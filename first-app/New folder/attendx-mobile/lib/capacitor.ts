"use client";
// Capacitor plugin helpers — gracefully fall back to web APIs when running in browser

export async function vibrate(duration = 50) {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (navigator.vibrate) navigator.vibrate(duration);
  }
}

export async function getGeolocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
    return {
      lat:      pos.coords.latitude,
      lng:      pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch {
    // Web fallback
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        (e) => { if (e.code !== 1) reject(e); }, // suppress permission denied
        { enableHighAccuracy: true, timeout: 20000 }
      );
    });
  }
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as typeof window & { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
}
