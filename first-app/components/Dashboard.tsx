'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';

interface Session {
  id: string; sub: string; cls: string; dept: string;
  lec: string; time: string; dur: number; room: string;
  start: number; expiry: number; adminId: string;
  geoLat?: number; geoLng?: number; geoRadius?: number;
}

interface Record {
  fN: string; lN: string; mat: string; cls: string;
  dept: string; time: string; arrivalRank: number;
}

interface Props { adminUser: string; onLogout: () => void; }

export default function Dashboard({ adminUser, onLogout }: Props) {
  const [tab, setTab] = useState<'create' | 'sessions'>('create');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState({ sub: '', cls: '', dept: '', lec: '', time: '', dur: '30', room: '' });
  const [link, setLink] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedSess, setSelectedSess] = useState<Session | null>(null);
  const [records, setRecords] = useState<Record[]>([]);

  // Set default time
  useEffect(() => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setForm(f => ({ ...f, time: t }));
  }, []);

  // Load today's sessions
  const loadSessions = useCallback(async () => {
    const today = new Date().toDateString();
    const snap = await getDocs(collection(db, 'sessions'));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
    setSessions(all.filter(s => new Date(s.start).toDateString() === today && s.adminId === adminUser)
      .sort((a, b) => b.start - a.start));
  }, [adminUser]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const createSession = async () => {
    if (!form.sub || !form.cls || !form.time) { setMsg('Subject, class and time are required.'); return; }
    setCreating(true); setMsg('');
    const start = Date.now();
    const dur = parseInt(form.dur) || 30;
    const expiry = start + dur * 60 * 1000;
    const id = String(start);
    const sess: Session = {
      id, sub: form.sub, cls: form.cls, dept: form.dept,
      lec: form.lec, time: form.time, dur, room: form.room,
      start, expiry, adminId: adminUser
    };
    await setDoc(doc(db, 'sessions', id), sess);
    const base = window.location.origin;
    setLink(`${base}?session=${id}`);
    setMsg(`✓ Session created — ${form.sub} · ${form.cls} · ${dur} min`);
    setForm(f => ({ ...f, sub: '', cls: '', dept: '', lec: '', room: '', dur: '30' }));
    loadSessions();
    setCreating(false);
  };

  const openSession = async (s: Session) => {
    setSelectedSess(s);
    const snap = await getDocs(collection(db, 'sessions', s.id, 'records'));
    const recs = snap.docs.map(d => d.data() as Record)
      .sort((a, b) => a.lN?.localeCompare(b.lN || '') || 0);
    setRecords(recs);
  };

  // Live count for active session
  useEffect(() => {
    if (!selectedSess) return;
    const unsub = onSnapshot(collection(db, 'sessions', selectedSess.id, 'records'), snap => {
      const recs = snap.docs.map(d => d.data() as Record)
        .sort((a, b) => (a.lN || '').localeCompare(b.lN || ''));
      setRecords(recs);
    });
    return () => unsub();
  }, [selectedSess]);

  const isLive = (s: Session) => Date.now() < s.expiry;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-blue-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">✦</div>
          <span className="font-bold text-blue-900">AttendX PRO</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">@{adminUser}</span>
          <button onClick={onLogout} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">Sign Out</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-blue-100">
          <button onClick={() => setTab('create')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab==='create' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-blue-600'}`}>
            ✦ New Session
          </button>
          <button onClick={() => { setTab('sessions'); loadSessions(); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab==='sessions' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-blue-600'}`}>
            📋 Sessions ({sessions.length})
          </button>
        </div>

        {/* Create Session */}
        {tab === 'create' && (
          <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
            <h2 className="font-bold text-blue-900 mb-4 text-sm uppercase tracking-wider">Create Attendance Session</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Subject / Course', key: 'sub', ph: 'e.g. Mathematics' },
                { label: 'Class / Level', key: 'cls', ph: 'e.g. Level 1' },
                { label: 'Department', key: 'dept', ph: 'e.g. Computer Science' },
                { label: 'Lecturer', key: 'lec', ph: 'Dr. Name' },
                { label: 'Start Time', key: 'time', ph: '', type: 'time' },
                { label: 'Duration (min)', key: 'dur', ph: '30', type: 'number' },
                { label: 'Room (optional)', key: 'room', ph: 'e.g. Amphi B' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              ))}
            </div>

            {msg && <p className={`mt-3 text-sm p-3 rounded-lg ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg}</p>}

            <button onClick={createSession} disabled={creating}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition disabled:opacity-50">
              {creating ? '⏳ Creating…' : '⚡ Generate Attendance Link'}
            </button>

            {link && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Student Attendance Link</p>
                <div className="flex gap-2">
                  <input readOnly value={link} className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 font-mono" />
                  <button onClick={() => { navigator.clipboard.writeText(link); }}
                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition whitespace-nowrap">
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Share via WhatsApp or project on screen</p>
              </div>
            )}
          </div>
        )}

        {/* Sessions List */}
        {tab === 'sessions' && (
          <div className="space-y-3">
            {sessions.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">No sessions today</p>
              </div>
            )}
            {sessions.map(s => (
              <div key={s.id} onClick={() => openSession(s)}
                className="bg-white rounded-2xl border border-blue-100 p-4 cursor-pointer hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-900">{s.sub}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isLive(s) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isLive(s) ? '● LIVE' : 'ENDED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{s.cls}{s.dept ? ` · ${s.dept}` : ''} · {s.time}</p>
                  </div>
                  <span className="text-blue-600 text-lg">›</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Session Detail Modal */}
        {selectedSess && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedSess(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-900">{selectedSess.sub} — {selectedSess.cls}</h3>
                  <p className="text-xs text-gray-400">{records.length} present · {selectedSess.time}</p>
                </div>
                <button onClick={() => setSelectedSess(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-5">
                {records.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No attendance records yet</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase border-b">
                        <th className="pb-2 text-left">#</th>
                        <th className="pb-2 text-left">Name</th>
                        <th className="pb-2 text-left">Matricule</th>
                        <th className="pb-2 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50 transition">
                          <td className="py-2 text-gray-400 text-xs">{i+1}</td>
                          <td className="py-2 font-medium">{r.fN} {r.lN}</td>
                          <td className="py-2 text-blue-600 font-mono text-xs">{r.mat}</td>
                          <td className="py-2 text-gray-400 text-xs">{r.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
