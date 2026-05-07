# AttendX PRO — Full Deployment Guide
## GitHub → Firebase → Vercel + Real Push Notifications
**KЭL ♛ PHANTOM — VALIDE EdTech**

---

## 📁 Your Repo Structure (exactly this)

```
attendx/
├── index.html                  ← your main app
├── firebase-messaging-sw.js    ← FCM service worker (MUST be at root)
├── manifest.json               ← PWA manifest
├── vercel.json                 ← Vercel config
├── package.json                ← Node deps for API
├── api/
│   └── send-notification.js   ← Vercel serverless push function
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-192.png
    ├── icon-512.png
    └── badge-72.png
```

> **Icons:** Create simple square PNG icons at these sizes using Canva or any tool.
> Use the AttendX logo on a dark background (#060a14).

---

## STEP 1 — GitHub

```bash
# On your machine
git init
git add .
git commit -m "AttendX PRO v1 — push notifications integrated"

# Create repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/attendx.git
git branch -M main
git push -u origin main
```

---

## STEP 2 — Firebase: Enable FCM + Get VAPID Key

1. Go to **https://console.firebase.google.com**
2. Select your project **attendex-47d45**
3. **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Under **Web configuration**, click **Generate key pair**
5. Copy the **Key pair** value — this is your `FCM_VAPID_KEY`

6. In `index.html`, find this line and replace:
   ```js
   const FCM_VAPID_KEY = 'YOUR_FCM_WEB_PUSH_VAPID_KEY_HERE';
   ```
   Replace with your actual key:
   ```js
   const FCM_VAPID_KEY = 'BHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
   ```

---

## STEP 3 — Firebase: Get Service Account for Vercel

1. **Project Settings** → **Service Accounts** tab
2. Click **Generate new private key** → Download JSON
3. Open the JSON file — copy **all the text** inside it
4. You'll paste this into Vercel in Step 5

---

## STEP 4 — Firebase: Add Firestore Rules

In **Firestore** → **Rules**, add:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Existing rules stay as-is
    match /admins/{doc} { ... }
    match /sessions/{doc} { ... }
    match /attendance/{doc} { ... }
    match /notifications/{doc} { ... }

    // NEW: push tokens collection
    match /push_tokens/{userId} {
      allow read, write: if true; // tighten this in production
    }
  }
}
```

---

## STEP 5 — Vercel: Deploy

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **Add New Project** → import your `attendx` repo
3. Leave all settings default — Vercel auto-detects `vercel.json`
4. Click **Environment Variables** → Add:

   | Name | Value |
   |------|-------|
   | `FIREBASE_SERVICE_ACCOUNT` | Paste the entire JSON from Step 3 (as one line) |

5. Click **Deploy**
6. Copy your Vercel URL e.g. `https://attendx-pro.vercel.app`

7. In `index.html`, find and update:
   ```js
   const PUSH_API_ENDPOINT = 'https://YOUR-PROJECT.vercel.app/api/send-notification';
   ```
   Replace with:
   ```js
   const PUSH_API_ENDPOINT = 'https://attendx-pro.vercel.app/api/send-notification';
   ```

8. Commit and push again:
   ```bash
   git add index.html
   git commit -m "Set FCM VAPID key and Vercel endpoint"
   git push
   ```
   Vercel auto-redeploys on every push.

---

## STEP 6 — Firebase Hosting (Optional, alternative to Vercel for the frontend)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting

# Choose: attendex-47d45
# Public directory: . (dot, root)
# Single page app: No
# Overwrite index.html: No

firebase deploy --only hosting
```

Your app will be live at: `https://attendex-47d45.web.app`

> Use **Vercel** for the backend API and **Firebase Hosting** for the frontend.
> Or just use Vercel for everything — it handles both static files and API.

---

## How Push Notifications Work End-to-End

```
User logs in to AttendX
  ↓
Permission prompt appears (smart — 2 second delay, not on page load)
  ↓
User clicks "Enable Notifications"
  ↓
FCM generates a unique token for that browser/device
  ↓
Token saved to Firestore: push_tokens/{userId}
  ↓
Super Admin sends notification (or admin sends to super)
  ↓
index.html calls → POST https://your-vercel.app/api/send-notification
  ↓
Vercel reads tokens from Firestore → sends via Firebase Admin SDK
  ↓
FCM delivers to device — even if browser is closed
  ↓
firebase-messaging-sw.js handles background display
  ↓
Notification appears with sound + vibration on Android/Chrome
```

---

## Notification Types & Behavior

| Type | Vibration | Requires Tap | Auto-dismiss |
|------|-----------|--------------|--------------|
| 🚨 Emergency | Long burst × 3 | ✅ Yes | ❌ No |
| ✅ Attendance | Double pulse | ✅ Yes | ❌ No |
| 📚 Session | Short pulse | ❌ No | ✅ 30s |
| 📢 Announcement | Soft pulse | ❌ No | ✅ 10s |
| 💬 Message | Double pulse | ❌ No | ✅ 10s |

---

## Platforms That Receive Push Notifications

| Platform | Works? | Notes |
|----------|--------|-------|
| Android Chrome | ✅ | Full support — background delivery |
| Desktop Chrome | ✅ | Full support |
| Desktop Firefox | ✅ | Full support |
| Desktop Edge | ✅ | Full support |
| macOS Safari 16+ | ✅ | Requires HTTPS |
| iOS Safari 16.4+ | ✅ PWA only | User must install app to home screen |
| Samsung Internet | ✅ | Full support |

---

## Troubleshooting

**"Firebase Messaging not available"**
→ Make sure you're on HTTPS (Vercel/Firebase Hosting). Push doesn't work on `http://localhost`.

**Push tokens not saving**
→ Check Firestore rules allow writes to `push_tokens` collection.

**Notifications not arriving when app is closed**
→ Make sure `firebase-messaging-sw.js` is deployed at the root URL, not in a subfolder.

**iOS not receiving notifications**
→ User must add the site to home screen (PWA install). Then it works on iOS 16.4+.

---

*Built with Firebase Cloud Messaging, Web Push API, and Vercel Serverless Functions.*
*No third-party notification service needed — 100% Firebase + Vercel.*
