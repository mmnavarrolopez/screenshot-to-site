import { format } from "date-fns";
import { es } from "date-fns/locale";
import { fromISO, type ISODate } from "./dates";

/** Deterministic money format (same output on server and browser). */
export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$ ${digits}`;
}

export function formatShort(iso: ISODate): string {
  return format(fromISO(iso), "d MMM", { locale: es });
}

export function formatLong(iso: ISODate): string {
  return format(fromISO(iso), "EEEE d 'de' MMMM", { locale: es });
}

export function formatMonth(year: number, month: number): string {
  return format(new Date(year, month, 1), "MMMM yyyy", { locale: es });
}

export function formatSpecialDay(mmdd: string): string {
  const [m, d] = mmdd.split("-").map(Number);
  return format(new Date(2000, m - 1, d), "d 'de' MMMM", { locale: es });
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
