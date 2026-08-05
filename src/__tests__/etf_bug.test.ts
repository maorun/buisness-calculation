import { berechneEndeErgebnisse } from "@/lib/calculations/ende";

it("bug: when ETF is much smaller than loan, reinvestiertes Darlehen is lost due to max(0,...)", () => {
  const state = {
    geschaeftsfuehrergehalt: 0,
    stammkapitalErhoehungEtf: 0,
    gehaltBereich1: 0,
    teiltilgungBereich1: 0,
    gewinnausschuettung: 0,
    tilgungsrate: 0,
    laufzeitJahre: 2,
    zielnettoBereich1: 0,
    zielnettoBereich2: 0,
  };

  // ETF start = 0, loan = 10000
  // In real scenario: loan was not invested in ETF (or ETF was depleted)
  const results = berechneEndeErgebnisse(state, 0, 10000, 0, 0, true, 7);
  const b1 = results[0];
  const b2y1 = results[1];

  console.log("ETF=0 case:");
  console.log("B1 firmenEtfVermoegen:", b1.details.firmenEtfVermoegen);
  console.log("B1 restdarlehen (neuesDarlehenStart):", b1.details.neuesDarlehenStart);
  console.log("B2y1 firmenEtfVermoegen:", b2y1.details.firmenEtfVermoegen);
  console.log("B2y1 restdarlehen:", b2y1.details.restdarlehen);
  
  // If the re-lent loan (10000) should be in the ETF, we expect firmenEtfVermoegen >= 10000
  // Bug: firmenEtfVermoegen might be 0 because max(0,...) clips the addition
  expect(b1.details.firmenEtfVermoegen).toBeGreaterThanOrEqual(b1.details.neuesDarlehenStart ?? 0);
});
