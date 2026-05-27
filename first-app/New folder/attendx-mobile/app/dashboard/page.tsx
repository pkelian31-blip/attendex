"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, collection, query, where, onSnapshot, getDocs, addDoc, doc, setDoc, deleteDoc } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/utils";

interface Session {
  id: string; sub: string; cls: string; dept?: string; room?: string;
  lec?: string; expiry: number; start: number; createdAt: number;
  ended?: boolean; admin: string; dur?: number;
}
interface Record { fN: string; lN: string; mat: string; cls: string; dept: string; arrivalRank?: number; timestamp: number; }

export default function DashboardPage() {
  const router = useRouter();
  const toast  = useToast();

  const [admin, setAdmin] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tab, setTab]   = useState<"live" | "new">("live");
  const [loading, setLoading] = useState(true);

  // New session form
  const [sub,  setSub]  = useState("");
  const [cls,  setCls]  = useState("");
  const [dept, setDept] = useState("");
  const [room, setRoom] = useState("");
  const [lec,  setLec]  = useState("");
  const [dur,  setDur]  = useState("30");
  const [creating, setCreating] = useState(false);

  // Expanded session records
  const [openSid, setOpenSid]       = useState<string | null>(null);
  const [records,  setRecords]      = useState<Record[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ax_admin");
    if (!stored) { router.replace("/"); return; }
    setAdmin(stored);

    const q = query(collection(db, "sessions"), where("admin", "==", stored));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      all.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(all);
      setLoading(false);
    });
    return unsub;
  }, [router]);

  async function createSession() {
    if (!sub) { toast("Enter a subject name", "warn"); return; }
    if (!cls) { toast("Enter a class", "warn"); return; }
    setCreating(true);
    try {
      const durMs = (parseInt(dur) || 30) * 60 * 1000;
      const now   = Date.now();
      const ref   = await addDoc(collection(db, "sessions"), {
        sub, cls, dept, room, lec, dur: parseInt(dur),
        admin, start: now, expiry: now + durMs, createdAt: now,
        ended: false,
      });
      toast("✓ Session created!", "ok");
      setSub(""); setCls(""); setDept(""); setRoom(""); setLec(""); setDur("30");
      setTab("live");
      // Show QR / link
      const link = `${window.location.origin}/student/${ref.id}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast("Session link copied!", "ok");
    } catch (e) { toast("Failed: " + (e as Error).message, "err"); }
    setCreating(false);
  }

  async function endSession(sid: string) {
    await setDoc(doc(db, "sessions", sid), { ended: true }, { merge: true });
    toast("Session ended", "warn");
  }

  async function deleteSession(sid: string) {
    await deleteDoc(doc(db, "sessions", sid));
    toast("Session deleted", "ok");
  }

  async function viewRecords(sid: string) {
    if (openSid === sid) { setOpenSid(null); return; }
    setOpenSid(sid); setLoadingRec(true);
    const snap = await getDocs(collection(db, "sessions", sid, "records"));
    const recs = snap.docs.map(d => d.data() as Record);
    recs.sort((a, b) => (a.lN || "").localeCompare(b.lN || ""));
    setRecords(recs);
    setLoadingRec(false);
  }

  async function exportPDF(s: Session) {
    const snap = await getDocs(collection(db, "sessions", s.id, "records"));
    const recs = snap.docs.map(d => d.data() as Record);
    recs.sort((a, b) => (a.lN || "").localeCompare(b.lN || ""));
    // Dynamic import jsPDF
    const { jsPDF } = await import("jspdf");
    const jsPDFAutoTable = (await import("jspdf-autotable")).default;
    const doc2 = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 16;
    // Header
    doc2.setFillColor(59, 111, 232); doc2.rect(0, 0, W, 2, "F");
    doc2.setFont("helvetica", "bold"); doc2.setFontSize(16); doc2.setTextColor(30, 42, 74);
    doc2.text(s.sub, M, 28);
    doc2.setFont("helvetica", "normal"); doc2.setFontSize(10); doc2.setTextColor(74, 88, 120);
    doc2.text([`Class: ${s.cls}`, `Date: ${new Date(s.start).toLocaleDateString()}`, `Admin: ${s.admin}`, `Total: ${recs.length} students`], M, 38);
    if (recs.length === 0) {
      doc2.text("No attendance records.", W / 2, 70, { align: "center" });
    } else {
      jsPDFAutoTable(doc2, {
        startY: 62, margin: { left: M, right: M },
        head: [["#", "First Name", "Last Name", "Matricule", "Class", "Department", "Time"]],
        body: recs.map((r, i) => [
          i + 1, r.fN, r.lN, r.mat, r.cls || "—", r.dept || "—",
          new Date(r.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 111, 232] },
      });
    }
    doc2.setFontSize(7); doc2.setTextColor(140, 150, 170);
    doc2.text("AttendX PRO · KЭL ♛ PHANTOM", M, 285);
    // Save
    const blob = doc2.output("blob");
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = s.sub.replace(/[^a-z0-9]/gi, "_") + "_Attendance.pdf";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("PDF exported", "ok");
  }

  async function copyLink(sid: string) {
    const link = `${window.location.origin}/student/${sid}`;
    await navigator.clipboard.writeText(link);
    toast("Link copied!", "ok");
  }

  function logout() {
    localStorage.removeItem("ax_admin");
    localStorage.removeItem("ax_admin_role");
    router.push("/");
  }

  const live    = sessions.filter(s => !s.ended && Date.now() < s.expiry);
  const past    = sessions.filter(s =>  s.ended || Date.now() >= s.expiry);
  const display = tab === "live" ? [...live, ...past] : [];

  return (
    <main className="page-wrap">
      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <span style={{ fontWeight: 800, fontSize: 16 }}>📊 Dashboard</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>{admin}</span>
            <button className="btn btn-sm btn-ghost" onClick={logout}>Logout</button>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
          {(["live", "new"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px", fontSize: 13, fontWeight: 700,
              background: "none", border: "none", cursor: "pointer",
              color: tab === t ? "var(--blue)" : "var(--text3)",
              borderBottom: tab === t ? "2px solid var(--blue)" : "2px solid transparent",
            }}>
              {t === "live" ? "📋 Sessions" : "＋ New Session"}
            </button>
          ))}
        </div>
      </div>

      <div className="page-inner">

        {/* ── Stats row ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Total", value: sessions.length, color: "var(--blue)" },
            { label: "Live",  value: live.length,     color: "var(--green)" },
            { label: "Past",  value: past.length,     color: "var(--text3)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ flex: 1, textAlign: "center", padding: "10px 6px", marginBottom: 0 }}>
              <p style={{ fontSize: 22, fontWeight: 800, color }}>{value}</p>
              <p style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── New Session form ── */}
        {tab === "new" && (
          <div className="card fade-up">
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)", marginBottom: 14, fontFamily: "var(--mono)" }}>✦ Create Session</p>
            <div className="field"><label>Subject *</label><input value={sub} onChange={e => setSub(e.target.value)} placeholder="e.g. Algorithms & Data Structures" /></div>
            <div className="field"><label>Class *</label><input value={cls} onChange={e => setCls(e.target.value)} placeholder="e.g. L3 Informatique" /></div>
            <div className="field"><label>Department</label><input value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>Room</label><input value={room} onChange={e => setRoom(e.target.value)} placeholder="Amphi B" /></div>
              <div className="field" style={{ flex: 1 }}><label>Duration (min)</label>
                <select value={dur} onChange={e => setDur(e.target.value)} style={{ width: "100%", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 14 }}>
                  {["15","30","45","60","90","120"].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Lecturer</label><input value={lec} onChange={e => setLec(e.target.value)} placeholder="Prof. Njoya" /></div>
            <button className="btn btn-primary" onClick={createSession} disabled={creating}>
              {creating ? "Creating…" : "✦ Create Session"}
            </button>
          </div>
        )}

        {/* ── Sessions list ── */}
        {tab === "live" && (
          loading ? (
            <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : display.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📡</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>No sessions yet. Create one!</p>
            </div>
          ) : (
            display.map(s => {
              const isLive = !s.ended && Date.now() < s.expiry;
              return (
                <div key={s.id} className="card fade-up" style={{ borderLeft: `3px solid ${isLive ? "var(--green)" : "var(--line)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      {isLive && <span className="dot-live" />}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{s.sub}</span>
                      <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{s.cls}{s.dept ? " · " + s.dept : ""}</p>
                    </div>
                    <span className={`badge ${isLive ? "badge-green" : "badge-blue"}`}>
                      {isLive ? "LIVE" : "ENDED"}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", marginBottom: 10 }}>
                    {timeAgo(s.createdAt)} {s.room ? "· " + s.room : ""}
                  </p>
                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => viewRecords(s.id)}>
                      {openSid === s.id ? "▲ Hide" : "👥 Records"}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => copyLink(s.id)}>🔗 Link</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => exportPDF(s)}>📄 PDF</button>
                    {isLive && <button className="btn btn-sm btn-danger" onClick={() => endSession(s.id)}>⏹ End</button>}
                    <button className="btn btn-sm btn-danger" onClick={() => deleteSession(s.id)}>🗑</button>
                  </div>

                  {/* Records table */}
                  {openSid === s.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      {loadingRec ? (
                        <div className="spinner" style={{ margin: "0 auto" }} />
                      ) : records.length === 0 ? (
                        <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center" }}>No records yet.</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, fontFamily: "var(--mono)" }}>
                            {records.length} student{records.length !== 1 ? "s" : ""} · sorted A→Z
                          </p>
                          {records.map((r, i) => (
                            <div key={r.mat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 12 }}>
                              <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", width: 22 }}>{i + 1}</span>
                              <span style={{ flex: 1, fontWeight: 600 }}>{r.lN} {r.fN}</span>
                              <span style={{ fontFamily: "var(--mono)", color: "var(--text3)", fontSize: 11 }}>{r.mat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </main>
  );
}
