/**
 * Hotel Canino booking rules — pure functions shared by the UI and (later) the server.
 * Keep every capacity / pricing decision here so the server can reuse it verbatim.
 */
import { rangeISO, type ISODate } from "./dates";
import type { Dog, Reservation, Settings } from "./types";

export const MAX_DOGS = 6;
export const DEPOSIT_RATE = 0.5;
export const CHECKOUT_LIMIT = "13:00";

/** Nights that are charged and occupy a spot. Leaving after 13:00 adds the checkout day. */
export function chargedNights(
  checkIn: ISODate,
  checkOut: ISODate,
  checkoutTime: string = CHECKOUT_LIMIT,
): ISODate[] {
  if (!checkIn || !checkOut || checkOut <= checkIn) return [];
  const nights = rangeISO(checkIn, checkOut);
  if (isLateCheckout(checkoutTime)) nights.push(checkOut);
  return nights;
}

export function isLateCheckout(checkoutTime: string): boolean {
  return checkoutTime > CHECKOUT_LIMIT;
}

export function isSpecialDate(iso: ISODate, specialDates: string[]): boolean {
  return specialDates.includes(iso.slice(5));
}

/** Dogs lodged per night. Only confirmed reservations take a spot. */
export function occupancyByDate(
  reservations: Reservation[],
  excludeReservationId?: string,
): Map<ISODate, number> {
  const map = new Map<ISODate, number>();
  for (const r of reservations) {
    if (r.status !== "confirmed" || r.id === excludeReservationId) continue;
    for (const night of chargedNights(r.checkIn, r.checkOut, r.checkoutTime)) {
      map.set(night, (map.get(night) ?? 0) + r.dogIds.length);
    }
  }
  return map;
}

export interface StayInput {
  checkIn: ISODate;
  checkOut: ISODate;
  checkoutTime: string;
  dogCount: number;
}

export type AvailabilityResult =
  | { ok: true; minFree: number; nights: ISODate[] }
  | {
      ok: false;
      reason: "invalid-range" | "no-dogs" | "too-many-dogs" | "unavailable";
      conflicts: { date: ISODate; free: number; blocked: boolean }[];
      minFree: number;
      nights: ISODate[];
    };

export function checkAvailability(
  stay: StayInput,
  reservations: Reservation[],
  blockedDates: ISODate[],
  excludeReservationId?: string,
): AvailabilityResult {
  const nights = chargedNights(stay.checkIn, stay.checkOut, stay.checkoutTime);
  if (nights.length === 0) {
    return { ok: false, reason: "invalid-range", conflicts: [], minFree: 0, nights };
  }
  const occupancy = occupancyByDate(reservations, excludeReservationId);
  const blocked = new Set(blockedDates);
  let minFree = MAX_DOGS;
  const conflicts: { date: ISODate; free: number; blocked: boolean }[] = [];
  for (const night of nights) {
    const free = blocked.has(night) ? 0 : MAX_DOGS - (occupancy.get(night) ?? 0);
    minFree = Math.min(minFree, free);
    if (blocked.has(night) || free < stay.dogCount) {
      conflicts.push({ date: night, free: Math.max(free, 0), blocked: blocked.has(night) });
    }
  }
  if (stay.dogCount < 1) return { ok: false, reason: "no-dogs", conflicts, minFree, nights };
  if (stay.dogCount > MAX_DOGS) {
    return { ok: false, reason: "too-many-dogs", conflicts, minFree, nights };
  }
  if (conflicts.length > 0) return { ok: false, reason: "unavailable", conflicts, minFree, nights };
  return { ok: true, minFree, nights };
}

export interface QuoteLine {
  date: ISODate;
  rate: number;
  special: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  nights: number;
  specialNights: number;
  lateCheckout: boolean;
  perDog: number;
  dogCount: number;
  total: number;
  deposit: number;
  balance: number;
}

export function quoteStay(stay: StayInput, settings: Settings): Quote {
  const lines = chargedNights(stay.checkIn, stay.checkOut, stay.checkoutTime).map((date) => {
    const special = isSpecialDate(date, settings.specialDates);
    return {
      date,
      special,
      rate: settings.nightlyRate * (special ? settings.specialMultiplier : 1),
    };
  });
  const perDog = lines.reduce((sum, l) => sum + l.rate, 0);
  const dogCount = Math.max(stay.dogCount, 0);
  const total = perDog * dogCount;
  const deposit = Math.round(total * DEPOSIT_RATE);
  return {
    lines,
    nights: lines.length,
    specialNights: lines.filter((l) => l.special).length,
    lateCheckout: isLateCheckout(stay.checkoutTime),
    perDog,
    dogCount,
    total,
    deposit,
    balance: total - deposit,
  };
}

export function depositFor(total: number): number {
  return Math.round(total * DEPOSIT_RATE);
}

export function paidTotal(r: Reservation): number {
  return r.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function balanceDue(r: Reservation): number {
  return Math.max(r.total - paidTotal(r), 0);
}

/** Confirmed dogs sharing at least one night with the given stay (public-safe list). */
export function stayCompanions(
  stay: Omit<StayInput, "dogCount">,
  reservations: Reservation[],
  dogs: Dog[],
  excludeReservationId?: string,
): Dog[] {
  const wanted = new Set(chargedNights(stay.checkIn, stay.checkOut, stay.checkoutTime));
  if (wanted.size === 0) return [];
  const ids = new Set<string>();
  for (const r of reservations) {
    if (r.status !== "confirmed" || r.id === excludeReservationId) continue;
    if (chargedNights(r.checkIn, r.checkOut, r.checkoutTime).some((n) => wanted.has(n))) {
      r.dogIds.forEach((id) => ids.add(id));
    }
  }
  return dogs.filter((d) => ids.has(d.id));
}

/** Reservations (any status) that touch a given night. */
export function reservationsOnNight(reservations: Reservation[], night: ISODate): Reservation[] {
  return reservations.filter((r) =>
    chargedNights(r.checkIn, r.checkOut, r.checkoutTime).includes(night),
  );
}
