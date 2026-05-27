"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, collection, query, orderBy, limit, onSnapshot, addDoc } from "@/lib/firebase";
import { getDeviceId } from "@/lib/utils";
import { useToast } from "@/components/Toast";

interface ChatMsg {
  id: string;
  name: string;
  text: string;
  role: string;
  at: number;
}

export default function HomePage() {
  const router  = useRouter();
  const toast   = useToast();

  // ── Session join ──
  const [sessCode, setSessCode] = useState("");

  // ── Admin login ──
  const [showLogin, setShowLogin] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPin,  setAdminPin]  = useState("");
  const [loginErr,  setLoginErr]  = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // ── Public chat ──
  const [msgs,     setMsgs]    = useState<ChatMsg[]>([]);
  const [chatName, setChatName] = useState("");
  const [chatText, setChatText] = useState("");
  const [nameLocked, setNameLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Restore locked name
  useEffect(() => {
    const saved = localStorage.getItem("ax_chatName");
    if (saved) { setChatName(saved); setNameLocked(true); }
  }, []);

  // Live chat listener
  useEffect(() => {
    const q = query(collection(db, "chat_public"), orderBy("at", "asc"), limit(60));
    const unsub = onSnapshot(q, snap => {
      setMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMsg)));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, []);

  function joinSession() {
    const code = sessCode.trim();
    if (!code) { toast("Enter a session code or ID", "warn"); return; }
    router.push(`/student/${code}`);
  }

  async function loginAdmin() {
    if (!adminUser || !adminPin) { setLoginErr("Enter username and PIN."); return; }
    setLoggingIn(true); setLoginErr("");
    try {
      const { getDoc, doc } = await import("@/lib/firebase");
      const snap = await getDoc(doc(db, "admins", adminUser));
      if (!snap.exists()) { setLoginErr("Admin not found."); setLoggingIn(false); return; }
      const data = snap.data();
      if (data.pin !== adminPin) { setLoginErr("Incorrect PIN."); setLoggingIn(false); return; }
      if (data.suspended) { setLoginErr("Account suspended."); setLoggingIn(false); return; }
      localStorage.setItem("ax_admin", adminUser);
      localStorage.setItem("ax_admin_role", data.role || "admin");
      toast("Welcome, " + adminUser + "!", "ok");
      if (adminUser === "__super__" || data.role === "super") {
        router.push("/super");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      setLoginErr("Login failed: " + (e as Error).message);
      setLoggingIn(false);
    }
  }

  async function sendChat() {
    const name = chatName.trim();
    const text = chatText.trim();
    if (!name)  { toast("Enter your name first", "warn"); return; }
    if (!text)  { toast("Write a message", "warn"); return; }
    if (!nameLocked) {
      localStorage.setItem("ax_chatName", name);
      setNameLocked(true);
    }
    await addDoc(collection(db, "chat_public"), {
      name, text, role: "visitor", senderId: getDeviceId(), at: Date.now(),
    });
    setChatText("");
  }

  const roleColor = (role: string) =>
    role === "super" ? "var(--purple)" :
    role === "admin" ? "var(--blue)"   : "var(--text3)";

  return (
    <main className="page-wrap">
      <div className="page-inner">

        {/* ── Logo + Header ── */}
        <div className="fade-up" style={{ textAlign: "center", padding: "8px 0 20px" }}>
          {/* App logo */}
          <img
            src="/icons/icon-192.png"
            alt="AttendX PRO"
            style={{ width: 72, height: 72, borderRadius: 20, display: "block", margin: "0 auto 12px", boxShadow: "0 4px 20px rgba(59,111,232,0.18)" }}
          />
          <h1 style={{ fontFamily: "var(--head)", fontSize: 22, fontWeight: 800, color: "var(--text)" }}>
            AttendX <span style={{ color: "var(--blue)" }}>PRO</span>
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
            Smart Attendance Platform
          </p>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, fontFamily: "var(--mono)", opacity: 0.7 }}>
            by KЭL ♛ PHANTOM · VALIDE EdTech
          </p>
        </div>

        {/* ── Join Session ── */}
        <div className="card fade-up">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 10, fontFamily: "var(--mono)" }}>
            📡 Join a Session
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="field"
              style={{ flex: 1, marginBottom: 0, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 14, outline: "none" }}
              placeholder="Session code or ID…"
              value={sessCode}
              onChange={e => setSessCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && joinSession()}
            />
            <button className="btn btn-primary" style={{ width: "auto", padding: "11px 18px" }} onClick={joinSession}>
              Join
            </button>
          </div>
        </div>

        {/* ── Admin Login ── */}
        {!showLogin ? (
          <button className="btn btn-ghost fade-up" style={{ marginBottom: 12 }} onClick={() => setShowLogin(true)}>
            🔐 Admin / Teacher Login
          </button>
        ) : (
          <div className="card fade-up">
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--blue)", marginBottom: 12, fontFamily: "var(--mono)" }}>
              🔐 Admin Login
            </p>
            {loginErr && <div className="alert alert-err show">{loginErr}</div>}
            <div className="field">
              <label>Username</label>
              <input value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="admin_username" autoCapitalize="none" />
            </div>
            <div className="field">
              <label>PIN</label>
              <input value={adminPin} onChange={e => setAdminPin(e.target.value)} type="password" inputMode="numeric" maxLength={4} placeholder="••••" />
            </div>
            <button className="btn btn-primary" onClick={loginAdmin} disabled={loggingIn}>
              {loggingIn ? "Logging in…" : "Login →"}
            </button>
            <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowLogin(false)}>
              Cancel
            </button>
          </div>
        )}

        {/* ── Public Chat ── */}
        <div className="card fade-up" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="dot-live" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Community Chat</span>
          </div>

          {/* Messages */}
          <div style={{ height: 220, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 20 }}>No messages yet. Say hi! 👋</p>
            )}
            {msgs.map(m => (
              <div key={m.id}>
                <span style={{ fontSize: 11, fontWeight: 700, color: roleColor(m.role) }}>{m.name}</span>
                {" "}
                <span style={{ fontSize: 13, color: "var(--text2)" }}>{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ borderTop: "1px solid var(--line)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
            <input
              style={{ width: "100%", padding: "8px 11px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 13, outline: "none" }}
              placeholder={nameLocked ? chatName : "Your name (required)…"}
              value={nameLocked ? chatName : chatName}
              onChange={e => { if (!nameLocked) setChatName(e.target.value); }}
              readOnly={nameLocked}
            />
            <div style={{ display: "flex", gap: 7 }}>
              <input
                style={{ flex: 1, padding: "8px 11px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 13, outline: "none" }}
                placeholder="Message…"
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
              />
              <button className="btn btn-primary" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={sendChat}>
                Send
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
