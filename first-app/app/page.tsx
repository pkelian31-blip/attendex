'use client';
import { useEffect, useState } from 'react';
import LandingPage from '@/components/LandingPage';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';
import StudentPage from '@/components/StudentPage';

type Page = 'landing' | 'login' | 'dashboard' | 'student';

export default function Home() {
  const [page, setPage] = useState<Page>('landing');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) {
      setSessionId(sid);
      setPage('student');
    }
  }, []);

  if (page === 'student' && sessionId) {
    return <StudentPage sessionId={sessionId} />;
  }
  if (page === 'login') {
    return <LoginPage onLogin={(u) => { setAdminUser(u); setPage('dashboard'); }} onBack={() => setPage('landing')} />;
  }
  if (page === 'dashboard' && adminUser) {
    return <Dashboard adminUser={adminUser} onLogout={() => { setAdminUser(null); setPage('landing'); }} />;
  }
  return <LandingPage onLogin={() => setPage('login')} />;
}
