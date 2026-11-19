'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMatricule,
  parseCookies,
  getDeviceKeyFromCookies,
  validateSubmission,
  sessionWindow
} = require('../lib/attendance-validation');

test('matricules are normalized for uniqueness', () => {
  assert.equal(normalizeMatricule('  ax/2024/001 '), 'AX/2024/001');
  assert.equal(normalizeMatricule('ax-01'), 'AX-01');
});

test('cookies are parsed and a valid server device key is accepted', () => {
  const device = 'a'.repeat(32);
  const header = `ax_device=${device}; other=hello%20world`;
  assert.equal(parseCookies(header).other, 'hello world');
  assert.equal(getDeviceKeyFromCookies(header), device);
  assert.equal(getDeviceKeyFromCookies('ax_device=short'), null);
  assert.equal(getDeviceKeyFromCookies(undefined), null);
});

test('valid submission passes validation', () => {
  const result = validateSubmission({
    token: 'a'.repeat(32),
    matricule: 'ax/2024/001',
    firstName: 'Alice',
    lastName: 'Ngo',
    studentLat: 3.866,
    studentLng: 11.517,
    accuracyM: 12
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.matricule, 'AX/2024/001');
});

test('invalid submissions are rejected with reasons', () => {
  const result = validateSubmission({
    token: 'short',
    matricule: '',
    studentLat: 999,
    studentLng: 'abc',
    accuracyM: -5
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('token')));
  assert.ok(result.errors.some((e) => e.includes('matriculation')));
  assert.ok(result.errors.some((e) => e.includes('latitude')));
  assert.ok(result.errors.some((e) => e.includes('longitude')));
  assert.ok(result.errors.some((e) => e.includes('accuracy')));
});

test('session window uses server time and legacy fields', () => {
  assert.equal(sessionWindow({ start: 1000, expiry: 2000 }, 1500).valid, true);
  assert.equal(sessionWindow({ start: 1000, expiry: 2000 }, 2500).reason, 'SESSION_EXPIRED');
  assert.equal(sessionWindow({ startAt: 1000, expiryAt: 2000 }, 500).reason, 'SESSION_NOT_OPEN_YET');
  assert.equal(sessionWindow({}, 1500).reason, 'INVALID_SESSION_WINDOW');
});
