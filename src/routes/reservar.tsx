import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLayout } from "@/components/site/SiteHeader";
import { CalendarLegend, MonthCalendar } from "@/components/hotel/MonthCalendar";
import { DogAvatar } from "@/components/hotel/DogAvatar";
import { PaymentInfo } from "@/components/hotel/PaymentInfo";
import { PhotoPicker } from "@/components/hotel/PhotoPicker";
import { TimeSelect } from "@/components/hotel/TimeSelect";
import { availabilityMessage, submitPublicRequest, useHotel } from "@/lib/hotel/store";
import { useToday } from "@/lib/hotel/use-today";
import { fromISO, type ISODate } from "@/lib/hotel/dates";
import { formatLong, formatMoney, formatShort, plural } from "@/lib/hotel/format";
import {
  CHECKOUT_LIMIT,
  MAX_DOGS,
  checkAvailability,
  isSpecialDate,
  occupancyByDate,
  quoteStay,
  stayCompanions,
} from "@/lib/hotel/rules";
import type { Reservation } from "@/lib/hotel/types";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar estadía · Hotel Canino" },
      {
        name: "description",
        content:
          "Elegí fechas de ingreso y salida, mirá la disponibilidad y los compañeros de estadía, y solicitá tu reserva en Hotel Canino.",
      },
      { property: "og:title", content: "Reservar estadía · Hotel Canino" },
      {
        property: "og:description",
        content: "Calendario de disponibilidad en tiempo real. Solo 6 huéspedes a la vez.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReservePage,
});

interface DogForm {
  key: string;
  name: string;
  breed: string;
  photo?: string | undefined;
  notes: string;
}

const newDog = (): DogForm => ({ key: Math.random().toString(36).slice(2), name: "", breed: "", notes: "" });

