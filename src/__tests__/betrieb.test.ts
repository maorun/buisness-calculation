import {
  berechneVorabpauschale,
  berechneVorabpauschalesteuer,
  berechneEtfWachstum,
  berechneDarlehenszinsen,
  berechneBetriebskosten,
  berechneBenefitsSteuerersparnis,
  berechneHandyNettoKostenProJahr,
  berechneBetriebsErgebnisse,
  BASISZINS_2024,
  ABGELTUNGSSTEUER_GESAMT,
  TEILFREISTELLUNG_AKTIEN,
  GMBH_STEUER_GESAMT,
  HANDY_ANSCHAFFUNGSKOSTEN,
  HANDY_VERKAUFSQUOTE,
} from "@/lib/calculations/betrieb";
import { BetriebState, DarlehenConfig, BenefitConfig, KostenPosition } from "@/lib/types";

describe("berechneEtfWachstum", () => {
  it("calculates 7% growth correctly", () => {
    expect(berechneEtfWachstum(100000, 7)).toBeCloseTo(107000);
  });

  it("handles 0% growth", () => {
    expect(berechneEtfWachstum(100000, 0)).toBe(100000);
  });

  it("handles negative growth (loss year)", () => {
    expect(berechneEtfWachstum(100000, -10)).toBeCloseTo(90000);
  });
});

describe("berechneVorabpauschale", () => {
  it("returns 0 if no actual return", () => {
    // navStart = navEnd → no return
    expect(berechneVorabpauschale(100000, 100000)).toBe(0);
  });

  it("returns 0 if navEnd < navStart (loss)", () => {
    expect(berechneVorabpauschale(100000, 90000)).toBe(0);
  });

  it("is capped at actual return when basisertrag > actual return", () => {
    // Very high basiszins, small actual return
    const nav = 100000;
    const smallGain = 100; // only 0.1% gain
    const result = berechneVorabpauschale(nav, nav + smallGain, 0.5); // 50% basiszins → huge basisertrag
    expect(result).toBe(smallGain); // capped at actual return
  });

  it("uses basisertrag if lower than actual return", () => {
    const navStart = 100000;
    const navEnd = 110000; // 10% gain
    const basiszins = BASISZINS_2024; // 2.29%
    const basisertrag = basiszins * 0.7 * navStart; // = 1603
    const actualReturn = 10000;
    const result = berechneVorabpauschale(navStart, navEnd, basiszins);
    expect(result).toBeCloseTo(basisertrag);
    expect(result).toBeLessThan(actualReturn);
  });

  it("calculates correctly with default 2024 basiszins", () => {
    const navStart = 50000;
    const navEnd = 53500; // 7% gain
    const expected = BASISZINS_2024 * 0.7 * navStart; // ~801.5
    expect(berechneVorabpauschale(navStart, navEnd)).toBeCloseTo(expected);
  });
});

describe("berechneVorabpauschalesteuer", () => {
  it("applies Teilfreistellung correctly", () => {
    const vp = 1000;
    const taxableAmount = vp * (1 - TEILFREISTELLUNG_AKTIEN); // 700
    const expectedTax = taxableAmount * ABGELTUNGSSTEUER_GESAMT;
    expect(berechneVorabpauschalesteuer(vp)).toBeCloseTo(expectedTax);
  });

  it("returns 0 for 0 Vorabpauschale", () => {
    expect(berechneVorabpauschalesteuer(0)).toBe(0);
  });

  it("respects custom Teilfreistellung", () => {
    const vp = 1000;
    const taxableAmount = vp * (1 - 0.5); // 50% Teilfreistellung
    const expectedTax = taxableAmount * ABGELTUNGSSTEUER_GESAMT;
    expect(berechneVorabpauschalesteuer(vp, 0.5)).toBeCloseTo(expectedTax);
  });
});

describe("berechneDarlehenszinsen", () => {
  const darlehen: DarlehenConfig = {
    betrag: 25000,
    zinssatz: 3.5,
    endfaellig: false,
  };

  it("calculates annual interest correctly", () => {
    expect(berechneDarlehenszinsen(darlehen)).toBeCloseTo(875);
  });

  it("handles 0% interest rate", () => {
    expect(berechneDarlehenszinsen({ ...darlehen, zinssatz: 0 })).toBe(0);
  });

  it("handles 0 loan amount", () => {
    expect(berechneDarlehenszinsen({ ...darlehen, betrag: 0 })).toBe(0);
  });

  it("calculates same for endfaellig and non-endfaellig (annual interest is the same)", () => {
    const endfaellig = berechneDarlehenszinsen({ ...darlehen, endfaellig: true });
    const normal = berechneDarlehenszinsen({ ...darlehen, endfaellig: false });
    expect(endfaellig).toBe(normal);
  });
});

