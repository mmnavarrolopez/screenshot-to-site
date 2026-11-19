/**
 * Reads the data saved by the old browser-only demo (localStorage) so the admin can move it
 * to the database once. The browser copy is never deleted.
 */
import type { BlockedDate, Dog, Reservation, Settings } from "./types";

export const LEGACY_KEY = "hotel-canino-demo-v1";
const IMPORTED_KEY = "hotel-canino-demo-v1-importado";

export interface LegacyData {
  dogs: Dog[];
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  settings?: Partial<Settings> | undefined;
}

export interface LegacySummary {
  dogs: number;
  reservations: number;
  payments: number;
  blockedDates: number;
  importedAt: string | null;
}

export function readLegacyData(): LegacyData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegacyData>;
    return {
      dogs: Array.isArray(parsed.dogs) ? parsed.dogs : [],
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [],
      blockedDates: Array.isArray(parsed.blockedDates) ? parsed.blockedDates : [],
      settings: parsed.settings,
    };
  } catch {
    return null;
  }
}

/** Null when this browser holds no demo data worth importing. */
export function legacySummary(): LegacySummary | null {
  const data = readLegacyData();
  if (!data) return null;
  const summary: LegacySummary = {
    dogs: data.dogs.length,
    reservations: data.reservations.length,
    payments: data.reservations.reduce((n, r) => n + (r.payments?.length ?? 0), 0),
    blockedDates: data.blockedDates.length,
    importedAt: window.localStorage.getItem(IMPORTED_KEY),
  };
  const settingsUsed = !!(data.settings?.nightlyRate || data.settings?.bankAlias);
  if (!summary.dogs && !summary.reservations && !summary.blockedDates && !settingsUsed) return null;
  return summary;
}

export function markLegacyImported() {
  window.localStorage.setItem(IMPORTED_KEY, new Date().toISOString());
}
