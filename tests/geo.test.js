'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineMetres, evaluateLocation } = require('../lib/geo');

const METRES_PER_DEGREE_LAT = (Math.PI / 180) * 6371000;

test('haversine returns correct metres for known latitude offsets', () => {
  for (const expected of [10, 20, 30, 50, 100, 200]) {
    const delta = expected / METRES_PER_DEGREE_LAT;
    const actual = haversineMetres(0, 0, delta, 0);
    assert.ok(
      Math.abs(actual - expected) < 0.01,
      `expected ~${expected}m, got ${actual}m`
    );
  }
});

test('haversine is symmetric and zero for identical points', () => {
  assert.equal(haversineMetres(4.5, 7.2, 4.5, 7.2), 0);
  const a = haversineMetres(4.5, 7.2, 4.51, 7.21);
  const b = haversineMetres(4.51, 7.21, 4.5, 7.2);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test('radius decision: eligible when accuracy circle fits inside radius', () => {
  const delta = 12 / METRES_PER_DEGREE_LAT;
  const result = evaluateLocation({
    classLat: 0,
    classLng: 0,
    studentLat: delta,
    studentLng: 0,
    accuracyM: 5,
    radiusM: 20
  });
  assert.equal(result.status, 'eligible');
  assert.equal(result.reason, 'WITHIN_RADIUS');
  assert.ok(Math.abs(result.distanceM - 12) < 0.01);
});

test('radius decision: rejected when accuracy circle is fully outside radius', () => {
  const delta = 120 / METRES_PER_DEGREE_LAT;
  const result = evaluateLocation({
    classLat: 0,
    classLng: 0,
    studentLat: delta,
    studentLng: 0,
    accuracyM: 10,
    radiusM: 50
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, 'OUTSIDE_RADIUS');
});

test('radius decision: uncertain overlap goes to lecturer review, not absent', () => {
  const delta = 45 / METRES_PER_DEGREE_LAT;
  const result = evaluateLocation({
    classLat: 0,
    classLng: 0,
    studentLat: delta,
    studentLng: 0,
    accuracyM: 10,
    radiusM: 50
  });
  assert.equal(result.status, 'review');
  assert.equal(result.reason, 'LOCATION_UNCERTAIN');
});

test('radius decision: poor accuracy goes to review', () => {
  const result = evaluateLocation({
    classLat: 0,
    classLng: 0,
    studentLat: 0.0001,
    studentLng: 0,
    accuracyM: 80,
    radiusM: 50
  });
  assert.equal(result.status, 'review');
  assert.equal(result.reason, 'POOR_ACCURACY');
});

test('radius decision: invalid inputs are rejected', () => {
  assert.equal(
    evaluateLocation({ classLat: 999, classLng: 0, studentLat: 0, studentLng: 0, accuracyM: 5, radiusM: 50 }).reason,
    'INVALID_COORDINATES'
  );
  assert.equal(
    evaluateLocation({ classLat: 0, classLng: 0, studentLat: 0, studentLng: 0, accuracyM: -1, radiusM: 50 }).reason,
    'INVALID_ACCURACY'
  );
  assert.equal(
    evaluateLocation({ classLat: 0, classLng: 0, studentLat: 0, studentLng: 0, accuracyM: 5, radiusM: 0 }).reason,
    'INVALID_RADIUS'
  );
});

test('all configured radius examples enforce metres consistently', () => {
  for (const radius of [10, 20, 30, 50, 100, 200]) {
    const inside = evaluateLocation({
      classLat: 0,
      classLng: 0,
      studentLat: (radius - 5) / METRES_PER_DEGREE_LAT,
      studentLng: 0,
      accuracyM: 2,
      radiusM: radius
    });
    const outside = evaluateLocation({
      classLat: 0,
      classLng: 0,
      studentLat: (radius + 25) / METRES_PER_DEGREE_LAT,
      studentLng: 0,
      accuracyM: 2,
      radiusM: radius
    });
    assert.equal(inside.status, 'eligible', `radius ${radius} should accept inside`);
    assert.equal(outside.status, 'rejected', `radius ${radius} should reject outside`);
  }
});