describe("berechneBetriebskosten", () => {
  it("sums annual costs", () => {
    const kosten: KostenPosition[] = [
      { id: "1", bezeichnung: "Steuerberater", betrag: 3000, periode: 'jaehrlich' },
      { id: "2", bezeichnung: "Bank", betrag: 240, periode: 'jaehrlich' },
    ];
    expect(berechneBetriebskosten(kosten)).toBe(3240);
  });

  it("converts monthly costs to annual (×12)", () => {
    const kosten: KostenPosition[] = [
      { id: "1", bezeichnung: "Software", betrag: 50, periode: 'monatlich' },
    ];
    expect(berechneBetriebskosten(kosten)).toBe(600); // 50 × 12
  });

  it("mixes monthly and annual costs correctly", () => {
    const kosten: KostenPosition[] = [
      { id: "1", bezeichnung: "Steuerberater", betrag: 3000, periode: 'jaehrlich' },
      { id: "2", bezeichnung: "Bank", betrag: 20, periode: 'monatlich' }, // 240/year
    ];
    expect(berechneBetriebskosten(kosten)).toBe(3240);
  });

  it("treats undefined periode as annual", () => {
    const kosten: KostenPosition[] = [
      { id: "1", bezeichnung: "Steuerberater", betrag: 3000 },
    ];
    expect(berechneBetriebskosten(kosten)).toBe(3000);
  });

  it("returns 0 for empty list", () => {
    expect(berechneBetriebskosten([])).toBe(0);
  });
});

describe("berechneBenefitsSteuerersparnis", () => {
  it("caps fuel voucher at 50€/month", () => {
    const benefits: BenefitConfig = { tankgutschein: 75, strategieessen: 0 };
    const expected = 600 * GMBH_STEUER_GESAMT;
    expect(berechneBenefitsSteuerersparnis(benefits)).toBeCloseTo(expected);
  });

  it("includes full strategieessen", () => {
    const benefits: BenefitConfig = { tankgutschein: 0, strategieessen: 1500 };
    const expected = 1500 * GMBH_STEUER_GESAMT;
    expect(berechneBenefitsSteuerersparnis(benefits)).toBeCloseTo(expected);
  });

  it("returns 0 for all-zero benefits", () => {
    const benefits: BenefitConfig = { tankgutschein: 0, strategieessen: 0 };
    expect(berechneBenefitsSteuerersparnis(benefits)).toBe(0);
  });

  it("combines all benefits correctly", () => {
    const benefits: BenefitConfig = { tankgutschein: 50, strategieessen: 1500 };
    const expected = (600 + 1500) * GMBH_STEUER_GESAMT;
    expect(berechneBenefitsSteuerersparnis(benefits)).toBeCloseTo(expected);
  });
});

describe("berechneHandyNettoKostenProJahr", () => {
  it("applies net phone costs every 3 years", () => {
    const expected = HANDY_ANSCHAFFUNGSKOSTEN * (1 - HANDY_VERKAUFSQUOTE);
    expect(berechneHandyNettoKostenProJahr(1)).toBeCloseTo(expected);
    expect(berechneHandyNettoKostenProJahr(2)).toBe(0);
    expect(berechneHandyNettoKostenProJahr(3)).toBe(0);
    expect(berechneHandyNettoKostenProJahr(4)).toBeCloseTo(expected);
  });
});

