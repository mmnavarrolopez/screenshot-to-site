/**
 * DEMO data layer — keeps everything in this browser (localStorage) and starts EMPTY.
 * Every action mirrors a future server function: when the database is connected, replace
 * these bodies with server calls that re-run the same rules (rules.ts) before writing.
 */
import { useSyncExternalStore } from "react";
import { todayISO, type ISODate } from "./dates";
import {
  MAX_DOGS,
  checkAvailability,
  chargedNights,
  quoteStay,
  type AvailabilityResult,
} from "./rules";
import type { BlockedDate, Dog, Payment, Reservation, Settings } from "./types";

const STORAGE_KEY = "hotel-canino-demo-v1";

export const DEFAULT_SETTINGS: Settings = {
  nightlyRate: 0,
  specialMultiplier: 2,
  specialDates: ["12-24", "12-25", "12-31", "01-01"],
  bankAlias: "",
  bankHolder: "",
  bankName: "",
  conditions: [
    "Capacidad máxima de 6 perros alojados al mismo tiempo.",
    "La reserva se confirma al recibir la seña del 50% por transferencia.",
    "El día de salida, el retiro hasta las 13:00 no suma una noche adicional. Después de esa hora se cobra una noche más.",
    "Las fechas de Navidad y Año Nuevo tienen tarifa doble.",
    "Vacunas al día y desparasitación reciente (presentar libreta sanitaria).",
    "Informar alimentación, medicación y cualquier cuidado especial al ingresar.",
  ],
};

export interface HotelState {
  dogs: Dog[];
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  settings: Settings;
  adminSession: boolean;
}

const INITIAL: HotelState = {
  dogs: [],
  reservations: [],
  blockedDates: [],
  settings: DEFAULT_SETTINGS,
  adminSession: false,
};

let state: HotelState = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): HotelState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<HotelState>;
    return {
      ...INITIAL,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return INITIAL;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = readStorage();
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = readStorage();
    listeners.forEach((l) => l());
  });
}

export class StorageFullError extends Error {}

function commit(next: HotelState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new StorageFullError(
      "El almacenamiento de demostración está lleno. Probá con fotos más livianas.",
    );
  }
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

function getServerSnapshot() {
  return INITIAL;
}

export function useHotel(): HotelState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function run<T>(fn: () => ActionResult<T>): ActionResult<T> {
  ensureLoaded();
  try {
    return fn();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ocurrió un error inesperado." };
  }
}

export function availabilityMessage(result: AvailabilityResult): string {
  if (result.ok) return "";
  switch (result.reason) {
    case "invalid-range":
      return "La fecha de salida debe ser posterior a la de ingreso.";
    case "no-dogs":
      return "Agregá al menos un perro.";
    case "too-many-dogs":
      return `No se pueden alojar más de ${MAX_DOGS} perros al mismo tiempo.`;
    case "unavailable": {
      const blocked = result.conflicts.some((c) => c.blocked);
      if (blocked) return "Algunas de las fechas elegidas no están disponibles.";
      return result.minFree <= 0
        ? "No quedan lugares para alguna de las noches elegidas."
        : `Solo quedan ${result.minFree} lugar(es) para alguna de las noches elegidas.`;
    }
  }
}

const blockedList = (s: HotelState) => s.blockedDates.map((b) => b.date);

/* ---------------------------- Public request ---------------------------- */

export interface PublicRequestInput {
  ownerName: string;
  phone: string;
  email?: string | undefined;
  checkIn: ISODate;
  checkOut: ISODate;
  checkoutTime: string;
  notes?: string | undefined;
  dogs: { name: string; breed?: string; photo?: string | undefined; notes?: string }[];
}

