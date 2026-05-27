"use client";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/Toast";

type QRTab = "text" | "url" | "email" | "session" | "image";

export default function QRPage() {
  const toast    = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab,    setTab]    = useState<QRTab>("session");
  const [input,  setInput]  = useState("");
  const [size,   setSize]   = useState(256);
  const [color,  setColor]  = useState("#3B6FE8");
  const [bg,     setBg]     = useState("#FFFFFF");
  const [generated, setGenerated] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // Load QR lib dynamically (works offline — bundled)
  async function generateQR() {
    if (!input.trim()) { toast("Enter something to encode", "warn"); return; }
    const QRCode = (await import("qrcode")).default;
    const canvas  = canvasRef.current;
    if (!canvas) return;
    try {
      await QRCode.toCanvas(canvas, input.trim(), {
        width: size, margin: 2,
        color: { dark: color, light: bg },
      });
      setImgSrc(canvas.toDataURL("image/png"));
      setGenerated(true);
    } catch (e) {
      toast("QR generation failed: " + (e as Error).message, "err");
    }
  }

  function downloadPNG() {
    if (!imgSrc) return;
    const a = document.createElement("a");
    a.href = imgSrc; a.download = "attendx_qr.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("QR downloaded", "ok");
  }

  async function shareQR() {
    if (!imgSrc) return;
    const blob = await (await fetch(imgSrc)).blob();
    const file = new File([blob], "attendx_qr.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "AttendX QR Code" });
    } else {
      await navigator.clipboard.writeText(input);
      toast("Text copied to clipboard", "ok");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64  = (ev.target?.result as string).split(",")[1];
      const data = `data:image/png;base64,${b64}`;
      setInput(data.slice(0, 1800)); // QR has data limit — trim
      toast("Image loaded — generating QR…", "info");
      setTimeout(generateQR, 100);
    };
    reader.readAsDataURL(file);
  }

  const TABS: { key: QRTab; label: string }[] = [
    { key: "session", label: "🔗 Session" },
    { key: "url",     label: "🌐 URL" },
    { key: "text",    label: "📝 Text" },
    { key: "email",   label: "✉ Email" },
    { key: "image",   label: "🖼 Image" },
  ];

  return (
    <main className="page-wrap">
      <div className="top-bar">
        <div className="top-bar-inner">
          <span style={{ fontWeight: 800, fontSize: 16 }}>QR Generator</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Works offline</span>
        </div>
      </div>

      <div className="page-inner">
        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", gap: 6, marginBottom: 14, paddingBottom: 2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              whiteSpace: "nowrap", padding: "7px 14px", borderRadius: "var(--r1)",
              fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              background: tab === t.key ? "var(--blue)" : "var(--s2)",
              color:      tab === t.key ? "#fff"        : "var(--text3)",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="card">
          {tab === "session" && (
            <div className="field">
              <label>Session ID or full URL</label>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Paste session link or ID…" />
            </div>
          )}
          {tab === "url" && (
            <div className="field">
              <label>URL</label>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="https://…" inputMode="url" />
            </div>
          )}
          {tab === "text" && (
            <div className="field">
              <label>Text</label>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Any text…" rows={3} style={{ resize: "none" }} />
            </div>
          )}
          {tab === "email" && (
            <div className="field">
              <label>Email Address</label>
              <input value={input} onChange={e => setInput("mailto:" + e.target.value)} placeholder="user@example.com" inputMode="email" />
            </div>
          )}
          {tab === "image" && (
            <div className="field">
              <label>Upload Image (converts to QR)</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>Note: large images may exceed QR data limits — image will be compressed.</p>
            </div>
          )}

          {/* Size + colors */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div className="field" style={{ flex: 2 }}>
              <label>Size (px)</label>
              <select value={size} onChange={e => setSize(Number(e.target.value))} style={{ width: "100%", padding: "10px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 13 }}>
                {[128, 256, 512].map(s => <option key={s} value={s}>{s}×{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>QR Color</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line)", borderRadius: "var(--r1)", padding: 2, cursor: "pointer" }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Background</label>
              <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ width: "100%", height: 42, border: "1px solid var(--line)", borderRadius: "var(--r1)", padding: 2, cursor: "pointer" }} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={generateQR}>⚡ Generate QR</button>
        </div>

        {/* Preview */}
        <div className="card" style={{ textAlign: "center" }}>
          {!generated && (
            <div style={{ padding: "30px 0", color: "var(--text3)" }}>
              <p style={{ fontSize: 32 }}>◻</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>QR will appear here</p>
            </div>
          )}
          <canvas ref={canvasRef} style={{ borderRadius: 8, maxWidth: "100%", display: generated ? "block" : "none", margin: "0 auto" }} />

          {generated && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-sm btn-ghost" onClick={downloadPNG}>⬇ PNG</button>
              <button className="btn btn-sm btn-ghost" onClick={shareQR}>📤 Share</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
