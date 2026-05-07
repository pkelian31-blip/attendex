/**
 * AttendX — Vercel Serverless Push Notification API
 * File: /api/send-notification.js
 *
 * This runs on Vercel. It reads FCM tokens from Firestore
 * and sends push notifications via Firebase Admin SDK.
 *
 * SETUP:
 *   1. npm install firebase-admin
 *   2. Add these to Vercel Environment Variables:
 *      FIREBASE_SERVICE_ACCOUNT  ← paste the full JSON from Firebase Console
 *                                    (Project Settings → Service Accounts → Generate new private key)
 *
 * KЭL ♛ PHANTOM — VALIDE EdTech
 */

const admin = require('firebase-admin');

// ── Initialize Firebase Admin (once) ─────────────────────────────────────────
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('[AttendX API] Firebase Admin init error:', e.message);
  }
}

const db = admin.firestore();

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetType, targetId, title, body, type, url } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body required' });
  }

  try {
    // ── Fetch FCM tokens from Firestore ─────────────────────────────────────
    let tokens = [];

    if (targetType === 'user' && targetId) {
      // Single user by userId (e.g. '__super__' or 'admin_username')
      const doc = await db.collection('push_tokens').doc(targetId).get();
      if (doc.exists && doc.data().token) {
        tokens.push({ userId: targetId, token: doc.data().token });
      }
    } else if (targetType === 'role' && targetId) {
      // All users with a specific role
      const snap = await db.collection('push_tokens').where('role', '==', targetId).get();
      snap.docs.forEach(d => {
        if (d.data().token) tokens.push({ userId: d.id, token: d.data().token });
      });
    } else {
      // All users
      const snap = await db.collection('push_tokens').get();
      snap.docs.forEach(d => {
        if (d.data().token) tokens.push({ userId: d.id, token: d.data().token });
      });
    }

    if (tokens.length === 0) {
      return res.json({ success: true, sent: 0, message: 'No tokens found for target' });
    }

    // ── Build FCM message ───────────────────────────────────────────────────
    const notification = { title, body };
    const data = {
      title, body,
      type: type || 'general',
      url: url || '/',
      to: targetId || 'all',
      ts: String(Date.now())
    };

    // Android-specific config
    const android = {
      notification: {
        icon: 'ic_notification',
        color: '#1a5cff',
        sound: 'default',
        channelId: type === 'emergency' ? 'attendx_emergency' : 'attendx_default',
        priority: type === 'emergency' ? 'max' : 'high',
        vibrateTimingsMillis: type === 'emergency'
          ? [0, 500, 200, 500, 200, 500]
          : [0, 200, 100, 200],
        defaultVibrateTimings: false
      },
      priority: 'high'
    };

    // Web Push config
    const webpush = {
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        requireInteraction: type === 'emergency' || type === 'attendance',
        vibrate: type === 'emergency' ? [500, 200, 500, 200, 500] : [200, 100, 200]
      },
      fcmOptions: { link: url || '/' }
    };

    // ── Send to all tokens ───────────────────────────────────────────────────
    const results = await Promise.allSettled(
      tokens.map(async ({ userId, token }) => {
        try {
          await admin.messaging().send({
            token,
            notification,
            data,
            android,
            webpush
          });
          return { userId, status: 'sent' };
        } catch (err) {
          // Remove stale tokens (registration-token-not-registered)
          if (
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token'
          ) {
            await db.collection('push_tokens').doc(userId).delete().catch(() => {});
            console.log(`[AttendX API] Removed stale token for: ${userId}`);
          }
          return { userId, status: 'failed', error: err.code };
        }
      })
    );

    const sent   = results.filter(r => r.value?.status === 'sent').length;
    const failed = results.filter(r => r.value?.status === 'failed').length;

    console.log(`[AttendX API] Push sent: ${sent} ok, ${failed} failed`);
    return res.json({ success: true, sent, failed, total: tokens.length });

  } catch (err) {
    console.error('[AttendX API] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
