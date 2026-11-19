'use strict';

const { evaluateLocation } = require('./geo');
const { hashToken, safeEqual } = require('./tokens');
const { sessionWindow } = require('./attendance-validation');
const { ApiError } = require('./api-error');

/**
 * The complete server-side attendance transaction.
 *
 * `db` is a Firestore Admin instance. A compatible in-memory implementation is
 * used by tests, so the same code path can be verified without cloud access.
 */
async function processAttendance({ db, sessionId, value, deviceHash, tokenHash, now, ip, userAgentHash }) {
  return db.runTransaction(async (tx) => {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) throw new ApiError(404, 'INVALID_SESSION_TOKEN', 'Session no longer exists.');
    const session = sessionSnap.data();

    if ((session.status || 'open') !== 'open') {
      throw new ApiError(403, 'SESSION_CLOSED', 'This attendance session is closed.');
    }
    const window = sessionWindow(session, now);
    if (!window.valid) {
      const message = window.reason === 'SESSION_EXPIRED'
        ? 'This attendance session has expired.'
        : window.reason === 'SESSION_NOT_OPEN_YET'
          ? 'This attendance session is not open yet.'
          : 'This attendance session is misconfigured.';
      throw new ApiError(403, window.reason, message);
    }

    if (session.qrRequired) {
      if (!value.qrToken) throw new ApiError(403, 'QR_TOKEN_REQUIRED', 'A valid QR token is required.');
      const qrHash = hashToken(value.qrToken);
      if (!safeEqual(qrHash, session.qrTokenHash)) throw new ApiError(403, 'INVALID_QR_TOKEN', 'Invalid QR token.');
      if (Number(session.qrExpiryAt || 0) < now) throw new ApiError(403, 'QR_TOKEN_EXPIRED', 'The QR token has expired.');
      if (session.qrSingleUse) {
        const useRef = sessionRef.collection('qrUses').doc(qrHash);
        const useSnap = await tx.get(useRef);
        if (useSnap.exists) throw new ApiError(403, 'QR_TOKEN_ALREADY_USED', 'This QR token has already been used.');
        tx.set(useRef, { usedAt: now, matricule: value.matricule });
      }
    }

    const classLat = Number(session.classLat != null ? session.classLat : session.geoLat);
    const classLng = Number(session.classLng != null ? session.classLng : session.geoLng);
    const radiusM = Number(session.radiusM != null ? session.radiusM : session.geoRadius);
    if (!Number.isFinite(classLat) || !Number.isFinite(classLng) || !Number.isFinite(radiusM) || radiusM <= 0) {
      throw new ApiError(409, 'GEOFENCE_NOT_CONFIGURED', 'This session has no registered classroom location.');
    }
    const location = evaluateLocation({
      classLat,
      classLng,
      studentLat: value.studentLat,
      studentLng: value.studentLng,
      accuracyM: value.accuracyM,
      radiusM,
      maxAccuracyM: Number(session.maxAccuracyM || 50)
    });
    if (location.status === 'invalid') throw new ApiError(400, 'INVALID_LOCATION_DATA', location.reason);
    if (location.status === 'rejected') {
      throw new ApiError(
        403,
        'LOCATION_REJECTED',
        `You are ${Math.round(location.distanceM)} m from the classroom; the permitted radius is ${radiusM} m.`
      );
    }

    let identityVerified = false;
    if (Array.isArray(session.allowedMatricules) && session.allowedMatricules.length) {
      const allowed = session.allowedMatricules.map((m) => String(m).trim().toUpperCase());
      if (!allowed.includes(value.matricule)) {
        throw new ApiError(403, 'NOT_ENROLLED', 'This matriculation number is not enrolled for the session.');
      }
      identityVerified = true;
    }

    // Record uniqueness is checked BEFORE device locking so that the same
    // student gets the explicit "already registered" message on refresh.
    const recordRef = sessionRef.collection('records').doc(value.matricule);
    const recordSnap = await tx.get(recordRef);
    if (recordSnap.exists) {
      throw new ApiError(
        409,
        'ALREADY_REGISTERED',
        'YOU ARE ALREADY REGISTERED! Your attendance for this session has already been successfully recorded.'
      );
    }

    const deviceRef = sessionRef.collection('deviceLocks').doc(deviceHash);
    const deviceSnap = await tx.get(deviceRef);
    if (deviceSnap.exists) {
      throw new ApiError(
        409,
        'DEVICE_ALREADY_USED',
        'ACCESS DENIED! This device has already been used to register attendance for another student in this session. Each device can only register one student per attendance session.'
      );
    }

    const counterRef = sessionRef.collection('meta').doc('counter');
    const counterSnap = await tx.get(counterRef);
    const rank = (counterSnap.exists ? Number(counterSnap.data().count) || 0 : 0) + 1;

    const record = {
      no: rank,
      mat: value.matricule,
      fN: value.firstName,
      lN: value.lastName,
      cls: value.className || session.cls || null,
      dept: value.department || session.dept || null,
      phone: value.phone || null,
      createdAt: now,
      createdAtISO: new Date(now).toISOString(),
      status: location.status === 'eligible' && identityVerified ? 'present' : 'review',
      locationStatus: location.status,
      locationReason: location.reason,
      distanceM: Math.round(location.distanceM * 100) / 100,
      accuracyM: value.accuracyM,
      effectiveRadiusM: location.effectiveRadiusM,
      studentLat: value.studentLat,
      studentLng: value.studentLng,
      deviceHash,
      fingerprint: value.fingerprint || null,
      ip,
      userAgentHash,
      qrTokenHash: value.qrToken ? hashToken(value.qrToken) : null,
      identityVerified,
      sessionTokenHash: tokenHash,
      source: 'server-verified'
    };

    tx.set(recordRef, record);
    tx.set(deviceRef, {
      deviceHash,
      matricule: value.matricule,
      createdAt: now,
      sessionId,
      fingerprint: value.fingerprint || null,
      ip
    });
    tx.set(counterRef, { count: rank, updatedAt: now }, { merge: true });
    tx.set(db.collection('audit_logs').doc(), {
      action: 'ATTENDANCE_RECORDED',
      sessionId,
      matricule: value.matricule,
      deviceHash,
      status: record.status,
      locationStatus: location.status,
      distanceM: record.distanceM,
      createdAt: now,
      ip
    });
    if (location.status === 'review' || !identityVerified) {
      tx.set(sessionRef.collection('flags').doc(), {
        type: location.status === 'review' ? location.reason : 'IDENTITY_NOT_VERIFIED',
        matricule: value.matricule,
        recordId: value.matricule,
        createdAt: now,
        resolved: false
      });
    }

    return {
      rank,
      status: record.status,
      locationStatus: location.status,
      distanceM: record.distanceM,
      identityVerified
    };
  });
}

module.exports = { processAttendance };
