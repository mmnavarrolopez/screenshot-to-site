import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CircleDollarSign, PawPrint, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/SiteHeader";
import { PaymentInfo } from "@/components/hotel/PaymentInfo";
import { useHotel } from "@/lib/hotel/store";
import { CHECKOUT_LIMIT, MAX_DOGS } from "@/lib/hotel/rules";
import { formatMoney, formatSpecialDay } from "@/lib/hotel/format";

export const Route = createFileRoute("/condiciones")({
  head: () => ({
    meta: [
      { title: "Condiciones del servicio · Hotel Canino" },
      {
        name: "description",
        content:
          "Capacidad, horarios de salida, seña del 50% y tarifas especiales de Navidad y Año Nuevo en Hotel Canino.",
      },
      { property: "og:title", content: "Condiciones del servicio · Hotel Canino" },
      {
        property: "og:description",
        content: "Todo lo que necesitás saber antes de reservar la estadía de tu perro.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Conditions,
});

function Conditions() {
  const { settings } = useHotel();
  const highlights = [
    { icon: PawPrint, title: `Máximo ${MAX_DOGS} perros`, text: "Nunca alojamos más de seis perros al mismo tiempo." },
    {
      icon: CalendarClock,
      title: `Salida hasta las ${CHECKOUT_LIMIT}`,
      text: "El día de salida no suma noche si retirás antes de esa hora.",
    },
    { icon: CircleDollarSign, title: "Seña del 50%", text: "La reserva se confirma cuando recibimos la seña." },
    {
      icon: Sparkles,
      title: `Tarifa x${settings.specialMultiplier} en fiestas`,
      text: settings.specialDates.map(formatSpecialDay).join(", ") || "Navidad y Año Nuevo",
    },
  ];

  return (
    <PublicLayout>
      <section className="bg-gradient-warm">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="eyebrow">Antes de reservar</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Condiciones del servicio</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Queremos que cada estadía sea tranquila y segura. Estas son las reglas de la casa.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {highlights.map((h) => (
            <div key={h.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <h.icon className="size-5" />
              </span>
              <div>
                <h2 className="text-lg">{h.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-2xl">Detalle</h2>
            <ul className="mt-4 space-y-3">
              {settings.conditions.map((c, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl bg-secondary p-5">
              <p className="text-sm text-muted-foreground">Tarifa por noche y por perro</p>
              <p className="mt-1 font-display text-2xl">
                {settings.nightlyRate > 0 ? formatMoney(settings.nightlyRate) : "A confirmar por el hotel"}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <PaymentInfo settings={settings} />
            <Button asChild size="xl" className="w-full">
              <Link to="/reservar">Elegir fechas</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
