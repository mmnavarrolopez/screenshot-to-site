/**
 * Data layer backed by the owner's own Supabase project. Components only use these actions.
 *
 * - Public visitors: settings, blocked dates and confirmed stays (dog name + photo only).
 *   Requests go through the SQL function submit_booking_request, which re-checks every rule.
 * - Admin (signed in with the admin role): full data; bookings are saved with the SQL functions
 *   admin_save_reservation / admin_confirm_reservation, which mirror rules.ts.
 */
import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysISO, todayISO, type ISODate } from "./dates";
import { MAX_DOGS, type AvailabilityResult } from "./rules";
import type { BlockedDate, Dog, Payment, Reservation, Settings } from "./types";
import {
  DEFAULT_SETTINGS,
  SETTINGS_COLUMNS,
  blockedFromRow,
  dogFromRow,
  publicFromStays,
  reservationFromRow,
  settingsFromRow,
  settingsToRow,
  type ConfirmedStayRow,
  type DogRow,
  type ReservationRow,
  type SettingsRow,
} from "./mapping";
import { getSupabase, photoPathFromUrl, photoUrl, removePhoto, uploadPhoto } from "./supabase";
import { markLegacyImported, readLegacyData } from "./legacy-import";

export { DEFAULT_SETTINGS };

export interface HotelState {
  dogs: Dog[];
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  settings: Settings;
  /** True when a signed-in user with the admin role is loaded. */
  adminSession: boolean;
  adminEmail?: string | undefined;
  status: "loading" | "ready" | "error";
  /** False until the saved sign-in (if any) has been checked. */
  authReady: boolean;
}

const INITIAL: HotelState = {
  dogs: [],
  reservations: [],
  blockedDates: [],
  settings: DEFAULT_SETTINGS,
  adminSession: false,
  status: "loading",
  authReady: false,
};

let state: HotelState = INITIAL;
let started = false;
let seq = 0;
const listeners = new Set<() => void>();

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Keeps unchanged items as the same objects so open forms are not reset by a refresh. */
function reuseList<T extends { id?: string; date?: string }>(prev: T[], next: T[]): T[] {
  const key = (t: T) => t.id ?? t.date ?? "";
  const byKey = new Map(prev.map((p) => [key(p), p]));
  const out = next.map((n) => {
    const p = byKey.get(key(n));
    return p && same(p, n) ? p : n;
  });
  return out.length === prev.length && out.every((o, i) => o === prev[i]) ? prev : out;
}

