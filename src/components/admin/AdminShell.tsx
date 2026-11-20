import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  PawPrint,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/site/SiteHeader";
import { signOut, useHotel } from "@/lib/hotel/store";

const NAV = [
  { to: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
  { to: "/admin/reservas", label: "Reservas", icon: ClipboardList, exact: false },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarDays, exact: false },
  { to: "/admin/perros", label: "Perros", icon: PawPrint, exact: false },
  { to: "/admin/ajustes", label: "Ajustes", icon: Settings2, exact: false },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { reservations } = useHotel();
  const pending = reservations.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
          <Link to="/admin">
            <BrandMark />
          </Link>
          <p className="mt-1 pl-11 text-xs text-muted-foreground">Administración</p>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-foreground" }}
              >
                <n.icon className="size-4.5" />
                <span className="flex-1">{n.label}</span>
                {n.to === "/admin/reservas" && pending > 0 && (
                  <span className="rounded-full bg-warning px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
                    {pending}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="space-y-1 border-t border-sidebar-border pt-4">
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/">
                <ExternalLink /> Ver sitio público
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut()}>
              <LogOut /> Salir
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md lg:hidden">
            <Link to="/admin">
              <BrandMark />
            </Link>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon" aria-label="Ver sitio público">
                <Link to="/">
                  <ExternalLink />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Salir" onClick={() => void signOut()}>
                <LogOut />
              </Button>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
            {children}
          </main>
        </div>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pt-2 backdrop-blur-md lg:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.exact }}
            className="relative flex flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <n.icon className="size-5" />
            {n.label}
            {n.to === "/admin/reservas" && pending > 0 && (
              <span className="absolute right-1/2 top-0 translate-x-4 rounded-full bg-warning px-1.5 text-[10px] font-semibold text-warning-foreground">
                {pending}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
