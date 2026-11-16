import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

export function TimeSelect({
  value,
  onChange,
  id,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-card px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
        className,
      )}
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {h} {h > "13:00" ? "· suma una noche" : ""}
        </option>
      ))}
    </select>
  );
}
