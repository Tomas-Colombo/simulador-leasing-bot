import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDualLeasing, calculateLeasingSingle } from './calculator.js';

describe('Leasing Domain Calculator', () => {
  it('should calculate single ARS simulation matching Excel "En pesos"', () => {
    const result = calculateLeasingSingle({
      amount: 151950000,
      targetAmountNet: 151950000,
      targetCurrency: 'ARS',
      category: 'utilitario',
      isIvaIncluded: false,
    });

    assert.equal(result.currency, 'ARS');
    assert.equal(result.assetPriceNet, 151950000);
    assert.equal(result.assetPriceIva, 15954750);
    assert.equal(result.assetPriceTotal, 167904750);
  });

  it('should calculate dual simulation in both USD and ARS', () => {
    const dual = calculateDualLeasing({
      amount: 100000,
      inputCurrency: 'USD',
      category: 'utilitario',
      exchangeRate: 1530,
      isIvaIncluded: false,
      isCommissionBonified: true,
      clientName: 'Juan Pérez',
      assetDescription: 'Toyota Hilux',
    });

    assert.equal(dual.clientName, 'Juan Pérez');
    assert.equal(dual.assetDescription, 'Toyota Hilux');
    assert.equal(dual.isCommissionBonified, true);

    // Check USD simulation
    assert.equal(dual.usdSimulation.currency, 'USD');
    assert.equal(dual.usdSimulation.assetPriceNet, 100000);
    assert.equal(dual.usdSimulation.options['100_percent'].associatedCommission, 0);
    assert.ok(dual.usdSimulation.options['100_percent'].originalAssociatedCommission > 0);

    // Check ARS simulation
    assert.equal(dual.arsSimulation.currency, 'ARS');
    assert.equal(dual.arsSimulation.assetPriceNet, 153000000);
  });

  it('should correctly handle amount with IVA included', () => {
    const dual = calculateDualLeasing({
      amount: 110500, // 100k net + 10.5% IVA
      inputCurrency: 'USD',
      category: 'utilitario',
      isIvaIncluded: true,
    });

    assert.ok(Math.abs(dual.usdSimulation.assetPriceNet - 100000) < 0.1);
    assert.ok(Math.abs(dual.usdSimulation.assetPriceTotal - 110500) < 0.1);
  });
});
