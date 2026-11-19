'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  newSessionToken,
  newQrToken,
  newDeviceKey,
  hashToken,
  safeEqual
} = require('../lib/tokens');

test('session tokens are unpredictable and sufficiently long', () => {
  const a = newSessionToken();
  const b = newSessionToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32, 'token should contain at least 128 bits of entropy');
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test('QR and device tokens are unique', () => {
  assert.notEqual(newQrToken(), newQrToken());
  assert.notEqual(newDeviceKey(), newDeviceKey());
});

test('hashToken is deterministic and hides the input', () => {
  const token = newSessionToken();
  const hash = hashToken(token);
  assert.equal(hash, hashToken(token));
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
});

test('safeEqual compares correctly', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});
