import { getSteuerjahrParameter, STEUERJAHR_PARAMETER, DEFAULT_STEUERJAHR } from "@/lib/parameters";
import { berechneEinkommensteuerBetrieb, berechneSoliBetrieb, berechneVorabpauschale, berechneBetriebsErgebnisse } from "@/lib/calculations/betrieb";
import { berechneEinkommensteuer, berechneSoli, berechneGesetzlicheKrankenversicherungBeitrag, berechneEndeErgebnisse } from "@/lib/calculations/ende";
import { BetriebState, EndeState } from "@/lib/types";

describe("SteuerjahrParameter definitions", () => {
  it("defaults to 2025", () => {
    expect(DEFAULT_STEUERJAHR).toBe(2025);
    const param = getSteuerjahrParameter();
    expect(param.jahr).toBe(2025);
  });

  it("contains correct parameters for 2024", () => {
    const p = STEUERJAHR_PARAMETER[2024];
    expect(p.grundfreibetrag).toBe(11784);
    expect(p.gkvBemessungMonatMax).toBe(5175.0);
    expect(p.gkvBemessungJahrMax).toBe(62100.0);
    expect(p.gkvZusatzbeitrag).toBe(0.017);
    expect(p.gkvBeitragssatz).toBeCloseTo(0.163);
    expect(p.midijobMonatMin).toBe(538);
    expect(p.midijobJahrMin).toBe(6456);
    expect(p.basiszins).toBe(0.0229);
  });

  it("contains correct parameters for 2025", () => {
    const p = STEUERJAHR_PARAMETER[2025];
    expect(p.grundfreibetrag).toBe(12096);
    expect(p.gkvBemessungMonatMax).toBe(5512.5);
    expect(p.gkvBemessungJahrMax).toBe(66150.0);
    expect(p.gkvZusatzbeitrag).toBe(0.025);
    expect(p.gkvBeitragssatz).toBeCloseTo(0.171);
    expect(p.midijobMonatMin).toBe(556);
    expect(p.midijobJahrMin).toBe(6672);
    expect(p.basiszins).toBe(0.0253);
  });

  it("contains correct parameters for 2026", () => {
    const p = STEUERJAHR_PARAMETER[2026];
    expect(p.grundfreibetrag).toBe(12348);
    expect(p.gkvBemessungMonatMax).toBe(5812.5);
    expect(p.gkvBemessungJahrMax).toBe(69750.0);
    expect(p.gkvZusatzbeitrag).toBe(0.029);
    expect(p.gkvBeitragssatz).toBeCloseTo(0.175);
    expect(p.midijobMonatMin).toBe(603);
    expect(p.midijobJahrMin).toBe(7236);
    expect(p.basiszins).toBe(0.0253);
  });
});

describe("Income Tax (ESt) by Steuerjahr", () => {
  it("returns 0 tax up to Grundfreibetrag for 2024, 2025, 2026", () => {
    expect(berechneEinkommensteuer(11784, 2024)).toBe(0);
    expect(berechneEinkommensteuer(12096, 2025)).toBe(0);
    expect(berechneEinkommensteuer(12348, 2026)).toBe(0);
  });

  it("taxes income above Grundfreibetrag for each year", () => {
    expect(berechneEinkommensteuer(15000, 2024)).toBeGreaterThan(0);
    expect(berechneEinkommensteuer(15000, 2025)).toBeGreaterThan(0);
    expect(berechneEinkommensteuer(15000, 2026)).toBeGreaterThan(0);

    // As Grundfreibetrag increases (2024 < 2025 < 2026), tax on 15,000 € decreases
    const tax2024 = berechneEinkommensteuer(15000, 2024);
    const tax2025 = berechneEinkommensteuer(15000, 2025);
    const tax2026 = berechneEinkommensteuer(15000, 2026);
    expect(tax2024).toBeGreaterThan(tax2025);
    expect(tax2025).toBeGreaterThan(tax2026);
  });

  it("calculates ESt in Betrieb calculations consistently with steuerjahr", () => {
    expect(berechneEinkommensteuerBetrieb(11784, 2024)).toBe(0);
    expect(berechneEinkommensteuerBetrieb(12096, 2025)).toBe(0);
    expect(berechneEinkommensteuerBetrieb(12348, 2026)).toBe(0);
  });
});

describe("Soli by Steuerjahr", () => {
  it("respects year-specific Soli-Freigrenze", () => {
    // 2024: 18.130 € ESt, 2025: 19.228 € ESt, 2026: 20.316 € ESt
    expect(berechneSoli(18130, 2024)).toBe(0);
    expect(berechneSoli(19228, 2025)).toBe(0);
    expect(berechneSoli(20316, 2026)).toBe(0);

    expect(berechneSoli(19000, 2024)).toBeGreaterThan(0);
    expect(berechneSoli(19000, 2025)).toBe(0);
    expect(berechneSoli(19000, 2026)).toBe(0);
  });
});

