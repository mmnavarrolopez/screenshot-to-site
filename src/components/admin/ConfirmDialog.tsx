import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmReservation } from "@/lib/hotel/store";
import { formatMoney, formatShort } from "@/lib/hotel/format";
import { depositFor } from "@/lib/hotel/rules";
import type { Reservation } from "@/lib/hotel/types";

export function ConfirmDialog({
  reservation,
  onOpenChange,
}: {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (reservation) {
      setAmount(String(depositFor(reservation.total)));
      setError(null);
    }
  }, [reservation]);

  if (!reservation) return null;

  async function confirm() {
    setBusy(true);
    const result = await confirmReservation(reservation!.id, Number(amount) || 0);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Reserva confirmada");
    onOpenChange(false);
  }

  return (
    <Dialog open={!!reservation} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Confirmar seña</DialogTitle>
          <DialogDescription>
            {reservation.ownerName} · {formatShort(reservation.checkIn)} → {formatShort(reservation.checkOut)} ·
            Total {formatMoney(reservation.total)}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="deposit" className="mb-1.5 block">
            Seña recibida
          </Label>
          <Input id="deposit" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="h-11" />
          <p className="mt-2 text-xs text-muted-foreground">
            El 50% del total es {formatMoney(depositFor(reservation.total))}. Al confirmar, los perros ocupan su
            lugar y se muestran en la página pública.
          </p>
        </div>
        {error && (
          <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button variant="success" onClick={() => void confirm()} disabled={busy}>
            Confirmar reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
