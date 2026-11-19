'use strict';

const crypto = require('crypto');

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function newSessionToken() {
  return randomToken(24);
}

function newQrToken() {
  return randomToken(18);
}

function newDeviceKey() {
  return randomToken(32);
}

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = {
  randomToken,
  newSessionToken,
  newQrToken,
  newDeviceKey,
  hashToken,
  safeEqual
};
