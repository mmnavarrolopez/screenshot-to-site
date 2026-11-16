import { Link } from "@tanstack/react-router";
import { Menu, PawPrint } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/reservar", label: "Reservar" },
  { to: "/condiciones", label: "Condiciones" },
] as const;

export function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <PawPrint className="size-4.5" strokeWidth={2} />
      </span>
      <span className="font-display text-xl leading-none">Hotel Canino</span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Hotel Canino, inicio">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            to="/admin"
            className="ml-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Administración
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm">
            <Link to="/reservar">Reservar</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <BrandMark />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 px-4">
                {[...NAV, { to: "/admin", label: "Administración" } as const].map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-base hover:bg-secondary"
                    activeProps={{ className: "bg-secondary font-medium" }}
                    activeOptions={{ exact: true }}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <BrandMark />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Alojamiento canino con lugar para solo 6 huéspedes a la vez.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/reservar" className="hover:text-foreground">
            Reservar
          </Link>
          <Link to="/condiciones" className="hover:text-foreground">
            Condiciones
          </Link>
          <Link to="/admin" className="hover:text-foreground">
            Administración
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
