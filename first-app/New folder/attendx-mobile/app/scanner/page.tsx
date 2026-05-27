"use client";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { vibrate } from "@/lib/capacitor";

export default function ScannerPage() {
  const toast       = useToast();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState<string | null>(null);
  const [torch,     setTorch]     = useState(false);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const trackRef    = useRef<MediaStreamTrack | null>(null);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      trackRef.current  = stream.getVideoTracks()[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      setResult(null);
      requestAnimationFrame(scanFrame);
    } catch (e) {
      toast("Camera access denied or unavailable", "err");
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function scanFrame() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(scanFrame); return; }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // @ts-ignore — BarcodeDetector is newer API
      if (typeof BarcodeDetector !== "undefined") {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        const codes    = await detector.detect(canvas);
        if (codes.length > 0) {
          const value = codes[0].rawValue as string;
          await vibrate(80);
          handleResult(value);
          return;
        }
      }
    } catch { /* not supported — fall through */ }

    rafRef.current = requestAnimationFrame(scanFrame);
  }

  function handleResult(value: string) {
    setResult(value);
    stopCamera();
    toast("✓ QR code scanned!", "ok");
  }

  function handleManualEntry(val: string) {
    if (!val.trim()) return;
    handleResult(val.trim());
  }

  async function toggleTorch() {
    if (!trackRef.current) return;
    try {
      // @ts-ignore
      await trackRef.current.applyConstraints({ advanced: [{ torch: !torch }] });
      setTorch(!torch);
    } catch { toast("Torch not supported on this device", "warn"); }
  }

  function openResult() {
    if (!result) return;
    try {
      const url = new URL(result);
      window.location.href = url.toString();
    } catch {
      toast("Not a valid URL — copied to clipboard", "warn");
      navigator.clipboard.writeText(result).catch(() => {});
    }
  }

  return (
    <main className="page-wrap">
      <div className="top-bar">
        <div className="top-bar-inner">
          <span style={{ fontWeight: 800, fontSize: 16 }}>📷 QR Scanner</span>
          {scanning && (
            <button className="btn btn-sm btn-ghost" onClick={toggleTorch}>
              {torch ? "🔦 ON" : "🔦 OFF"}
            </button>
          )}
        </div>
      </div>

      <div className="page-inner">
        {/* Camera viewfinder */}
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%", aspectRatio: "1/1", objectFit: "cover",
              display: scanning ? "block" : "none",
              background: "#000",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!scanning && !result && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 56, marginBottom: 12 }}>◻</p>
              <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 20 }}>
                Point your camera at a QR code to scan it
              </p>
              <button className="btn btn-primary" style={{ width: "auto", padding: "13px 28px" }} onClick={startCamera}>
                📷 Start Camera
              </button>
            </div>
          )}

          {scanning && (
            <>
              {/* Crosshair overlay */}
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                <div style={{ width: 200, height: 200, position: "relative" }}>
                  {[
                    { top: 0, left: 0, borderTop: "3px solid var(--blue)", borderLeft: "3px solid var(--blue)", borderRadius: "4px 0 0 0" },
                    { top: 0, right: 0, borderTop: "3px solid var(--blue)", borderRight: "3px solid var(--blue)", borderRadius: "0 4px 0 0" },
                    { bottom: 0, left: 0, borderBottom: "3px solid var(--blue)", borderLeft: "3px solid var(--blue)", borderRadius: "0 0 0 4px" },
                    { bottom: 0, right: 0, borderBottom: "3px solid var(--blue)", borderRight: "3px solid var(--blue)", borderRadius: "0 0 4px 0" },
                  ].map((style, i) => (
                    <div key={i} style={{ position: "absolute", width: 28, height: 28, ...style }} />
                  ))}
                  {/* Scan line */}
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: 2,
                    background: "var(--blue)", opacity: 0.8,
                    animation: "scanLine 2s ease-in-out infinite",
                  }} />
                </div>
              </div>
              <style>{`@keyframes scanLine { 0%,100% { top:10%; } 50% { top:85%; } }`}</style>
              <button
                className="btn btn-danger btn-sm"
                style={{ position: "absolute", bottom: 12, right: 12 }}
                onClick={stopCamera}
              >
                ✕ Stop
              </button>
            </>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="card fade-up" style={{ borderLeft: "3px solid var(--green)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--green)", marginBottom: 8, fontFamily: "var(--mono)" }}>
              ✓ QR Scanned
            </p>
            <p style={{ fontSize: 13, color: "var(--text2)", wordBreak: "break-all", marginBottom: 14, fontFamily: "var(--mono)" }}>
              {result}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={openResult}>
                🔗 Open
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(result); toast("Copied!", "ok"); }}>
                📋 Copy
              </button>
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => { setResult(null); startCamera(); }}>
                📷 Scan Another
              </button>
            </div>
          </div>
        )}

        {/* Manual entry fallback */}
        {!scanning && !result && (
          <div className="card" style={{ marginTop: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", marginBottom: 10, fontFamily: "var(--mono)" }}>
              Or enter session code manually
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="manualQRInput"
                style={{ flex: 1, padding: "11px 13px", border: "1px solid var(--line)", borderRadius: "var(--r1)", background: "var(--s2)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "var(--mono)" }}
                placeholder="Session ID or URL…"
                onKeyDown={e => { if (e.key === "Enter") handleManualEntry((e.target as HTMLInputElement).value); }}
              />
              <button className="btn btn-primary" style={{ width: "auto", padding: "11px 18px" }} onClick={() => {
                const el = document.getElementById("manualQRInput") as HTMLInputElement;
                handleManualEntry(el?.value || "");
              }}>
                Go
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
