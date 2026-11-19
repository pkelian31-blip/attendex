'use strict';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { newDeviceKey, hashToken } = require('../../lib/tokens');
const {
  validateSubmission,
  getDeviceKeyFromCookies,
  getClientIp
} = require('../../lib/attendance-validation');
const { processAttendance } = require('../../lib/attendance-engine');
const { ApiError } = require('../../lib/api-error');

let db = null;
let initError = null;
try {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  }
  db = getFirestore();
} catch (error) {
  initError = error && error.message ? error.message : 'Firebase Admin init failed';
}

const ALLOWED_ORIGINS = String(
  process.env.ALLOWED_ORIGINS || 'https://attendex-pro.vercel.app,http://localhost:3001'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function applyCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function fail(res, error) {
  return res.status(error.status).json({ ok: false, error: error.code, message: error.message });
}

module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST'));
  if (!db) return fail(res, new ApiError(503, 'BACKEND_UNAVAILABLE', `Backend unavailable: ${initError}`));

  const check = validateSubmission(req.body);
  if (!check.ok) return fail(res, new ApiError(400, 'INVALID_SUBMISSION', check.errors.join('; ')));
  const value = check.value;

  let deviceKey = getDeviceKeyFromCookies(req.headers.cookie);
  if (!deviceKey) {
    deviceKey = newDeviceKey();
    const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `ax_device=${deviceKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? '; Secure' : ''}`
    );
  }

  try {
    const tokenHash = hashToken(value.token);
    const sessionQuery = await db.collection('sessions').where('tokenHash', '==', tokenHash).limit(1).get();
    if (sessionQuery.empty) {
      return fail(res, new ApiError(404, 'INVALID_SESSION_TOKEN', 'This attendance link is invalid.'));
    }
    const sessionId = sessionQuery.docs[0].id;
    const outcome = await processAttendance({
      db,
      sessionId,
      value,
      deviceHash: hashToken(deviceKey),
      tokenHash,
      now: Date.now(),
      ip: getClientIp(req),
      userAgentHash: hashToken((req.headers && req.headers['user-agent']) || 'unknown')
    });
    return res.status(200).json({ ok: true, ...outcome });
  } catch (error) {
    if (error instanceof ApiError) return fail(res, error);
    console.error('submit attendance error:', error);
    return fail(res, new ApiError(500, 'SERVER_ERROR', 'Unable to record attendance. Please retry.'));
  }
};
