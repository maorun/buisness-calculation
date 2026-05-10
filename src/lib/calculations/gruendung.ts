import { KostenPosition } from "../types";

/**
 * Sum all founding cost positions.
 */
export function berechneGruendungskosten(kosten: KostenPosition[]): number {
  return kosten.reduce((sum, k) => sum + k.betrag, 0);
}

/**
 * Alias for clarity – total of all costs in the list.
 */
export function berechneGesamtkosten(kosten: KostenPosition[]): number {
  return berechneGruendungskosten(kosten);
}

/**
 * Group costs by category and return summed amounts per category.
 */
export function berechneKostenNachKategorie(
  kosten: KostenPosition[]
): Record<string, number> {
  return kosten.reduce<Record<string, number>>((acc, k) => {
    const key = k.kategorie ?? "Sonstige";
    acc[key] = (acc[key] ?? 0) + k.betrag;
    return acc;
  }, {});
}
