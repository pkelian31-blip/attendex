"use client";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Home",
    path: "/",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "var(--blue)" : "none"} stroke="currentColor" strokeWidth={2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: "Scanner",
    path: "/scanner",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M17 3h2a2 2 0 0 1 2 2v2" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <rect x="7" y="7" width="10" height="10" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
      </svg>
    ),
  },
  {
    label: "QR",
    path: "/qr",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <rect x="14" y="3" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <rect x="3" y="14" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M14 14h3v3" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M20 14v.01" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M17 20h3" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <path d="M20 17v3" style={{ stroke: active ? "var(--blue)" : undefined }}/>
      </svg>
    ),
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <rect x="14" y="3" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <rect x="3" y="14" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
        <rect x="14" y="14" width="7" height="7" rx="1" style={{ stroke: active ? "var(--blue)" : undefined }}/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const isStudent = pathname.startsWith("/student");
  if (isStudent) return null; // hide nav on student scan page

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ label, path, icon }) => {
        const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
        return (
          <button
            key={path}
            className={cx("nav-item", active ? "active" : "")}
            onClick={() => router.push(path)}
            aria-label={label}
          >
            {icon(active)}
            <span>{label}</span>
          </button>
        );
      })}
      {/* Programmer watermark — always visible */}
      <div style={{
        position: "absolute", bottom: "calc(var(--sab) + 2px)", left: 0, right: 0,
        textAlign: "center", fontSize: 8, color: "var(--text3)", fontFamily: "var(--mono)",
        opacity: 0.45, letterSpacing: "0.04em", pointerEvents: "none",
      }}>
        KЭL ♛ PHANTOM
      </div>
    </nav>
  );
}
