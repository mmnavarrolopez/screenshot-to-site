import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { monthGrid, type ISODate } from "@/lib/hotel/dates";
import { formatMonth } from "@/lib/hotel/format";
import { MAX_DOGS } from "@/lib/hotel/rules";

export interface DayInfo {
  /** Dogs already lodged that night (confirmed only). */
  occupied: number;
  blocked: boolean;
  special: boolean;
  disabled?: boolean;
  /** Extra marker, e.g. pending requests in admin. */
  pending?: number;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function MonthCalendar({
  year,
  month,
  onMonthChange,
  getDay,
  onSelect,
  rangeStart,
  rangeEnd,
  selected,
  variant = "public",
  canGoBack = true,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  getDay: (iso: ISODate) => DayInfo;
  onSelect?: (iso: ISODate) => void;
  rangeStart?: ISODate | null;
  rangeEnd?: ISODate | null;
  selected?: ISODate | null;
  variant?: "public" | "admin";
  canGoBack?: boolean;
}) {
  const cells = monthGrid(year, month);
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  return (
    <div className="select-none">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Mes anterior"
        >
          <ChevronLeft />
        </Button>
        <h3 className="font-display text-xl capitalize">{formatMonth(year, month)}</h3>
        <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Mes siguiente">
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const info = getDay(iso);
          const free = info.blocked ? 0 : MAX_DOGS - info.occupied;
          const full = free <= 0;
          const few = !full && free <= 2;
          const isStart = iso === rangeStart;
          const isEnd = iso === rangeEnd;
          const inRange = !!rangeStart && !!rangeEnd && iso > rangeStart && iso < rangeEnd;
          const isSelected = iso === selected || isStart || isEnd;
          const disabled = info.disabled;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled || !onSelect}
              onClick={() => onSelect?.(iso)}
              aria-label={`${iso}${info.blocked ? ", bloqueado" : `, ${free} lugares libres`}`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border text-sm transition-all",
                "border-transparent bg-day-free",
                few && "bg-day-few",
                full && !info.blocked && "bg-day-full text-muted-foreground",
                info.blocked && "pattern-blocked bg-day-blocked text-muted-foreground",
                inRange && "border-primary/30 bg-primary-soft text-foreground",
                isSelected && "border-primary bg-primary text-primary-foreground shadow-soft",
                disabled && "cursor-not-allowed opacity-35",
                !disabled && onSelect && !isSelected && "hover:border-primary/40",
              )}
            >
              <span className={cn("font-medium leading-none", info.special && !isSelected && "text-primary")}>
                {Number(iso.slice(8))}
              </span>
              {info.special && (
                <span
                  className={cn(
                    "absolute right-1 top-1 size-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
              {variant === "admin" ? (
                <span className="mt-1 text-[10px] leading-none opacity-80">
                  {info.blocked ? "—" : `${info.occupied}/${MAX_DOGS}`}
                </span>
              ) : (
                !info.blocked && (
                  <span className="mt-1.5 flex gap-px">
                    {Array.from({ length: MAX_DOGS }).map((_, k) => (
                      <span
                        key={k}
                        className={cn(
                          "h-1 w-1 rounded-full sm:w-1.5",
                          k < info.occupied
                            ? isSelected
                              ? "bg-primary-foreground/40"
                              : "bg-foreground/25"
                            : isSelected
                              ? "bg-primary-foreground"
                              : "bg-primary/70",
                        )}
                      />
                    ))}
                  </span>
                )
              )}
              {variant === "admin" && !!info.pending && (
                <span className="absolute left-1 top-1 size-1.5 rounded-full bg-warning" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend({ variant = "public" }: { variant?: "public" | "admin" }) {
  const items = [
    { cls: "bg-day-free border border-border", label: "Disponible" },
    { cls: "bg-day-few", label: "Pocos lugares" },
    { cls: "bg-day-full", label: "Completo" },
    { cls: "pattern-blocked bg-day-blocked", label: "No disponible" },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className={cn("size-3.5 rounded", it.cls)} />
          {it.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-primary" />
        Tarifa especial
      </span>
      {variant === "admin" && (
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-warning" />
          Solicitudes pendientes
        </span>
      )}
      {variant === "public" && (
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1.5 rounded-full bg-primary/70" />
          Lugar libre
        </span>
      )}
    </div>
  );
}
