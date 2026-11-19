'use strict';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { randomUUID } = require('crypto');
const { newSessionToken, newQrToken, hashToken } = require('../../lib/tokens');

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
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
  }
  db = getFirestore();
  auth = getAuth();
} catch (error) {
  initError = error && error.message ? error.message : 'Firebase Admin init failed';
}

const DEFAULT_RADII = [10, 20, 30, 50, 100, 200];

function applyCors(req, res) {
  const origin = req.headers && req.headers.origin;
  const allowed = String(
    process.env.ALLOWED_ORIGINS || 'https://attendex-pro.vercel.app,http://localhost:3001'
  ).split(',').map((s) => s.trim());
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function fail(res, error) {
  return res.status(error.status).json({ ok: false, error: error.code, message: error.message });
}

async function requireAdmin(req) {
  const header = String((req.headers && req.headers.authorization) || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication required.');
  let claims;
  try {
    claims = await auth.verifyIdToken(match[1], true);
  } catch (error) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token.');
  }
  const role = claims.role;
  if (!['super_admin', 'university_admin', 'department_admin', 'lecturer'].includes(role)) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not allowed to create sessions.');
  }
  if (!claims.tenantId) throw new ApiError(403, 'NO_TENANT', 'Your account has no university assigned.');
  return claims;
}

module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST'));
  if (!db || !auth) return fail(res, new ApiError(503, 'BACKEND_UNAVAILABLE', `Backend unavailable: ${initError}`));

  try {
    const claims = await requireAdmin(req);
    const body = req.body || {};
    const tenantId = String(claims.tenantId);
    const classroomId = String(body.classroomId || '').trim();
    if (!classroomId) throw new ApiError(400, 'CLASSROOM_REQUIRED', 'Select a registered classroom.');

    const classroomRef = db.collection('tenants').doc(tenantId).collection('classrooms').doc(classroomId);
    const classroomSnap = await classroomRef.get();
    if (!classroomSnap.exists) throw new ApiError(404, 'CLASSROOM_NOT_FOUND', 'Classroom not found in your university.');
    const classroom = classroomSnap.data();
    const classLat = Number(classroom.latitude != null ? classroom.latitude : classroom.lat);
    const classLng = Number(classroom.longitude != null ? classroom.longitude : classroom.lng);
    if (!Number.isFinite(classLat) || !Number.isFinite(classLng)) {
      throw new ApiError(409, 'CLASSROOM_LOCATION_MISSING', 'This classroom has no registered GPS coordinates.');
    }

    const settingsSnap = await db.collection('tenants').doc(tenantId).collection('settings').doc('attendance').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const allowedRadii = Array.isArray(settings.allowedRadiiM) && settings.allowedRadiiM.length
      ? settings.allowedRadiiM.map(Number)
      : DEFAULT_RADII;
    const radiusM = Number(body.radiusM);
    if (!allowedRadii.includes(radiusM)) {
      throw new ApiError(400, 'INVALID_RADIUS', `Radius must be one of: ${allowedRadii.join(', ')} metres.`);
    }

    const startAt = Number(body.startAt || Date.now());
    const durationMinutes = Number(body.durationMinutes || 60);
    if (!Number.isFinite(startAt) || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) {
      throw new ApiError(400, 'INVALID_DURATION', 'Invalid session duration.');
    }
    const expiryAt = startAt + durationMinutes * 60 * 1000;

    const allowedMatricules = Array.isArray(body.allowedMatricules)
      ? body.allowedMatricules.map((m) => String(m).trim().toUpperCase()).filter(Boolean)
      : [];
    if (!allowedMatricules.length) {
      throw new ApiError(400, 'ROSTER_REQUIRED', 'An eligible student roster is required.');
    }

    const rawToken = newSessionToken();
    const rawQrToken = newQrToken();
    const qrRequired = Boolean(body.qrRequired);
    const sessionId = randomUUID();
    const sessionRef = db.collection('sessions').doc(sessionId);
    await sessionRef.set({
      id: sessionId,
      tenantId,
      status: 'open',
      departmentId: String(body.departmentId || claims.departmentId || ''),
      courseId: String(body.courseId || ''),
      levelId: String(body.levelId || ''),
      semesterId: String(body.semesterId || ''),
      classroomId,
      classroomName: classroom.name || classroomId,
      classLat,
      classLng,
      radiusM,
      maxAccuracyM: Number(settings.maxAccuracyM || 50),
      tokenHash: hashToken(rawToken),
      qrRequired,
      qrTokenHash: qrRequired ? hashToken(rawQrToken) : null,
      qrExpiryAt: qrRequired ? expiryAt : null,
      qrSingleUse: Boolean(body.qrSingleUse),
      allowedMatricules,
      startAt,
      expiryAt,
      createdBy: claims.uid || claims.adminId || claims.sub || null,
      createdByRole: claims.role,
      createdAt: Date.now(),
      notes: String(body.notes || '').slice(0, 500)
    });

    await db.collection('audit_logs').add({
      action: 'SESSION_CREATED',
      sessionId,
      tenantId,
      actor: claims.uid || claims.adminId || claims.sub || null,
      createdAt: Date.now()
    });

    return res.status(201).json({
      ok: true,
      sessionId,
      linkToken: rawToken,
      qrToken: qrRequired ? rawQrToken : null,
      startAt,
      expiryAt,
      radiusM
    });
  } catch (error) {
    if (error instanceof ApiError) return fail(res, error);
    console.error('create session error:', error);
    return fail(res, new ApiError(500, 'SERVER_ERROR', 'Unable to create session.'));
  }
};