function apply(next: HotelState) {
  state = {
    ...next,
    dogs: reuseList(state.dogs, next.dogs),
    reservations: reuseList(state.reservations, next.reservations),
    blockedDates: reuseList(state.blockedDates, next.blockedDates),
    settings: same(state.settings, next.settings) ? state.settings : next.settings,
  };
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refresh();
  getSupabase().auth.onAuthStateChange((event) => {
    // Never await Supabase calls inside this callback; defer them.
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => void refresh(), 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.adminSession) void refresh();
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

export function useHotel(): HotelState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* --------------------------------- Loading --------------------------------- */

function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

async function loadShared(sb: SupabaseClient) {
  const [settingsRes, blockedRes] = await Promise.all([
    sb.from("settings").select(SETTINGS_COLUMNS).single(),
    sb.from("blocked_dates").select("date, reason").order("date"),
  ]);
  return {
    settings: settingsFromRow(must(settingsRes) as SettingsRow),
    blockedDates: ((must(blockedRes) ?? []) as { date: string; reason: string | null }[]).map(blockedFromRow),
  };
}

async function loadPublic(sb: SupabaseClient) {
  const today = todayISO();
  const [shared, staysRes] = await Promise.all([
    loadShared(sb),
    sb.rpc("public_confirmed_stays", { p_from: addDaysISO(today, -30), p_to: addDaysISO(today, 370) }),
  ]);
  const { reservations, dogs } = publicFromStays((must(staysRes) ?? []) as ConfirmedStayRow[], photoUrl);
  return { ...shared, reservations, dogs };
}

async function loadAdmin(sb: SupabaseClient) {
  const [shared, dogsRes, resRes] = await Promise.all([
    loadShared(sb),
    sb.from("dogs").select("*").order("name"),
    sb
      .from("reservations")
      .select("*, reservation_dogs(dog_id), payments(*)")
      .order("check_in", { ascending: false }),
  ]);
  return {
    ...shared,
    dogs: ((must(dogsRes) ?? []) as DogRow[]).map((d) => dogFromRow(d, photoUrl)),
    reservations: ((must(resRes) ?? []) as ReservationRow[]).map(reservationFromRow),
  };
}

/** Reloads everything the current visitor is allowed to see. */
export async function refresh(): Promise<void> {
  const my = ++seq;
  const sb = getSupabase();
  try {
    const {
      data: { session },
    } = await sb.auth.getSession();
    let isAdmin = false;
    if (session) {
      const { data, error } = await sb.rpc("is_admin");
      isAdmin = !error && data === true;
    }
    const data = isAdmin ? await loadAdmin(sb) : await loadPublic(sb);
    if (my !== seq) return;
    apply({
      ...data,
      adminSession: isAdmin,
      adminEmail: isAdmin ? session?.user.email : undefined,
      status: "ready",
      authReady: true,
    });
  } catch {
    if (my !== seq) return;
    state = { ...state, status: "error", authReady: true };
    listeners.forEach((l) => l());
  }
}

/* --------------------------------- Helpers --------------------------------- */

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function errorText(e: unknown): string {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  if (!msg || /failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
  }
  if (/jwt|permission denied|row-level security|no autorizado/i.test(msg)) {
    return "No tenés permiso para esta acción. Volvé a iniciar sesión.";
  }
  if (/violates|invalid input syntax|out of range/i.test(msg)) {
    return "No se pudo guardar: revisá los datos ingresados.";
  }
  return msg;
}

async function act<T>(fn: (sb: SupabaseClient) => Promise<T>, reload = true): Promise<ActionResult<T>> {
  try {
    const data = await fn(getSupabase());
    if (reload) await refresh();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

/** Updates/deletes hidden by security rules return no rows instead of an error. */
function mustAffect<T>(res: { data: T[] | null; error: unknown }) {
  const rows = must(res);
  if (!rows || rows.length === 0) throw new Error("No autorizado o el registro ya no existe.");
  return rows;
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

export function submitPublicRequest(input: PublicRequestInput): Promise<ActionResult<Reservation>> {
  return act(async (sb) => {
    if (input.checkIn < todayISO()) throw new Error("La fecha de ingreso no puede ser anterior a hoy.");
    const dogs = [];
    for (const d of input.dogs) {
      const photo_path = d.photo?.startsWith("data:") ? await uploadPhoto(d.photo, "solicitudes") : null;
      dogs.push({ name: d.name, breed: d.breed ?? "", notes: d.notes ?? "", photo_path });
    }
    const result = must(
      await sb.rpc("submit_booking_request", {
        p_owner_name: input.ownerName,
        p_phone: input.phone,
        p_email: input.email ?? "",
        p_check_in: input.checkIn,
        p_check_out: input.checkOut,
        p_checkout_time: input.checkoutTime,
        p_notes: input.notes ?? "",
        p_dogs: dogs,
      }),
    ) as { id: string; total: number | string };
    const reservation: Reservation = {
      id: result.id,
      ownerName: input.ownerName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      dogIds: [],
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      checkoutTime: input.checkoutTime,
      status: "pending",
      total: Number(result.total) || 0,
      payments: [],
      notes: input.notes?.trim() || undefined,
      source: "public",
      createdAt: new Date().toISOString(),
    };
    return reservation;
  }, false);
}

/* ------------------------------ Admin: auth ------------------------------ */

export async function signIn(email: string, password: string): Promise<ActionResult> {
  const sb = getSupabase();
  try {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        return { ok: false, error: "Email o contraseña incorrectos." };
      }
      if (/email not confirmed/i.test(error.message)) {
        return { ok: false, error: "Este correo todavía no fue confirmado en Supabase." };
      }
      return { ok: false, error: errorText(error) };
    }
    const { data: isAdmin, error: roleError } = await sb.rpc("is_admin");
    if (roleError || isAdmin !== true) {
      await sb.auth.signOut();
      return { ok: false, error: "Esta cuenta no tiene permiso de administrador." };
    }
    await refresh();
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut().catch(() => undefined);
  await refresh();
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

function draftArgs(draft: ReservationDraft) {
  return {
    p_owner_name: draft.ownerName,
    p_phone: draft.phone,
    p_email: draft.email ?? "",
    p_dog_ids: draft.dogIds,
    p_check_in: draft.checkIn,
    p_check_out: draft.checkOut,
    p_checkout_time: draft.checkoutTime,
    p_notes: draft.notes ?? "",
    p_total: draft.total,
  };
}

export function createAdminReservation(
  draft: ReservationDraft,
  options: { confirm: boolean; deposit?: number },
): Promise<ActionResult<string>> {
  return act(
    async (sb) =>
      must(
        await sb.rpc("admin_save_reservation", {
          p_id: null,
          ...draftArgs(draft),
          p_confirm: options.confirm,
          p_deposit: options.confirm ? (options.deposit ?? 0) : 0,
        }),
      ) as string,
  );
}

export function updateReservation(id: string, draft: ReservationDraft): Promise<ActionResult> {
  return act(async (sb) => {
    must(
      await sb.rpc("admin_save_reservation", { p_id: id, ...draftArgs(draft), p_confirm: false, p_deposit: 0 }),
    );
    return undefined;
  });
}

/** Confirms a pending request after the deposit was received. The database re-checks capacity. */
export function confirmReservation(id: string, depositAmount: number): Promise<ActionResult> {
  return act(async (sb) => {
    must(await sb.rpc("admin_confirm_reservation", { p_id: id, p_deposit: depositAmount }));
    return undefined;
  });
}

function setStatus(id: string, status: Reservation["status"]): Promise<ActionResult> {
  return act(async (sb) => {
    mustAffect(await sb.from("reservations").update({ status }).eq("id", id).select("id"));
    return undefined;
  });
}

export const cancelReservation = (id: string) => setStatus(id, "cancelled");
export const reopenReservation = (id: string) => setStatus(id, "pending");

export function addPayment(id: string, payment: Omit<Payment, "id">): Promise<ActionResult> {
  return act(async (sb) => {
    if (!(payment.amount > 0)) throw new Error("Ingresá un monto mayor a cero.");
    must(
      await sb.from("payments").insert({
        reservation_id: id,
        kind: payment.kind,
        amount: payment.amount,
        paid_on: payment.date,
        note: payment.note?.trim() || null,
      }),
    );
    return undefined;
  });
}

export function removePayment(_reservationId: string, paymentId: string): Promise<ActionResult> {
  return act(async (sb) => {
    mustAffect(await sb.from("payments").delete().eq("id", paymentId).select("id"));
    return undefined;
  });
}

/* -------------------------------- Admin: dogs ------------------------------- */

async function resolvePhoto(photo: string | undefined): Promise<string | null> {
  if (!photo) return null;
  if (photo.startsWith("data:")) return uploadPhoto(photo, "perros");
  return photoPathFromUrl(photo);
}

export function saveDog(
  dog: Omit<Dog, "id" | "createdAt"> & { id?: string | undefined },
): Promise<ActionResult<Dog>> {
  return act(async (sb) => {
    if (!dog.name.trim()) throw new Error("Ingresá el nombre del perro.");
    const existing = dog.id ? state.dogs.find((d) => d.id === dog.id) : undefined;
    if (dog.id && !existing) throw new Error("El perro ya no existe.");
    const photo_path = await resolvePhoto(dog.photo);
    const row = {
      name: dog.name.trim(),
      breed: dog.breed?.trim() || null,
      owner_name: dog.ownerName?.trim() || null,
      notes: dog.notes?.trim() || null,
      photo_path,
    };
    const saved = (
      existing
        ? mustAffect(await sb.from("dogs").update(row).eq("id", existing.id).select("*"))[0]
        : must(await sb.from("dogs").insert(row).select("*").single())
    ) as DogRow;
    const oldPath = photoPathFromUrl(existing?.photo);
    if (oldPath && oldPath !== photo_path) await removePhoto(oldPath);
    return dogFromRow(saved, photoUrl);
  });
}

export function deleteDog(id: string): Promise<ActionResult> {
  return act(async (sb) => {
    const existing = state.dogs.find((d) => d.id === id);
    mustAffect(await sb.from("dogs").delete().eq("id", id).select("id"));
    await removePhoto(photoPathFromUrl(existing?.photo));
    return undefined;
  });
}

/* ---------------------------- Admin: blocked dates --------------------------- */

export function setBlocked(date: ISODate, blocked: boolean, reason?: string | undefined): Promise<ActionResult> {
  return act(async (sb) => {
    if (blocked) {
      must(await sb.from("blocked_dates").upsert({ date, reason: reason?.trim() || null }));
    } else {
      must(await sb.from("blocked_dates").delete().eq("date", date));
    }
    return undefined;
  });
}

/* ------------------------------ Admin: settings ------------------------------ */

export function updateSettings(patch: Partial<Settings>): Promise<ActionResult> {
  return act(async (sb) => {
    mustAffect(
      await sb
        .from("settings")
        .update({ ...settingsToRow(patch), updated_at: new Date().toISOString() })
        .eq("id", true)
        .select("id"),
    );
    return undefined;
  });
}

/* ------------------------- Admin: import old demo data ------------------------ */

export interface ImportReport {
  dogs: number;
  reservations: number;
  payments: number;
  blockedDates: number;
  settings: boolean;
  warnings: string[];
}

/**
 * Copies the data saved by the old browser-only demo into the database. Reservations are
 * created as pending and then confirmed, so the database re-checks the 6-dog limit; any that
 * no longer fit stay pending with a warning. The browser copy is kept.
 */
export function importLegacyData(): Promise<ActionResult<ImportReport>> {
  return act(async (sb) => {
    const legacy = readLegacyData();
    if (!legacy) throw new Error("No hay datos guardados en este navegador.");
    const report: ImportReport = { dogs: 0, reservations: 0, payments: 0, blockedDates: 0, settings: false, warnings: [] };
    const dogIds = new Map<string, string>();

    for (const dog of legacy.dogs) {
      let photo_path: string | null = null;
      if (dog.photo?.startsWith("data:")) {
        try {
          photo_path = await uploadPhoto(dog.photo, "perros");
        } catch {
          report.warnings.push(`No se pudo subir la foto de ${dog.name}.`);
        }
      }
      const row = must(
        await sb
          .from("dogs")
          .insert({
            name: (dog.name || "Sin nombre").trim().slice(0, 60),
            breed: dog.breed?.trim().slice(0, 60) || null,
            owner_name: dog.ownerName?.trim().slice(0, 100) || null,
            notes: dog.notes?.trim().slice(0, 1000) || null,
            photo_path,
            created_at: dog.createdAt || undefined,
          })
          .select("id")
          .single(),
      ) as { id: string };
      dogIds.set(dog.id, row.id);
      report.dogs++;
    }

    for (const r of legacy.reservations) {
      const label = `${r.ownerName || "Sin nombre"} (${r.checkIn} → ${r.checkOut})`;
      const ids = [...new Set(r.dogIds.map((id) => dogIds.get(id)).filter((x): x is string => !!x))];
      const created = must(
        await sb
          .from("reservations")
          .insert({
            owner_name: (r.ownerName || "Sin nombre").trim().slice(0, 100),
            phone: (r.phone ?? "").trim().slice(0, 40),
            email: r.email?.trim().slice(0, 200) || null,
            check_in: r.checkIn,
            check_out: r.checkOut,
            checkout_time: r.checkoutTime || "13:00",
            status: r.status === "cancelled" ? "cancelled" : "pending",
            total: Math.max(0, Number(r.total) || 0),
            notes: r.notes?.trim().slice(0, 2000) || null,
            source: r.source === "admin" ? "admin" : "public",
            created_at: r.createdAt || undefined,
          })
          .select("id")
          .single(),
      ) as { id: string };
      report.reservations++;
      if (ids.length > 0) {
        must(await sb.from("reservation_dogs").insert(ids.map((dog_id) => ({ reservation_id: created.id, dog_id }))));
      }
      const payments = (r.payments ?? []).filter((p) => Number(p.amount) > 0);
      if (payments.length > 0) {
        must(
          await sb.from("payments").insert(
            payments.map((p) => ({
              reservation_id: created.id,
              kind: p.kind === "deposit" ? "deposit" : "balance",
              amount: Number(p.amount),
              paid_on: p.date,
              note: p.note?.trim().slice(0, 500) || null,
            })),
          ),
        );
        report.payments += payments.length;
      }
      if (r.status === "confirmed") {
        if (ids.length === 0) {
          report.warnings.push(`La reserva de ${label} quedó pendiente porque no tiene perros.`);
        } else {
          const res = await sb.from("reservations").update({ status: "confirmed" }).eq("id", created.id);
          if (res.error) report.warnings.push(`La reserva de ${label} quedó pendiente: ${errorText(res.error)}`);
        }
      }
    }

    if (legacy.blockedDates.length > 0) {
      must(
        await sb.from("blocked_dates").upsert(
          legacy.blockedDates.map((b) => ({ date: b.date, reason: b.reason?.trim().slice(0, 200) || null })),
        ),
      );
      report.blockedDates = legacy.blockedDates.length;
    }

    // Only fill settings that were never configured in the database.
    const current = state.settings;
    if (legacy.settings && current.nightlyRate === 0 && !current.bankAlias) {
      const s = legacy.settings;
      const patch: Partial<Settings> = {};
      if (s.nightlyRate) patch.nightlyRate = s.nightlyRate;
      if (s.specialMultiplier && s.specialMultiplier >= 1) patch.specialMultiplier = s.specialMultiplier;
      if (Array.isArray(s.specialDates)) patch.specialDates = s.specialDates;
      if (s.bankAlias) patch.bankAlias = s.bankAlias;
      if (s.bankHolder) patch.bankHolder = s.bankHolder;
      if (s.bankName) patch.bankName = s.bankName;
      if (Array.isArray(s.conditions) && s.conditions.length > 0) patch.conditions = s.conditions;
      if (s.nightlyRate || s.bankAlias) {
        must(await sb.from("settings").update(settingsToRow(patch)).eq("id", true));
        report.settings = true;
      }
    }

    markLegacyImported();
    return report;
  });
}
