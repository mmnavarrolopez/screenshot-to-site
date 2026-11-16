import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dog } from "@/lib/hotel/types";

const SIZES = {
  sm: "size-9",
  md: "size-14",
  lg: "size-20",
  xl: "size-28",
};

export function DogAvatar({
  dog,
  size = "md",
  className,
}: {
  dog: Pick<Dog, "name" | "photo">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-secondary ring-2 ring-card shadow-soft",
        SIZES[size],
        className,
      )}
    >
      {dog.photo ? (
        <img src={dog.photo} alt={dog.name} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center text-primary">
          <PawPrint className="size-1/2" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

export function DogStack({ dogs, max = 4 }: { dogs: Pick<Dog, "id" | "name" | "photo">[]; max?: number }) {
  const shown = dogs.slice(0, max);
  const rest = dogs.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((d, i) => (
        <DogAvatar key={d.id} dog={d} size="sm" className={i > 0 ? "-ml-2.5" : undefined} />
      ))}
      {rest > 0 && (
        <span className="-ml-2.5 flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold ring-2 ring-card">
          +{rest}
        </span>
      )}
    </div>
  );
}
