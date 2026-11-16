import type { ISODate } from "./dates";

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Dog {
  id: string;
  name: string;
  /** Image URL (data URL in demo mode, storage URL once the database is connected). */
  photo?: string;
  breed?: string;
  ownerName?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  kind: "deposit" | "balance";
  amount: number;
  date: ISODate;
  note?: string;
}

export interface Reservation {
  id: string;
  ownerName: string;
  phone: string;
  email?: string;
  dogIds: string[];
  checkIn: ISODate;
  checkOut: ISODate;
  /** "HH:MM" — leaving after the checkout limit adds one night. */
  checkoutTime: string;
  status: ReservationStatus;
  total: number;
  payments: Payment[];
  notes?: string;
  source: "public" | "admin";
  createdAt: string;
}

export interface BlockedDate {
  date: ISODate;
  reason?: string;
}

export interface Settings {
  nightlyRate: number;
  specialMultiplier: number;
  /** "MM-DD" dates charged at the special (holiday) rate. */
  specialDates: string[];
  bankAlias: string;
  bankHolder: string;
  bankName: string;
  conditions: string[];
}
