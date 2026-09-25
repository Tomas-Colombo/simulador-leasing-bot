import type { AssetCategory, Currency, LeasingCalculationInput } from '../domain/leasing/types.js';

export interface ParseResult {
  success: true;
  input: LeasingCalculationInput;
  details: {
    rawAmountText: string;
    amount: number;
    currency: Currency;
    category: AssetCategory;
    exchangeRate: number;
    isIvaIncluded: boolean;
    isCommissionBonified: boolean;
    clientName?: string | undefined;
    assetDescription?: string | undefined;
  };
}

export interface ParseError {
  success: false;
  error: string;
}

export type ParseMessageOutput = ParseResult | ParseError;

const DEFAULT_EXCHANGE_RATE = 1530;
const DEFAULT_CATEGORY: AssetCategory = 'utilitario';

export function parseFinancialAmount(text: string): { amount: number; raw: string } | null {
  const cleanText = text.replace(/(?:tc|tipo\s+de\s+cambio)\s*[:=]?\s*\d+(?:[\.,]\d+)?/gi, '');
  const normalized = cleanText.toLowerCase();

  const regex = /(?:^|\s|\$)(?<num>\d+(?:[\.,]\d+)*)\s*(?<unit>k|mil|m|millon|millones)?/gi;
  let match: RegExpExecArray | null;
  let bestMatch: { amount: number; raw: string } | null = null;

  while ((match = regex.exec(normalized)) !== null) {
    if (!match.groups?.['num']) continue;

    let numStr = match.groups['num'];
    const unit = match.groups['unit']?.toLowerCase();

    if (numStr.includes('.') && numStr.includes(',')) {
      if (numStr.indexOf('.') < numStr.indexOf(',')) {
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      } else {
        numStr = numStr.replace(/,/g, '');
      }
    } else if ((numStr.match(/\./g) || []).length > 1) {
      numStr = numStr.replace(/\./g, '');
    } else if ((numStr.match(/,/g) || []).length > 1) {
      numStr = numStr.replace(/,/g, '');
    } else if (numStr.includes('.') && numStr.split('.')[1]?.length === 3 && !unit) {
      numStr = numStr.replace('.', '');
    } else if (numStr.includes(',') && numStr.split(',')[1]?.length === 3 && !unit) {
      numStr = numStr.replace(',', '');
    } else {
      numStr = numStr.replace(',', '.');
    }

    let amount = parseFloat(numStr);
    if (isNaN(amount) || amount <= 0) continue;

    if (unit === 'k' || unit === 'mil') {
      amount *= 1_000;
    } else if (unit === 'm' || unit === 'millon' || unit === 'millones') {
      amount *= 1_000_000;
    }

    bestMatch = { amount, raw: match[0].trim() };
    break;
  }

  return bestMatch;
}

export function parseExchangeRate(text: string): number {
  const tcRegex = /(?:tc|tipo\s+de\s+cambio)\s*[:=]?\s*(\d+(?:[\.,]\d+)?)/i;
  const match = text.match(tcRegex);
  if (match?.[1]) {
    const parsed = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_EXCHANGE_RATE;
}

export function parseCurrency(text: string, amount: number): Currency {
  const normalized = text.toLowerCase();

  if (/\b(?:usd|u\$s|dolar|dólar|dolares|dólares)\b/i.test(normalized)) {
    return 'USD';
  }
  if (/\b(?:ars|pesos?)\b/i.test(normalized) || (text.includes('$') && !text.includes('u$s'))) {
    return 'ARS';
  }

  // Heuristic: amounts >= 10,000,000 default to ARS; under 10,000,000 default to USD
  return amount >= 10_000_000 ? 'ARS' : 'USD';
}

export function parseCategory(text: string): AssetCategory {
  const normalized = text.toLowerCase();

  if (/\b(?:auto|suv|auto\s+suv|sedan|hatchback|21%?)\b/i.test(normalized)) {
    return 'auto_suv';
  }
  if (/\b(?:utilitario|camion|camión|furgon|furgón|pickup|pick\s*up|maquinaria|10\.5%?)\b/i.test(normalized)) {
    return 'utilitario';
  }

  return DEFAULT_CATEGORY;
}

export function parseIvaIncluded(text: string): boolean {
  const normalized = text.toLowerCase();
  // If explicitly says "neto", "sin iva", "mas iva", "+ iva", "+iva", "neto de iva" -> false (not included)
  if (/\b(?:neto|sin\s+iva|mas\s+iva|mÃ¡s\s+iva|\+\s*iva|neto\s+de\s+iva)\b/i.test(normalized)) {
    return false;
  }
  // Default: IVA is included
  return true;
}

export function parseCommissionBonified(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(?:bonificada|bonificado|liugong|comision\s*0|sin\s+comision|sin\s+comisiÃ³n)\b/i.test(normalized);
}

export function parseClientAndAsset(text: string): { clientName?: string | undefined; assetDescription?: string | undefined } {
  let clientName: string | undefined;
  let assetDescription: string | undefined;

  const stopPattern = '(?:\\s+bien|\\s+vehiculo|\\s+vehículo|\\s+auto|\\s+equipo|\\s+maquinaria|\\s+neto|\\s+sin\\s+iva|\\s+bonificada|\\s+liugong|\\s+tc|[,\\.\\;\\n]|$)';

  const clientMatch = text.match(new RegExp(`(?:cliente|client|para|empresa)\\s*[:=-]?\\s*(.*?)${stopPattern}`, 'i'));
  if (clientMatch?.[1]) {
    const trimmed = clientMatch[1].trim();
    if (trimmed.length > 0) clientName = trimmed;
  }

  const assetMatch = text.match(new RegExp(`(?:bien|vehiculo|vehículo|auto|equipo|maquinaria)\\s*[:=-]?\\s*(.*?)${stopPattern}`, 'i'));
  if (assetMatch?.[1]) {
    const trimmed = assetMatch[1].trim();
    if (trimmed.length > 0) assetDescription = trimmed;
  }

  return { clientName, assetDescription };
}

export function parseMessage(messageText: string): ParseMessageOutput {
  if (!messageText || messageText.trim().length === 0) {
    return { success: false, error: 'El mensaje está vacío.' };
  }

  const parsedAmount = parseFinancialAmount(messageText);
  if (!parsedAmount) {
    return {
      success: false,
      error: 'No se pudo identificar un monto válido en el mensaje. Ejemplos: "100k usd utilitario", "150.000.000 pesos auto cliente: Juan Perez".',
    };
  }

  const amount = parsedAmount.amount;
  const currency = parseCurrency(messageText, amount);
  const category = parseCategory(messageText);
  const exchangeRate = parseExchangeRate(messageText);
  const isIvaIncluded = parseIvaIncluded(messageText);
  const isCommissionBonified = parseCommissionBonified(messageText);
  const { clientName, assetDescription } = parseClientAndAsset(messageText);

  return {
    success: true,
    input: {
      amount,
      isIvaIncluded,
      inputCurrency: currency,
      category,
      exchangeRate,
      termYears: 3,
      isCommissionBonified,
      clientName,
      assetDescription,
    },
    details: {
      rawAmountText: parsedAmount.raw,
      amount,
      currency,
      category,
      exchangeRate,
      isIvaIncluded,
      isCommissionBonified,
      clientName,
      assetDescription,
    },
  };
}
