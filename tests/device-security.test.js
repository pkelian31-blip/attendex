'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { processAttendance } = require('../lib/attendance-engine');
const { hashToken } = require('../lib/tokens');

const METRES_PER_DEGREE_LAT = (Math.PI / 180) * 6371000;
const NOW = 1_800_000_000_000;

class MockStore {
  constructor() {
    this.docs = new Map();
    this.auto = 0;
  }
  get(path) {
    return this.docs.get(path);
  }
  set(path, data, merge) {
    if (merge && this.docs.has(path)) this.docs.set(path, { ...this.docs.get(path), ...data });
    else this.docs.set(path, { ...data });
  }
}

class MockDoc {
  constructor(store, parent, id) {
    this.store = store;
    this.path = id ? `${parent}/${id}` : `${parent}/auto_${++store.auto}`;
  }
  async get() {
    const data = this.store.get(this.path);
    return { exists: data !== undefined, data: () => data };
  }
  collection(name) {
    return new MockCollection(this.store, `${this.path}/${name}`);
  }
  async set(data, options) {
    this.store.set(this.path, data, Boolean(options && options.merge));
  }
  async update(data) {
    this.store.set(this.path, data, true);
  }
}

class MockCollection {
  constructor(store, path) {
    this.store = store;
    this.path = path;
  }
  doc(id) {
    return new MockDoc(this.store, this.path, id);
  }
  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
  async where(field, _op, value) {
    const depth = this.path.split('/').length + 1;
    const docs = [];
    for (const [path, data] of this.store.docs) {
      const parts = path.split('/');
      if (parts.length === depth && parts.slice(0, depth - 1).join('/') === this.path && data[field] === value) {
        docs.push({ id: parts[parts.length - 1], data: () => data });
      }
    }
    return { empty: docs.length === 0, docs };
  }
}

class MockDb {
  constructor() {
    this.store = new MockStore();
  }
  collection(name) {
    return new MockCollection(this.store, name);
  }
  get(ref) {
    return ref.get();
  }
  set(ref, data, options) {
    return ref.set(data, options);
  }
  async runTransaction(fn) {
    return fn(this);
  }
}

async function createSession(db, id, token, overrides = {}) {
  await db.collection('sessions').doc(id).set({
    status: 'open',
    tenantId: 'university-1',
    startAt: NOW - 60_000,
    expiryAt: NOW + 600_000,
    classLat: 0,
    classLng: 0,
    radiusM: 50,
    maxAccuracyM: 50,
    tokenHash: hashToken(token),
    allowedMatricules: ['A1', 'B1'],
    ...overrides
  });
}

function value(matricule, distanceM = 5, accuracyM = 5, token = 'token'.repeat(8)) {
  return {
    token,
    matricule,
    firstName: 'Test',
    lastName: 'Student',
    studentLat: distanceM / METRES_PER_DEGREE_LAT,
    studentLng: 0,
    accuracyM,
    className: 'Mathematics',
    department: 'Civil Engineering',
    phone: '',
    fingerprint: 'fp-' + matricule,
    qrToken: ''
  };
}

function submit(db, sessionId, student, phone, overrides = {}) {
  return processAttendance({
    db,
    sessionId,
    value: student,
    deviceHash: hashToken(phone),
    tokenHash: hashToken(student.token),
    now: NOW,
    ip: '10.0.0.1',
    userAgentHash: hashToken('ua'),
    ...overrides
  });
}

async function expectError(promise, code) {
  try {
    await promise;
    assert.fail(`expected error ${code}`);
  } catch (error) {
    assert.equal(error.code, code, `expected ${code}, got ${error.code}: ${error.message}`);
  }
}

test('TEST 1 + 2: first registration succeeds, repeat by same student is blocked', async () => {
  const db = new MockDb();
  const token = 'token'.repeat(8);
  await createSession(db, 's1', token);
  const student = value('A1', 5, 5, token);

  const first = await submit(db, 's1', student, 'PHONE_1');
  assert.equal(first.status, 'present');
  assert.equal(first.rank, 1);
  await expectError(submit(db, 's1', student, 'PHONE_1'), 'ALREADY_REGISTERED');
});

test('TEST 3 + 4: one device cannot register a second student; a second device can', async () => {
  const db = new MockDb();
  const token = 'token'.repeat(8);
  await createSession(db, 's1', token);

  await submit(db, 's1', value('A1', 5, 5, token), 'PHONE_1');
  await expectError(submit(db, 's1', value('B1', 5, 5, token), 'PHONE_1'), 'DEVICE_ALREADY_USED');
  const second = await submit(db, 's1', value('B1', 5, 5, token), 'PHONE_2');
  assert.equal(second.rank, 2);
});

test('TEST 5: clearing browser storage does not bypass the server device/record lock', async () => {
  const db = new MockDb();
  const token = 'token'.repeat(8);
  await createSession(db, 's1', token);
  await submit(db, 's1', value('A1', 5, 5, token), 'PHONE_1');
  // Same server-controlled device hash is reused even if localStorage is cleared.
  await expectError(submit(db, 's1', value('A1', 5, 5, token), 'PHONE_1'), 'ALREADY_REGISTERED');
  await expectError(submit(db, 's1', value('B1', 5, 5, token), 'PHONE_1'), 'DEVICE_ALREADY_USED');
});

test('TEST 6: the same device is allowed for a different session', async () => {
  const db = new MockDb();
  await createSession(db, 's1', 'token'.repeat(8));
  await createSession(db, 's2', 'other'.repeat(8));
  await submit(db, 's1', value('A1', 5, 5, 'token'.repeat(8)), 'PHONE_1');
  const result = await submit(db, 's2', value('A1', 5, 5, 'other'.repeat(8)), 'PHONE_1');
  assert.equal(result.status, 'present');
});

test('expired sessions and closed sessions reject new registrations', async () => {
  const db = new MockDb();
  const token = 'token'.repeat(8);
  await createSession(db, 'expired', token, { expiryAt: NOW - 1 });
  await expectError(submit(db, 'expired', value('A1', 5, 5, token), 'P1'), 'SESSION_EXPIRED');

  await createSession(db, 'closed', token, { status: 'closed' });
  await expectError(submit(db, 'closed', value('A1', 5, 5, token), 'P2'), 'SESSION_CLOSED');
});

test('outside-radius submissions are rejected; uncertain ones go to review', async () => {
  const db = new MockDb();
  const token = 'token'.repeat(8);
  await createSession(db, 's1', token);
  await expectError(submit(db, 's1', value('A1', 120, 5, token), 'P1'), 'LOCATION_REJECTED');
  const review = await submit(db, 's1', value('A1', 45, 10, token), 'P2');
  assert.equal(review.status, 'review');
  assert.equal(review.locationStatus, 'review');
});

test('roster membership and geofence configuration are enforced', async () => {
  const db = new MockDb();
  const token = 'token'.repeat(8);
  await createSession(db, 's1', token);
  await expectError(submit(db, 's1', value('Z9', 5, 5, token), 'P1'), 'NOT_ENROLLED');

  await createSession(db, 'no-geo', token, { classLat: null, classLng: null, radiusM: null });
  await expectError(submit(db, 'no-geo', value('A1', 5, 5, token), 'P2'), 'GEOFENCE_NOT_CONFIGURED');
});
