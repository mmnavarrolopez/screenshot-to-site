/** Calendar dates are plain "YYYY-MM-DD" strings (local, no time zone) to avoid TZ drift. */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

/** Every date from start (inclusive) to end (exclusive). */
export function rangeISO(start: ISODate, endExclusive: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cur = start;
  let guard = 0;
  while (cur < endExclusive && guard < 800) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
    guard++;
  }
  return out;
}

/** Month grid starting on Monday; null = padding cell. */
export function monthGrid(year: number, month: number): (ISODate | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (ISODate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isValidISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toISO(fromISO(value)) === value;
}
