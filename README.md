# AttendX PRO — Smart Attendance Platform

University attendance management system being upgraded for multi-university use.

## Structure

- `index.html` — current browser application (being migrated to call server-verified APIs).
- `api/attendance/` — server-side attendance endpoints (Vercel serverless functions, Firebase Admin SDK).
  - `device.js` — issues a server-controlled `ax_device` cookie.
  - `create-session.js` — creates a session with a cryptographically random link token, registered classroom coordinates, roster, radius and expiry. Requires a Firebase ID token.
  - `submit.js` — server-side attendance transaction: token check, expiry/status check, Haversine distance with GPS accuracy, device lock, one-record-per-student, audit log and fraud flags.
  - `close-session.js` — close or cancel a session and invalidate its link.
- `lib/` — pure, unit-tested logic shared by endpoints.
  - `geo.js` — Haversine distance in metres and location decision policy.
  - `tokens.js` — CSPRNG token generation and constant-time comparison.
  - `attendance-validation.js` — request validation and tenant/session helpers.
- `tests/` — Node built-in tests (`node --test`).
- `firestore.rules` — Phase 2 deny-by-default rules. **Not yet deployed.**

## Local development

```bash
npm test
node preview-server.js   # optional local static preview on http://localhost:3001
```

## Environment variables required by the APIs

- `FIREBASE_SERVICE_ACCOUNT` — JSON string of a Firebase service account with Firestore Admin and Firebase Auth permissions.
- `ALLOWED_ORIGINS` — comma-separated list of permitted browser origins.

## Migration status

See `IMPLEMENTATION_STATUS.md` for the honest per-feature status. Phase 1 (secure attendance core) is in progress.
