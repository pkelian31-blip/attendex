"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, setDoc, deleteDoc, doc, query, orderBy } from "@/lib/firebase";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/utils";

interface Admin { id: string; role: string; pin: string; createdAt?: number; suspended?: boolean; }
interface Session { id: string; sub: string; cls: string; admin: string; createdAt: number; ended?: boolean; }

export default function SuperPage() {
  const router  = useRouter();
  const toast   = useToast();
  const [tab,   setTab]   = useState<"admins" | "sessions" | "analytics">("admins");
  const [admins,    setAdmins]    = useState<Admin[]>([]);
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [loading,   setLoading]   = useState(false);

  // New admin form
  const [newId,  setNewId]  = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super">("admin");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("ax_admin_role");
    if (role !== "super") { router.replace("/"); return; }
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [aSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "admins")),
        getDocs(query(collection(db, "sessions"), orderBy("createdAt", "desc"))),
      ]);
      setAdmins(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as Admin)));
      setSessions(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session)).slice(0, 30));
    } catch (e) { toast("Load failed: " + (e as Error).message, "err"); }
    setLoading(false);
  }

  async function createAdmin() {
    if (!newId || !newPin) { toast("Enter username and PIN", "warn"); return; }
    if (newPin.length < 4) { toast("PIN must be at least 4 digits", "warn"); return; }
    setCreating(true);
    try {
      await setDoc(doc(db, "admins", newId), {
        pin: newPin, role: newRole, createdAt: Date.now(), suspended: false,
      });
      toast("Admin created: " + newId, "ok");
      setNewId(""); setNewPin("");
      loadData();
    } catch (e) { toast("Failed: " + (e as Error).message, "err"); }
    setCreating(false);
  }

  async function toggleSuspend(admin: Admin) {
    await setDoc(doc(db, "admins", admin.id), { suspended: !admin.suspended }, { merge: true });
    toast(admin.suspended ? "Admin unsuspended" : "Admin suspended", "warn");
    loadData();
  }

  async function deleteAdmin(id: string) {
    if (!confirm(`Delete admin "${id}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, "admins", id));
    toast("Admin deleted", "ok");
    loadData();
  }

  function logout() {
    localStorage.removeItem("ax_admin");
    localStorage.removeItem("ax_admin_role");
    router.push("/");
  }

  const totalSessions = sessions.length;
  const liveSessions  = sessions.filter(s => !s.ended && Date.now() < ((s as any).expiry || 0)).length;

  return (
    <main className="page-wrap">
      <div className="top-bar">
        <div className="top-bar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "var(--purple)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: "100px", fontFamily: "var(--mono)" }}>SUPER</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Admin Panel</span>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={logout}>Logout</button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
          {(["admins", "sessions", "analytics"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 4px", fontSize: 11, fontWeight: 700,
              background: "none", border: "none", cursor: "pointer", textTransform: "capitalize",
              color: tab === t ? "var(--purple)" : "var(--text3)",
              borderBottom: tab === t ? "2px solid var(--purple)" : "2px solid transparent",
            }}>
              {t === "admins" ? "👤 Admins" : t === "sessions" ? "📋 Sessions" : "📊 Analytics"}
            </button>
          ))}
        </div>
      </div>

      <div className="page-inner">
        {loading && <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>}

        {/* ── ADMINS TAB ── */}
        {tab === "admins" && !loading && (
          <>
            {/* Create admin */}
            <div className="card fade-up" style={{ borderLeft: "3px solid var(--purple)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", marginBottom: 12, fontFamily: "var(--mono)" }}>
                ✦ Create Admin
              </p>
              <div className="field"><label>Username</label><input value={newId} onChange={e => setNewId(e.target.value)} placeholder="admin_username" autoCapitalize="none" /></div>
              <div className="field"><label>PIN (4+ digits)</label><input value={newPin} onChange={e => setNewPin(e.target.value)} type="password" inputMode="numeric" maxLength={8} placeholder="••••" /></div>
              <div className="field">
                <label>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as "admin" | "super")} style={{ width: "100%", padding: "11px 13px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 14 }}>
                  <option value="admin">Admin (Teacher)</option>
                  <option value="super">Super Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ background: "var(--purple)" }} onClick={createAdmin} disabled={creating}>
                {creating ? "Creating…" : "✦ Create Admin"}
              </button>
            </div>

            {/* Admins list */}
            {admins.map(a => (
              <div key={a.id} className="card fade-up" style={{ borderLeft: `3px solid ${a.suspended ? "var(--red)" : a.role === "super" ? "var(--purple)" : "var(--blue)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{a.id}</span>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <span className={`badge ${a.role === "super" ? "badge-blue" : "badge-blue"}`} style={{ background: a.role === "super" ? "rgba(139,92,246,0.1)" : "var(--blue3)", color: a.role === "super" ? "var(--purple)" : "var(--blue)" }}>
                        {a.role.toUpperCase()}
                      </span>
                      {a.suspended && <span className="badge badge-red">SUSPENDED</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: a.suspended ? "var(--green2)" : "var(--gold2)", color: a.suspended ? "var(--green)" : "var(--gold)", border: "none" }} onClick={() => toggleSuspend(a)}>
                      {a.suspended ? "Unban" : "Suspend"}
                    </button>
                    {a.id !== "__super__" && (
                      <button className="btn btn-sm btn-danger" onClick={() => deleteAdmin(a.id)}>🗑</button>
                    )}
                  </div>
                </div>
                {a.createdAt && <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>Created {timeAgo(a.createdAt)}</p>}
              </div>
            ))}
          </>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === "sessions" && !loading && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Total", value: totalSessions, color: "var(--blue)" },
                { label: "Live",  value: liveSessions,  color: "var(--green)" },
                { label: "Admins", value: admins.length, color: "var(--purple)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ flex: 1, textAlign: "center", padding: "10px 6px", marginBottom: 0 }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color }}>{value}</p>
                  <p style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{label}</p>
                </div>
              ))}
            </div>
            {sessions.map(s => (
              <div key={s.id} className="card fade-up">
                <p style={{ fontWeight: 700, fontSize: 13 }}>{s.sub}</p>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, fontFamily: "var(--mono)" }}>
                  {s.cls} · {s.admin} · {timeAgo(s.createdAt)}
                </p>
              </div>
            ))}
          </>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && !loading && (
          <div className="card fade-up">
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", marginBottom: 16, fontFamily: "var(--mono)" }}>PLATFORM OVERVIEW</p>
            {[
              { label: "Total Admins",   value: admins.length,       icon: "👤" },
              { label: "Total Sessions", value: totalSessions,        icon: "📋" },
              { label: "Active Admins",  value: admins.filter(a => !a.suspended).length, icon: "✅" },
              { label: "Suspended",      value: admins.filter(a => a.suspended).length,  icon: "🚫" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 14 }}>{icon} {label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--blue)", fontFamily: "var(--mono)" }}>{value}</span>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={loadData}>🔄 Refresh Data</button>
          </div>
        )}
      </div>
    </main>
  );
}
