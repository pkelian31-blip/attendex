# AttendX PRO — Implementation Status

Date: 2026-11-21. This file is intentionally honest: no feature is marked tested unless a test was actually executed.

## Latest change — school-based accounts + name-only login (browser-verified)
- Registration now asks for **full name, WhatsApp number, school/university, and series/faculty**.
- A directory of 12 Cameroon universities is built in (`AX_SCHOOLS`). Choosing a school populates the series list — the school determines the available series.
- The chosen school is saved on the admin account and written to `localStorage.ax_school` at registration and at every login. It is the **default school name in all PDF filenames and PDF footers**; verified example: `2026-11-21_University-of-Yaound-I_Level-2_Anatomy_Attendance.pdf`.
- The admin's series is saved on the account and offered as suggestions in the session "Class / Level" field.
- **Admin login no longer asks for a PIN or code.** The user enters their name only. A "Remember my name on this device" checkbox pre-fills the name next time; the remembered value no longer expires. (Security trade-off requested explicitly: anyone who knows an admin's name can log in as them. Super admin still uses its password.)
- Admin onboarding guide updated for the new flow (school → series → create → name-only login).
- Verified in a real browser: 13 school options, school-specific series lists, name-only login field present, old username/PIN field gone, datalist present, zero page-level console errors (one pre-existing Firestore permission-denied listener remains).

## Verification performed

`npm test` → **24 tests passed** (`node --test`).

Executed tests cover:
- Haversine distance at 10 m, 20 m, 30 m, 50 m, 100 m, 200 m, metre units, symmetry and zero.
- Radius decisions: eligible, rejected, uncertain-review, poor-accuracy-review, invalid inputs.
- Secure token generation, hashing and constant-time comparison.
- Server-controlled device cookie parsing and request validation.
- Device security TEST 1–6 from the project brief (same student repeat, second student on same device, second device, cleared browser storage, reuse in a different session).
- Session expiry, session closed, outside-radius rejection, review path, roster enforcement, missing geofence fail-closed.

## Feature status

### Fully implemented and tested
- Server-side Haversine distance calculation in metres (`lib/geo.js`).
- GPS accuracy-aware attendance decision policy: eligible / rejected / review (`lib/geo.js`).
- Cryptographically random session, QR and device tokens (`lib/tokens.js`).
- Server-side attendance transaction (`lib/attendance-engine.js`) enforcing:
  - one student → one record per session,
  - one device → one student per session,
  - session-specific device locks,
  - server-time expiry and close/revoke status,
  - classroom coordinates and radius from the session, never from the student,
  - explicit enrolled-roster check when a roster exists,
  - audit log entry and fraud flag for review cases.
- Device-security scenarios 1–6 from the brief, executed against an in-memory Firestore-compatible store.

### Implemented but not fully tested
- `api/attendance/submit.js` — server endpoint. Logic is tested via the shared engine; the real Firebase Admin integration and cookie flow still need an integration test against a Firebase project.
- `api/attendance/create-session.js` — session creation with random token, registered classroom coordinates, radius allow-list, roster requirement and audit log. Requires a Firebase ID token and real Firestore; not integration-tested here.
- `api/attendance/close-session.js` — close/cancel with tenant check. Not integration-tested.
- `api/attendance/device.js` — issues server-controlled `ax_device` cookie. Not integration-tested.
- `firestore.rules` — written but intentionally **not deployed**; deploying now would break the current client.

### Partially implemented
- Legacy client UI (`index.html`) still writes attendance directly to Firestore. The new server-verified path exists but is not yet wired into the student form because that requires Firebase Auth / tenant migration first.
- Existing PDF session/day exports were verified to exist in code but were not executed in this phase.
- Existing chat, notifications and visitor analytics were verified to exist in code but were not executed in this phase.

### Not implemented yet
- Firebase Authentication with custom claims, hashed credentials, and removal of the hardcoded super password.
- University / faculty / department / level / course / classroom / timetable hierarchy.
- Tenant isolation enforced by rules and server queries.
- Lecturer, university-admin and student dashboards specified in the brief.
- Excel export and weekly/monthly/semester/course/department/student reports.
- WebAuthn/passkey device binding.
- Data migration from existing Firestore collections.
- Real-device GPS validation and multi-user load testing.

## Simple guide system (just added, browser-verified)
- Main Admin: a "📖 Help & Guides" button in the Super Panel opens a 5-step guide to help someone create an account (name → WhatsApp number → Create Account → write down username + PIN 1234 → check Admins list). Its action button opens the real registration form; verified end-to-end.
- Student: a "❓ Need help? How to mark present" button on the attendance page opens a 6-step mobile-friendly guide (open link → allow location → fill details → submit → confirmation → what to do if it fails).
- Both guides include copy-to-clipboard instructions for sharing, and warn that one phone registers only one student per session.

## Additional changes just applied and browser-verified
- Lecturer-controlled attendance distance: quick-pick chips (10/20/30/50/100/200 m) plus numeric input, with radius limited to 10–200 m.
- Fail-closed session creation: a session can no longer be created without the lecturer's captured classroom GPS and a valid radius. Verified in a real browser — invalid radius and missing location both produce clear blocking messages.
- PDF filenames now contain date, school, class and subject, e.g. `2026-11-19_ENSTP_Level-1-BTP_Mathematics_Attendance.pdf`. Verified in a real browser, including sanitisation of accented and punctuation-heavy names.
- Lightweight 3D visual layer: CSS perspective/depth, drifting ambient gradients, tilting feature cards with pop-out icons, 3D-lift buttons, plus pointer-driven tilt on desktop. Touch devices and `prefers-reduced-motion` fall back to flat layouts. Verified via computed styles and DOM in a real browser with zero page-level console errors from the changes.

## Safe fixes already applied to the live-source branch
- Disabled unauthenticated self-service PIN recovery (`recoverPin`), which allowed full account takeover.
- Removed the universal `DELETE2025` admin-deletion override PIN.
- Repaired the three broken super-admin PDF buttons to call the real existing PDF functions.
- Removed unresolved merge-conflict markers from `README.md`.

## Deployment note
Pushing to `main` deploys to the existing production URL `https://attendex-pro.vercel.app/`. The new API endpoints are additive and do not change the current browser flow, so this phase can be deployed without breaking existing users. Breaking client changes will be made only after Phase 2 identity/tenant migration and further tests.
