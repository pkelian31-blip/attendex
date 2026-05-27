"use client";
import { useState, useEffect, useRef, use } from "react";
import { db, doc, getDoc, getDocs, setDoc, collection } from "@/lib/firebase";
import { getDeviceId, fmtCountdown, rankLabel, haversine } from "@/lib/utils";
import { getGeolocation } from "@/lib/capacitor";
import { useToast } from "@/components/Toast";

interface Session {
  id: string; sub: string; cls: string; dept?: string; room?: string;
  lec?: string; time?: string; dur?: number; expiry: number; start: number;
  geoLat?: number; geoLng?: number; geoRadius?: number; ended?: boolean;
}

type Phase = "loading" | "form" | "geo" | "submitting" | "done" | "expired" | "duplicate";

export default function StudentPage({ params }: { params: Promise<{ sid: string }> }) {
  const { sid }  = use(params);
  const toast    = useToast();

  const [sess,    setSess]    = useState<Session | null>(null);
  const [phase,   setPhase]   = useState<Phase>("loading");
  const [error,   setError]   = useState("");
  const [countdown, setCountdown] = useState(0);
  const [rank,    setRank]    = useState(0);

  // Form fields
  const [first, setFirst] = useState("");
  const [last,  setLast]  = useState("");
  const [mat,   setMat]   = useState("");
  const [cls,   setCls]   = useState("");
  const [dept,  setDept]  = useState("");
  const [phone, setPhone] = useState("");
  const [matFilling, setMatFilling] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceId = getDeviceId();

  // Load session on mount
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "sessions", sid));
        if (!snap.exists()) { setError("Session not found or invalid link."); setPhase("expired"); return; }
        const s = { id: sid, ...snap.data() } as Session;
        setSess(s);

        // Already submitted?
        const devSnap = await getDoc(doc(db, "sessions", sid, "devices", deviceId));
        if (devSnap.exists()) { setPhase("duplicate"); return; }

        if (Date.now() > s.expiry) { setPhase("expired"); return; }

        startTimer(s.expiry, s.start, s.expiry - s.start);
        setPhase("form");

        if (s.geoLat != null) setPhase("geo");
        else setPhase("form");
      } catch (e) {
        setError("Error loading session: " + (e as Error).message);
        setPhase("expired");
      }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sid, deviceId]);

  function startTimer(expiry: number, start: number, total: number) {
    const tick = () => {
      const rem = expiry - Date.now();
      if (rem <= 0) { setCountdown(0); setPhase("expired"); clearInterval(timerRef.current!); return; }
      setCountdown(rem);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }

  // Matricule autofill
  const matDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function handleMatInput(val: string) {
    setMat(val);
    if (matDebounce.current) clearTimeout(matDebounce.current);
    if (val.length < 4) return;
    matDebounce.current = setTimeout(async () => {
      setMatFilling(true);
      try {
        const safeId = val.toUpperCase().replace(/[\\/\s.#$[\]]/g, "_");
        const snap   = await getDoc(doc(db, "student_registry", safeId));
        if (snap.exists()) {
          const d = snap.data();
          if (!first && d.first) setFirst(d.first);
          if (!last  && d.last)  setLast(d.last);
          if (!dept  && d.dept)  setDept(d.dept);
          if (!cls   && d.cls)   setCls(d.cls);
          if (d.first || d.last) toast("✓ Info filled from registry", "ok");
        }
      } catch { /* silent */ }
      setMatFilling(false);
    }, 700);
  }

  async function handleGeoAndSubmit() {
    if (!sess) return;
    setPhase("geo");
    try {
      const geo = await getGeolocation();
      const dist = haversine(sess.geoLat!, sess.geoLng!, geo.lat, geo.lng);
      const margin = Math.min(geo.accuracy, 100);
      const effective = (sess.geoRadius || 50) + margin + 20; // +20 GPS_BUFFER
      if (dist > effective) {
        setError(`📍 You are ${Math.round(dist)}m away — must be within ${sess.geoRadius}m of class.`);
        setPhase("form");
        return;
      }
      await submitAttend(geo.lat, geo.lng);
    } catch {
      // Geo failed — allow without geo
      await submitAttend(null, null);
    }
  }

  async function submitAttend(lat: number | null, lng: number | null) {
    if (!sess) return;
    if (!first && !last) { setError("Please enter your name."); setPhase("form"); return; }
    if (!mat)            { setError("Please enter your matriculation number."); setPhase("form"); return; }
    if (!cls)            { setError("Please enter your class/level."); setPhase("form"); return; }

    // Class match
    if (sess.cls && cls.toLowerCase().replace(/\s/g,"") !== sess.cls.toLowerCase().replace(/\s/g,"")) {
      setError(`Class mismatch — you entered "${cls}" but session is for "${sess.cls}".`);
      setPhase("form"); return;
    }

    setPhase("submitting");
    try {
      // Count existing records for rank
      const recSnap = await getDocs(collection(db, "sessions", sid, "records"));
      const arrival = recSnap.size + 1;

      const safeId = mat.toUpperCase().replace(/[\\/\s.#$[\]]/g, "_");
      await setDoc(doc(db, "sessions", sid, "records", safeId), {
        fN: first, lN: last, mat: mat.toUpperCase(), cls, dept, phone,
        name: [first, last].filter(Boolean).join(" "),
        timestamp: Date.now(), rank: Date.now(), arrivalRank: arrival,
        device: navigator.userAgent.slice(0, 80), ip: "N/A",
        verified: true, lat, lng,
      });
      await setDoc(doc(db, "sessions", sid, "devices", deviceId), { ts: Date.now() });

      // Save to registry
      try {
        await setDoc(doc(db, "student_registry", safeId), {
          mat: mat.toUpperCase(), first, last, dept, cls, updatedAt: Date.now(),
        }, { merge: true });
      } catch { /* silent */ }

      setRank(arrival);
      setPhase("done");
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (e) {
      setError("Submission failed: " + (e as Error).message);
      setPhase("form");
    }
  }

  function handleSubmit() {
    if (!sess) return;
    if (sess.geoLat != null) handleGeoAndSubmit();
    else submitAttend(null, null);
  }

  const pct = sess ? Math.max(0, Math.min(100, (countdown / (sess.expiry - sess.start)) * 100)) : 100;
  const warn = countdown > 0 && countdown < 120000;

  // ─── RENDER ───
  if (phase === "loading") return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", flexDirection: "column", gap: 12 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: "var(--text3)", fontSize: 13 }}>Loading session…</p>
    </main>
  );

  if (phase === "expired") return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Session Expired</h2>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>{error || "This session is no longer active."}</p>
      </div>
    </main>
  );

  if (phase === "duplicate") return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div className="success-ring">✓</div>
        <h2 style={{ fontWeight: 800, color: "var(--blue)", marginBottom: 8 }}>Already Registered</h2>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>You already submitted attendance for this session.</p>
      </div>
    </main>
  );

  if (phase === "done") return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div className="success-ring">✓</div>
        <h2 style={{ fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>
          {[first, last].filter(Boolean).join(" ")}
        </h2>
        <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 14 }}>
          {mat.toUpperCase()} · {cls}{dept ? " · " + dept : ""}
        </p>
        <div className="success-rank">{rankLabel(rank)}</div>
        <p style={{ color: "var(--text3)", fontSize: 11, marginTop: 12 }}>Attendance confirmed ✓</p>
      </div>
    </main>
  );

  if (phase === "submitting" || phase === "geo") return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", flexDirection: "column", gap: 12 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: "var(--text3)", fontSize: 13 }}>
        {phase === "geo" ? "📍 Verifying your location…" : "Submitting attendance…"}
      </p>
    </main>
  );

  return (
    <main style={{ minHeight: "100dvh", background: "var(--s2)" }}>
      {/* Session banner */}
      {sess && (
        <div style={{ background: "var(--blue)", padding: "calc(var(--sat) + 12px) 16px 14px", color: "#fff" }}>
          <p style={{ fontSize: 17, fontWeight: 800 }}>{sess.sub}</p>
          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>
            {[sess.room, sess.lec, sess.cls].filter(Boolean).join(" · ")}
          </p>
          {/* Timer bar */}
          <div style={{ marginTop: 10, height: 4, background: "rgba(255,255,255,0.25)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: warn ? "#FCA5A5" : "#fff", borderRadius: 2, transition: "width 1s linear" }} />
          </div>
          <p style={{ fontSize: 11, opacity: 0.8, marginTop: 4, fontFamily: "var(--mono)" }}>
            {fmtCountdown(countdown)} remaining
          </p>
        </div>
      )}

      <div className="page-inner" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <h2 style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>📝 Mark Attendance</h2>

        {error && <div className="alert alert-err show">{error}</div>}

        <div className="card" style={{ padding: "16px 14px" }}>
          <div className="field">
            <label>First Name</label>
            <input value={first} onChange={e => setFirst(e.target.value)} placeholder="Jean" autoComplete="given-name" />
          </div>
          <div className="field">
            <label>Last Name / Surname</label>
            <input value={last} onChange={e => setLast(e.target.value)} placeholder="Mbarga" autoComplete="family-name" />
          </div>
          <div className="field">
            <label>Matriculation Number {matFilling && "⏳"}</label>
            <input
              value={mat}
              onChange={e => handleMatInput(e.target.value)}
              placeholder="e.g. 21B0045"
              autoComplete="off"
              style={{ fontFamily: "var(--mono)" }}
            />
          </div>
          <div className="field">
            <label>Class / Level</label>
            <input value={cls} onChange={e => setCls(e.target.value)} placeholder="e.g. L3 Informatique" />
          </div>
          <div className="field">
            <label>Department</label>
            <input value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Computer Science" />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+237 6XX XXX XXX" />
          </div>

          {sess?.geoLat != null && (
            <div className="alert alert-info show" style={{ marginBottom: 12 }}>
              📍 Geo-fenced ±{sess.geoRadius}m — your location will be verified
            </div>
          )}

          <button className="btn btn-primary" onClick={handleSubmit}>
            ✓ Submit My Attendance
          </button>
        </div>
      </div>
    </main>
  );
}
