import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ClipboardList, PawPrint, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageTitle } from "@/components/admin/AdminShell";
import { ReservationCard } from "@/components/admin/ReservationCard";
import { DogAvatar } from "@/components/hotel/DogAvatar";
import { useHotel } from "@/lib/hotel/store";
import { useToday } from "@/lib/hotel/use-today";
import { addDaysISO, fromISO } from "@/lib/hotel/dates";
import { formatLong, formatMoney } from "@/lib/hotel/format";
import { MAX_DOGS, balanceDue, occupancyByDate, reservationsOnNight } from "@/lib/hotel/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Panel · Hotel Canino" }] }),
  component: Dashboard,
});

function Dashboard() {
  const today = useToday();
  const { reservations, dogs, blockedDates } = useHotel();
  if (!today) return null;

  const occupancy = occupancyByDate(reservations);
  const blocked = new Set(blockedDates.map((b) => b.date));
  const confirmed = reservations.filter((r) => r.status === "confirmed");
  const pending = reservations.filter((r) => r.status === "pending").sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const tonight = reservationsOnNight(confirmed, today);
  const tonightDogs = dogs.filter((d) => tonight.some((r) => r.dogIds.includes(d.id)));
  const arrivals = confirmed.filter((r) => r.checkIn === today);
  const departures = confirmed.filter((r) => r.checkOut === today);
  const toCollect = confirmed.reduce((sum, r) => sum + balanceDue(r), 0);
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));
  const DAY = ["D", "L", "M", "M", "J", "V", "S"];

  return (
    <>
      <PageTitle title="Panel" subtitle={formatLong(today)} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={PawPrint} label="Perros esta noche" value={`${occupancy.get(today) ?? 0}/${MAX_DOGS}`} />
        <Stat icon={ClipboardList} label="Pendientes" value={String(pending.length)} accent={pending.length > 0} />
        <Stat icon={ArrowDownRight} label="Ingresos · Salidas hoy" value={`${arrivals.length} · ${departures.length}`} />
        <Stat icon={Wallet} label="Saldo por cobrar" value={formatMoney(toCollect)} />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Ocupación diaria</h2>
          <Link to="/admin/calendario" className="text-sm font-medium text-primary">
            Calendario →
          </Link>
        </div>
        <div className="mt-5 flex h-36 items-end gap-1.5 sm:gap-2">
          {days.map((d) => {
            const occ = occupancy.get(d) ?? 0;
            const isBlocked = blocked.has(d);
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{isBlocked ? "—" : occ}</span>
                <div className="relative flex h-24 w-full items-end overflow-hidden rounded-lg bg-secondary">
                  <div
                    className={cn("w-full rounded-lg bg-primary transition-all", occ >= MAX_DOGS && "bg-espresso", isBlocked && "pattern-blocked h-full bg-day-blocked")}
                    style={isBlocked ? undefined : { height: `${(occ / MAX_DOGS) * 100}%` }}
                  />
                </div>
                <span className={cn("text-[10px]", d === today ? "font-bold text-primary" : "text-muted-foreground")}>
                  {DAY[fromISO(d).getDay()]}
                  {Number(d.slice(8))}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">Solicitudes pendientes</h2>
            <Link to="/admin/reservas" className="text-sm font-medium text-primary">
              Todas →
            </Link>
          </div>
          {pending.length > 0 ? (
            <div className="space-y-3">
              {pending.slice(0, 4).map((r) => (
                <ReservationCard key={r.id} reservation={r} />
              ))}
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="Sin solicitudes pendientes" text="Las nuevas solicitudes de la página pública aparecerán aquí para que confirmes la seña." />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl">Hoy en el hotel</h2>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            {tonightDogs.length > 0 ? (
              <ul className="space-y-3">
                {tonightDogs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <DogAvatar dog={d} size="sm" />
                    <span className="font-medium">{d.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hay perros alojados esta noche.</p>
            )}
            {(arrivals.length > 0 || departures.length > 0) && (
              <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                {arrivals.map((r) => (
                  <p key={r.id} className="flex items-center gap-2"><ArrowDownRight className="size-4 text-success" /> Ingresa: {r.ownerName}</p>
                ))}
                {departures.map((r) => (
                  <p key={r.id} className="flex items-center gap-2"><ArrowUpRight className="size-4 text-primary" /> Sale: {r.ownerName} ({r.checkoutTime})</p>
                ))}
              </div>
            )}
          </div>
          <Button asChild variant="soft" className="mt-3 w-full">
            <Link to="/admin/reservas">Registrar reserva</Link>
          </Button>
        </section>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-soft", accent && "border-warning/50 bg-warning-soft")}>
      <Icon className="size-4.5 text-primary" />
      <p className="mt-3 font-display text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
