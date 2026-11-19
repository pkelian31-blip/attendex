'use strict';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let db = null;
let auth = null;
let initError = null;
try {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  db = getFirestore();
  auth = getAuth();
} catch (error) {
  initError = error && error.message ? error.message : 'Firebase Admin init failed';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!db || !auth) return res.status(503).json({ ok: false, error: 'BACKEND_UNAVAILABLE', message: initError });

  try {
    const header = String((req.headers && req.headers.authorization) || '');
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required.');
    let claims;
    try {
      claims = await auth.verifyIdToken(match[1], true);
    } catch (error) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token.');
    }
    if (!['super_admin', 'university_admin', 'department_admin', 'lecturer'].includes(claims.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Not allowed to close sessions.');
    }

    const sessionId = String((req.body || {}).sessionId || '').trim();
    if (!sessionId) throw new ApiError(400, 'SESSION_ID_REQUIRED', 'sessionId is required.');
    const ref = db.collection('sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found.');
    const session = snap.data();
    if (claims.tenantId && session.tenantId !== claims.tenantId && claims.role !== 'super_admin') {
      throw new ApiError(403, 'CROSS_TENANT_DENIED', 'You cannot modify another university’s session.');
    }
    const action = (req.body || {}).action === 'cancel' ? 'cancelled' : 'closed';
    await ref.update({ status: action, closedAt: Date.now(), closedBy: claims.uid || claims.sub || null });
    await db.collection('audit_logs').add({
      action: action === 'cancelled' ? 'SESSION_CANCELLED' : 'SESSION_CLOSED',
      sessionId,
      tenantId: session.tenantId || null,
      actor: claims.uid || claims.sub || null,
      createdAt: Date.now()
    });
    return res.status(200).json({ ok: true, status: action });
  } catch (error) {
    if (error instanceof ApiError) return res.status(error.status).json({ ok: false, error: error.code, message: error.message });
    console.error('close session error:', error);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
