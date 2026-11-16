import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resizeImage } from "@/lib/hotel/image";

export function PhotoPicker({
  value,
  onChange,
  label = "Foto",
  className,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen.");
      return;
    }
    setBusy(true);
    try {
      onChange(await resizeImage(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la foto.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative size-20 shrink-0", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex size-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-input bg-secondary/60 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        aria-label={value ? `Cambiar ${label.toLowerCase()}` : `Agregar ${label.toLowerCase()}`}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[11px]">
            <Camera className="size-5" strokeWidth={1.6} />
            {label}
          </span>
        )}
      </button>
      {value && !busy && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-espresso text-espresso-foreground shadow-soft"
          aria-label="Quitar foto"
        >
          <X className="size-3.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
