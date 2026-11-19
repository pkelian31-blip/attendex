'use strict';

const { isLat, isLng } = require('./geo');

function normalizeMatricule(value) {
  return String(value || '').trim().toUpperCase();
}

function parseCookies(cookieHeader) {
  const out = {};
  String(cookieHeader || '')
    .split(';')
    .forEach((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key) out[key] = decodeURIComponent(value);
    });
  return out;
}

function getDeviceKeyFromCookies(cookieHeader) {
  const value = parseCookies(cookieHeader).ax_device;
  return typeof value === 'string' && value.length >= 20 && value.length <= 200 ? value : null;
}

function getClientIp(req) {
  const forwarded = String((req.headers && req.headers['x-forwarded-for']) || '')
    .split(',')[0]
    .trim();
  if (forwarded) return forwarded;
  return String((req.socket && req.socket.remoteAddress) || '').replace(/^::ffff:/, '');
}

function validateSubmission(body) {
  const errors = [];
  const b = body || {};

  const token = String(b.token || '').trim();
  if (!token || token.length < 20 || token.length > 200) errors.push('Invalid session token');

  const matricule = normalizeMatricule(b.matricule);
  if (!/^[A-Z0-9][A-Z0-9\-/]{2,29}$/.test(matricule)) errors.push('Invalid matriculation number');

  const firstName = String(b.firstName || '').trim();
  const lastName = String(b.lastName || '').trim();
  if (!firstName || firstName.length > 80) errors.push('Invalid first name');
  if (!lastName || lastName.length > 80) errors.push('Invalid last name');

  const studentLat = Number(b.studentLat);
  const studentLng = Number(b.studentLng);
  const accuracyM = Number(b.accuracyM);
  if (!isLat(studentLat)) errors.push('Invalid student latitude');
  if (!isLng(studentLng)) errors.push('Invalid student longitude');
  if (!Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > 1000) errors.push('Invalid GPS accuracy');

  const className = String(b.className || '').trim().slice(0, 120);
  const department = String(b.department || '').trim().slice(0, 120);
  const phone = String(b.phone || '').trim().slice(0, 40);
  const fingerprint = String(b.fingerprint || '').trim().slice(0, 200);
  const qrToken = String(b.qrToken || '').trim().slice(0, 200);

  if (errors.length) return { ok: false, errors, value: null };
  return {
    ok: true,
    errors: [],
    value: { token, matricule, firstName, lastName, studentLat, studentLng, accuracyM, className, department, phone, fingerprint, qrToken }
  };
}

function sessionWindow(session, now) {
  const start = Number(session.startAt != null ? session.startAt : session.start);
  const expiry = Number(session.expiryAt != null ? session.expiryAt : session.expiry);
  if (!Number.isFinite(start) || !Number.isFinite(expiry) || expiry <= start) {
    return { valid: false, reason: 'INVALID_SESSION_WINDOW' };
  }
  if (now < start) return { valid: false, reason: 'SESSION_NOT_OPEN_YET' };
  if (now > expiry) return { valid: false, reason: 'SESSION_EXPIRED' };
  return { valid: true, start, expiry };
}

module.exports = {
  normalizeMatricule,
  parseCookies,
  getDeviceKeyFromCookies,
  getClientIp,
  validateSubmission,
  sessionWindow
};
