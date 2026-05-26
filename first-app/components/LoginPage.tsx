'use client';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface Props {
  onLogin: (username: string) => void;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: Props) {
  const [step, setStep] = useState<'choose' | 'login' | 'register'>('choose');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || pin.length < 4) { setError('Enter username and 4-digit PIN'); return; }
    setLoading(true); setError('');
    try {
      const snap = await getDoc(doc(db, 'admins', username));
      if (!snap.exists()) { setError('Username not found. Please register.'); setLoading(false); return; }
      const data = snap.data();
      if (data.blocked) { setError('⛔ Account suspended. Contact super admin.'); setLoading(false); return; }
      if (data.pin !== pin) { setError('Incorrect PIN.'); setLoading(false); return; }
      await setDoc(doc(db, 'admins', username), { lastLogin: Date.now() }, { merge: true });
      onLogin(username);
    } catch (e: unknown) {
      setError('Login failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim()) { setError('Enter your full name'); return; }
    if (!phone.trim()) { setError('Enter your WhatsApp number'); return; }
    setLoading(true); setError('');
    try {
      const uname = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20) + '_' + Date.now().toString().slice(-4);
      await setDoc(doc(db, 'admins', uname), {
        name: name.trim(), username: uname, phone: phone.trim(),
        pin: '1234', blocked: false, createdAt: Date.now(), lastLogin: null
      });
      setError('');
      alert(`✓ Account created!\nUsername: ${uname}\nDefault PIN: 1234\n\nSave your username!`);
      setUsername(uname);
      setStep('login');
    } catch (e: unknown) {
      setError('Registration failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        {step === 'choose' && (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="text-2xl font-black text-blue-900">Welcome to AttendX</h2>
              <p className="text-gray-500 text-sm mt-1">How are you accessing today?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setStep('login')} className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
                👨‍🏫 Admin Login
              </button>
              <button onClick={() => setStep('register')} className="border border-blue-200 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                ➕ Register as New Admin
              </button>
              <button onClick={onBack} className="text-gray-400 text-sm mt-2 hover:text-gray-600 transition">
                ← Back to Home
              </button>
            </div>
          </>
        )}

        {step === 'login' && (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">👨‍🏫</div>
              <h2 className="text-xl font-black text-blue-900">Admin Login</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Your username" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">4-digit PIN</label>
                <input value={pin} onChange={e => setPin(e.target.value.slice(0,4))}
                  type="password" inputMode="numeric" maxLength={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="••••" />
              </div>
              {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Logging in…' : 'Login →'}
              </button>
              <button onClick={() => setStep('choose')} className="text-gray-400 text-sm hover:text-gray-600 transition">← Back</button>
            </div>
          </>
        )}

        {step === 'register' && (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">➕</div>
              <h2 className="text-xl font-black text-blue-900">Register Admin</h2>
              <p className="text-gray-500 text-xs mt-1">Default PIN will be 1234 — change after login</p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="e.g. Dr. Jean Mbarga" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  type="tel"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="+237 6XX XXX XXX" />
              </div>
              {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
              <button onClick={handleRegister} disabled={loading}
                className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Creating…' : 'Create Account'}
              </button>
              <button onClick={() => setStep('choose')} className="text-gray-400 text-sm hover:text-gray-600 transition">← Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
