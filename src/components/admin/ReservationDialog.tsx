import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DogAvatar } from "@/components/hotel/DogAvatar";
import { PhotoPicker } from "@/components/hotel/PhotoPicker";
import { TimeSelect } from "@/components/hotel/TimeSelect";
import { cn } from "@/lib/utils";
import {
  availabilityMessage,
  createAdminReservation,
  saveDog,
  updateReservation,
  useHotel,
  type ReservationDraft,
} from "@/lib/hotel/store";
import { addDaysISO, todayISO, type ISODate } from "@/lib/hotel/dates";
import { formatMoney, plural } from "@/lib/hotel/format";
import { checkAvailability, depositFor, quoteStay } from "@/lib/hotel/rules";
import type { Reservation } from "@/lib/hotel/types";

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  defaultCheckIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation | undefined;
  defaultCheckIn?: ISODate | undefined;
}) {
  const { dogs, reservations, blockedDates, settings } = useHotel();
  const [draft, setDraft] = useState<ReservationDraft>(() => emptyDraft(defaultCheckIn));
  const [totalOverride, setTotalOverride] = useState<string | null>(null);
  const [newDogName, setNewDogName] = useState("");
  const [newDogPhoto, setNewDogPhoto] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewDogName("");
    setNewDogPhoto(undefined);
    if (reservation) {
      setDraft({
        ownerName: reservation.ownerName,
        phone: reservation.phone,
        email: reservation.email ?? "",
        dogIds: reservation.dogIds,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        checkoutTime: reservation.checkoutTime,
        notes: reservation.notes ?? "",
        total: reservation.total,
      });
      setTotalOverride(String(reservation.total));
    } else {
      setDraft(emptyDraft(defaultCheckIn));
      setTotalOverride(null);
    }
  }, [open, reservation, defaultCheckIn]);

  const stay = { ...draft, dogCount: draft.dogIds.length };
  const quote = useMemo(() => quoteStay(stay, settings), [stay.checkIn, stay.checkOut, stay.checkoutTime, stay.dogCount, settings]);
  const total = totalOverride !== null && totalOverride !== "" ? Number(totalOverride) || 0 : quote.total;
  const availability = checkAvailability(
    stay,
    reservations,
    blockedDates.map((b) => b.date),
    reservation?.id,
  );
  const set = (patch: Partial<ReservationDraft>) => setDraft((d) => ({ ...d, ...patch }));

  function toggleDog(id: string) {
    set({ dogIds: draft.dogIds.includes(id) ? draft.dogIds.filter((x) => x !== id) : [...draft.dogIds, id] });
  }

  async function addNewDog() {
    setBusy(true);
    const result = await saveDog({ name: newDogName, photo: newDogPhoto, ownerName: draft.ownerName || undefined });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const newId = result.data.id;
    setDraft((d) => ({ ...d, dogIds: [...d.dogIds, newId] }));
    setNewDogName("");
    setNewDogPhoto(undefined);
  }

  async function save(confirm: boolean) {
    setError(null);
    setBusy(true);
    const payload = { ...draft, total };
    const result = reservation
      ? await updateReservation(reservation.id, payload)
      : await createAdminReservation(payload, { confirm, deposit: depositFor(total) });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(reservation ? "Reserva actualizada" : confirm ? "Reserva confirmada" : "Reserva guardada como pendiente");
    onOpenChange(false);
  }

  const takesSpot = !reservation || reservation.status === "confirmed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {reservation ? "Modificar reserva" : "Nueva reserva"}
          </DialogTitle>
          <DialogDescription>Registrá responsable, perros y fechas de ingreso y salida.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Responsable" id="r-owner">
            <Input id="r-owner" value={draft.ownerName} onChange={(e) => set({ ownerName: e.target.value })} />
          </F>
          <F label="Teléfono" id="r-phone">
            <Input id="r-phone" type="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
          </F>
          <F label="Ingreso" id="r-in">
            <Input id="r-in" type="date" value={draft.checkIn} onChange={(e) => set({ checkIn: e.target.value })} />
          </F>
          <F label="Salida" id="r-out">
            <Input id="r-out" type="date" value={draft.checkOut} onChange={(e) => set({ checkOut: e.target.value })} />
          </F>
          <F label="Hora de retiro" id="r-time">
            <TimeSelect id="r-time" value={draft.checkoutTime} onChange={(v) => set({ checkoutTime: v })} className="h-9" />
          </F>
          <F label="Email (opcional)" id="r-email">
            <Input id="r-email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
          </F>
        </div>

        <div>
          <Label className="mb-2 block">Perros ({draft.dogIds.length})</Label>
          {dogs.length > 0 ? (
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {dogs.map((d) => {
                const on = draft.dogIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDog(d.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2 text-left text-sm transition-colors",
                      on ? "border-primary bg-primary-soft" : "border-border hover:bg-secondary",
                    )}
                    aria-pressed={on}
                  >
                    <DogAvatar dog={d} size="sm" />
                    <span className="truncate">{d.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay perros registrados. Agregá uno abajo.</p>
          )}
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
            <PhotoPicker value={newDogPhoto} onChange={setNewDogPhoto} className="size-14" />
            <Input placeholder="Nombre del nuevo perro" value={newDogName} onChange={(e) => setNewDogName(e.target.value)} className="bg-card" />
            <Button type="button" variant="outline" size="icon" onClick={() => void addNewDog()} disabled={busy || !newDogName.trim()} aria-label="Agregar perro">
              <Plus />
            </Button>
          </div>
        </div>

        <F label="Notas" id="r-notes">
          <Textarea id="r-notes" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} className="min-h-16" />
        </F>

        <div className="rounded-2xl bg-secondary p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {plural(quote.nights, "noche", "noches")}
              {quote.specialNights > 0 && ` · ${quote.specialNights} con tarifa especial`}
              {quote.lateCheckout && " · retiro tardío"}
            </span>
            <span>Calculado: {formatMoney(quote.total)}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Label htmlFor="r-total" className="shrink-0">Total</Label>
            <Input id="r-total" inputMode="numeric" value={totalOverride ?? String(quote.total)} onChange={(e) => setTotalOverride(e.target.value.replace(/[^\d]/g, ""))} className="bg-card" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setTotalOverride(null)}>
              Recalcular
            </Button>
          </div>
          <p className="mt-2 text-muted-foreground">Seña 50%: {formatMoney(depositFor(total))}</p>
        </div>

        {draft.dogIds.length > 0 && (
          availability.ok ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> Hay cupo para {plural(draft.dogIds.length, "perro", "perros")}.
            </p>
          ) : (
            <p className="flex items-start gap-2 text-sm text-warning-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {availabilityMessage(availability)}
              {!takesSpot && " (se verificará al confirmar)"}
            </p>
          )
        )}

        {error && (
          <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          {reservation ? (
            <Button onClick={() => void save(false)} disabled={busy}>Guardar cambios</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => void save(false)} disabled={busy}>
                Guardar como pendiente
              </Button>
              <Button onClick={() => void save(true)} disabled={busy || !availability.ok}>
                Guardar y confirmar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyDraft(checkIn?: ISODate): ReservationDraft {
  const start = checkIn ?? todayISO();
  return {
    ownerName: "",
    phone: "",
    email: "",
    dogIds: [],
    checkIn: start,
    checkOut: addDaysISO(start, 1),
    checkoutTime: "12:00",
    notes: "",
    total: 0,
  };
}

function F({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
