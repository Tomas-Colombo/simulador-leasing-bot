import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import type { DualLeasingSimulationResult, LeasingSimulationResult, OptionSimulationResult } from '../domain/leasing/types.js';
import { formatCurrency, formatPercent } from './whatsappFormatter.js';

export function generateLeasingPdfBuffer(dualSimulation: DualLeasingSimulationResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const { clientName, assetDescription, isCommissionBonified, usdSimulation, arsSimulation } = dualSimulation;

      // Color Palette based on AndesLeasing Web Skin:
      const COLOR_NAVY = '#0B1E36';      // Deep Navy Blue
      const COLOR_GREEN = '#22C55E';     // Emerald Accent
      const COLOR_GREEN_DARK = '#15803D';// Dark Green for text
      const COLOR_GOLD = '#E5A718';      // Logo Excavator Gold
      const COLOR_GRAY_DARK = '#334155'; // Slate Text
      const COLOR_GRAY_MUTED = '#64748B';// Muted Slate
      const COLOR_BG_LIGHT = '#F8FAFC';  // Card Background
      const COLOR_BORDER = '#E2E8F0';    // Light Border

      // Logo discrete placement at top left
      const logoPath = path.resolve(process.cwd(), 'assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 35, 25, { width: 110 });
      } else {
        doc
          .fillColor(COLOR_NAVY)
          .fontSize(20)
          .text('Andes Leasing', 35, 28);
      }

      // Header Title Section
      doc
        .fillColor(COLOR_NAVY)
        .fontSize(16)
        .text('COTIZACIÓN OFICIAL DE LEASING', 220, 28, { align: 'right' })
        .fillColor(COLOR_GRAY_MUTED)
        .fontSize(8.5)
        .text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, 220, 48, { align: 'right' })
        .text('Documento generado comercialmente', 220, 59, { align: 'right' });

      // Aesthetic Accent Bar
      doc.rect(35, 80, 525, 3).fill(COLOR_GREEN);

      // Section 1: Information Card (Client, Asset, Exchange Rate, Liugong Promo)
      const infoY = 92;
      doc.rect(35, infoY, 525, 48).fillAndStroke(COLOR_BG_LIGHT, COLOR_BORDER);
      
      // Green accent side strip on card
      doc.rect(35, infoY, 4, 48).fill(COLOR_NAVY);

      doc.fillColor(COLOR_GRAY_DARK).fontSize(9);

      const clientText = clientName ? `Cliente / Empresa: ${clientName}` : 'Cliente: Cotización General';
      const assetText = assetDescription ? `Bien / Vehículo: ${assetDescription}` : 'Bien: Vehículo / Maquinaria Registrable';

      doc.font('Helvetica-Bold').text(clientText, 48, infoY + 10);
      doc.font('Helvetica').text(assetText, 48, infoY + 26);

      doc.font('Helvetica-Bold').text(`Tipo de Cambio: $ ${usdSimulation.exchangeRate} ARS/USD`, 360, infoY + 10);

      if (isCommissionBonified) {
        doc.fillColor('#B45309').fontSize(8.5).text('🎁 Promo: Comisión Bonificada por Liugong', 360, infoY + 26);
      } else {
        doc.fillColor(COLOR_GRAY_MUTED).fontSize(8.5).text('Garantías: A satisfacción según perfil crediticio', 360, infoY + 26);
      }

      let currentY = 152;

      // Helper function to render simulation tables
      const renderSimulationTable = (sim: LeasingSimulationResult, title: string, subtitle: string) => {
        // Section Header Pill
        doc.rect(35, currentY, 6, 16).fill(COLOR_GREEN);
        doc
          .font('Helvetica-Bold')
          .fillColor(COLOR_NAVY)
          .fontSize(11)
          .text(title, 48, currentY + 2);

        currentY += 18;

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLOR_GRAY_MUTED)
          .text(
            `Precio Neto del Bien: ${formatCurrency(sim.assetPriceNet, sim.currency)}  |  IVA (${(sim.ivaRate * 100).toFixed(1)}%): ${formatCurrency(sim.assetPriceIva, sim.currency)}  |  Total Bien con IVA: ${formatCurrency(sim.assetPriceTotal, sim.currency)}`,
            35,
            currentY
          );

        currentY += 13;

        const headers = ['Opción', 'Canon Inicial', 'Cuota Mensual', 'Op. Compra', 'Tasa Anual', 'Ahorro / Costo Neto (ARS)'];
        const colWidths = [95, 85, 85, 80, 75, 105];
        const startX = 35;

        // Table Header
        doc.rect(35, currentY, 525, 18).fill(COLOR_NAVY);
        doc.font('Helvetica-Bold').fillColor('#FFFFFF').fontSize(8);

        headers.forEach((header, index) => {
          const width = colWidths[index] ?? 80;
          const x = startX + colWidths.slice(0, index).reduce((a, b) => a + b, 0);
          doc.text(header, x + 2, currentY + 5, { width: width - 4, align: 'center' });
        });

        currentY += 18;

        const optionKeys: (keyof typeof sim.options)[] = ['100_percent', '10_percent_down', '20_percent_down', '30_percent_down'];

        optionKeys.forEach((key, idx) => {
          const opt: OptionSimulationResult = sim.options[key];
          const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

          doc.rect(35, currentY, 525, 20).fillAndStroke(rowBg, '#F1F5F9');
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_GRAY_DARK);

          const downLabel = opt.downPaymentRate === 0.05 ? '100% financiado' : `${opt.downPaymentRate * 100}% anticipo`;
          const rowData = [
            downLabel,
            formatCurrency(opt.downPaymentNet, sim.currency, 0),
            formatCurrency(opt.monthlyCanonNet, sim.currency, 0),
            formatCurrency(opt.purchaseOptionNet, sim.currency, 0),
            formatPercent(opt.nominalAnnualRate),
            formatCurrency(opt.netFinancialCost, 'ARS', 0),
          ];

          rowData.forEach((val, colIdx) => {
            const width = colWidths[colIdx] ?? 80;
            const x = startX + colWidths.slice(0, colIdx).reduce((a, b) => a + b, 0);

            // Highlight net financial cost in green if negative (savings)
            if (colIdx === 5 && opt.netFinancialCost < 0) {
              doc.font('Helvetica-Bold').fillColor(COLOR_GREEN_DARK);
            } else {
              doc.font('Helvetica').fillColor(COLOR_GRAY_DARK);
            }

            doc.text(val, x + 2, currentY + 5, { width: width - 4, align: 'center' });
          });

          currentY += 20;
        });

        currentY += 14;
      };

      // Render USD Table
      renderSimulationTable(usdSimulation, 'OPCIÓN 1: TASA FIJA DÓLAR LINK (USD)', 'Cuotas en USD al tipo de cambio oficial');

      // Render ARS Table
      renderSimulationTable(arsSimulation, 'OPCIÓN 2: TASA FIJA PESOS (ARS)', 'Cuotas fijas en pesos argentinos');

      // Legal & Disclaimer Card Footer
      const footerY = currentY + 5;
      doc.rect(35, footerY, 525, 48).fillAndStroke(COLOR_BG_LIGHT, COLOR_BORDER);

      doc
        .font('Helvetica-Bold')
        .fillColor(COLOR_NAVY)
        .fontSize(8)
        .text('Condiciones Comerciales - Andes Leasing (Leasing para PyMEs en Mendoza):', 43, footerY + 6)
        .font('Helvetica')
        .fillColor(COLOR_GRAY_MUTED)
        .fontSize(7.5)
        .text('1. Para la validez de la cotización se requiere revisión crediticia satisfactoria e instrumentación contractual.', 43, footerY + 18)
        .text('2. La presente propuesta comercial tiene una validez de 2 días hábiles a partir de su fecha de emisión.', 43, footerY + 28)
        .text(
          isCommissionBonified
            ? '3. Promoción especial Liugong: Los gastos de comisión asociada se encuentran 100% bonificados.'
            : '3. Las estimaciones de ahorro de Ganancias (35%) y Bienes Personales (2.5%) están sujetas al perfil impositivo del cliente.',
          43,
          footerY + 38
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
