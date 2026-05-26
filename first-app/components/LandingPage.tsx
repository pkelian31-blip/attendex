'use client';

interface Props { onLogin: () => void; }

export default function LandingPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur border-b border-blue-100 px-6 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="AttendX PRO" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-blue-900 text-lg">AttendX <span className="text-blue-600">PRO</span></span>
        </div>
        <button onClick={onLogin} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
          Admin Login
        </button>
      </nav>

      {/* Hero */}
      <div className="text-center max-w-2xl mt-20">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="AttendX PRO Logo" className="w-40 h-40 drop-shadow-xl" />
        </div>
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-4 tracking-widest uppercase">
          Smart Attendance Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-blue-900 leading-tight mb-2" style={{fontFamily:'serif'}}>
          <em className="not-italic bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Attendance.</em>
          <br/>Zero Friction.
        </h1>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Create timed sessions, verify students by class, generate QR codes, and export professional PDF reports — all in one platform.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={onLogin} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            Open Admin Panel →
          </button>
          <button onClick={onLogin} className="border border-blue-200 text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
            View Demo
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mt-16">
        {[
          { icon: '⏱', title: 'Timed Sessions', desc: 'Links expire automatically — latecomers are absent.' },
          { icon: '🎓', title: 'Class Verification', desc: 'Students verified against their registered class.' },
          { icon: '📄', title: 'PDF Reports', desc: 'Professional attendance reports, alphabetically sorted.' },
          { icon: '▦', title: 'QR Codes', desc: 'Generate scannable QR codes for instant sharing.' },
          { icon: '🔐', title: 'Secure Admin', desc: 'PIN-protected dashboard with live monitoring.' },
          { icon: '📡', title: 'Live Tracking', desc: 'Watch attendance roll in real-time.' },
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-blue-100 hover:shadow-md transition">
            <div className="text-2xl mb-3">{f.icon}</div>
            <div className="font-bold text-blue-900 mb-1">{f.title}</div>
            <div className="text-sm text-gray-500">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-16 mb-6 text-center text-sm text-gray-400">
        AttendX PRO · Created by <span className="font-semibold text-gray-500">KЭL ♛ PHANTOM</span> · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
