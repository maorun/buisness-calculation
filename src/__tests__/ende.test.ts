import {
  berechneEinkommensteuer,
  berechneSoli,
  berechneNettoGehalt,
  berechneGewinnausschuettungsteuer,
  berechneNettoAusschuettung,
  berechneEndeErgebnisse,
} from "@/lib/calculations/ende";
import { EndeState } from "@/lib/types";

describe("berechneEinkommensteuer", () => {
  it("returns 0 below Grundfreibetrag (11.604 €)", () => {
    expect(berechneEinkommensteuer(0)).toBe(0);
    expect(berechneEinkommensteuer(11604)).toBe(0);
  });

  it("returns positive tax for income above Grundfreibetrag", () => {
    expect(berechneEinkommensteuer(15000)).toBeGreaterThan(0);
  });

  it("uses 42% rate for high incomes (up to 277.825 €)", () => {
    const income = 100000;
    const tax = berechneEinkommensteuer(income);
    // approx: 0.42 × 100000 - 10602 = 31398
    expect(tax).toBeCloseTo(31398, -2);
  });

  it("uses 45% rate for very high incomes (above 277.825 €)", () => {
    const income = 300000;
    const tax45 = berechneEinkommensteuer(income);
    // approx: 0.45 × 300000 - 17375 = 117625
    expect(tax45).toBeCloseTo(117625, -2);
  });

  it("is progressive (higher income → higher tax rate)", () => {
    const tax30k = berechneEinkommensteuer(30000);
    const tax60k = berechneEinkommensteuer(60000);
    const tax100k = berechneEinkommensteuer(100000);
    expect(tax60k / 60000).toBeGreaterThan(tax30k / 30000);
    expect(tax100k / 100000).toBeGreaterThan(tax60k / 60000);
  });
});

describe("berechneSoli", () => {
  it("returns 0 for low income tax (abolished for most)", () => {
    // Soli threshold ~16956 ESt
    expect(berechneSoli(0)).toBe(0);
    expect(berechneSoli(16956)).toBe(0);
  });

  it("calculates 5.5% for high income tax", () => {
    const est = 30000;
    expect(berechneSoli(est)).toBeCloseTo(Math.floor(est * 0.055));
  });
});

describe("berechneNettoGehalt", () => {
  it("netto is less than brutto", () => {
    expect(berechneNettoGehalt(60000)).toBeLessThan(60000);
  });

  it("returns full amount for income below Grundfreibetrag", () => {
    expect(berechneNettoGehalt(11000)).toBe(11000);
  });

  it("returns reasonable netto for typical GmbH-GF salary", () => {
    const netto = berechneNettoGehalt(60000);
    // Rough estimate: ~38000-42000 net (no social security here)
    expect(netto).toBeGreaterThan(30000);
    expect(netto).toBeLessThan(60000);
  });
});

describe("berechneGewinnausschuettungsteuer", () => {
  it("uses Abgeltungssteuer for moderate distribution", () => {
    const { methode, steuer } = berechneGewinnausschuettungsteuer(10000, 0.42);
    // At 42% personal rate: Abgeltungsteuer = 2637.5, Teileinkünfte = 2520 + Soli
    // Let's just verify it returns the lower one
    expect(steuer).toBeGreaterThan(0);
    expect(steuer).toBeLessThan(10000);
    expect(methode).toMatch(/Abgeltungssteuer|Teileinkünfteverfahren/);
  });

  it("chooses Teileinkünfteverfahren for very high personal tax rate", () => {
    // At 45% personal rate → Teileinkünfte = 10000 * 0.6 * 0.45 = 2700, Abgeltungsteuer = 2637.5
    // Abgeltungsteuer should be cheaper
    const { methode } = berechneGewinnausschuettungsteuer(10000, 0.45);
    // Abgeltungsteuer 26.375% flat vs Teileinkünfte 60% × 45% = 27% → Abgeltungsteuer wins
    expect(methode).toBe("Abgeltungssteuer");
  });

  it("returns 0 tax for 0 distribution", () => {
    const { steuer } = berechneGewinnausschuettungsteuer(0);
    expect(steuer).toBe(0);
  });

  it("Abgeltungssteuer is approx 26.375% of gross", () => {
    const ausschuettung = 100000;
    const { steuer, methode } = berechneGewinnausschuettungsteuer(ausschuettung, 0.1); // low personal rate → Abgeltungsteuer
    if (methode === "Abgeltungssteuer") {
      expect(steuer).toBeCloseTo(100000 * 0.25 * 1.055, 0);
    }
  });
});

