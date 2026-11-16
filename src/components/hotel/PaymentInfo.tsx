import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/hotel/format";
import type { Settings } from "@/lib/hotel/types";

export function PaymentInfo({ settings, deposit }: { settings: Settings; deposit?: number }) {
  const [copied, setCopied] = useState(false);
  const hasAlias = settings.bankAlias.trim().length > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(settings.bankAlias);
      setCopied(true);
      toast.success("Alias copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Mantené presionado el alias para copiarlo.");
    }
  }

  return (
    <div className="rounded-2xl bg-espresso p-5 text-espresso-foreground shadow-lift">
      <div className="flex items-center gap-2 text-sm opacity-80">
        <Landmark className="size-4" />
        Seña del 50% por transferencia
      </div>
      {deposit !== undefined && deposit > 0 && (
        <p className="mt-3 font-display text-3xl">{formatMoney(deposit)}</p>
      )}
      <div className="mt-4 rounded-xl bg-espresso-foreground/10 p-3">
        <p className="text-xs uppercase tracking-widest opacity-70">Alias</p>
        {hasAlias ? (
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="select-all break-all font-mono text-lg">{settings.bankAlias}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={copy}
              aria-label="Copiar alias"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ) : (
          <p className="mt-1 text-sm opacity-80">
            El alias se mostrará aquí cuando el hotel lo configure.
          </p>
        )}
        {(settings.bankHolder || settings.bankName) && (
          <p className="mt-2 text-sm opacity-80">
            {[settings.bankHolder, settings.bankName].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
