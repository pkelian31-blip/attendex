"use client";
import { useEffect, useRef, createContext, useContext, useState, useCallback } from "react";

type ToastType = "ok" | "err" | "warn" | "info";
interface ToastItem { id: number; msg: string; type: ToastType; }

const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {});

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const emoji = { ok: "✓", err: "✕", warn: "⚠", info: "ℹ" };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{
            background: t.type === "ok"   ? "var(--green)" :
                        t.type === "err"  ? "var(--red)"   :
                        t.type === "warn" ? "var(--gold)"  : "var(--text)"
          }}>
            {emoji[t.type]} {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
