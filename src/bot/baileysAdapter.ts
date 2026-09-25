import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import type { WAMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { parseMessage } from '../parser/messageParser.js';
import { calculateDualLeasing } from '../domain/leasing/calculator.js';
import { formatWhatsAppMessage } from '../formatters/whatsappFormatter.js';
import { generateLeasingPdfBuffer } from '../formatters/pdfGenerator.js';

import { isNumberWhitelisted, parseWhitelist } from './whitelist.js';

export interface BotConfig {
  whitelistNumbers: string[];
  authFolder?: string;
}

export async function startWhatsAppBot(config: BotConfig) {
  const { whitelistNumbers, authFolder = 'auth_info_baileys' } = config;
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'info' });

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📱 ESCANEÁ ESTE CÓDIGO QR PARA CONECTAR EL BOT:');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(' Conexión cerrada. Razón:', lastDisconnect?.error, 'Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppBot(config);
      }
    } else if (connection === 'open') {
      console.log(' Conexión a WhatsApp establecida con éxito.');
      console.log(` Números en Whitelist autorizados: ${whitelistNumbers.length > 0 ? whitelistNumbers.join(', ') : 'TODOS (Modo desarrollo)'}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;

      const senderJid = msg.key.remoteJid;
      if (!senderJid) continue;

      // Whitelist Enforcement
      if (!isNumberWhitelisted(senderJid, whitelistNumbers)) {
        console.log(` Mensaje ignorado de número no autorizado: ${senderJid}`);
        continue;
      }

      const messageText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      if (!messageText || messageText.trim().length === 0) {
        continue;
      }

      console.log(`📩 Mensaje recibido de ${senderJid}: "${messageText}"`);

      const parseResult = parseMessage(messageText);

      if (!parseResult.success) {
        await sock.sendMessage(senderJid, {
          text: `⚠️ ${parseResult.error}`,
        });
        continue;
      }

      try {
        // Run dual domain calculation (USD & ARS)
        const dualSimulation = calculateDualLeasing(parseResult.input);

        // Format WhatsApp text response
        const responseText = formatWhatsAppMessage(dualSimulation);

        // Generate PDF in hot memory
        const pdfBuffer = await generateLeasingPdfBuffer(dualSimulation);

        // 1. Send WhatsApp Text message
        await sock.sendMessage(senderJid, { text: responseText });

        // 2. Send PDF Document Attachment
        await sock.sendMessage(senderJid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: `AndesLeasing_Cotizacion_${dualSimulation.usdSimulation.assetPriceNet}USD.pdf`,
          caption: '📄 Cotización oficial de AndesLeasing en PDF',
        });

        console.log(` Simulación enviada exitosamente a ${senderJid}`);
      } catch (err) {
        console.error('Error procesando simulación:', err);
        await sock.sendMessage(senderJid, {
          text: '❌ Ocurrió un error interno al calcular la simulación.',
        });
      }
    }
  });

  return sock;
}
