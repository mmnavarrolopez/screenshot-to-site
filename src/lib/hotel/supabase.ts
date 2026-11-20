/**
 * Connection to the owner's own Supabase project (never Lovable Cloud).
 * Both values are PUBLIC by design (publishable key + project URL); access is controlled by
 * the RLS policies and SQL functions in docs/supabase/esquema.sql. Build-time env vars
 * (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) override the defaults, e.g. on Cloudflare.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://qochzsyyybnynbysfjye.supabase.co";
const DEFAULT_KEY = "sb_publishable_5d-X5Kojt96HdSkIxDRB0w_pMYrKwtQ";

export const SUPABASE_URL = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || DEFAULT_URL;
const SUPABASE_KEY =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) || DEFAULT_KEY;

export const PHOTO_BUCKET = "dog-photos";
const PHOTO_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/`;

let client: SupabaseClient | null = null;

/** Browser-only client (sessions are kept in this browser's storage). */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "hotel-canino-auth" },
    });
  }
  return client;
}

export function photoUrl(path: string): string {
  return PHOTO_PREFIX + path.split("/").map(encodeURIComponent).join("/");
}

/** Storage path of a photo URL served from our bucket, or null for anything else. */
export function photoPathFromUrl(url: string | undefined): string | null {
  if (!url || !url.startsWith(PHOTO_PREFIX)) return null;
  return decodeURIComponent(url.slice(PHOTO_PREFIX.length));
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Uploads a resized photo (data URL) and returns its storage path. */
export async function uploadPhoto(dataUrl: string, folder: "solicitudes" | "perros"): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const type = blob.type || "image/jpeg";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${newId()}.${ext}`;
  const { error } = await getSupabase()
    .storage.from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: type, upsert: false });
  if (error) throw new Error("No se pudo subir la foto. Probá con otra imagen más liviana.");
  return path;
}

export async function removePhoto(path: string | null) {
  if (!path) return;
  await getSupabase().storage.from(PHOTO_BUCKET).remove([path]).catch(() => undefined);
}
