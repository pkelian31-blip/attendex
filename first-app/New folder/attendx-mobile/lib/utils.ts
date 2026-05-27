// Escape HTML to prevent XSS
export function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Haversine distance in metres
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Friendly time display
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000)  return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// Format ms countdown → MM:SS
export function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const m  = Math.floor(ms / 60000);
  const sc = Math.floor((ms % 60000) / 1000);
  return String(m).padStart(2, "0") + ":" + String(sc).padStart(2, "0");
}

// Get or create stable device ID
export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("ax_device_id");
  if (!id) {
    id = "D" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7).toUpperCase();
    localStorage.setItem("ax_device_id", id);
  }
  return id;
}

// Arrival rank label
export function rankLabel(n: number): string {
  if (n === 1) return "🥇 1st to arrive!";
  if (n === 2) return "🥈 2nd to arrive";
  if (n === 3) return "🥉 3rd to arrive";
  return `🏅 #${n} to arrive`;
}

// Class names helper (simple cx)
export function cx(...args: (string | undefined | null | false)[]): string {
  return args.filter(Boolean).join(" ");
}
