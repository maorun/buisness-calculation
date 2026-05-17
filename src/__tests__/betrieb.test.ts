import {
  berechneVorabpauschale,
  berechneVorabpauschaleNachEtfVerkauf,
  berechneVorabpauschalesteuer,
  berechneEtfVerkaufssteuer,
  berechneEtfWachstum,
  berechneDarlehenszinsen,
  berechneDarlehensjahr,
  berechneBetriebskosten,
  berechneBenefitsKosten,
  berechneBenefitsSteuerersparnis,
  berechneHandyNettoKostenProJahr,
  berechneGmbhKonsumwertProJahr,
  berechneBetriebsErgebnisse,
  berechnePrivatVergleichErgebnis,
  BASISZINS_2024,
  ABGELTUNGSSTEUER_GESAMT,
  TEILFREISTELLUNG_AKTIEN,
  TEILFREISTELLUNG_AKTIEN_GMBH,
  GMBH_STEUER_GESAMT,
  HANDY_ANSCHAFFUNGSKOSTEN,
  HANDY_VERKAUFSQUOTE,
  DEFAULT_FIRMENHANDY_CONFIG,
  UMSATZSTEUER_SATZ,
  berechneEinkommensteuerBetrieb,
  berechneSoliBetrieb,
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

describe("berechneVorabpauschaleNachEtfVerkauf", () => {
  it("credits realized ETF gains against Vorabpauschale", () => {
    expect(berechneVorabpauschaleNachEtfVerkauf(1000, 400)).toBe(600);
  });

  it("never becomes negative", () => {
    expect(berechneVorabpauschaleNachEtfVerkauf(1000, 2000)).toBe(0);
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

  it("uses GmbH Teilfreistellung (80%) and corporate tax rate when called with GmbH parameters", () => {
    const vp = 1000;
    const taxableAmount = vp * (1 - TEILFREISTELLUNG_AKTIEN_GMBH); // 200
    const expectedTax = taxableAmount * GMBH_STEUER_GESAMT;
    expect(berechneVorabpauschalesteuer(vp, TEILFREISTELLUNG_AKTIEN_GMBH, GMBH_STEUER_GESAMT)).toBeCloseTo(expectedTax);
  });
});

describe("berechneEtfVerkaufssteuer", () => {
  it("uses GmbH Teilfreistellung (80%) and GmbH tax rate by default", () => {
    const realisierterGewinn = 1000;
    const expected = realisierterGewinn * (1 - TEILFREISTELLUNG_AKTIEN_GMBH) * GMBH_STEUER_GESAMT;
    expect(berechneEtfVerkaufssteuer(realisierterGewinn)).toBeCloseTo(expected);
  });

  it("allows overriding to private-person Teilfreistellung", () => {
    const realisierterGewinn = 1000;
    const expected = realisierterGewinn * (1 - TEILFREISTELLUNG_AKTIEN) * ABGELTUNGSSTEUER_GESAMT;
    expect(
      berechneEtfVerkaufssteuer(realisierterGewinn, TEILFREISTELLUNG_AKTIEN, ABGELTUNGSSTEUER_GESAMT)
    ).toBeCloseTo(expected);
  });

  it("returns 0 for non-positive realized gain", () => {
    expect(berechneEtfVerkaufssteuer(0)).toBe(0);
    expect(berechneEtfVerkaufssteuer(-100)).toBe(0);
  });
});

describe("berechneDarlehenszinsen", () => {
  const darlehen: DarlehenConfig = {
    betrag: 25000,
    zinssatz: 3.5,
    monatlicherZuschuss: 0,
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

describe("berechneDarlehensjahr", () => {
  it("keeps principal stable without monthly top-ups", () => {
    const result = berechneDarlehensjahr(25000, 3.5, 0);
    expect(result.darlehenBetragEnde).toBeCloseTo(25000);
    expect(result.zinsenJaehrlich).toBeCloseTo(875, 6);
  });

  it("increases principal and annual interest with monthly top-ups", () => {
    const result = berechneDarlehensjahr(25000, 3.5, 100);
    expect(result.darlehenBetragEnde).toBeCloseTo(26200);
    expect(result.zinsenJaehrlich).toBeCloseTo(894.25, 6);
    expect(result.zinsenJaehrlich).toBeGreaterThan(875);
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
    const benefits: BenefitConfig = { tankgutschein: 75, strategieessen: 0, bav: 0 };
    const expected = 600 * GMBH_STEUER_GESAMT;
    expect(berechneBenefitsSteuerersparnis(benefits)).toBeCloseTo(expected);
  });

  it("includes full strategieessen", () => {
    const benefits: BenefitConfig = { tankgutschein: 0, strategieessen: 1500, bav: 0 };
    const expected = 1500 * GMBH_STEUER_GESAMT;
    expect(berechneBenefitsSteuerersparnis(benefits)).toBeCloseTo(expected);
  });

  it("returns 0 for all-zero benefits", () => {
    const benefits: BenefitConfig = { tankgutschein: 0, strategieessen: 0, bav: 0 };
    expect(berechneBenefitsSteuerersparnis(benefits)).toBe(0);
  });

  it("combines all benefits correctly", () => {
    const benefits: BenefitConfig = { tankgutschein: 50, strategieessen: 1500, bav: 0 };
    const expected = (600 + 1500) * GMBH_STEUER_GESAMT;
    expect(berechneBenefitsSteuerersparnis(benefits)).toBeCloseTo(expected);
  });
});

describe("berechneBenefitsKosten", () => {
  it("treats benefits as annual deductible operating costs", () => {
    const benefits: BenefitConfig = { tankgutschein: 50, strategieessen: 1500, bav: 0 };
    expect(berechneBenefitsKosten(benefits)).toBe(2100);
  });

  it("includes bAV contribution in total costs", () => {
    const benefits: BenefitConfig = { tankgutschein: 50, strategieessen: 1500, bav: 3600 };
    expect(berechneBenefitsKosten(benefits)).toBe(5700);
  });

  it("treats negative bAV as zero", () => {
    const benefits: BenefitConfig = { tankgutschein: 50, strategieessen: 0, bav: -500 };
    expect(berechneBenefitsKosten(benefits)).toBe(600);
  });
});

describe("berechneHandyNettoKostenProJahr", () => {
  it("charges full purchase price in the first acquisition year (no trade-in)", () => {
    expect(berechneHandyNettoKostenProJahr(1)).toBeCloseTo(HANDY_ANSCHAFFUNGSKOSTEN);
  });

  it("returns 0 in non-replacement years", () => {
    expect(berechneHandyNettoKostenProJahr(2)).toBe(0);
    expect(berechneHandyNettoKostenProJahr(3)).toBe(0);
  });

  it("applies trade-in offset from the second cycle onward", () => {
    const expected = HANDY_ANSCHAFFUNGSKOSTEN * (1 - HANDY_VERKAUFSQUOTE);
    expect(berechneHandyNettoKostenProJahr(4)).toBeCloseTo(expected);
    expect(berechneHandyNettoKostenProJahr(7)).toBeCloseTo(expected);
  });

  it("returns 0 when aktiv is false", () => {
    const config = { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: false };
    expect(berechneHandyNettoKostenProJahr(1, config)).toBe(0);
    expect(berechneHandyNettoKostenProJahr(4, config)).toBe(0);
  });

  it("respects custom config (purchase price, restwertQuote, cycle)", () => {
    const config = { aktiv: true, anschaffungskosten: 800, restwertQuote: 0.2, ersatzzyklusJahre: 2 };
    // Year 1: full purchase, no trade-in
    expect(berechneHandyNettoKostenProJahr(1, config)).toBeCloseTo(800);
    expect(berechneHandyNettoKostenProJahr(2, config)).toBe(0);
    // Year 3 (second cycle): 800 - 160 = 640
    expect(berechneHandyNettoKostenProJahr(3, config)).toBeCloseTo(640);
  });

  it("respects erstanschaffungJahr: no cost before that year", () => {
    const config = { ...DEFAULT_FIRMENHANDY_CONFIG, erstanschaffungJahr: 3 };
    // Years 1 and 2: programme not started yet
    expect(berechneHandyNettoKostenProJahr(1, config)).toBe(0);
    expect(berechneHandyNettoKostenProJahr(2, config)).toBe(0);
    // Year 3: first acquisition – full purchase price
    expect(berechneHandyNettoKostenProJahr(3, config)).toBeCloseTo(HANDY_ANSCHAFFUNGSKOSTEN);
    // Year 4, 5: no cost
    expect(berechneHandyNettoKostenProJahr(4, config)).toBe(0);
    expect(berechneHandyNettoKostenProJahr(5, config)).toBe(0);
    // Year 6 (= 3 + ersatzzyklusJahre): replacement with trade-in
    expect(berechneHandyNettoKostenProJahr(6, config)).toBeCloseTo(HANDY_ANSCHAFFUNGSKOSTEN * (1 - HANDY_VERKAUFSQUOTE));
  });
});

describe("berechneGmbhKonsumwertProJahr", () => {
  it("reduces the GmbH consumption value by tax shield and input VAT for company phones", () => {
    const benefits: BenefitConfig = { tankgutschein: 50, strategieessen: 0, bav: 0 };
    const expectedTankEffektiv = 600 * (1 - GMBH_STEUER_GESAMT);
    const expectedHandyEffektiv = (HANDY_ANSCHAFFUNGSKOSTEN / (1 + UMSATZSTEUER_SATZ)) * (1 - GMBH_STEUER_GESAMT);

    expect(berechneGmbhKonsumwertProJahr(1, benefits)).toBeCloseTo(expectedTankEffektiv + expectedHandyEffektiv);
  });
});

describe("berechneBetriebsErgebnisse", () => {
  const defaultState: BetriebState = {
    startkapital: 100000,
    jaehrlicherCashZuschuss: 0,
    geschaeftsfuehrergehalt: 0,
    darlehen: { betrag: 25000, zinssatz: 3.5, monatlicherZuschuss: 0, endfaellig: false },
    etfRendite: 7,
    laufzeitJahre: 3,
    kosten: [{ id: "1", bezeichnung: "Steuerberater", betrag: 3000 }],
    benefits: { tankgutschein: 50, strategieessen: 1500, bav: 0 },
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
    const initialEtf = defaultState.startkapital + defaultState.darlehen.betrag;
    // ETF grows 7% then cash outflows (costs + taxes) are deducted via ETF unit sales
    const etfNachWachstum = initialEtf * 1.07;
    expect(r.details.etfWert).toBeCloseTo(etfNachWachstum - r.details.etfVerkauf);
    // ETF is less than pure growth because outflows are deducted
    expect(r.details.etfWert).toBeLessThan(etfNachWachstum);
    // Can be below start value if annual outflows exceed realized return in year 1.
    expect(r.details.etfWert).toBeGreaterThan(0);
  });

  it("ETF value in year 1 is above start when outflows are minimal", () => {
    const state: BetriebState = {
      ...defaultState,
      kosten: [],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
    };
    const result = berechneBetriebsErgebnisse(state)[0];
    expect(result.details.etfWert).toBeGreaterThan(100000);
  });

  it("etfVerkauf equals sum of all annual cash outflows", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    const expectedVerkauf =
      r.details.jaehrlicheKosten +
      r.details.handyNettoKosten +
      r.details.benefitsKosten +
      r.details.jaehrlicheZinsen +
      r.details.gmbhSteuer +
      r.details.vorabpauschalesteuer +
      r.details.etfVerkaufssteuer;
    expect(r.details.etfVerkauf).toBeCloseTo(expectedVerkauf);
  });

  it("etfVerkauf is split into sold cost basis plus realized ETF gain", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    expect(r.details.etfVerkauf).toBeCloseTo(r.details.etfEinstandswertVerkauft + r.details.etfGewinn);
  });

  it("deckungssaldo after operating outflows and taxes is approximately zero", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    // ETF sales are iteratively sized to cover operating outflows and taxes in the same year.
    expect(r.details.deckungssaldoNachAusgabenUndSteuern).toBeCloseTo(0, 2);
  });

  it("gesamtvermoegen equals ETF + cash reserve each year", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    for (const r of results) {
      expect(r.gesamtvermoegen).toBeCloseTo(r.details.etfWert + r.details.cashReserve);
    }
  });

  it("nettovermoegen in details = gesamtvermoegen - offenesDarlehen", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    for (const r of results) {
      expect(r.details.nettovermoegen).toBeCloseTo(r.gesamtvermoegen - r.details.offenesDarlehen);
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

  it("adapts required ETF sale when operating expenses change", () => {
    const lowCostState: BetriebState = {
      ...defaultState,
      kosten: [{ id: "1", bezeichnung: "Niedrige Kosten", betrag: 1000, periode: "jaehrlich", kategorie: "Test" }],
    };
    const highCostState: BetriebState = {
      ...defaultState,
      kosten: [{ id: "1", bezeichnung: "Hohe Kosten", betrag: 10000, periode: "jaehrlich", kategorie: "Test" }],
    };

    const low = berechneBetriebsErgebnisse(lowCostState)[0];
    const high = berechneBetriebsErgebnisse(highCostState)[0];

    expect(high.details.jaehrlicheKosten).toBeGreaterThan(low.details.jaehrlicheKosten);
    expect(high.details.etfVerkauf).toBeGreaterThan(low.details.etfVerkauf);
  });

  it("handles 0 loan (no interest)", () => {
    const state = {
      ...defaultState,
      darlehen: { betrag: 0, zinssatz: 3.5, monatlicherZuschuss: 0, endfaellig: false },
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

  it("steuer includes GmbH tax, Vorabpauschale tax and ETF sale tax", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    expect(r.steuer).toBeCloseTo(
      r.details.gmbhSteuer + r.details.vorabpauschalesteuer + r.details.etfVerkaufssteuer
    );
  });

  it("reduces Vorabpauschale to zero when realized ETF gain already covers it", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 100000,
      etfRendite: 7,
      laufzeitJahre: 1,
      // Intentionally large enough to force ETF sales with positive realized gain in year 1.
      kosten: [{ id: "1", bezeichnung: "Hohe Kosten", betrag: 120000, periode: "jaehrlich" }],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
      firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: false },
    };
    const result = berechneBetriebsErgebnisse(state)[0];
    expect(result.details.etfVerkauf).toBeGreaterThan(0);
    expect(result.details.etfGewinn).toBeGreaterThan(0);
    expect(result.details.vorabpauschaleVorAnrechnung).toBeGreaterThan(0);
    expect(result.details.vorabpauschale).toBe(0);
    expect(result.details.vorabpauschalesteuer).toBe(0);
  });

  it("tracks theoretischer ETF-Ertrag separately from realized sale gain", () => {
    const results = berechneBetriebsErgebnisse(defaultState);
    const r = results[0];
    expect(r.details.theoretischerEtfErtrag).toBeCloseTo((defaultState.startkapital + defaultState.darlehen.betrag) * 0.07);
    expect(r.details.etfGewinn).toBeLessThan(r.details.theoretischerEtfErtrag);
  });

  it("shows startkapital and shareholder loan as separate ETF positions in assets", () => {
    const result = berechneBetriebsErgebnisse(defaultState)[0];
    expect(result.details.startkapitalEtfWert).toBeGreaterThan(0);
    expect(result.details.darlehenEtfWert).toBeGreaterThan(0);
    expect(result.details.startkapitalEtfWert + result.details.darlehenEtfWert + result.details.zuzahlungenEtfWert)
      .toBeCloseTo(result.details.etfWert);
  });

  it("uses loan top-ups for operating expenses before investing the surplus", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 12500,
      etfRendite: 0,
      laufzeitJahre: 2,
      kosten: [{ id: "1", bezeichnung: "Software", betrag: 600, periode: "jaehrlich" }],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 100, endfaellig: true },
    };

    const result = berechneBetriebsErgebnisse(state)[1];

    expect(result.details.ausZuzahlungenBeglicheneBetriebsausgaben).toBe(600);
    expect(result.details.ungedeckteBetriebsausgaben).toBe(0);
    expect(result.details.freieDarlehensZuzahlungen).toBe(600);
    expect(result.details.zuzahlungenEtfWert).toBe(600);
    expect(result.details.etfVerkauf).toBe(0);
  });

  it("uses annual cash for operating expenses before loan top-ups and keeps it out of ETFs", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 12500,
      jaehrlicherCashZuschuss: 600,
      etfRendite: 0,
      laufzeitJahre: 1,
      kosten: [{ id: "1", bezeichnung: "Software", betrag: 600, periode: "jaehrlich" }],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 100, endfaellig: true },
      firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: false },
    };

    const result = berechneBetriebsErgebnisse(state)[0];

    expect(result.details.ausCashZuschussBeglicheneBetriebsausgaben).toBe(600);
    expect(result.details.ausCashReserveBeglicheneBetriebsausgaben).toBe(0);
    expect(result.details.ausZuzahlungenBeglicheneBetriebsausgaben).toBe(0);
    expect(result.details.freieDarlehensZuzahlungen).toBe(1200);
    expect(result.details.cashReserve).toBe(0);
    expect(result.details.zuzahlungenEtfWert).toBe(1200);
  });

  it("uses existing cash reserves before loan top-ups when annual cash is not enough", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 12500,
      jaehrlicherCashZuschuss: 900,
      etfRendite: 0,
      laufzeitJahre: 2,
      kosten: [{ id: "1", bezeichnung: "Software", betrag: 400, periode: "jaehrlich" }],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 100, endfaellig: true },
      firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, erstanschaffungJahr: 2 },
    };

    const [erstesJahr, zweitesJahr] = berechneBetriebsErgebnisse(state);

    expect(erstesJahr.details.cashReserve).toBe(500);
    expect(zweitesJahr.details.ausCashZuschussBeglicheneBetriebsausgaben).toBe(900);
    expect(zweitesJahr.details.ausCashReserveBeglicheneBetriebsausgaben).toBe(500);
    expect(zweitesJahr.details.ausZuzahlungenBeglicheneBetriebsausgaben).toBe(0);
    expect(zweitesJahr.details.cashReserve).toBe(0);
    expect(zweitesJahr.details.freieDarlehensZuzahlungen).toBe(1200);
  });

  it("uses loan top-ups before ETF sales when annual outflows are fully covered", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 10000,
      etfRendite: 10,
      laufzeitJahre: 2,
      kosten: [{ id: "1", bezeichnung: "Kosten", betrag: 0, periode: "jaehrlich" }],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 10000, zinssatz: 0, monatlicherZuschuss: 175, endfaellig: true },
    };

    const [erstesJahr] = berechneBetriebsErgebnisse(state);
    const wachstumsfaktor = 1 + state.etfRendite / 100;
    expect(erstesJahr.details.etfVerkauf).toBeCloseTo(0);

    const zweitesJahr = berechneBetriebsErgebnisse(state)[1];

    expect(zweitesJahr.details.ausZuzahlungenBeglicheneBetriebsausgaben).toBeCloseTo(0);
    expect(zweitesJahr.details.ungedeckteBetriebsausgaben).toBeCloseTo(0);
    expect(zweitesJahr.details.etfVerkauf).toBeCloseTo(0);
    expect(zweitesJahr.details.etfGewinn).toBeCloseTo(0);
    expect(zweitesJahr.details.startkapitalEtfWert).toBeCloseTo(erstesJahr.details.startkapitalEtfWert * wachstumsfaktor, 4);
    expect(zweitesJahr.details.darlehenEtfWert).toBeCloseTo(erstesJahr.details.darlehenEtfWert * wachstumsfaktor, 4);
    expect(zweitesJahr.details.zuzahlungenEtfWert)
      .toBeLessThan(erstesJahr.details.zuzahlungenEtfWert * wachstumsfaktor + (175 * 12));
  });

  it("does not invest free loan top-ups in years with ETF sales", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 10000,
      etfRendite: 7,
      laufzeitJahre: 1,
      kosten: [{ id: "1", bezeichnung: "Hohe Kosten", betrag: 5000, periode: "jaehrlich" }],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 200, endfaellig: false },
    };

    const result = berechneBetriebsErgebnisse(state)[0];

    expect(result.details.etfVerkauf).toBeGreaterThan(0);
    expect(result.details.freieDarlehensZuzahlungen).toBeCloseTo(0);
    expect(result.details.deckungssaldoNachAusgabenUndSteuern).toBeCloseTo(0, 2);
  });

  it("cash reserve accumulates only positive annual net profit", () => {
    const state: BetriebState = {
      ...defaultState,
      startkapital: 100000,
      etfRendite: 12,
      laufzeitJahre: 3,
      kosten: [],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
    };
    const results = berechneBetriebsErgebnisse(state);
    let expectedReserve = 0;
    for (const r of results) {
      expectedReserve += Math.max(0, r.nettogewinn);
      expect(r.details.cashReserve).toBeCloseTo(expectedReserve);
    }
  });

  it("does not deduct interest annually for endfällig loans", () => {
    const endfaelligState: BetriebState = {
      ...defaultState,
      darlehen: { betrag: 25000, zinssatz: 3.5, monatlicherZuschuss: 0, endfaellig: true },
    };
    const normalState: BetriebState = {
      ...defaultState,
      darlehen: { betrag: 25000, zinssatz: 3.5, monatlicherZuschuss: 0, endfaellig: false },
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
      darlehen: { betrag: 25000, zinssatz: 3.5, monatlicherZuschuss: 0, endfaellig: true },
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
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
    };
    const results = berechneBetriebsErgebnisse(state);
    // Year 1: first acquisition – full purchase price (no trade-in)
    expect(results[0].details.handyNettoKosten).toBeCloseTo(HANDY_ANSCHAFFUNGSKOSTEN);
    expect(results[1].details.handyNettoKosten).toBeCloseTo(0);
    expect(results[2].details.handyNettoKosten).toBeCloseTo(0);
    // Year 4: replacement – net of resale proceeds
    expect(results[3].details.handyNettoKosten).toBeCloseTo(HANDY_ANSCHAFFUNGSKOSTEN * (1 - HANDY_VERKAUFSQUOTE));
  });

  it("counts benefits inside operating expenses", () => {
    const state: BetriebState = {
      ...defaultState,
      kosten: [],
      benefits: { tankgutschein: 50, strategieessen: 1500, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
    };
    const result = berechneBetriebsErgebnisse(state)[0];
    expect(result.details.benefitsKosten).toBe(2100);
    expect(result.details.betriebsausgabenGesamt).toBeCloseTo(
      result.details.handyNettoKosten + 2100
    );
  });

  it("tracks operating expense items including phone cadence in the yearly breakdown", () => {
    const state: BetriebState = {
      ...defaultState,
      etfRendite: 0,
      laufzeitJahre: 4,
      kosten: [{ id: "1", bezeichnung: "Software", betrag: 100, periode: "monatlich" }],
      benefits: { tankgutschein: 50, strategieessen: 1500, bav: 0 },
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
    };

    const [jahr1, jahr2] = berechneBetriebsErgebnisse(state);
    const firmenhandyJahr1 = jahr1.betriebskostenPosten?.find((posten) => posten.label.includes("Firmenhandy"));
    const firmenhandyJahr2 = jahr2.betriebskostenPosten?.find((posten) => posten.label.includes("Firmenhandy"));

    expect(jahr1.betriebskostenPosten).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Software", wert: 1200 }),
        expect.objectContaining({ label: "Tankgutschein", wert: 600 }),
        expect.objectContaining({ label: "Strategieessen", wert: 1500 }),
        expect.objectContaining({ label: "GF-Gehalt", wert: 0 }),
      ])
    );
    expect(firmenhandyJahr1?.wert).toBeCloseTo(HANDY_ANSCHAFFUNGSKOSTEN); // first purchase: no trade-in
    expect(firmenhandyJahr2?.wert).toBe(0);
    const erwarteterKonsumwertJahr1 = berechneGmbhKonsumwertProJahr(1, state.benefits, state.firmenhandy);
    const erwarteterKonsumwertJahr2 = berechneGmbhKonsumwertProJahr(2, state.benefits, state.firmenhandy);
    expect(jahr1.details.konsumNutzenwert).toBeCloseTo(erwarteterKonsumwertJahr1);
    expect(jahr2.details.konsumNutzenwert).toBeCloseTo(erwarteterKonsumwertJahr2);
    expect(jahr2.details.kumulierterKonsumwert).toBeCloseTo(erwarteterKonsumwertJahr1 + erwarteterKonsumwertJahr2);
  });

  it("counts GF salary as operating expense and computes total target-net details", () => {
    const state: BetriebState = {
      ...defaultState,
      etfRendite: 0,
      laufzeitJahre: 1,
      kosten: [],
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: false },
      darlehen: { betrag: 25000, zinssatz: 3.5, monatlicherZuschuss: 0, endfaellig: false },
      geschaeftsfuehrergehalt: 12000,
      zielnettoGesellschafter: undefined,
    };

    const result = berechneBetriebsErgebnisse(state)[0];
    const expectedSalaryTotal = 12000;
    const expectedTotalIncome = expectedSalaryTotal + 875;
    const expectedTotalIncomeTax = berechneEinkommensteuerBetrieb(expectedTotalIncome);
    const expectedTotalTax = expectedTotalIncomeTax + berechneSoliBetrieb(expectedTotalIncomeTax);
    const expectedSalaryIncomeTax = berechneEinkommensteuerBetrieb(expectedSalaryTotal);
    const expectedSalaryTax = expectedSalaryIncomeTax + berechneSoliBetrieb(expectedSalaryIncomeTax);
    const expectedSalaryNet = expectedSalaryTotal - expectedSalaryTax;
    const expectedInterestTax = expectedTotalTax - expectedSalaryTax;
    const expectedInterestNet = 875 - expectedInterestTax;
    const expectedShareholderNet = expectedSalaryNet + expectedInterestNet;

    expect(result.details.geschaeftsfuehrergehalt).toBe(12000);
    expect(result.details.gehaelterGesamt).toBe(12000);
    expect(result.details.betriebsausgabenGesamt).toBeCloseTo(12000);
    expect(result.details.gehaelterNetto).toBeCloseTo(expectedSalaryNet);
    expect(result.details.gesellschafterBruttoEinkommen).toBeCloseTo(expectedTotalIncome);
    expect(result.details.gesellschafterSteuerGesamt).toBeCloseTo(expectedTotalTax);
    expect(result.details.darlehenszinsenNetto).toBeCloseTo(expectedInterestNet);
    expect(result.details.gesellschafterNetto).toBeCloseTo(expectedShareholderNet);
    expect(result.details.zielnettoGesellschafter).toBe(36000);
    expect(result.details.zielnettoDifferenz).toBeCloseTo(expectedShareholderNet - 36000);
  });

  it("increases outstanding loan balance each year for monthly top-ups", () => {
    const state: BetriebState = {
      ...defaultState,
      laufzeitJahre: 2,
      darlehen: { betrag: 25000, zinssatz: 3.5, monatlicherZuschuss: 100, endfaellig: false },
    };
    const results = berechneBetriebsErgebnisse(state);
    expect(results[0].details.offenesDarlehen).toBeCloseTo(26200);
    expect(results[1].details.offenesDarlehen).toBeCloseTo(27400);
    expect(results[0].details.jaehrlicheZinsen).toBeGreaterThan(875);
  });
});