export function submitPublicRequest(input: PublicRequestInput): ActionResult<Reservation> {
  return run(() => {
    if (input.checkIn < todayISO()) {
      return { ok: false, error: "La fecha de ingreso no puede ser anterior a hoy." };
    }
    const availability = checkAvailability(
      { ...input, dogCount: input.dogs.length },
      state.reservations,
      blockedList(state),
    );
    if (!availability.ok) return { ok: false, error: availabilityMessage(availability) };

    const now = new Date().toISOString();
    const newDogs: Dog[] = input.dogs.map((d) => ({
      id: uid(),
      name: d.name.trim(),
      breed: d.breed?.trim() || undefined,
      photo: d.photo,
      notes: d.notes?.trim() || undefined,
      ownerName: input.ownerName.trim(),
      createdAt: now,
    }));
    const quote = quoteStay({ ...input, dogCount: newDogs.length }, state.settings);
    const reservation: Reservation = {
      id: uid(),
      ownerName: input.ownerName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      dogIds: newDogs.map((d) => d.id),
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      checkoutTime: input.checkoutTime,
      status: "pending",
      total: quote.total,
      payments: [],
      notes: input.notes?.trim() || undefined,
      source: "public",
      createdAt: now,
    };
    commit({
      ...state,
      dogs: [...state.dogs, ...newDogs],
      reservations: [...state.reservations, reservation],
    });
    return { ok: true, data: reservation };
  });
}

/* ------------------------------ Admin: auth ------------------------------ */

export function demoSignIn() {
  run(() => {
    commit({ ...state, adminSession: true });
    return { ok: true, data: undefined };
  });
}

export function demoSignOut() {
  run(() => {
    commit({ ...state, adminSession: false });
    return { ok: true, data: undefined };
  });
}

/* --------------------------- Admin: reservations -------------------------- */

export interface ReservationDraft {
  ownerName: string;
  phone: string;
  email?: string | undefined;
  dogIds: string[];
  checkIn: ISODate;
  checkOut: ISODate;
  checkoutTime: string;
  notes?: string | undefined;
  total: number;
}

function validateDraft(draft: ReservationDraft): string | null {
  if (!draft.ownerName.trim()) return "Ingresá el nombre del responsable.";
  if (draft.dogIds.length === 0) return "Seleccioná al menos un perro.";
  if (chargedNights(draft.checkIn, draft.checkOut, draft.checkoutTime).length === 0) {
    return "La fecha de salida debe ser posterior a la de ingreso.";
  }
  return null;
}

export function createAdminReservation(
  draft: ReservationDraft,
  options: { confirm: boolean; deposit?: number },
): ActionResult<Reservation> {
  return run(() => {
    const invalid = validateDraft(draft);
    if (invalid) return { ok: false, error: invalid };
    if (options.confirm) {
      const availability = checkAvailability(
        { ...draft, dogCount: draft.dogIds.length },
        state.reservations,
        blockedList(state),
      );
      if (!availability.ok) return { ok: false, error: availabilityMessage(availability) };
    }
    const payments: Payment[] =
      options.confirm && options.deposit && options.deposit > 0
        ? [{ id: uid(), kind: "deposit", amount: options.deposit, date: todayISO() }]
        : [];
    const reservation: Reservation = {
      id: uid(),
      ownerName: draft.ownerName.trim(),
      phone: draft.phone.trim(),
      email: draft.email?.trim() || undefined,
      dogIds: draft.dogIds,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      checkoutTime: draft.checkoutTime,
      status: options.confirm ? "confirmed" : "pending",
      total: draft.total,
      payments,
      notes: draft.notes?.trim() || undefined,
      source: "admin",
      createdAt: new Date().toISOString(),
    };
    commit({ ...state, reservations: [...state.reservations, reservation] });
    return { ok: true, data: reservation };
  });
}

export function updateReservation(id: string, draft: ReservationDraft): ActionResult {
  return run(() => {
    const current = state.reservations.find((r) => r.id === id);
    if (!current) return { ok: false, error: "La reserva ya no existe." };
    const invalid = validateDraft(draft);
    if (invalid) return { ok: false, error: invalid };
    if (current.status === "confirmed") {
      const availability = checkAvailability(
        { ...draft, dogCount: draft.dogIds.length },
        state.reservations,
        blockedList(state),
        id,
      );
      if (!availability.ok) return { ok: false, error: availabilityMessage(availability) };
    }
    commit({
      ...state,
      reservations: state.reservations.map((r) =>
        r.id === id
          ? {
              ...r,
              ...draft,
              ownerName: draft.ownerName.trim(),
              phone: draft.phone.trim(),
              email: draft.email?.trim() || undefined,
              notes: draft.notes?.trim() || undefined,
            }
          : r,
      ),
    });
    return { ok: true, data: undefined };
  });
}

