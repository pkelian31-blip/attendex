'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';

interface Session {
  id: string; sub: string; cls: string; dept: string;
  lec: string; time: string; dur: number; room: string;
  start: number; expiry: number;
  geoLat?: number; geoLng?: number; geoRadius?: number;
}

interface Props { sessionId: string; }

export default function StudentPage({ sessionId }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [form, setForm] = useState({ fN: '', lN: '', mat: '', cls: '', dept: '', phone: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'sessions', sessionId));
        if (!snap.exists()) { setLoading(false); return; }
        const s = { id: snap.id, ...snap.data() } as Session;
        setSession(s);
        if (Date.now() > s.expiry) setExpired(true);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [sessionId]);

  // Timer
  useEffect(() => {
    if (!session || expired) return;
    const tick = () => {
      const rem = session.expiry - Date.now();
      if (rem <= 0) { setExpired(true); return; }
      const m = Math.floor(rem / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, expired]);

  const submit = async () => {
    if (!form.fN || !form.lN) { setError('Enter your first and last name'); return; }
    if (!form.mat) { setError('Enter your matriculation number'); return; }
    if (!form.cls) { setError('Enter your class'); return; }
    if (!form.dept) { setError('Enter your department'); return; }
    if (!session) return;
    if (Date.now() > session.expiry) { setExpired(true); return; }

    // Class check
    const norm = (x: string) => x.toLowerCase().replace(/\s/g, '');
    if (norm(form.cls) !== norm(session.cls)) {
      setError(`Wrong class. This session is for "${session.cls}"`);
      return;
    }

    setSubmitting(true); setError('');
    try {
      const existing = await getDocs(collection(db, 'sessions', sessionId, 'records'));
      const dup = existing.docs.find(d => d.data().mat?.toLowerCase() === form.mat.toLowerCase());
      if (dup) { setError('This matricule is already registered.'); setSubmitting(false); return; }

      const arrivalRank = existing.size + 1;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

      await setDoc(doc(db, 'sessions', sessionId, 'records', form.mat.toUpperCase()), {
        fN: form.fN, lN: form.lN, mat: form.mat.toUpperCase(),
        cls: form.cls, dept: form.dept, phone: form.phone,
        time, arrivalRank, ts: Date.now()
      });

      setRank(arrivalRank);
      setStudentName(`${form.fN} ${form.lN}`);
      setSubmitted(true);
    } catch (e: unknown) {
      setError('Submission failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">⏳</div>
        <p className="text-gray-500">Loading session…</p>
      </div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-700 mb-2">Invalid Link</h2>
        <p className="text-gray-500 text-sm">This session link is invalid or has been removed.</p>
      </div>
    </div>
  );

  if (expired) return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⏰</div>
        <h2 className="text-2xl font-black text-red-700 mb-2">Time Elapsed</h2>
        <p className="text-gray-500">This session has ended. You are recorded as <strong className="text-red-600">absent</strong>.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">✓</div>
        <h2 className="text-2xl font-black text-green-700 mb-1">{studentName}</h2>
        <p className="text-gray-500 text-sm mb-4">Attendance confirmed ✓</p>
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-bold">
          {rank === 1 ? '🥇 First to arrive!' : rank === 2 ? '🥈 2nd to arrive' : rank === 3 ? '🥉 3rd to arrive' : `🏅 #${rank} on attendance list`}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Session Banner */}
        <div className="bg-white rounded-2xl border border-blue-100 p-5 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-black text-blue-900">{session.sub}</h2>
              <p className="text-xs text-gray-400 mt-1">{session.room && `${session.room} · `}{session.lec && `${session.lec} · `}{session.time}</p>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">● LIVE</span>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{session.cls}</span>
            {session.dept && <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-3 py-1 rounded-full">{session.dept}</span>}
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">{session.dur} min</span>
          </div>
          {/* Timer */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Session closes in</span>
              <span className="font-bold text-yellow-600 text-sm">{timeLeft}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${Math.max(0, ((session.expiry - Date.now()) / (session.dur * 60000)) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Attendance Form */}
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <span>📍</span> Mark Your Attendance
          </h3>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</label>
                <input value={form.fN} onChange={e => setForm(f => ({...f, fN: e.target.value}))}
                  placeholder="Jean" autoComplete="given-name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Name</label>
                <input value={form.lN} onChange={e => setForm(f => ({...f, lN: e.target.value}))}
                  placeholder="Mbarga" autoComplete="family-name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Matriculation Number</label>
              <input value={form.mat} onChange={e => setForm(f => ({...f, mat: e.target.value}))}
                placeholder="e.g. 21B0045" autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm font-mono focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Class / Level</label>
              <input value={form.cls} onChange={e => setForm(f => ({...f, cls: e.target.value}))}
                placeholder="Must match session class"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
              <input value={form.dept} onChange={e => setForm(f => ({...f, dept: e.target.value}))}
                placeholder="e.g. Computer Science"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone (optional)</label>
              <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                type="tel" placeholder="+237 6XX XXX XXX"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
            </div>

            {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}

            <button onClick={submit} disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50 mt-1">
              {submitting ? '⏳ Submitting…' : '✓ Submit My Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
