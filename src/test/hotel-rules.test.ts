import { describe, expect, it } from "vitest";
import {
  MAX_DOGS,
  chargedNights,
  checkAvailability,
  occupancyByDate,
  quoteStay,
  stayCompanions,
} from "@/lib/hotel/rules";
import type { Dog, Reservation, Settings } from "@/lib/hotel/types";

const settings: Settings = {
  nightlyRate: 10000,
  specialMultiplier: 2,
  specialDates: ["12-24", "12-25", "12-31", "01-01"],
  bankAlias: "",
  bankHolder: "",
  bankName: "",
  conditions: [],
};

function reservation(partial: Partial<Reservation>): Reservation {
  return {
    id: Math.random().toString(36),
    ownerName: "Test",
    phone: "1",
    dogIds: ["a"],
    checkIn: "2026-03-10",
    checkOut: "2026-03-12",
    checkoutTime: "12:00",
    status: "confirmed",
    total: 0,
    payments: [],
    source: "admin",
    createdAt: "",
    ...partial,
  };
}

describe("Hotel Canino rules", () => {
  it("never allows more than 6 dogs at the same time", () => {
    expect(MAX_DOGS).toBe(6);
    const full = reservation({ dogIds: ["1", "2", "3", "4", "5"] });
    const ok = checkAvailability(
      { checkIn: "2026-03-10", checkOut: "2026-03-11", checkoutTime: "10:00", dogCount: 1 },
      [full],
      [],
    );
    expect(ok.ok).toBe(true);
    const tooMany = checkAvailability(
      { checkIn: "2026-03-10", checkOut: "2026-03-11", checkoutTime: "10:00", dogCount: 2 },
      [full],
      [],
    );
    expect(tooMany.ok).toBe(false);
  });

  it("rejects a single request with 7 dogs", () => {
    const result = checkAvailability(
      { checkIn: "2026-03-10", checkOut: "2026-03-11", checkoutTime: "10:00", dogCount: 7 },
      [],
      [],
    );
    expect(result.ok).toBe(false);
  });

  it("pending requests do not take confirmed availability", () => {
    const pending = reservation({ status: "pending", dogIds: ["1", "2", "3", "4", "5", "6"] });
    expect(occupancyByDate([pending]).get("2026-03-10")).toBeUndefined();
    const result = checkAvailability(
      { checkIn: "2026-03-10", checkOut: "2026-03-11", checkoutTime: "10:00", dogCount: 6 },
      [pending],
      [],
    );
    expect(result.ok).toBe(true);
  });

  it("leaving on checkout day until 13:00 adds no extra night", () => {
    expect(chargedNights("2026-03-10", "2026-03-12", "13:00")).toEqual([
      "2026-03-10",
      "2026-03-11",
    ]);
  });

  it("leaving after 13:00 counts one more night", () => {
    expect(chargedNights("2026-03-10", "2026-03-12", "15:00")).toHaveLength(3);
  });

  it("charges double on Christmas and New Year dates", () => {
    const quote = quoteStay(
      { checkIn: "2026-12-24", checkOut: "2026-12-26", checkoutTime: "12:00", dogCount: 1 },
      settings,
    );
    expect(quote.total).toBe(40000);
    const normal = quoteStay(
      { checkIn: "2026-12-20", checkOut: "2026-12-22", checkoutTime: "12:00", dogCount: 1 },
      settings,
    );
    expect(normal.total).toBe(20000);
  });

  it("deposit is 50% of the total", () => {
    const quote = quoteStay(
      { checkIn: "2026-03-10", checkOut: "2026-03-13", checkoutTime: "12:00", dogCount: 2 },
      settings,
    );
    expect(quote.total).toBe(60000);
    expect(quote.deposit).toBe(30000);
  });

  it("blocked dates are not available", () => {
    const result = checkAvailability(
      { checkIn: "2026-03-10", checkOut: "2026-03-12", checkoutTime: "10:00", dogCount: 1 },
      [],
      ["2026-03-11"],
    );
    expect(result.ok).toBe(false);
  });

  it("only confirmed dogs are shown as stay companions", () => {
    const dogs: Dog[] = [
      { id: "c", name: "Confirmado", createdAt: "" },
      { id: "p", name: "Pendiente", createdAt: "" },
    ];
    const list = stayCompanions(
      { checkIn: "2026-03-11", checkOut: "2026-03-13", checkoutTime: "10:00" },
      [reservation({ dogIds: ["c"] }), reservation({ dogIds: ["p"], status: "pending" })],
      dogs,
    );
    expect(list.map((d) => d.name)).toEqual(["Confirmado"]);
  });
});
