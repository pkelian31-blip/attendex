const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}'))
    });
  } catch (e) {
    console.error('Firebase Admin init error:', e.message);
  }
}

const db = getFirestore();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { targetType, targetId, title, body, type, url } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    let tokens = [];

    if (targetType === 'user' && targetId) {
      const doc = await db.collection('push_tokens').doc(targetId).get();
      if (doc.exists && doc.data().token) {
        tokens.push({ userId: targetId, token: doc.data().token });
      }
    } else if (targetType === 'role' && targetId) {
      const snap = await db.collection('push_tokens').where('role', '==', targetId).get();
      snap.docs.forEach(d => {
        if (d.data().token) tokens.push({ userId: d.id, token: d.data().token });
      });
    } else {
      const snap = await db.collection('push_tokens').get();
      snap.docs.forEach(d => {
        if (d.data().token) tokens.push({ userId: d.id, token: d.data().token });
      });
    }

    if (!tokens.length) return res.json({ success: true, sent: 0, message: 'No tokens found' });

    const messaging = getMessaging();
    const results = await Promise.allSettled(
      tokens.map(async ({ userId, token }) => {
        try {
          await messaging.send({
            token,
            notification: { title, body },
            data: { title, body, type: type || 'general', url: url || '/', ts: String(Date.now()) },
            webpush: {
              notification: {
                icon: '/icons/icon-192.png',
                badge: '/icons/badge-72.png',
                requireInteraction: type === 'emergency' || type === 'attendance'
              },
              fcmOptions: { link: url || '/' }
            }
          });
          return { userId, status: 'sent' };
        } catch (err) {
          if (
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token'
          ) {
            await db.collection('push_tokens').doc(userId).delete().catch(() => {});
          }
          return { userId, status: 'failed', error: err.code };
        }
      })
    );

    const sent = results.filter(r => r.value?.status === 'sent').length;
    const failed = results.filter(r => r.value?.status === 'failed').length;
    return res.json({ success: true, sent, failed, total: tokens.length });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
