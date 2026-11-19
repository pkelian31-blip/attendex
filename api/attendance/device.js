'use strict';

const { newDeviceKey, hashToken } = require('../../lib/tokens');

const ALLOWED_ORIGINS = String(
  process.env.ALLOWED_ORIGINS || 'https://attendex-pro.vercel.app,http://localhost:3001'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function cookieValue(cookieHeader) {
  const entry = String(cookieHeader || '')
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith('ax_device='));
  return entry ? entry.slice('ax_device='.length) : null;
}

module.exports = async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  let deviceKey = cookieValue(req.headers.cookie);
  if (!deviceKey || deviceKey.length < 20 || deviceKey.length > 200) {
    deviceKey = newDeviceKey();
    const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `ax_device=${deviceKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? '; Secure' : ''}`
    );
  }
  return res.status(200).json({ ok: true, deviceHash: hashToken(deviceKey) });
};
