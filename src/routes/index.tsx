import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarHeart, HeartHandshake, PawPrint, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/SiteHeader";
import heroImg from "@/assets/hero-dogs.jpg";
import gardenImg from "@/assets/garden.jpg";
import { useHotel } from "@/lib/hotel/store";
import { useToday } from "@/lib/hotel/use-today";
import { addDaysISO, fromISO } from "@/lib/hotel/dates";
import { MAX_DOGS, occupancyByDate } from "@/lib/hotel/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hotel Canino · Alojamiento cálido para tu perro" },
      {
        name: "description",
        content:
          "Reservá la estadía de tu perro en Hotel Canino: solo 6 huéspedes a la vez, disponibilidad en tiempo real y seña del 50%.",
      },
      { property: "og:title", content: "Hotel Canino · Alojamiento cálido para tu perro" },
      {
        property: "og:description",
        content: "Solo 6 huéspedes a la vez. Elegí fechas, conocé a sus compañeros y reservá.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: PawPrint,
    title: `Solo ${MAX_DOGS} huéspedes`,
    text: "Grupos pequeños para que cada perro reciba atención y tranquilidad.",
  },
  {
    icon: HeartHandshake,
    title: "Conocé a sus compañeros",
    text: "Al elegir fechas, ves las fotos y nombres de los perros confirmados que compartirán estadía.",
  },
  {
    icon: ShieldCheck,
    title: "Reserva simple",
    text: "Solicitás en minutos y confirmás con una seña del 50% por transferencia.",
  },
];

const STEPS = [
  "Elegí la fecha de ingreso y de salida en el calendario.",
  "Mirá la disponibilidad y quiénes estarán esos días.",
  "Completá la solicitud con los datos de tu perro.",
  "Transferí la seña del 50% y esperá nuestra confirmación.",
];

function Home() {
  return (
    <PublicLayout>
      <section className="relative">
        <div className="relative h-[78svh] min-h-[520px] w-full overflow-hidden sm:h-[640px]">
          <img
            src={heroImg}
            alt="Un golden retriever y un caniche descansando en una cama de lino"
            width={1600}
            height={1200}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-hero-fade" />
          <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-16">
            <div className="max-w-xl animate-rise text-espresso-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-90">
                Alojamiento canino
              </p>
              <h1 className="mt-3 text-4xl leading-[1.05] sm:text-6xl">
                Un hogar tibio mientras estás lejos.
              </h1>
              <p className="mt-4 text-base opacity-90 sm:text-lg">
                Pocas camas, mucho cariño. Elegí fechas y mirá al instante si hay lugar.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="xl">
                  <Link to="/reservar">
                    Ver disponibilidad <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="secondary">
                  <Link to="/condiciones">Condiciones del servicio</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-xl">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <NextDays />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <img
          src={gardenImg}
          alt="Perro jugando en el jardín del hotel"
          width={1200}
          height={912}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift"
        />
        <div>
          <p className="eyebrow">Cómo reservar</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Cuatro pasos y listo.</h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-espresso font-display text-sm text-espresso-foreground">
                  {i + 1}
                </span>
                <p className="pt-1 text-muted-foreground">{s}</p>
              </li>
            ))}
          </ol>
          <Button asChild size="xl" className="mt-8 w-full sm:w-auto">
            <Link to="/reservar">
              <CalendarHeart /> Elegir fechas
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}

function NextDays() {
  const today = useToday();
  const { reservations, blockedDates, status } = useHotel();
  if (!today || status !== "ready") return <div className="h-40" />;
  const occupancy = occupancyByDate(reservations);
  const blocked = new Set(blockedDates.map((b) => b.date));
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));
  const DAY = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  return (
    <section className="bg-gradient-warm py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Próximos 14 días</p>
            <h2 className="mt-2 text-2xl sm:text-3xl">Lugares libres por noche</h2>
          </div>
          <Link to="/reservar" className="hidden text-sm font-medium text-primary sm:block">
            Ver calendario completo →
          </Link>
        </div>
        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0 lg:grid-cols-14">
          {days.map((d) => {
            const free = blocked.has(d) ? 0 : MAX_DOGS - (occupancy.get(d) ?? 0);
            return (
              <Link
                key={d}
                to="/reservar"
                className={cn(
                  "flex min-w-[64px] flex-col items-center rounded-2xl border border-border bg-card px-2 py-3 shadow-soft",
                  free <= 0 && "bg-day-full",
                  blocked.has(d) && "pattern-blocked",
                )}
              >
                <span className="text-[11px] uppercase text-muted-foreground">
                  {DAY[fromISO(d).getDay()]}
                </span>
                <span className="font-display text-xl">{Number(d.slice(8))}</span>
                <span className="mt-1 text-xs font-medium text-primary">
                  {blocked.has(d) ? "—" : `${free} lib.`}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
