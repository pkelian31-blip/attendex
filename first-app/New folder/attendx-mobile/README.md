# AttendX PRO — Mobile App

> Next.js 16 + Capacitor 8 + Firebase Firestore  
> Works as PWA (Android + iOS) and native app via Capacitor  
> **KЭL ♛ PHANTOM** — VALIDE EdTech

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase project credentials
```

### 3. Run in browser (development)
```bash
npm run dev
# Open http://localhost:3000
```

---

## 📱 Build for Android / iOS

### Prerequisites
- Android Studio (for Android APK)
- Xcode (for iOS — Mac only)
- JDK 17+ for Android

### First time setup
```bash
# Initialize native projects (run once)
npx cap add android
npx cap add ios
```

### Build and open in Android Studio
```bash
npm run cap:android
# Android Studio opens → Run on device or emulator
```

### Build and open in Xcode (Mac only)
```bash
npm run cap:ios
# Xcode opens → Sign with your Apple Developer account → Run
```

### Quick rebuild (after code changes)
```bash
npm run cap:build   # builds Next.js + syncs Capacitor
```

---

## 🌐 PWA (Progressive Web App)

The app works as a PWA on both Android and iOS without app store:

1. Deploy to Vercel: `vercel --prod`
2. On Android: Chrome → "Add to Home Screen"
3. On iPhone: Safari → Share → "Add to Home Screen"

---

## 📁 Project Structure

```
attendx-mobile/
├── app/
│   ├── page.tsx              # Home / Login / Public Chat
│   ├── dashboard/page.tsx    # Admin dashboard + session mgmt
│   ├── qr/page.tsx           # QR generator (offline capable)
│   ├── scanner/page.tsx      # QR scanner (camera)
│   ├── super/page.tsx        # Super Admin panel
│   ├── student/[sid]/page.tsx # Student attendance form
│   ├── layout.tsx            # Root layout + PWA meta
│   └── globals.css           # AttendX PRO design tokens
├── components/
│   ├── Toast.tsx             # Global toast notifications
│   └── BottomNav.tsx         # Mobile bottom navigation
├── lib/
│   ├── firebase.ts           # Firestore client (same DB as web app)
│   ├── capacitor.ts          # Native plugin helpers + web fallbacks
│   └── utils.ts              # Haversine, ranking, formatters
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icons/                # App icons (add icon-192.png + icon-512.png)
├── capacitor.config.ts       # Native app config
└── next.config.ts            # Static export mode for Capacitor
```

---

## 🔑 Firestore Collections Used

Same as the web app — no migration needed:

| Collection | Usage |
|---|---|
| `sessions` | Attendance sessions |
| `sessions/{id}/records` | Student attendance records |
| `sessions/{id}/devices` | Duplicate prevention |
| `admins` | Admin accounts |
| `chat_public` | Live public chat |
| `visitor_replies/{vid}/messages` | Private DMs |
| `student_registry` | Matricule autofill database |

---

## 🎨 Adding Your Logo

1. Export your logo as PNG: `192×192px` and `512×512px`
2. Place them in `public/icons/icon-192.png` and `public/icons/icon-512.png`
3. For the Android splash screen: place `splash.png` (2732×2732px) in `android/app/src/main/res/drawable/`

---

## 📦 Deploy Commands

```bash
# Deploy PWA to Vercel
vercel --prod

# Build Android APK (release)
cd android && ./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk

# Build iOS (via Xcode)
npm run cap:ios   # then Archive in Xcode
```

---

*AttendX PRO Mobile · VALIDE EdTech · KЭL ♛ PHANTOM*
