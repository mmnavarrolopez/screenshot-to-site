import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ban, Plus, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/admin/AdminShell";
import { ReservationDialog } from "@/components/admin/ReservationDialog";
import { CalendarLegend, MonthCalendar } from "@/components/hotel/MonthCalendar";
import { DogAvatar } from "@/components/hotel/DogAvatar";
import { StatusBadge } from "@/components/hotel/StatusBadge";
import { setBlocked, useHotel } from "@/lib/hotel/store";
import { useToday } from "@/lib/hotel/use-today";
import { fromISO, type ISODate } from "@/lib/hotel/dates";
import { formatLong } from "@/lib/hotel/format";
import { MAX_DOGS, isSpecialDate, occupancyByDate, reservationsOnNight } from "@/lib/hotel/rules";

export const Route = createFileRoute("/admin/calendario")({
  head: () => ({ meta: [{ title: "Calendario · Hotel Canino" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const today = useToday();
  const { reservations, dogs, blockedDates, settings } = useHotel();
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (today && !view) {
      const d = fromISO(today);
      setView({ y: d.getFullYear(), m: d.getMonth() });
      setSelected(today);
    }
  }, [today, view]);

  if (!today || !view) return null;

  const occupancy = occupancyByDate(reservations);
  const blockedMap = new Map(blockedDates.map((b) => [b.date, b]));
  const pendingByNight = (iso: ISODate) => reservationsOnNight(reservations.filter((r) => r.status === "pending"), iso).length;

  const day = selected;
  const dayReservations = day ? reservationsOnNight(reservations.filter((r) => r.status !== "cancelled"), day) : [];
  const confirmedToday = dayReservations.filter((r) => r.status === "confirmed");
  const pendingToday = dayReservations.filter((r) => r.status === "pending");
  const dayDogs = dogs.filter((d) => confirmedToday.some((r) => r.dogIds.includes(d.id)));
  const arrivals = day ? reservations.filter((r) => r.status === "confirmed" && r.checkIn === day) : [];
  const departures = day ? reservations.filter((r) => r.status === "confirmed" && r.checkOut === day) : [];
  const block = day ? blockedMap.get(day) : undefined;

  return (
    <>
      <PageTitle
        title="Calendario"
        subtitle="Ocupación por noche. Tocá un día para ver el detalle o bloquearlo."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nueva reserva
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
          <MonthCalendar
            variant="admin"
            year={view.y}
            month={view.m}
            onMonthChange={(y, m) => setView({ y, m })}
            selected={selected}
            onSelect={(iso) => { setSelected(iso); setReason(""); }}
            getDay={(iso) => ({
              occupied: occupancy.get(iso) ?? 0,
              blocked: blockedMap.has(iso),
              special: isSpecialDate(iso, settings.specialDates),
              pending: pendingByNight(iso),
            })}
          />
          <div className="mt-5 border-t border-border pt-4">
            <CalendarLegend variant="admin" />
          </div>
        </div>

        {day && (
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <p className="text-sm capitalize text-muted-foreground">{formatLong(day)}</p>
              <p className="mt-1 font-display text-3xl">
                {block ? "Bloqueado" : `${occupancy.get(day) ?? 0} / ${MAX_DOGS}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {block ? block.reason || "Sin motivo indicado" : "perros alojados esa noche"}
              </p>

              <div className="mt-4 space-y-3">
                {dayDogs.length > 0 ? (
                  dayDogs.map((d) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <DogAvatar dog={d} size="sm" />
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin perros confirmados.</p>
                )}
              </div>

              {(arrivals.length > 0 || departures.length > 0) && (
                <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                  {arrivals.map((r) => <p key={r.id}>↘ Ingresa: {r.ownerName}</p>)}
                  {departures.map((r) => <p key={r.id}>↗ Sale: {r.ownerName} ({r.checkoutTime})</p>)}
                </div>
              )}

              {pendingToday.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Solicitudes pendientes (no ocupan lugar)</p>
                  {pendingToday.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span>{r.ownerName} · {r.dogIds.length} 🐾</span>
                      <StatusBadge status="pending" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              {block ? (
                <Button variant="outline" className="w-full" onClick={() => { setBlocked(day, false); toast.success("Fecha desbloqueada"); }}>
                  <Unlock /> Desbloquear fecha
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button variant="espresso" className="w-full" onClick={() => { setBlocked(day, true, reason); setReason(""); toast.success("Fecha bloqueada"); }}>
                    <Ban /> Bloquear fecha
                  </Button>
                  {confirmedToday.length > 0 && (
                    <p className="text-xs text-muted-foreground">Hay reservas confirmadas ese día; el bloqueo solo impide nuevas.</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      <ReservationDialog open={creating} onOpenChange={setCreating} defaultCheckIn={selected ?? undefined} />
    </>
  );
}
