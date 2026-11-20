import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageTitle } from "@/components/admin/AdminShell";
import { importLegacyData, updateSettings, useHotel } from "@/lib/hotel/store";
import { legacySummary, type LegacySummary } from "@/lib/hotel/legacy-import";
import { plural } from "@/lib/hotel/format";
import { formatMoney, formatSpecialDay } from "@/lib/hotel/format";
import { CHECKOUT_LIMIT, DEPOSIT_RATE, MAX_DOGS } from "@/lib/hotel/rules";

export const Route = createFileRoute("/admin/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes · Hotel Canino" }] }),
  component: SettingsPage,
});

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function SettingsPage() {
  const { settings } = useHotel();
  const [rate, setRate] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [alias, setAlias] = useState("");
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [conditions, setConditions] = useState("");
  const [specialDates, setSpecialDates] = useState<string[]>([]);
  const [newMonth, setNewMonth] = useState("12");
  const [newDay, setNewDay] = useState("24");

  useEffect(() => {
    setRate(settings.nightlyRate ? String(settings.nightlyRate) : "");
    setMultiplier(String(settings.specialMultiplier));
    setAlias(settings.bankAlias);
    setHolder(settings.bankHolder);
    setBank(settings.bankName);
    setConditions(settings.conditions.join("\n"));
    setSpecialDates(settings.specialDates);
  }, [settings]);

  const [saving, setSaving] = useState(false);

  async function save() {
    const mult = Number(multiplier.replace(",", "."));
    if (!(mult >= 1)) {
      toast.error("El multiplicador debe ser 1 o mayor.");
      return;
    }
    setSaving(true);
    const result = await updateSettings({
      nightlyRate: Number(rate) || 0,
      specialMultiplier: mult,
      bankAlias: alias.trim(),
      bankHolder: holder.trim(),
      bankName: bank.trim(),
      specialDates,
      conditions: conditions.split("\n").map((c) => c.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ajustes guardados");
  }

  function addSpecial() {
    const mmdd = `${newMonth.padStart(2, "0")}-${newDay.padStart(2, "0")}`;
    if (!specialDates.includes(mmdd)) setSpecialDates([...specialDates, mmdd].sort());
  }

  return (
    <>
      <PageTitle title="Ajustes" subtitle="Tarifas, fechas especiales, alias bancario y condiciones." />
      <div className="space-y-6">
        <Card title="Tarifas">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-rate" className="mb-1.5 block">Tarifa por noche y por perro</Label>
              <Input id="s-rate" inputMode="numeric" placeholder="Ej.: 15000" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d]/g, ""))} className="h-11" />
              <p className="mt-1 text-xs text-muted-foreground">{rate ? formatMoney(Number(rate)) : "Sin configurar: el público verá «a confirmar»."}</p>
            </div>
            <div>
              <Label htmlFor="s-mult" className="mb-1.5 block">Multiplicador en fechas especiales</Label>
              <Input id="s-mult" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="h-11" />
              <p className="mt-1 text-xs text-muted-foreground">2 = tarifa doble.</p>
            </div>
          </div>
          <div className="mt-5">
            <Label className="mb-2 block">Fechas especiales (Navidad y Año Nuevo)</Label>
            <div className="flex flex-wrap gap-2">
              {specialDates.map((d) => (
                <span key={d} className="flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-sm">
                  {formatSpecialDay(d)}
                  <button type="button" onClick={() => setSpecialDates(specialDates.filter((x) => x !== d))} className="rounded-full p-1 hover:bg-accent" aria-label={`Quitar ${formatSpecialDay(d)}`}>
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <select value={newDay} onChange={(e) => setNewDay(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Día">
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Mes">
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
              </select>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={addSpecial}>
                <Plus /> Agregar
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Datos para la seña">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label htmlFor="s-alias" className="mb-1.5 block">Alias bancario</Label>
              <Input id="s-alias" value={alias} onChange={(e) => setAlias(e.target.value)} className="h-11 font-mono" placeholder="mi.alias.banco" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="s-holder" className="mb-1.5 block">Titular</Label>
              <Input id="s-holder" value={holder} onChange={(e) => setHolder(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-bank" className="mb-1.5 block">Banco</Label>
              <Input id="s-bank" value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Condiciones del servicio">
          <Label htmlFor="s-cond" className="mb-1.5 block text-muted-foreground">Una condición por línea</Label>
          <Textarea id="s-cond" value={conditions} onChange={(e) => setConditions(e.target.value)} className="min-h-48" />
        </Card>

        <Card title="Reglas fijas">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="rounded-xl bg-secondary p-3">Máximo <strong className="text-foreground">{MAX_DOGS} perros</strong> a la vez</li>
            <li className="rounded-xl bg-secondary p-3">Seña del <strong className="text-foreground">{DEPOSIT_RATE * 100}%</strong></li>
            <li className="rounded-xl bg-secondary p-3">Salida sin cargo hasta las <strong className="text-foreground">{CHECKOUT_LIMIT}</strong></li>
          </ul>
        </Card>

        <LegacyImportCard />

        <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
          <Button size="xl" className="shadow-lift" onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar ajustes"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 text-xl">{title}</h2>
      {children}
    </section>
  );
}

/** Offers to move data saved by the old browser-only demo into the database (once). */
function LegacyImportCard() {
  const [summary, setSummary] = useState<LegacySummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSummary(legacySummary()), []);
  if (!summary) return null;

  async function runImport() {
    setBusy(true);
    const result = await importLegacyData();
    setBusy(false);
    setSummary(legacySummary());
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const r = result.data;
    toast.success(
      `Listo: ${plural(r.dogs, "perro", "perros")}, ${plural(r.reservations, "reserva", "reservas")} y ${plural(r.payments, "pago", "pagos")} pasados a la base de datos.`,
    );
    r.warnings.forEach((w) => toast.warning(w, { duration: 10000 }));
  }

  const items = [
    plural(summary.dogs, "perro", "perros"),
    plural(summary.reservations, "reserva", "reservas"),
    plural(summary.payments, "pago", "pagos"),
    plural(summary.blockedDates, "fecha bloqueada", "fechas bloqueadas"),
  ].join(" · ");

  return (
    <Card title="Datos de la versión de prueba">
      <p className="text-sm text-muted-foreground">
        Este navegador tiene datos cargados antes de conectar la base de datos: <strong className="text-foreground">{items}</strong>.
      </p>
      {summary.importedAt ? (
        <p className="mt-3 rounded-xl bg-success-soft p-3 text-sm text-success">
          Ya se pasaron a la base de datos el {summary.importedAt.slice(8, 10)}/{summary.importedAt.slice(5, 7)}/{summary.importedAt.slice(0, 4)}. La copia de este navegador se conserva.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Si eran datos reales, podés pasarlos a la base de datos. Si eran pruebas, no hace falta: simplemente ignorá este aviso.
            La copia de este navegador no se borra.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-4" disabled={busy}>
                {busy ? "Pasando datos…" : "Pasar a la base de datos"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl font-normal">¿Pasar estos datos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se copiarán {items} a la base de datos. Las reservas confirmadas se vuelven a verificar con el límite de 6 perros; si alguna no entra, queda pendiente y te avisamos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={() => void runImport()}>Pasar datos</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Card>
  );
}
