import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminShell, DemoNotice } from "@/components/admin/AdminShell";
import { BrandMark } from "@/components/site/SiteHeader";
import { demoSignIn, useHotel } from "@/lib/hotel/store";

export const Route = createFileRoute("/admin")({
  // Admin data lives in the browser (demo) and later behind sign-in: never server-render it.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administración · Hotel Canino" },
      { name: "description", content: "Panel privado de administración de Hotel Canino." },
      { property: "og:title", content: "Administración · Hotel Canino" },
      { property: "og:description", content: "Panel privado de administración de Hotel Canino." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { adminSession } = useHotel();
  if (!adminSession) return <AdminLogin />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  return (
    <div className="flex min-h-screen flex-col bg-gradient-warm">
      <DemoNotice />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-rise rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8">
          <BrandMark />
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" /> Acceso privado
          </div>
          <h1 className="mt-2 text-3xl">Administración</h1>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              demoSignIn();
            }}
          >
            <div>
              <Label htmlFor="admin-email" className="mb-1.5 block">
                Email
              </Label>
              <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" placeholder="admin@hotelcanino.com" />
            </div>
            <div>
              <Label htmlFor="admin-pass" className="mb-1.5 block">
                Contraseña
              </Label>
              <Input id="admin-pass" type="password" className="h-11" />
            </div>
            <Button type="submit" size="xl" className="w-full">
              Entrar en modo demostración
            </Button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Por ahora no se piden credenciales reales. Al conectar la base de datos, el acceso
            quedará protegido con cuentas de administrador.
          </p>
          <Link to="/" className="mt-6 block text-center text-sm text-primary">
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
