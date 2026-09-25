import { startWhatsAppBot } from './bot/baileysAdapter.js';
import { parseWhitelist } from './bot/whitelist.js';

async function main() {
  console.log('🚀 Iniciando Bot Simulador de Leasing por WhatsApp...');

  const rawWhitelist = process.env['WHITELIST_NUMBERS'] || '';
  const whitelistNumbers = parseWhitelist(rawWhitelist);

  if (whitelistNumbers.length === 0) {
    console.warn('⚠️ AVISO: No se definió la variable WHITELIST_NUMBERS. El bot responderá a todos los mensajes (modo desarrollo).');
  } else {
    console.log(`🔒 Whitelist activa con ${whitelistNumbers.length} números autorizados.`);
  }

  try {
    await startWhatsAppBot({
      whitelistNumbers,
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el bot:', error);
    process.exit(1);
  }
}

main();
