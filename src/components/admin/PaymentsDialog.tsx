import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addPayment, removePayment, useHotel } from "@/lib/hotel/store";
import { todayISO } from "@/lib/hotel/dates";
import { formatMoney, formatShort } from "@/lib/hotel/format";
import { balanceDue, paidTotal } from "@/lib/hotel/rules";
import type { Payment } from "@/lib/hotel/types";

export function PaymentsDialog({
  reservationId,
  onOpenChange,
}: {
  reservationId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { reservations } = useHotel();
  const reservation = reservations.find((r) => r.id === reservationId) ?? null;
  const [kind, setKind] = useState<Payment["kind"]>("balance");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!reservation) return;
    const hasDeposit = reservation.payments.some((p) => p.kind === "deposit");
    setKind(hasDeposit ? "balance" : "deposit");
    setAmount(String(balanceDue(reservation)));
    setDate(todayISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  if (!reservation) return null;

  async function add() {
    const result = await addPayment(reservation!.id, { kind, amount: Number(amount) || 0, date });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Pago registrado");
    setAmount("");
  }

  return (
    <Dialog open={!!reservation} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Pagos</DialogTitle>
          <DialogDescription>{reservation.ownerName}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Total" value={formatMoney(reservation.total)} />
          <Stat label="Pagado" value={formatMoney(paidTotal(reservation))} />
          <Stat label="Saldo" value={formatMoney(balanceDue(reservation))} highlight />
        </div>

        <div className="space-y-2">
          {reservation.payments.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
          )}
          {reservation.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{p.kind === "deposit" ? "Seña" : "Saldo"}</p>
                <p className="text-xs text-muted-foreground">{formatShort(p.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatMoney(p.amount)}</span>
                <Button variant="ghost" size="icon" aria-label="Eliminar pago" onClick={async () => {
                    const result = await removePayment(reservation.id, p.id);
                    if (!result.ok) toast.error(result.error);
                  }}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl bg-secondary p-4">
          <p className="text-sm font-medium">Registrar pago</p>
          <div className="grid grid-cols-2 gap-2">
            {(["deposit", "balance"] as const).map((k) => (
              <Button key={k} type="button" variant={kind === k ? "default" : "outline"} size="sm" onClick={() => setKind(k)}>
                {k === "deposit" ? "Seña" : "Saldo"}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="p-amount" className="mb-1 block text-xs">Monto</Label>
              <Input id="p-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="bg-card" />
            </div>
            <div>
              <Label htmlFor="p-date" className="mb-1 block text-xs">Fecha</Label>
              <Input id="p-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-card" />
            </div>
          </div>
          <Button className="w-full" onClick={() => void add()}>
            Agregar pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-xl bg-primary-soft p-3" : "rounded-xl bg-secondary p-3"}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