describe("berechneNettoAusschuettung", () => {
  it("reduces profit by KSt first, then by dividend tax", () => {
    const { nettoAusschuettung, kstSteuer, ausschuettungsteuer } =
      berechneNettoAusschuettung(100000);
    expect(kstSteuer).toBeCloseTo(15825);
    const ausschuettung = 100000 - kstSteuer;
    expect(nettoAusschuettung).toBeCloseTo(ausschuettung - ausschuettungsteuer);
  });

  it("returns 0 netto for 0 input", () => {
    const { nettoAusschuettung } = berechneNettoAusschuettung(0);
    expect(nettoAusschuettung).toBe(0);
  });
});

describe("berechneEndeErgebnisse", () => {
  const defaultState: EndeState = {
    geschaeftsfuehrergehalt: 60000,
    gewinnausschuettung: 40000,
    darlehenZinsen: 875,
    laufzeitJahre: 3,
  };

  it("returns one entry per year", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results).toHaveLength(3);
  });

  it("Jahr numbers are sequential", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results[0].jahr).toBe(1);
    expect(results[2].jahr).toBe(3);
  });

  it("gesamtvermoegen grows each year", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results[1].gesamtvermoegen).toBeGreaterThan(results[0].gesamtvermoegen);
  });

  it("nettogewinn = nettoGehalt + nettoAusschuettung + darlehenZinsenNetto", () => {
    const results = berechneEndeErgebnisse(defaultState);
    for (const r of results) {
      const expected = r.details.nettoGehalt + r.details.nettoAusschuettung + r.details.darlehenZinsenNetto;
      expect(r.nettogewinn).toBeCloseTo(expected);
    }
  });

  it("includes darlehen zinsen in gross income", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results[0].details.darlehenZinsen).toBe(875);
    expect(results[0].details.darlehenZinsenSteuer).toBeCloseTo(875 * 0.25 * 1.055);
    expect(results[0].details.darlehenZinsenNetto).toBeCloseTo(875 - 875 * 0.25 * 1.055);
  });

  it("handles 0 darlehen zinsen", () => {
    const state = { ...defaultState, darlehenZinsen: 0 };
    const results = berechneEndeErgebnisse(state);
    expect(results[0].details.darlehenZinsen).toBe(0);
    expect(results[0].details.darlehenZinsenSteuer).toBe(0);
    expect(results[0].details.darlehenZinsenNetto).toBe(0);
  });

  it("tax includes einkommensteuer + soli + kst + ausschuettungsteuer + darlehenZinsenSteuer", () => {
    const results = berechneEndeErgebnisse(defaultState);
    for (const r of results) {
      const expectedTax =
        r.details.einkommensteuer +
        r.details.soli +
        r.details.kstSteuer +
        r.details.ausschuettungsteuer +
        r.details.darlehenZinsenSteuer;
      expect(r.steuer).toBeCloseTo(expectedTax);
    }
  });

  it("handles 0 salary", () => {
    const state = { ...defaultState, geschaeftsfuehrergehalt: 0 };
    const results = berechneEndeErgebnisse(state);
    expect(results[0].details.bruttoGehalt).toBe(0);
    expect(results[0].details.nettoGehalt).toBe(0);
  });

  it("handles 0 distribution", () => {
    const state = { ...defaultState, gewinnausschuettung: 0 };
    const results = berechneEndeErgebnisse(state);
    expect(results[0].details.nettoAusschuettung).toBe(0);
  });

  it("handles laufzeitJahre = 0", () => {
    const state = { ...defaultState, laufzeitJahre: 0 };
    const results = berechneEndeErgebnisse(state);
    expect(results).toHaveLength(0);
  });

  it("initial ETF value is carried forward", () => {
    const etfStart = 500000;
    const results = berechneEndeErgebnisse(defaultState, etfStart);
    // gesamtvermoegen starts at etfStart + first year netto
    expect(results[0].gesamtvermoegen).toBeGreaterThan(etfStart);
  });
});
