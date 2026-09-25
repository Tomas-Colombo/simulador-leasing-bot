import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDualLeasing } from '../domain/leasing/calculator.js';
import { formatWhatsAppMessage } from './whatsappFormatter.js';

describe('WhatsApp Message Formatter', () => {
  it('should format dual leasing simulation message with AndesLeasing branding', () => {
    const dual = calculateDualLeasing({
      amount: 100000,
      inputCurrency: 'USD',
      category: 'utilitario',
      exchangeRate: 1530,
      clientName: 'Juan Pérez',
      assetDescription: 'Toyota Hilux',
      isCommissionBonified: true,
    });

    const text = formatWhatsAppMessage(dual);
    assert.match(text, /ANDES LEASING/);
    assert.match(text, /Juan Pérez/);
    assert.match(text, /Toyota Hilux/);
    assert.match(text, /BONIFICADA POR LIUGONG/);
    assert.match(text, /OPCIÓN 1: TASA FIJA DÓLAR LINK/);
    assert.match(text, /OPCIÓN 2: TASA FIJA PESOS/);
  });
});
