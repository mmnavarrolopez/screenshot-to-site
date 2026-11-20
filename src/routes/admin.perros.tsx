import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PawPrint, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, PageTitle } from "@/components/admin/AdminShell";
import { DogAvatar } from "@/components/hotel/DogAvatar";
import { PhotoPicker } from "@/components/hotel/PhotoPicker";
import { StatusBadge } from "@/components/hotel/StatusBadge";
import { deleteDog, saveDog, useHotel } from "@/lib/hotel/store";
import { formatShort } from "@/lib/hotel/format";
import type { Dog } from "@/lib/hotel/types";

export const Route = createFileRoute("/admin/perros")({
  head: () => ({ meta: [{ title: "Perros · Hotel Canino" }] }),
  component: DogsPage,
});

function DogsPage() {
  const { dogs, reservations } = useHotel();
  const [editing, setEditing] = useState<Dog | "new" | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = dogs
    .filter((d) => !q || d.name.toLowerCase().includes(q) || d.ownerName?.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageTitle
        title="Perros"
        subtitle="Nombre y fotografía de cada huésped."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Registrar perro
          </Button>
        }
      />
      {dogs.length > 0 && (
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o responsable" className="h-11 bg-card pl-9" />
        </div>
      )}
      {list.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((d) => {
            const next = reservations
              .filter((r) => r.status !== "cancelled" && r.dogIds.includes(d.id))
              .sort((a, b) => b.checkIn.localeCompare(a.checkIn))[0];
            return (
              <button
                key={d.id}
                onClick={() => setEditing(d)}
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center shadow-soft transition-shadow hover:shadow-lift"
              >
                <DogAvatar dog={d} size="xl" />
                <span className="mt-3 font-display text-lg">{d.name}</span>
                {d.breed && <span className="text-xs text-muted-foreground">{d.breed}</span>}
                {d.ownerName && <span className="mt-1 text-xs text-muted-foreground">de {d.ownerName}</span>}
                {next && (
                  <span className="mt-2 flex flex-col items-center gap-1 text-xs">
                    <StatusBadge status={next.status} />
                    {formatShort(next.checkIn)} → {formatShort(next.checkOut)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={PawPrint}
          title={dogs.length === 0 ? "Sin perros registrados" : "Sin resultados"}
          text={dogs.length === 0 ? "Registrá cada perro con su nombre y foto. Los que lleguen por solicitud web se agregan solos." : "Probá con otro nombre."}
          action={dogs.length === 0 && <Button onClick={() => setEditing("new")}><Plus /> Registrar perro</Button>}
        />
      )}
      <DogDialog dog={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function DogDialog({ dog, onClose }: { dog: Dog | "new" | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = dog && dog !== "new" ? dog : null;
    setName(d?.name ?? "");
    setBreed(d?.breed ?? "");
    setOwnerName(d?.ownerName ?? "");
    setNotes(d?.notes ?? "");
    setPhoto(d?.photo);
  }, [dog]);

  const existing = dog && dog !== "new" ? dog : null;

  async function save() {
    setBusy(true);
    const result = await saveDog({ id: existing?.id, name, breed: breed || undefined, ownerName: ownerName || undefined, notes: notes || undefined, photo });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(existing ? "Perro actualizado" : "Perro registrado");
    onClose();
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    const result = await deleteDog(existing.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Perro eliminado");
    onClose();
  }

  return (
    <Dialog open={!!dog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{existing ? "Editar perro" : "Registrar perro"}</DialogTitle>
          <DialogDescription>La foto y el nombre se muestran al público solo con reserva confirmada.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          <PhotoPicker value={photo} onChange={setPhoto} className="size-24" />
          <div className="grid flex-1 gap-3">
            <div>
              <Label htmlFor="d-name" className="mb-1.5 block">Nombre</Label>
              <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="d-breed" className="mb-1.5 block">Raza y tamaño</Label>
              <Input id="d-breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="d-owner" className="mb-1.5 block">Responsable</Label>
          <Input id="d-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="d-notes" className="mb-1.5 block">Notas de cuidado</Label>
          <Textarea id="d-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          {existing && (
            <Button variant="ghost" className="text-destructive sm:mr-auto" onClick={() => void remove()} disabled={busy}>
              <Trash2 /> Eliminar
            </Button>
          )}
          <Button onClick={() => void save()} disabled={busy}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