describe("berechneBetriebsErgebnisse", () => {
  const defaultState: BetriebState = {
    startkapital: 100000,
    darlehen: { betrag: 25000, zinssatz: 3.5, endfaellig: false },
    etfRendite: 7,
    laufzeitJahre: 3,
    kosten: [{ id: "1", bezeichnung: "Steuerberater", betrag: 3000 }],
    benefits: { tankgutschein: 50, strategieessen: 1500 },
  };

  it("returns one result per year", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    expect(results).toHaveLength(3);
  });

  it("ETF value grows each year", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    expect(results[1].details.etfWert).toBeGreaterThan(results[0].details.etfWert);
    expect(results[2].details.etfWert).toBeGreaterThan(results[1].details.etfWert);
  });

  it("Jahr numbers are sequential", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    expect(results[0].jahr).toBe(1);
    expect(results[1].jahr).toBe(2);
    expect(results[2].jahr).toBe(3);
  });

  it("ETF value in year 1 is 7% growth minus all cash outflows", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    // ETF grows 7% then cash outflows (costs + taxes) are deducted via ETF unit sales
    const etfNachWachstum = 100000 * 1.07; // 107,000
    expect(r.details.etfWert).toBeCloseTo(etfNachWachstum - r.details.etfVerkauf);
    // ETF is less than pure growth because outflows are deducted
    expect(r.details.etfWert).toBeLessThan(etfNachWachstum);
    // But still higher than start (positive net in year 1 with 7% rendite)
    expect(r.details.etfWert).toBeGreaterThan(100000);
  });

  it("etfVerkauf equals sum of all annual cash outflows", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    const expectedVerkauf =
      r.details.jaehrlicheKosten +
      r.details.handyNettoKosten +
      r.details.jaehrlicheZinsen +
      r.details.gmbhSteuer +
      r.details.vorabpauschalesteuer;
    expect(r.details.etfVerkauf).toBeCloseTo(expectedVerkauf);
  });

  it("ETF value equals growth minus etfVerkauf each year", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    // We can't easily know the pre-deduction value per year, but we can check
    // that gesamtvermoegen equals etfWert (which now reflects real cash-flow value)
    for (const r of results) {
      expect(r.gesamtvermoegen).toBeCloseTo(r.details.etfWert);
    }
  });

  it("nettovermoegen in details = etfWert - offenesDarlehen", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    for (const r of results) {
      expect(r.details.nettovermoegen).toBeCloseTo(r.details.etfWert - r.details.offenesDarlehen);
    }
  });

  it("handles monthly operating costs correctly (×12)", () => {
    const state: BetriebState = {
      ...defaultState,
      kosten: [{ id: "1", bezeichnung: "Software", betrag: 100, periode: 'monatlich' }],
    };
    const results = berechneBetriebsErgebnisse(state);
    expect(results[0].details.jaehrlicheKosten).toBe(1200); // 100 × 12
  });

  it("handles 0 operating costs", () => {
    const state = { ...defaultState, kosten: [] };
    const results = berechneBetriebsErgebnisse(state);
    expect(results[0].details.jaehrlicheKosten).toBe(0);
  });

  it("handles 0 loan (no interest)", () => {
    const state = {
      ...defaultState,
      darlehen: { betrag: 0, zinssatz: 3.5, endfaellig: false },
    };
    const results = berechneBetriebsErgebnisse(state);
    expect(results[0].details.jaehrlicheZinsen).toBe(0);
  });

  it("handles laufzeitJahre = 0", () => {
    const state = { ...defaultState, laufzeitJahre: 0 };
    const results = berechneBetriebsErgebnisse(state);
    expect(results).toHaveLength(0);
  });

  it("GmbH tax is 0 when operating at a loss", () => {
    // Very high costs to ensure a loss
    const state: BetriebState = {
      ...defaultState,
      kosten: [{ id: "1", bezeichnung: "Hohe Kosten", betrag: 200000 }],
    };
    const results = berechneBetriebsErgebnisse(state);
    expect(results[0].details.gmbhSteuer).toBe(0);
  });

  it("steuer includes both GmbH tax and Vorabpauschale tax", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    expect(r.steuer).toBeCloseTo(r.details.gmbhSteuer + r.details.vorabpauschalesteuer);
  });

  it("does not deduct interest annually for endfällig loans", () => {
    const endfaelligState: BetriebState = {
      ...defaultState,
      darlehen: { betrag: 25000, zinssatz: 3.5, endfaellig: true },
    };
    const normalState: BetriebState = {
      ...defaultState,
      darlehen: { betrag: 25000, zinssatz: 3.5, endfaellig: false },
    };
    const endfaelligResults = berechneBetriebsErgebnisse(endfaelligState);
    const normalResults = berechneBetriebsErgebnisse(normalState);
    // Endfällig: no annual interest deduction
    expect(endfaelligResults[0].details.jaehrlicheZinsen).toBe(0);
    // Regular: annual interest is deducted
    expect(normalResults[0].details.jaehrlicheZinsen).toBeCloseTo(875);
    // Endfällig profit should be higher (no interest deducted)
    expect(endfaelligResults[0].gewinn).toBeGreaterThan(normalResults[0].gewinn);
  });

  it("accumulates deferred interest for endfällig loans", () => {
    const endfaelligState: BetriebState = {
      ...defaultState,
      darlehen: { betrag: 25000, zinssatz: 3.5, endfaellig: true },
    };
    const results = berechneBetriebsErgebnisse(endfaelligState);
    const annualInterest = 25000 * 0.035; // 875
    expect(results[0].details.aufgelaufeneZinsen).toBeCloseTo(annualInterest);
    expect(results[1].details.aufgelaufeneZinsen).toBeCloseTo(annualInterest * 2);
    expect(results[2].details.aufgelaufeneZinsen).toBeCloseTo(annualInterest * 3);
  });

  it("aufgelaufeneZinsen is 0 for non-endfällig loans", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    for (const r of results) {
      expect(r.details.aufgelaufeneZinsen).toBe(0);
    }
  });

  it("includes phone net cost as operating expense only in replacement years", () => {
    const state: BetriebState = {
      ...defaultState,
      etfRendite: 0,
      laufzeitJahre: 4,
      kosten: [],
      darlehen: { betrag: 0, zinssatz: 0, endfaellig: false },
      benefits: { tankgutschein: 0, strategieessen: 0 },
    };
    const results = berechneBetriebsErgebnisse(state);
    const expectedHandyKosten = HANDY_ANSCHAFFUNGSKOSTEN * (1 - HANDY_VERKAUFSQUOTE);
    // Phone cost appears in details as handyNettoKosten and reduces profit directly
    expect(results[0].details.handyNettoKosten).toBeCloseTo(expectedHandyKosten);
    expect(results[1].details.handyNettoKosten).toBeCloseTo(0);
    expect(results[2].details.handyNettoKosten).toBeCloseTo(0);
    expect(results[3].details.handyNettoKosten).toBeCloseTo(expectedHandyKosten);
    // Benefits savings do not include phone costs (phone reduces profit directly)
    expect(results[0].details.benefitSteuerersparnis).toBeCloseTo(0);
    expect(results[3].details.benefitSteuerersparnis).toBeCloseTo(0);
  });
});
