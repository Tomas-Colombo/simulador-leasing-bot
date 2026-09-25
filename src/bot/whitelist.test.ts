import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNumberWhitelisted, parseWhitelist } from './whitelist.js';

describe('Whitelist Helper', () => {
  it('should parse comma-separated whitelist numbers correctly', () => {
    const parsed = parseWhitelist('5491112345678, +5491187654321, ');
    assert.deepEqual(parsed, ['5491112345678', '5491187654321']);
  });

  it('should allow sender when whitelist matches', () => {
    const whitelist = ['5491112345678'];
    assert.equal(isNumberWhitelisted('5491112345678@s.whatsapp.net', whitelist), true);
  });

  it('should reject sender when not in whitelist', () => {
    const whitelist = ['5491112345678'];
    assert.equal(isNumberWhitelisted('5491199999999@s.whatsapp.net', whitelist), false);
  });

  it('should allow all numbers if whitelist is empty', () => {
    assert.equal(isNumberWhitelisted('5491199999999@s.whatsapp.net', []), true);
  });
});
