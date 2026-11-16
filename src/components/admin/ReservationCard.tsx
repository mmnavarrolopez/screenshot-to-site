import { useState } from "react";
import { CalendarRange, Pencil, Phone, RotateCcw, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DogStack } from "@/components/hotel/DogAvatar";
import { StatusBadge } from "@/components/hotel/StatusBadge";
import { ConfirmDialog } from "./ConfirmDialog";
import { PaymentsDialog } from "./PaymentsDialog";
import { ReservationDialog } from "./ReservationDialog";
import { cancelReservation, reopenReservation, useHotel } from "@/lib/hotel/store";
import { formatMoney, formatShort, plural } from "@/lib/hotel/format";
import { balanceDue, chargedNights, paidTotal } from "@/lib/hotel/rules";
import type { Reservation } from "@/lib/hotel/types";

export function ReservationCard({ reservation }: { reservation: Reservation }) {
  const { dogs } = useHotel();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const resDogs = dogs.filter((d) => reservation.dogIds.includes(d.id));
  const nights = chargedNights(reservation.checkIn, reservation.checkOut, reservation.checkoutTime).length;
  const r = reservation;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            {r.source === "public" && <span className="text-xs text-muted-foreground">Solicitud web</span>}
          </div>
          <h3 className="mt-2 truncate text-lg">{r.ownerName}</h3>
          {r.phone && (
            <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5" /> {r.phone}
            </a>
          )}
        </div>
        <DogStack dogs={resDogs} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5">
          <CalendarRange className="size-4 text-primary" />
          {formatShort(r.checkIn)} → {formatShort(r.checkOut)} · {r.checkoutTime}
        </span>
        <span className="text-muted-foreground">{plural(nights, "noche", "noches")}</span>
        <span className="text-muted-foreground">{resDogs.map((d) => d.name).join(", ") || "Sin perros"}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span>Total <strong>{formatMoney(r.total)}</strong></span>
        <span className="text-muted-foreground">Pagado {formatMoney(paidTotal(r))}</span>
        {r.status !== "cancelled" && <span className="text-primary">Saldo {formatMoney(balanceDue(r))}</span>}
      </div>
      {r.status === "pending" && (
        <p className="mt-2 text-xs text-muted-foreground">No ocupa lugar hasta confirmar la seña.</p>
      )}
      {r.notes && <p className="mt-2 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{r.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {r.status === "pending" && (
          <Button size="sm" variant="success" onClick={() => setConfirming(true)}>
            Confirmar seña
          </Button>
        )}
        {r.status !== "cancelled" && (
          <Button size="sm" variant="outline" onClick={() => setPaying(true)}>
            <Wallet /> Pagos
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil /> Modificar
        </Button>
        {r.status !== "cancelled" ? (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelling(true)}>
            <X /> Cancelar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { reopenReservation(r.id); toast.success("Reserva reabierta como pendiente"); }}>
            <RotateCcw /> Reabrir
          </Button>
        )}
      </div>

      <ReservationDialog open={editing} onOpenChange={setEditing} reservation={r} />
      <ConfirmDialog reservation={confirming ? r : null} onOpenChange={setConfirming} />
      <PaymentsDialog reservationId={paying ? r.id : null} onOpenChange={setPaying} />
      <AlertDialog open={cancelling} onOpenChange={setCancelling}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal">¿Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Se liberarán los lugares de {r.ownerName}. Los pagos registrados se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { cancelReservation(r.id); toast.success("Reserva cancelada"); }}
            >
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
