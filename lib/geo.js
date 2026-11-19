'use strict';

const EARTH_RADIUS_M = 6371000;
const DEFAULT_MAX_ACCURACY_M = 50;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isLat(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isLng(value) {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

/**
 * Great-circle distance between two WGS84 coordinates, in METRES.
 */
function haversineMetres(lat1, lng1, lat2, lng2) {
  if (!isLat(lat1) || !isLng(lng1) || !isLat(lat2) || !isLng(lng2)) {
    throw new TypeError('Invalid latitude/longitude');
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Server-side attendance location decision.
 *
 * GPS uncertainty is handled explicitly instead of silently failing students:
 *  - eligible: the whole accuracy circle is inside the radius
 *  - rejected: the whole accuracy circle is outside the radius
 *  - review:   circles overlap, or accuracy is too poor -> lecturer decides
 */
function evaluateLocation(input) {
  const {
    classLat,
    classLng,
    studentLat,
    studentLng,
    accuracyM,
    radiusM,
    maxAccuracyM = DEFAULT_MAX_ACCURACY_M,
    bufferM = 0
  } = input || {};

  if (!isLat(classLat) || !isLng(classLng) || !isLat(studentLat) || !isLng(studentLng)) {
    return { status: 'invalid', reason: 'INVALID_COORDINATES', distanceM: null };
  }
  if (!isFiniteNumber(radiusM) || radiusM <= 0) {
    return { status: 'invalid', reason: 'INVALID_RADIUS', distanceM: null };
  }
  if (!isFiniteNumber(accuracyM) || accuracyM < 0) {
    return { status: 'invalid', reason: 'INVALID_ACCURACY', distanceM: null };
  }
  if (!isFiniteNumber(maxAccuracyM) || maxAccuracyM < 0) {
    return { status: 'invalid', reason: 'INVALID_MAX_ACCURACY', distanceM: null };
  }
  if (!isFiniteNumber(bufferM) || bufferM < 0) {
    return { status: 'invalid', reason: 'INVALID_BUFFER', distanceM: null };
  }

  const distanceM = haversineMetres(classLat, classLng, studentLat, studentLng);
  const effectiveRadiusM = radiusM + bufferM;
  const nearestM = Math.max(0, distanceM - accuracyM);
  const farthestM = distanceM + accuracyM;

  if (accuracyM > maxAccuracyM) {
    return {
      status: 'review',
      reason: 'POOR_ACCURACY',
      distanceM,
      accuracyM,
      effectiveRadiusM,
      nearestM,
      farthestM
    };
  }
  if (farthestM <= effectiveRadiusM) {
    return {
      status: 'eligible',
      reason: 'WITHIN_RADIUS',
      distanceM,
      accuracyM,
      effectiveRadiusM,
      nearestM,
      farthestM
    };
  }
  if (nearestM > effectiveRadiusM) {
    return {
      status: 'rejected',
      reason: 'OUTSIDE_RADIUS',
      distanceM,
      accuracyM,
      effectiveRadiusM,
      nearestM,
      farthestM
    };
  }
  return {
    status: 'review',
    reason: 'LOCATION_UNCERTAIN',
    distanceM,
    accuracyM,
    effectiveRadiusM,
    nearestM,
    farthestM
  };
}

module.exports = {
  EARTH_RADIUS_M,
  haversineMetres,
  evaluateLocation,
  isLat,
  isLng
};