describe("berechnePrivatVergleichErgebnis", () => {
  const basisState: BetriebState = {
    startkapital: 10000,
    jaehrlicherCashZuschuss: 0,
    geschaeftsfuehrergehalt: 0,
    darlehen: { betrag: 5000, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: true },
    etfRendite: 0,
    laufzeitJahre: 1,
    kosten: [],
    benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
    firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: false },
  };

  it("uses startkapital + darlehen as private initial ETF capital", () => {
    const result = berechnePrivatVergleichErgebnis(basisState);
    expect(result.anfangskapitalPrivat).toBe(15000);
    expect(result.verbleibenderEtfWert).toBeCloseTo(15000);
  });

  it("subtracts tankgutschein from annual private savings plan and tracks it as consumption value", () => {
    const state: BetriebState = {
      ...basisState,
      startkapital: 0,
      darlehen: { ...basisState.darlehen, betrag: 0 },
      jaehrlicherCashZuschuss: 600,
      benefits: { tankgutschein: 50, strategieessen: 0, bav: 0 },
      firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: false },
    };

    const result = berechnePrivatVergleichErgebnis(state);
    expect(result.kumulierterSparplan).toBe(0);
    expect(result.kumulierterKonsumwert).toBe(600);
    expect(result.gesamtwertMitKonsum).toBeCloseTo(600);
    expect(result.verbleibenderEtfWert).toBeCloseTo(0);
  });

  it("subtracts active firmenhandy costs from private savings plan and tracks them as consumption value", () => {
    const state: BetriebState = {
      ...basisState,
      startkapital: 0,
      darlehen: { ...basisState.darlehen, betrag: 0 },
      jaehrlicherCashZuschuss: 1000,
      benefits: { tankgutschein: 0, strategieessen: 0, bav: 0 },
      firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG, aktiv: true, anschaffungskosten: 1000, erstanschaffungJahr: 1 },
    };

    const result = berechnePrivatVergleichErgebnis(state);
    expect(result.kumulierterSparplan).toBe(0);
    expect(result.kumulierterKonsumwert).toBe(1000);
    expect(result.gesamtwertMitKonsum).toBeCloseTo(1000);
    expect(result.verbleibenderEtfWert).toBe(0);
  });

  it("sells private ETF for non-endfaellige zinsen and GF salary", () => {
    const stateMitEntnahmen: BetriebState = {
      ...basisState,
      startkapital: 20000,
      etfRendite: 0,
      geschaeftsfuehrergehalt: 1000,
      darlehen: { betrag: 10000, zinssatz: 6, monatlicherZuschuss: 0, endfaellig: false },
      laufzeitJahre: 1,
    };

    const stateOhneEntnahmen: BetriebState = {
      ...stateMitEntnahmen,
      geschaeftsfuehrergehalt: 0,
      darlehen: { ...stateMitEntnahmen.darlehen, zinssatz: 0 },
    };

    const mitEntnahmen = berechnePrivatVergleichErgebnis(stateMitEntnahmen);
    const ohneEntnahmen = berechnePrivatVergleichErgebnis(stateOhneEntnahmen);

    expect(mitEntnahmen.kumulierterEtfVerkauf).toBeGreaterThan(ohneEntnahmen.kumulierterEtfVerkauf);
    expect(mitEntnahmen.kumulierteEntnahmen).toBeGreaterThan(0);
  });

  it("calculates endwert as cumulative ETF sales plus remaining ETF", () => {
    const result = berechnePrivatVergleichErgebnis({
      ...basisState,
      startkapital: 25000,
      darlehen: { ...basisState.darlehen, betrag: 0 },
      etfRendite: 7,
      laufzeitJahre: 2,
    });

    expect(result.endwert).toBeCloseTo(result.kumulierterEtfVerkauf + result.verbleibenderEtfWert);
  });
});
