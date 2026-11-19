/** Pure conversions between database rows (snake_case) and the app's types. */
import type { BlockedDate, Dog, Payment, Reservation, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  nightlyRate: 0,
  specialMultiplier: 2,
  specialDates: ["12-24", "12-25", "12-31", "01-01"],
  bankAlias: "",
  bankHolder: "",
  bankName: "",
  conditions: [],
};

export const SETTINGS_COLUMNS =
  "nightly_rate, special_multiplier, special_dates, bank_alias, bank_holder, bank_name, conditions";

export interface SettingsRow {
  nightly_rate: number | string;
  special_multiplier: number | string;
  special_dates: string[] | null;
  bank_alias: string | null;
  bank_holder: string | null;
  bank_name: string | null;
  conditions: string[] | null;
}

export interface DogRow {
  id: string;
  name: string;
  breed: string | null;
  owner_name: string | null;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  kind: Payment["kind"];
  amount: number | string;
  paid_on: string;
  note: string | null;
  created_at?: string;
}

export interface ReservationRow {
  id: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  check_in: string;
  check_out: string;
  checkout_time: string | null;
  status: Reservation["status"];
  total: number | string;
  notes: string | null;
  source: Reservation["source"];
  created_at: string;
  reservation_dogs?: { dog_id: string }[] | null;
  payments?: PaymentRow[] | null;
}

/** Row returned by the public function public_confirmed_stays (name + photo only). */
export interface ConfirmedStayRow {
  reservation_id: string;
  check_in: string;
  check_out: string;
  checkout_time: string | null;
  dog_id: string;
  dog_name: string;
  photo_path: string | null;
}

type ToUrl = (path: string) => string;

/** "13:00:00" → "13:00". */
export const hhmm = (t: string | null | undefined) => (t || "13:00").slice(0, 5);

export function settingsFromRow(row: SettingsRow | null | undefined): Settings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    nightlyRate: Number(row.nightly_rate) || 0,
    specialMultiplier: Number(row.special_multiplier) || 1,
    specialDates: row.special_dates ?? [],
    bankAlias: row.bank_alias ?? "",
    bankHolder: row.bank_holder ?? "",
    bankName: row.bank_name ?? "",
    conditions: row.conditions ?? [],
  };
}

export function settingsToRow(patch: Partial<Settings>): Partial<Record<keyof SettingsRow, unknown>> {
  const row: Partial<Record<keyof SettingsRow, unknown>> = {};
  if (patch.nightlyRate !== undefined) row.nightly_rate = patch.nightlyRate;
  if (patch.specialMultiplier !== undefined) row.special_multiplier = patch.specialMultiplier;
  if (patch.specialDates !== undefined) row.special_dates = patch.specialDates;
  if (patch.bankAlias !== undefined) row.bank_alias = patch.bankAlias;
  if (patch.bankHolder !== undefined) row.bank_holder = patch.bankHolder;
  if (patch.bankName !== undefined) row.bank_name = patch.bankName;
  if (patch.conditions !== undefined) row.conditions = patch.conditions;
  return row;
}

export function dogFromRow(row: DogRow, toUrl: ToUrl): Dog {
  return {
    id: row.id,
    name: row.name,
    breed: row.breed ?? undefined,
    ownerName: row.owner_name ?? undefined,
    notes: row.notes ?? undefined,
    photo: row.photo_path ? toUrl(row.photo_path) : undefined,
    createdAt: row.created_at,
  };
}

export function paymentFromRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    kind: row.kind,
    amount: Number(row.amount) || 0,
    date: row.paid_on,
    note: row.note ?? undefined,
  };
}

export function reservationFromRow(row: ReservationRow): Reservation {
  const payments = (row.payments ?? [])
    .slice()
    .sort((a, b) => a.paid_on.localeCompare(b.paid_on) || (a.created_at ?? "").localeCompare(b.created_at ?? ""))
    .map(paymentFromRow);
  return {
    id: row.id,
    ownerName: row.owner_name,
    phone: row.phone ?? "",
    email: row.email ?? undefined,
    dogIds: (row.reservation_dogs ?? []).map((d) => d.dog_id),
    checkIn: row.check_in,
    checkOut: row.check_out,
    checkoutTime: hhmm(row.checkout_time),
    status: row.status,
    total: Number(row.total) || 0,
    payments,
    notes: row.notes ?? undefined,
    source: row.source,
    createdAt: row.created_at,
  };
}

export function blockedFromRow(row: { date: string; reason: string | null }): BlockedDate {
  return { date: row.date, reason: row.reason ?? undefined };
}

/**
 * Builds the public view from confirmed stays: confirmed reservations without any personal
 * data (no owner, phone, email, notes or payments) and dogs with only name + photo, so the
 * same availability rules (rules.ts) run unchanged on public pages.
 */
export function publicFromStays(rows: ConfirmedStayRow[], toUrl: ToUrl) {
  const reservations = new Map<string, Reservation>();
  const dogs = new Map<string, Dog>();
  for (const row of rows) {
    let r = reservations.get(row.reservation_id);
    if (!r) {
      r = {
        id: row.reservation_id,
        ownerName: "",
        phone: "",
        dogIds: [],
        checkIn: row.check_in,
        checkOut: row.check_out,
        checkoutTime: hhmm(row.checkout_time),
        status: "confirmed",
        total: 0,
        payments: [],
        source: "public",
        createdAt: "",
      };
      reservations.set(row.reservation_id, r);
    }
    if (!r.dogIds.includes(row.dog_id)) r.dogIds.push(row.dog_id);
    if (!dogs.has(row.dog_id)) {
      dogs.set(row.dog_id, {
        id: row.dog_id,
        name: row.dog_name,
        photo: row.photo_path ? toUrl(row.photo_path) : undefined,
        createdAt: "",
      });
    }
  }
  return { reservations: [...reservations.values()], dogs: [...dogs.values()] };
}