function ReservePage() {
  const today = useToday();
  const { reservations, dogs, blockedDates, settings } = useHotel();
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [checkIn, setCheckIn] = useState<ISODate | null>(null);
  const [checkOut, setCheckOut] = useState<ISODate | null>(null);
  const [checkoutTime, setCheckoutTime] = useState("12:00");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [dogForms, setDogForms] = useState<DogForm[]>([newDog()]);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Reservation | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (today && !view) {
      const d = fromISO(today);
      setView({ y: d.getFullYear(), m: d.getMonth() });
    }
  }, [today, view]);

  const occupancy = useMemo(() => occupancyByDate(reservations), [reservations]);
  const blocked = useMemo(() => new Set(blockedDates.map((b) => b.date)), [blockedDates]);
  const dogCount = Math.max(dogForms.length, 1);
  const hasRange = !!checkIn && !!checkOut;
  const stay = { checkIn: checkIn ?? "", checkOut: checkOut ?? "", checkoutTime, dogCount };
  const availability = hasRange
    ? checkAvailability(stay, reservations, blockedDates.map((b) => b.date))
    : null;
  const quote = hasRange ? quoteStay(stay, settings) : null;
  const companions = hasRange ? stayCompanions(stay, reservations, dogs) : [];
  const freeSpots = availability ? Math.max(availability.minFree, 0) : MAX_DOGS;

  function selectDate(iso: ISODate) {
    setError(null);
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut(null);
    } else if (iso <= checkIn) {
      setCheckIn(iso);
    } else {
      setCheckOut(iso);
    }
  }

  function updateDog(key: string, patch: Partial<DogForm>) {
    setDogForms((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!checkIn || !checkOut) {
      setError("Elegí la fecha de ingreso y de salida en el calendario.");
      return;
    }
    if (!ownerName.trim()) {
      setError("Ingresá tu nombre.");
      return;
    }
    if (phone.trim().length < 6) {
      setError("Ingresá un teléfono de contacto válido.");
      return;
    }
    if (dogForms.some((d) => !d.name.trim())) {
      setError("Completá el nombre de cada perro.");
      return;
    }
    if (!accepted) {
      setError("Para continuar, aceptá las condiciones del servicio.");
      return;
    }
    const result = submitPublicRequest({
      ownerName,
      phone,
      email,
      notes,
      checkIn,
      checkOut,
      checkoutTime,
      dogs: dogForms.map((d) => ({ name: d.name, breed: d.breed, photo: d.photo, notes: d.notes })),
    });
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setDone(result.data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <PublicLayout>
        <RequestSent reservation={done} onNew={() => {
          setDone(null);
          setCheckIn(null);
          setCheckOut(null);
          setDogForms([newDog()]);
          setAccepted(false);
        }} />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="bg-gradient-warm">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
          <p className="eyebrow">Reservar</p>
          <h1 className="mt-2 text-3xl sm:text-5xl">¿Cuándo nos visita?</h1>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Tocá el día de ingreso y después el de salida. Los puntitos muestran los lugares libres
            cada noche.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:pb-16">
        <div className="space-y-6">
          {/* Calendar */}
          <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
            {today && view ? (
              <MonthCalendar
                year={view.y}
                month={view.m}
                onMonthChange={(y, m) => setView({ y, m })}
                canGoBack={
                  view.y > fromISO(today).getFullYear() ||
                  (view.y === fromISO(today).getFullYear() && view.m > fromISO(today).getMonth())
                }
                rangeStart={checkIn}
                rangeEnd={checkOut}
                onSelect={selectDate}
                getDay={(iso) => ({
                  occupied: occupancy.get(iso) ?? 0,
                  blocked: blocked.has(iso),
                  special: isSpecialDate(iso, settings.specialDates),
                  disabled: iso < today,
                })}
              />
            ) : (
              <CalendarSkeleton />
            )}
            <div className="mt-5 border-t border-border pt-4">
              <CalendarLegend />
            </div>
          </div>

          {/* Dates + checkout time */}
          <div className="grid gap-3 sm:grid-cols-3">
            <DateTile label="Ingreso" value={checkIn} />
            <DateTile label="Salida" value={checkOut} />
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <Label htmlFor="checkout-time" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Hora de retiro
              </Label>
              <TimeSelect id="checkout-time" value={checkoutTime} onChange={setCheckoutTime} className="mt-2" />
            </div>
          </div>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            El día de salida no suma noche si retirás hasta las {CHECKOUT_LIMIT}.
          </p>

          {/* Availability + companions */}
          {hasRange && availability && (
            <div className="animate-rise space-y-4">
              {availability.ok ? (
                <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-success">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <p className="text-sm font-medium">
                    ¡Hay lugar! Quedan {plural(availability.minFree, "lugar libre", "lugares libres")} en
                    la noche más concurrida.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-warning-foreground">
                  <AlertCircle className="mt-0.5 size-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{availabilityMessage(availability)}</p>
                    {availability.conflicts.length > 0 && (
                      <p className="mt-1 opacity-80">
                        Noches con problema: {availability.conflicts.map((c) => formatShort(c.date)).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
                <h2 className="text-xl">Compañeros de estadía</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Perros con reserva confirmada que estarán en el hotel esos días.
                </p>
                {companions.length > 0 ? (
                  <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                    {companions.map((d) => (
                      <div key={d.id} className="flex flex-col items-center gap-2 text-center">
                        <DogAvatar dog={d} size="lg" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
                    Por ahora no hay otros huéspedes confirmados para estas fechas.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="lg:hidden">
            <PaymentInfo settings={settings} deposit={quote?.deposit} />
          </div>

          {/* Request form */}
          <div ref={formRef} className="scroll-mt-20">
            <form onSubmit={submit} className="space-y-6 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
              <div>
                <h2 className="text-2xl">Solicitud de reserva</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quedará pendiente hasta que confirmemos la seña.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tu nombre" htmlFor="owner">
                  <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" className="h-11" />
                </Field>
                <Field label="Teléfono / WhatsApp" htmlFor="phone">
                  <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="h-11" />
                </Field>
                <Field label="Email (opcional)" htmlFor="email" className="sm:col-span-2">
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11" />
                </Field>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">{dogForms.length === 1 ? "Tu perro" : "Tus perros"}</h3>
                  <span className="text-xs text-muted-foreground">
                    {hasRange ? `Hasta ${freeSpots} en estas fechas` : `Hasta ${MAX_DOGS}`}
                  </span>
                </div>
                {dogForms.map((d, i) => (
                  <div key={d.key} className="rounded-2xl bg-secondary/60 p-4">
                    <div className="flex gap-4">
                      <PhotoPicker value={d.photo} onChange={(photo) => updateDog(d.key, { photo })} />
                      <div className="grid flex-1 gap-3">
                        <Input
                          placeholder="Nombre"
                          aria-label={`Nombre del perro ${i + 1}`}
                          value={d.name}
                          onChange={(e) => updateDog(d.key, { name: e.target.value })}
                          className="h-11 bg-card"
                        />
                        <Input
                          placeholder="Raza y tamaño"
                          aria-label={`Raza del perro ${i + 1}`}
                          value={d.breed}
                          onChange={(e) => updateDog(d.key, { breed: e.target.value })}
                          className="h-11 bg-card"
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Alimentación, medicación, carácter… (opcional)"
                      value={d.notes}
                      onChange={(e) => updateDog(d.key, { notes: e.target.value })}
                      className="mt-3 min-h-16 bg-card"
                    />
                    {dogForms.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={() => setDogForms((l) => l.filter((x) => x.key !== d.key))}>
                        <Trash2 /> Quitar
                      </Button>
                    )}
                  </div>
                ))}
                {dogForms.length < Math.min(MAX_DOGS, hasRange ? Math.max(freeSpots, 1) : MAX_DOGS) && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setDogForms((l) => [...l, newDog()])}>
                    <Plus /> Agregar otro perro
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  La foto y el nombre se mostrarán a otros clientes solo cuando la reserva esté confirmada.
                </p>
              </div>

              <Field label="Comentarios (opcional)" htmlFor="notes">
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>

              <label className="flex items-start gap-3 rounded-2xl border border-border p-4">
                <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Leí y acepto las{" "}
                  <Link to="/condiciones" className="font-medium text-primary underline-offset-4 hover:underline">
                    condiciones del servicio
                  </Link>
                  .
                </span>
              </label>

              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}

              <Button type="submit" size="xl" className="w-full" disabled={!!availability && !availability.ok}>
                Enviar solicitud
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Vista de demostración: la solicitud se guarda solo en este navegador.
              </p>
            </form>
          </div>
        </div>

        {/* Summary (desktop sidebar) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <Summary checkIn={checkIn} checkOut={checkOut} quote={quote} hasRate={settings.nightlyRate > 0} />
            <PaymentInfo settings={settings} deposit={quote?.deposit} />
          </div>
        </aside>
      </div>

      {/* Summary (mobile sticky bar) */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pt-3 shadow-lift backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            {hasRange && quote ? (
              <>
                <p className="truncate text-sm font-medium">
                  {formatShort(checkIn!)} → {formatShort(checkOut!)} · {plural(quote.nights, "noche", "noches")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {settings.nightlyRate > 0
                    ? `Total ${formatMoney(quote.total)} · Seña ${formatMoney(quote.deposit)}`
                    : "Tarifa a confirmar"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {checkIn ? "Ahora elegí la salida" : "Elegí la fecha de ingreso"}
              </p>
            )}
          </div>
          <Button
            size="lg"
            disabled={!hasRange}
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            Continuar
          </Button>
        </div>
      </div>

    </PublicLayout>
  );
}

function Field({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

function DateTile({ label, value }: { label: string; value: ISODate | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-lg capitalize">{value ? formatLong(value) : "—"}</p>
    </div>
  );
}

function Summary({
  checkIn,
  checkOut,
  quote,
  hasRate,
}: {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  quote: ReturnType<typeof quoteStay> | null;
  hasRate: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="text-xl">Resumen</h2>
      {checkIn && checkOut && quote ? (
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Fechas" v={`${formatShort(checkIn)} → ${formatShort(checkOut)}`} />
          <Row k="Noches" v={String(quote.nights)} />
          {quote.specialNights > 0 && <Row k="Noches con tarifa especial" v={String(quote.specialNights)} />}
          {quote.lateCheckout && <Row k="Retiro después de las 13:00" v="+1 noche" />}
          <Row k="Perros" v={String(quote.dogCount)} />
          {hasRate ? (
            <>
              <div className="my-3 border-t border-border" />
              <Row k="Total" v={formatMoney(quote.total)} strong />
              <Row k="Seña 50%" v={formatMoney(quote.deposit)} />
              <Row k="Saldo al ingresar" v={formatMoney(quote.balance)} />
            </>
          ) : (
            <p className="pt-3 text-muted-foreground">La tarifa será informada por el hotel.</p>
          )}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Elegí las fechas para ver el detalle.</p>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={strong ? "font-display text-lg" : "font-medium"}>{v}</dd>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="mx-auto h-7 w-40" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function RequestSent({ reservation, onNew }: { reservation: Reservation; onNew: () => void }) {
  const { settings } = useHotel();
  const deposit = Math.round(reservation.total / 2);
  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <div className="animate-rise text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl sm:text-4xl">¡Solicitud enviada!</h1>
        <p className="mt-3 text-muted-foreground">
          Tu reserva del {formatShort(reservation.checkIn)} al {formatShort(reservation.checkOut)} queda{" "}
          <strong className="text-foreground">pendiente</strong> hasta que confirmemos la seña.
        </p>
      </div>
      <div className="mt-8 space-y-4">
        <PaymentInfo settings={settings} deposit={deposit > 0 ? deposit : undefined} />
        <ol className="space-y-2 rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
          <li>1. Copiá el alias y transferí la seña del 50%.</li>
          <li>2. Envianos el comprobante por WhatsApp.</li>
          <li>3. Te avisamos cuando la reserva esté confirmada.</li>
        </ol>
        {reservation.total === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            El hotel te informará el monto de la seña.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="lg" className="flex-1" onClick={onNew}>
            Nueva solicitud
          </Button>
          <Button asChild size="lg" className="flex-1">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
