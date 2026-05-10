import { berechneGruendungskosten, berechneGesamtkosten, berechneKostenNachKategorie } from "@/lib/calculations/gruendung";
import { KostenPosition } from "@/lib/types";

function pos(id: string, bezeichnung: string, betrag: number, kategorie?: string): KostenPosition {
  return { id, bezeichnung, betrag, kategorie };
}

describe("berechneGruendungskosten", () => {
  it("returns 0 for empty list", () => {
    expect(berechneGruendungskosten([])).toBe(0);
  });

  it("sums all amounts", () => {
    const kosten = [
      pos("1", "Notar", 1500),
      pos("2", "Handelsregister", 150),
      pos("3", "Stammkapital", 25000),
    ];
    expect(berechneGruendungskosten(kosten)).toBe(26650);
  });

  it("handles single item", () => {
    expect(berechneGruendungskosten([pos("1", "Test", 500)])).toBe(500);
  });

  it("handles decimal amounts", () => {
    const kosten = [pos("1", "A", 100.50), pos("2", "B", 200.25)];
    expect(berechneGruendungskosten(kosten)).toBeCloseTo(300.75);
  });

  it("handles zero amounts", () => {
    const kosten = [pos("1", "A", 0), pos("2", "B", 0)];
    expect(berechneGruendungskosten(kosten)).toBe(0);
  });
});

describe("berechneGesamtkosten", () => {
  it("is an alias for berechneGruendungskosten", () => {
    const kosten = [pos("1", "A", 100), pos("2", "B", 200)];
    expect(berechneGesamtkosten(kosten)).toBe(berechneGruendungskosten(kosten));
  });
});

describe("berechneKostenNachKategorie", () => {
  it("groups by category", () => {
    const kosten = [
      pos("1", "Notar", 1500, "Notar"),
      pos("2", "Handelsregister", 150, "Amtsgericht"),
      pos("3", "Stammkapital", 25000, "Kapital"),
      pos("4", "Steuerberater", 1000, "Notar"),
    ];
    const result = berechneKostenNachKategorie(kosten);
    expect(result["Notar"]).toBe(2500);
    expect(result["Amtsgericht"]).toBe(150);
    expect(result["Kapital"]).toBe(25000);
  });

  it("uses 'Sonstige' for items without category", () => {
    const kosten = [pos("1", "A", 100), pos("2", "B", 200)];
    const result = berechneKostenNachKategorie(kosten);
    expect(result["Sonstige"]).toBe(300);
  });

  it("returns empty object for empty list", () => {
    expect(berechneKostenNachKategorie([])).toEqual({});
  });
});
