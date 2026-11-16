import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageTitle } from "@/components/admin/AdminShell";
import { ReservationCard } from "@/components/admin/ReservationCard";
import { ReservationDialog } from "@/components/admin/ReservationDialog";
import { useHotel } from "@/lib/hotel/store";
import type { ReservationStatus } from "@/lib/hotel/types";

export const Route = createFileRoute("/admin/reservas")({
  head: () => ({ meta: [{ title: "Reservas · Hotel Canino" }] }),
  component: ReservationsPage,
});

type Filter = ReservationStatus | "all";

function ReservationsPage() {
  const { reservations, dogs } = useHotel();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const count = (s: Filter) => (s === "all" ? reservations.length : reservations.filter((r) => r.status === s).length);
  const q = query.trim().toLowerCase();
  const list = reservations
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => {
      if (!q) return true;
      const names = dogs.filter((d) => r.dogIds.includes(d.id)).map((d) => d.name.toLowerCase());
      return r.ownerName.toLowerCase().includes(q) || r.phone.includes(q) || names.some((n) => n.includes(q));
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <>
      <PageTitle
        title="Reservas"
        subtitle="Confirmá señas, modificá fechas y registrá pagos."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nueva reserva
          </Button>
        }
      />
      <div className="mb-5 space-y-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-secondary p-1">
            {([
              ["pending", "Pendientes"],
              ["confirmed", "Confirmadas"],
              ["cancelled", "Canceladas"],
              ["all", "Todas"],
            ] as const).map(([v, label]) => (
              <TabsTrigger key={v} value={v} className="rounded-lg px-1 py-2 text-xs sm:text-sm">
                {label} <span className="ml-1 opacity-60">{count(v)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por responsable, teléfono o perro" className="h-11 bg-card pl-9" />
        </div>
      </div>

      {list.length > 0 ? (
        <div className="space-y-3">
          {list.map((r) => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={reservations.length === 0 ? "Todavía no hay reservas" : "Nada por aquí"}
          text={
            reservations.length === 0
              ? "Registrá una reserva o esperá las solicitudes que lleguen desde la página pública."
              : "No hay reservas que coincidan con este filtro."
          }
          action={
            reservations.length === 0 && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Nueva reserva
              </Button>
            )
          }
        />
      )}

      <ReservationDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
