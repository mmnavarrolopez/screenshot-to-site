import { useEffect, useState } from "react";
import { todayISO, type ISODate } from "./dates";

/** Today's date, resolved only in the browser to avoid server/browser time-zone mismatch. */
export function useToday(): ISODate | null {
  const [today, setToday] = useState<ISODate | null>(null);
  useEffect(() => setToday(todayISO()), []);
  return today;
}
