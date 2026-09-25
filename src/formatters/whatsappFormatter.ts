import type { DualLeasingSimulationResult, LeasingSimulationResult, OptionSimulationResult } from '../domain/leasing/types.js';

export function formatCurrency(amount: number, currency: string, decimals: number = 2): string {
  const symbol = currency === 'USD' ? 'USD' : '$';
  const formattedNum = amount.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol} ${formattedNum}`;
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatOptionSummary(option: OptionSimulationResult, currency: string): string {
  const downLabel = option.downPaymentRate === 0.05 ? '100% financiado (5% inicial)' : `${option.downPaymentRate * 100}% anticipo`;

  let commissionLine = `     - Comisión asociada: ${formatCurrency(option.associatedCommission, 'ARS')}`;
  if (option.isCommissionBonified) {
    commissionLine = `     - Comisión asociada: ~${formatCurrency(option.originalAssociatedCommission, 'ARS')}~ 🎁 *BONIFICADA POR LIUGONG (0%)*`;
  }

  return [
    `📌 *Opción ${downLabel}*`,
    `  • Canon inicial: ${formatCurrency(option.downPaymentNet, currency)}`,
    `  • ${option.monthsCount + 1} cuotas mensuales de: ${formatCurrency(option.monthlyCanonNet, currency)}`,
    `  • Opción de compra: ${formatCurrency(option.purchaseOptionNet, currency)}`,
    `  • Tasa directa anual: ${formatPercent(option.nominalAnnualRate)}`,
    `  • Gastos e impositivo estimados (ARS):`,
    `     - Gastos líq. banco: ${formatCurrency(option.bankLiquidationExpenses, 'ARS')}`,
    commissionLine,
    `     - Ahorro Ganancias (35%): ${formatCurrency(option.gananciasTaxSavings, 'ARS')}`,
    `     - Ahorro Bienes Personales: ${formatCurrency(option.bienesPersonalesTaxSavings, 'ARS')}`,
    `  • *Ahorro / Costo neto del dinero:* ${formatCurrency(option.netFinancialCost, 'ARS')}`,
  ].join('\n');
}

function formatSingleSimulationBlock(simulation: LeasingSimulationResult, title: string): string {
  const { currency, assetPriceNet, assetPriceIva, assetPriceTotal, ivaRate, isIvaIncludedInput, options } = simulation;

  const header = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💵 *${title}*`,
    `🚗 *Bien:* ${formatCurrency(assetPriceNet, currency)} Neto ${isIvaIncludedInput ? '(IVA Incluido en monto origen)' : '(Neto + IVA)'}`,
    `💰 *IVA (${(ivaRate * 100).toFixed(1)}%):* ${formatCurrency(assetPriceIva, currency)}`,
    `💵 *Total Bien con IVA:* ${formatCurrency(assetPriceTotal, currency)}\n`,
  ].join('\n');

  const optionsText = [
    formatOptionSummary(options['100_percent'], currency),
    formatOptionSummary(options['10_percent_down'], currency),
    formatOptionSummary(options['20_percent_down'], currency),
    formatOptionSummary(options['30_percent_down'], currency),
  ].join('\n\n');

  return `${header}${optionsText}`;
}

export function formatWhatsAppMessage(dualSimulation: DualLeasingSimulationResult): string {
  const { clientName, assetDescription, isCommissionBonified, usdSimulation, arsSimulation } = dualSimulation;

  const brandHeader = [
    `🏦 *ANDES LEASING - SIMULACIÓN OFICIAL*`,
    `───────────────────────────────`,
    clientName ? `👤 *Cliente:* ${clientName}` : '',
    assetDescription ? `🚙 *Bien / Vehículo:* ${assetDescription}` : '',
    `💱 *Tipo de Cambio:* $ ${usdSimulation.exchangeRate} ARS/USD`,
    isCommissionBonified ? `🎁 *PROMO ESPECIAL:* Comisión bonificada por Liugong` : '',
    `───────────────────────────────\n`,
  ].filter(Boolean).join('\n');

  const usdBlock = formatSingleSimulationBlock(usdSimulation, 'OPCIÓN 1: TASA FIJA DÓLAR LINK (USD)');
  const arsBlock = formatSingleSimulationBlock(arsSimulation, 'OPCIÓN 2: TASA FIJA PESOS (ARS)');

  const footer = [
    `\n───────────────────────────────`,
    `📄 _Se adjunta la cotización formal de AndesLeasing en PDF lista para enviar al cliente._`,
  ].join('\n');

  return `${brandHeader}${usdBlock}\n\n${arsBlock}${footer}`;
}
