import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandMark } from "@/components/site/SiteHeader";
import { signIn, useHotel } from "@/lib/hotel/store";

export const Route = createFileRoute("/admin")({
  // Private data behind sign-in (session lives in the browser): never server-render it.
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
  const { adminSession, authReady } = useHotel();
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-warm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-label="Cargando" />
      </div>
    );
  }
  if (!adminSession) return <AdminLogin />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Ingresá tu email y contraseña.");
      return;
    }
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-warm">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-rise rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8">
          <BrandMark />
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" /> Acceso privado
          </div>
          <h1 className="mt-2 text-3xl">Administración</h1>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="admin-email" className="mb-1.5 block">
                Email
              </Label>
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div>
              <Label htmlFor="admin-pass" className="mb-1.5 block">
                Contraseña
              </Label>
              <Input id="admin-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            {error && (
              <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="xl" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Entrar
            </Button>
          </form>
          <Link to="/" className="mt-6 block text-center text-sm text-primary">
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
