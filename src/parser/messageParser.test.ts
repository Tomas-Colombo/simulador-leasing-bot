import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMessage } from './messageParser.js';

describe('Message Parser', () => {
  it('should parse "100k usd utilitario" with default IVA included', () => {
    const res = parseMessage('100k usd utilitario');
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.input.amount, 100000);
      assert.equal(res.input.inputCurrency, 'USD');
      assert.equal(res.input.category, 'utilitario');
      assert.equal(res.input.isIvaIncluded, true);
      assert.equal(res.input.isCommissionBonified, false);
    }
  });

  it('should parse "150.000.000 neto bonificada liugong cliente: Juan Perez bien: Toyota Hilux" correctly', () => {
    const res = parseMessage('150.000.000 neto bonificada liugong cliente: Juan Perez bien: Toyota Hilux');
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.input.amount, 150000000);
      assert.equal(res.input.inputCurrency, 'ARS');
      assert.equal(res.input.isIvaIncluded, false);
      assert.equal(res.input.isCommissionBonified, true);
      assert.equal(res.input.clientName, 'Juan Perez');
      assert.equal(res.input.assetDescription, 'Toyota Hilux');
    }
  });

  it('should apply 10M heuristic for currency detection', () => {
    const resSmall = parseMessage('500.000');
    assert.equal(resSmall.success, true);
    if (resSmall.success) {
      assert.equal(resSmall.input.inputCurrency, 'USD');
    }

    const resLarge = parseMessage('60.000.000');
    assert.equal(resLarge.success, true);
    if (resLarge.success) {
      assert.equal(resLarge.input.inputCurrency, 'ARS');
    }
  });
});
