import { describe, expect, it } from "vitest";
import { publicFromStays, reservationFromRow, settingsFromRow } from "@/lib/hotel/mapping";
import { checkAvailability, stayCompanions } from "@/lib/hotel/rules";

const toUrl = (p: string) => `https://fotos.test/${p}`;

describe("public view built from confirmed stays", () => {
  const rows = [1, 2, 3, 4, 5].map((n) => ({
    reservation_id: n <= 3 ? "r1" : "r2",
    check_in: "2026-12-10",
    check_out: "2026-12-12",
    checkout_time: "12:00:00",
    dog_id: `d${n}`,
    dog_name: `Perro ${n}`,
    photo_path: n === 1 ? "perros/a.jpg" : null,
  }));
  const view = publicFromStays(rows, toUrl);

  it("exposes only confirmed stays with no owner, phone or payments", () => {
    expect(view.reservations).toHaveLength(2);
    for (const r of view.reservations) {
      expect(r.status).toBe("confirmed");
      expect(r.ownerName).toBe("");
      expect(r.phone).toBe("");
      expect(r.payments).toEqual([]);
    }
  });

  it("shows companions with name and photo", () => {
    const stay = { checkIn: "2026-12-11", checkOut: "2026-12-13", checkoutTime: "12:00", dogCount: 1 };
    const companions = stayCompanions(stay, view.reservations, view.dogs);
    expect(companions.map((d) => d.name)).toContain("Perro 1");
    expect(companions.find((d) => d.name === "Perro 1")?.photo).toBe("https://fotos.test/perros/a.jpg");
  });

  it("applies the 6-dog limit with 5 confirmed dogs: 1 more fits, 2 do not", () => {
    const base = { checkIn: "2026-12-10", checkOut: "2026-12-11", checkoutTime: "12:00" };
    expect(checkAvailability({ ...base, dogCount: 1 }, view.reservations, []).ok).toBe(true);
    expect(checkAvailability({ ...base, dogCount: 2 }, view.reservations, []).ok).toBe(false);
  });
});

describe("database rows", () => {
  it("reads numeric strings and HH:MM times", () => {
    const s = settingsFromRow({
      nightly_rate: "15000.00",
      special_multiplier: "2.00",
      special_dates: ["12-24"],
      bank_alias: "hotel.canino",
      bank_holder: "",
      bank_name: "",
      conditions: [],
    });
    expect(s.nightlyRate).toBe(15000);
    expect(s.specialMultiplier).toBe(2);
    const r = reservationFromRow({
      id: "r",
      owner_name: "Ana",
      phone: null,
      email: null,
      check_in: "2026-12-10",
      check_out: "2026-12-12",
      checkout_time: "14:30:00",
      status: "pending",
      total: "30000",
      notes: null,
      source: "public",
      created_at: "2026-11-01T00:00:00Z",
      reservation_dogs: [{ dog_id: "d1" }],
      payments: [{ id: "p", kind: "deposit", amount: "15000", paid_on: "2026-11-02", note: null }],
    });
    expect(r.checkoutTime).toBe("14:30");
    expect(r.total).toBe(30000);
    expect(r.payments[0]?.amount).toBe(15000);
    expect(r.dogIds).toEqual(["d1"]);
  });
});