describe("GKV Contribution by Steuerjahr", () => {
  it("calculates GKV contribution using year-specific rates and BBG", () => {
    const income = 100000; // Above all BBG limits
    const gkv2024 = berechneGesetzlicheKrankenversicherungBeitrag(income, undefined, undefined, 2024);
    const gkv2025 = berechneGesetzlicheKrankenversicherungBeitrag(income, undefined, undefined, 2025);
    const gkv2026 = berechneGesetzlicheKrankenversicherungBeitrag(income, undefined, undefined, 2026);

    // 2024: 62.100 € * 16.3% = 10.122.30 €
    expect(gkv2024).toBeCloseTo(62100 * 0.163, 1);
    // 2025: 66.150 € * 17.1% = 11.311.65 €
    expect(gkv2025).toBeCloseTo(66150 * 0.171, 1);
    // 2026: 69.750 € * 17.5% = 12.206.25 €
    expect(gkv2026).toBeCloseTo(69750 * 0.175, 1);

    expect(gkv2025).toBeGreaterThan(gkv2024);
    expect(gkv2026).toBeGreaterThan(gkv2025);
  });
});

describe("Vorabpauschale Basiszins by Steuerjahr", () => {
  it("uses year-specific Basiszins when not explicitly provided", () => {
    const navStart = 100000;
    const navEnd = 110000;

    const vp2024 = berechneVorabpauschale(navStart, navEnd, undefined, 2024);
    const vp2025 = berechneVorabpauschale(navStart, navEnd, undefined, 2025);
    const vp2026 = berechneVorabpauschale(navStart, navEnd, undefined, 2026);

    // 2024: 0.0229 * 0.7 * 100000 = 1603 €
    expect(vp2024).toBeCloseTo(1603, 0);
    // 2025/2026: 0.0253 * 0.7 * 100000 = 1771 €
    expect(vp2025).toBeCloseTo(1771, 0);
    expect(vp2026).toBeCloseTo(1771, 0);
  });
});

describe("End-to-End Simulation with Steuerjahr", () => {
  it("berechneBetriebsErgebnisse reflects chosen steuerjahr", () => {
    const state2024: BetriebState = {
      steuerjahr: 2024,
      startkapital: 12500,
      jaehrlicherCashZuschuss: 0,
      simulierterGewinn: 0,
      geschaeftsfuehrergehalt: 20000,
      darlehen: { betrag: 0, zinssatz: 0, monatlicherZuschuss: 0, endfaellig: false },
      etfRendite: 5,
      laufzeitJahre: 1,
      kosten: [],
      benefits: { tankgutschein: 0, strategieessen: 0, essenszuschussProTag: 0, essenszuschussTageProJahr: 0 },
    };

    const state2026: BetriebState = {
      ...state2024,
      steuerjahr: 2026,
    };

    const res2024 = berechneBetriebsErgebnisse(state2024);
    const res2026 = berechneBetriebsErgebnisse(state2026);

    // On 20,000 € GF salary, tax in 2026 is lower (Grundfreibetrag 12,348 € vs 11,784 €)
    expect(res2026[0].details.gehaelterEinkommensteuer).toBeLessThan(res2024[0].details.gehaelterEinkommensteuer);
    expect(res2026[0].details.gehaelterNetto).toBeGreaterThan(res2024[0].details.gehaelterNetto);
  });

  it("berechneEndeErgebnisse reflects chosen steuerjahr", () => {
    const endeState: EndeState = {
      geschaeftsfuehrergehalt: 30000,
      stammkapitalErhoehungEtf: 0,
      gehaltBereich1: 30000,
      teiltilgungBereich1: 0,
      gewinnausschuettung: 0,
      tilgungsrate: 0,
      laufzeitJahre: 1,
      zielnettoBereich1: 0,
      zielnettoBereich2: 0,
    };

    const res2024 = berechneEndeErgebnisse(
      endeState, 100000, 0, 0, 0, false, 0, [],
      { tankgutschein: 0, strategieessen: 0, essenszuschussProTag: 0, essenszuschussTageProJahr: 0 },
      { aktiv: false, anschaffungskosten: 0, restwertQuote: 0, ersatzzyklusJahre: 3 },
      0.29825, 0.15825, 0.14, 2024
    );

    const res2026 = berechneEndeErgebnisse(
      endeState, 100000, 0, 0, 0, false, 0, [],
      { tankgutschein: 0, strategieessen: 0, essenszuschussProTag: 0, essenszuschussTageProJahr: 0 },
      { aktiv: false, anschaffungskosten: 0, restwertQuote: 0, ersatzzyklusJahre: 3 },
      0.29825, 0.15825, 0.14, 2026
    );

    // GKV in 2026 is 17.5% vs 16.3% in 2024 on 30,000 €
    expect(res2026[0].details.gesetzlicheKrankenversicherungBeitrag).toBeGreaterThan(
      res2024[0].details.gesetzlicheKrankenversicherungBeitrag
    );
  });
});