/** Confirms a pending request after the deposit was received. Re-checks capacity. */
export function confirmReservation(id: string, depositAmount: number): ActionResult {
  return run(() => {
    const current = state.reservations.find((r) => r.id === id);
    if (!current) return { ok: false, error: "La reserva ya no existe." };
    if (current.status === "confirmed") return { ok: false, error: "La reserva ya está confirmada." };
    const availability = checkAvailability(
      {
        checkIn: current.checkIn,
        checkOut: current.checkOut,
        checkoutTime: current.checkoutTime,
        dogCount: current.dogIds.length,
      },
      state.reservations,
      blockedList(state),
      id,
    );
    if (!availability.ok) return { ok: false, error: availabilityMessage(availability) };
    const payments =
      depositAmount > 0
        ? [
            ...current.payments,
            { id: uid(), kind: "deposit" as const, amount: depositAmount, date: todayISO() },
          ]
        : current.payments;
    commit({
      ...state,
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status: "confirmed", payments } : r,
      ),
    });
    return { ok: true, data: undefined };
  });
}

export function cancelReservation(id: string): ActionResult {
  return run(() => {
    commit({
      ...state,
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status: "cancelled" } : r,
      ),
    });
    return { ok: true, data: undefined };
  });
}

export function reopenReservation(id: string): ActionResult {
  return run(() => {
    commit({
      ...state,
      reservations: state.reservations.map((r) => (r.id === id ? { ...r, status: "pending" } : r)),
    });
    return { ok: true, data: undefined };
  });
}

export function addPayment(id: string, payment: Omit<Payment, "id">): ActionResult {
  return run(() => {
    if (!(payment.amount > 0)) return { ok: false, error: "Ingresá un monto mayor a cero." };
    commit({
      ...state,
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, payments: [...r.payments, { ...payment, id: uid() }] } : r,
      ),
    });
    return { ok: true, data: undefined };
  });
}

export function removePayment(reservationId: string, paymentId: string): ActionResult {
  return run(() => {
    commit({
      ...state,
      reservations: state.reservations.map((r) =>
        r.id === reservationId
          ? { ...r, payments: r.payments.filter((p) => p.id !== paymentId) }
          : r,
      ),
    });
    return { ok: true, data: undefined };
  });
}

/* -------------------------------- Admin: dogs ------------------------------- */

export function saveDog(dog: Omit<Dog, "id" | "createdAt"> & { id?: string | undefined }): ActionResult<Dog> {
  return run(() => {
    if (!dog.name.trim()) return { ok: false, error: "Ingresá el nombre del perro." };
    if (dog.id) {
      const existing = state.dogs.find((d) => d.id === dog.id);
      if (!existing) return { ok: false, error: "El perro ya no existe." };
      const updated: Dog = { ...existing, ...dog, id: existing.id, name: dog.name.trim() };
      commit({ ...state, dogs: state.dogs.map((d) => (d.id === dog.id ? updated : d)) });
      return { ok: true, data: updated };
    }
    const created: Dog = { ...dog, id: uid(), name: dog.name.trim(), createdAt: new Date().toISOString() };
    commit({ ...state, dogs: [...state.dogs, created] });
    return { ok: true, data: created };
  });
}

export function deleteDog(id: string): ActionResult {
  return run(() => {
    const inUse = state.reservations.some((r) => r.status !== "cancelled" && r.dogIds.includes(id));
    if (inUse) {
      return { ok: false, error: "Este perro tiene reservas activas. Cancelalas antes de eliminarlo." };
    }
    commit({ ...state, dogs: state.dogs.filter((d) => d.id !== id) });
    return { ok: true, data: undefined };
  });
}

/* ---------------------------- Admin: blocked dates --------------------------- */

export function setBlocked(date: ISODate, blocked: boolean, reason?: string | undefined): ActionResult {
  return run(() => {
    const rest = state.blockedDates.filter((b) => b.date !== date);
    commit({
      ...state,
      blockedDates: blocked ? [...rest, { date, reason: reason?.trim() || undefined }] : rest,
    });
    return { ok: true, data: undefined };
  });
}

/* ------------------------------ Admin: settings ------------------------------ */

export function updateSettings(patch: Partial<Settings>): ActionResult {
  return run(() => {
    commit({ ...state, settings: { ...state.settings, ...patch } });
    return { ok: true, data: undefined };
  });
}

export function resetDemoData(): ActionResult {
  return run(() => {
    commit({ ...INITIAL, adminSession: true });
    return { ok: true, data: undefined };
  });
}
