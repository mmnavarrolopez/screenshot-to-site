import { Badge } from "@/components/ui/badge";
import type { ReservationStatus } from "@/lib/hotel/types";

const LABELS: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge variant={status}>{LABELS[status]}</Badge>;
}
