import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDualLeasing } from '../domain/leasing/calculator.js';
import { generateLeasingPdfBuffer } from './pdfGenerator.js';

describe('PDF Generator', () => {
  it('should generate a non-empty PDF Buffer from dual leasing simulation', async () => {
    const dual = calculateDualLeasing({
      amount: 100000,
      inputCurrency: 'USD',
      category: 'utilitario',
      exchangeRate: 1530,
      clientName: 'Empresa Test S.A.',
      assetDescription: 'Camión Volvo 440',
      isCommissionBonified: true,
    });

    const pdfBuffer = await generateLeasingPdfBuffer(dual);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 500);

    const pdfHeader = pdfBuffer.subarray(0, 5).toString('ascii');
    assert.equal(pdfHeader, '%PDF-');
  });
});
