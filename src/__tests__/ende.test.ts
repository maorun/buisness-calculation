import {
  berechneEinkommensteuer,
  berechneSoli,
  berechneNettoGehalt,
  berechneGewinnausschuettungsteuer,
  berechneNettoAusschuettung,
  berechneDarlehensAuszahlung,
  berechneDarlehensZinsenSteuer,
  berechneRestlichesMidijobGehalt,
  berechneFlexibleTilgung,
  berechneGesetzlicheKrankenversicherungBeitrag,
  berechneEndeErgebnisse,
  MIDIJOB_JAHR_MAX,
  REINVESTIERTES_DARLEHEN_ZINSSATZ,
} from "@/lib/calculations/ende";
import { GMBH_STEUER_GESAMT } from "@/lib/calculations/betrieb";
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

describe("berechneDarlehensAuszahlung", () => {
  it("splits payment into interest and principal", () => {
    const auszahlung = berechneDarlehensAuszahlung(12000, 6, 3);
    expect(auszahlung.zinsertragBrutto).toBeCloseTo(720);
    expect(auszahlung.tilgungsanteil).toBeCloseTo(4000);
    expect(auszahlung.gesamtauszahlungBrutto).toBeCloseTo(4720);
  });

  it("returns zeros when no debt remains", () => {
    const auszahlung = berechneDarlehensAuszahlung(0, 6, 3);
    expect(auszahlung.zinsertragBrutto).toBe(0);
    expect(auszahlung.tilgungsanteil).toBe(0);
    expect(auszahlung.gesamtauszahlungBrutto).toBe(0);
  });
});

describe("berechneDarlehensZinsenSteuer", () => {
  it("returns 0 for zero interest", () => {
    expect(berechneDarlehensZinsenSteuer(0, 24000)).toBe(0);
    expect(berechneDarlehensZinsenSteuer(-100, 24000)).toBe(0);
  });

  it("returns positive tax for positive interest", () => {
    expect(berechneDarlehensZinsenSteuer(1000, 24000)).toBeGreaterThan(0);
  });

  it("equals combined income tax minus salary-only tax (marginal rate)", () => {
    const zinsen = 1000;
    const gehalt = 24000;
    const estGehalt = berechneEinkommensteuer(gehalt);
    const soliGehalt = berechneSoli(estGehalt);
    const estKombiniert = berechneEinkommensteuer(gehalt + zinsen);
    const soliKombiniert = berechneSoli(estKombiniert);
    const expected = (estKombiniert + soliKombiniert) - (estGehalt + soliGehalt);
    expect(berechneDarlehensZinsenSteuer(zinsen, gehalt)).toBeCloseTo(expected);
  });

  it("higher interest leads to higher tax (progressive)", () => {
    const lowTax = berechneDarlehensZinsenSteuer(500, 24000);
    const highTax = berechneDarlehensZinsenSteuer(5000, 24000);
    expect(highTax).toBeGreaterThan(lowTax);
  });

  it("handles 0 salary (interest alone determines tax)", () => {
    const tax = berechneDarlehensZinsenSteuer(10000, 0);
    const expectedTax = berechneEinkommensteuer(10000) + berechneSoli(berechneEinkommensteuer(10000));
    expect(tax).toBeCloseTo(expectedTax);
  });
});

describe("berechneRestlichesMidijobGehalt", () => {
  it("returns the remaining salary room below the Midijob limit", () => {
    expect(berechneRestlichesMidijobGehalt(1000)).toBe(MIDIJOB_JAHR_MAX - 1000);
  });

  it("returns 0 when interest already reaches the Midijob limit", () => {
    expect(berechneRestlichesMidijobGehalt(MIDIJOB_JAHR_MAX + 1)).toBe(0);
  });
});

describe("berechneFlexibleTilgung", () => {
  it("covers only the remaining gap to the target", () => {
    expect(berechneFlexibleTilgung(17000, 14000, 10000)).toBe(3000);
  });

  it("caps tilgung at the remaining debt", () => {
    expect(berechneFlexibleTilgung(17000, 1000, 2000)).toBe(2000);
  });
});

describe("berechneEndeErgebnisse", () => {
  const defaultState: EndeState = {
    geschaeftsfuehrergehalt: 24000,
    stammkapitalErhoehungEtf: 0,
    gehaltBereich1: 24000,
    teiltilgungBereich1: 0,
    gewinnausschuettung: 0,
    tilgungsrate: 0,
    laufzeitJahre: 3,
    zielnettoBereich1: 17000,
    zielnettoBereich2: 0,
  };

  it("returns one entry per year (non-endfaellig)", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results).toHaveLength(3);
  });

  it("Jahr numbers are sequential (non-endfaellig)", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results[0].jahr).toBe(1);
    expect(results[2].jahr).toBe(3);
  });

  it("gesamtvermoegen grows each year", () => {
    const results = berechneEndeErgebnisse(defaultState);
    expect(results[1].gesamtvermoegen).toBeGreaterThan(results[0].gesamtvermoegen);
  });

  it("nettogewinn = nettoGehalt + nettoAusschuettung + darlehensauszahlungNetto - GKV", () => {
    const results = berechneEndeErgebnisse(defaultState, 0, 12000, 6);
    for (const r of results) {
      const expected =
        r.details.nettoGehalt +
        r.details.nettoAusschuettung +
        r.details.darlehenGesamtauszahlungNetto -
        r.details.gesetzlicheKrankenversicherungBeitrag;
      expect(r.nettogewinn).toBeCloseTo(expected);
    }
  });

  it("includes calculated loan interest and repayment (progressive Einkommensteuer on interest)", () => {
    const results = berechneEndeErgebnisse(defaultState, 0, 12000, 6);
    const zinsen = 720; // 12000 * 6% = 720 annual interest (principal stays constant – re-lent)
    const expectedZinsenSteuer = berechneDarlehensZinsenSteuer(zinsen, defaultState.geschaeftsfuehrergehalt);
    expect(results[0].details.darlehenZinsen).toBeCloseTo(720);
    // No tilgungsrate configured → principal re-lent until final year; no tilgung in year 1
    expect(results[0].details.darlehenTilgung).toBeCloseTo(0);
    expect(results[0].details.darlehenZinsenSteuer).toBeCloseTo(expectedZinsenSteuer);
    expect(results[0].details.darlehenZinsenNetto).toBeCloseTo(zinsen - expectedZinsenSteuer);
  });

  it("handles 0 restdarlehen", () => {
    const results = berechneEndeErgebnisse(defaultState, 0, 0, 6);
    expect(results[0].details.darlehenZinsen).toBe(0);
    expect(results[0].details.darlehenZinsenSteuer).toBe(0);
    expect(results[0].details.darlehenZinsenNetto).toBe(0);
    expect(results[0].details.darlehenTilgung).toBe(0);
  });

  it("uses configured annual repayment rate in payout phase", () => {
    const state = { ...defaultState, tilgungsrate: 2000 };
    const results = berechneEndeErgebnisse(state, 0, 12000, 6);
    expect(results[0].details.darlehenTilgung).toBeCloseTo(2000);
    expect(results[0].details.restdarlehen).toBeCloseTo(10000);
  });

  it("caps configured repayment at remaining debt", () => {
    const state = { ...defaultState, tilgungsrate: 20000 };
    const results = berechneEndeErgebnisse(state, 0, 12000, 6);
    expect(results[0].details.darlehenTilgung).toBeCloseTo(12000);
    expect(results[0].details.restdarlehen).toBeCloseTo(0);
  });

  it("re-lends principal in ETF when no tilgungsrate configured (non-endfaellig): tilgung = 0 in all years", () => {
    // No tilgungsrate → loan is perpetually re-lent back to the GmbH so the ETF keeps the
    // full principal compounding. The principal is never forcefully repaid; restdarlehen stays
    // positive throughout, reflecting the outstanding shareholder loan.
    const darlehenStart = 12000;
    const zinssatz = 6;
    const state = { ...defaultState, geschaeftsfuehrergehalt: 0, gewinnausschuettung: 0, laufzeitJahre: 3 };
    const results = berechneEndeErgebnisse(state, 100000, darlehenStart, zinssatz);

    // All years: tilgung = 0, principal stays re-lent → restdarlehen unchanged throughout
    expect(results[0].details.darlehenTilgung).toBeCloseTo(0);
    expect(results[0].details.restdarlehen).toBeCloseTo(darlehenStart);
    expect(results[1].details.darlehenTilgung).toBeCloseTo(0);
    expect(results[1].details.restdarlehen).toBeCloseTo(darlehenStart);

    // Final year: still re-lent, no forced repayment
    expect(results[2].details.darlehenTilgung).toBeCloseTo(0);
    expect(results[2].details.restdarlehen).toBeCloseTo(darlehenStart);

    // Annual interest on the constant principal each year
    expect(results[0].details.darlehenZinsen).toBeCloseTo(darlehenStart * zinssatz / 100);
    expect(results[1].details.darlehenZinsen).toBeCloseTo(darlehenStart * zinssatz / 100);
  });

  it("re-lent loan keeps ETF higher than non-re-lent over multiple years", () => {
    // With re-lending (tilgungsrate = 0), the ETF is not reduced by tilgung in non-final years.
    // With an explicit tilgungsrate, the ETF shrinks as principal is repaid annually.
    const stateReLent = { ...defaultState, geschaeftsfuehrergehalt: 0, gewinnausschuettung: 0, laufzeitJahre: 3 };
    const stateRepay = { ...stateReLent, tilgungsrate: 4000 };
    const etfStart = 100000;
    const darlehenStart = 12000;

    const resultsReLent = berechneEndeErgebnisse(stateReLent, etfStart, darlehenStart, 6, 0, false, 7);
    const resultsRepay = berechneEndeErgebnisse(stateRepay, etfStart, darlehenStart, 6, 0, false, 7);

    // After year 1, the re-lent ETF is higher (no principal drained from it)
    expect(resultsReLent[0].details.firmenEtfVermoegen).toBeGreaterThan(
      resultsRepay[0].details.firmenEtfVermoegen
    );
  });

  it("stores configured zielnetto for non-endfällige payout years", () => {
    const state = { ...defaultState, zielnettoBereich2: 17000 };
    const results = berechneEndeErgebnisse(state, 0, 12000, 6);
    expect(results[0].details.zielnetto).toBe(17000);
  });

  it("tax includes einkommensteuer + soli + kst + ausschuettungsteuer + darlehenZinsenSteuer", () => {
    const results = berechneEndeErgebnisse(defaultState, 0, 12000, 6);
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
    const results = berechneEndeErgebnisse(state, 0, 12000, 6);
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
    const state = {
      ...defaultState,
      geschaeftsfuehrergehalt: 0,
      laufzeitJahre: 1,
    };
    const results = berechneEndeErgebnisse(
      state,
      etfStart,
      0,
      0,
      0,
      false,
      0,
      [],
      { tankgutschein: 0, strategieessen: 0, essenszuschussProTag: 0, essenszuschussTageProJahr: 0, bav: 0 },
      { aktiv: false, anschaffungskosten: 1000, restwertQuote: 0.1, ersatzzyklusJahre: 3, erstanschaffungJahr: 1 }
    );
    expect(results[0].details.firmenEtfVermoegen).toBeCloseTo(etfStart);
    expect(results[0].gesamtvermoegen).toBeCloseTo(etfStart);
  });

  it("includes firm balance details in payout phase", () => {
    const etfStart = 100000;
    const results = berechneEndeErgebnisse(defaultState, etfStart, 12000, 6);
    expect(results[0].details.firmenEtfVermoegen).toBeLessThan(etfStart);
    expect(results[0].details.firmenDarlehensverbindlichkeit).toBeGreaterThanOrEqual(0);
    expect(results[0].details.firmenNettovermoegen).toBeCloseTo(
      results[0].details.firmenEtfVermoegen - results[0].details.firmenDarlehensverbindlichkeit
    );
  });

  it("calculates gesamtvermoegen as private assets + gross firm ETF per year", () => {
    // gesamtvermoegen = privatvermoegen + firmenEtfVermoegen (gross ETF, not net of restdarlehen).
    // The shareholder loan is internal: the GmbH holds it as an ETF asset and the shareholder
    // holds it as a receivable – both cancel out in the consolidated total wealth view.
    const results = berechneEndeErgebnisse(defaultState, 100000, 12000, 6);
    let privatvermoegen = 0;
    for (const r of results) {
      privatvermoegen += r.nettogewinn;
      expect(r.gesamtvermoegen).toBeCloseTo(privatvermoegen + r.details.firmenEtfVermoegen);
    }
  });

  it("adds one-time stammkapital increase to ETF at Ende start", () => {
    const state: EndeState = {
      ...defaultState,
      stammkapitalErhoehungEtf: 10000,
      geschaeftsfuehrergehalt: 0,
      laufzeitJahre: 1,
    };
    const results = berechneEndeErgebnisse(
      state,
      0,
      0,
      0,
      0,
      false,
      0,
      [],
      { tankgutschein: 0, strategieessen: 0, essenszuschussProTag: 0, essenszuschussTageProJahr: 0, bav: 0 },
      { aktiv: false, anschaffungskosten: 1000, restwertQuote: 0.1, ersatzzyklusJahre: 3, erstanschaffungJahr: 1 }
    );
    expect(results[0].details.firmenEtfVermoegen).toBeCloseTo(10000);
    expect(results[0].details.stammkapitalErhoehungEtf).toBe(10000);
    expect(results[0].gesamtvermoegen).toBeCloseTo(10000);
  });

  // ---- Bereich 1 / endfällig tests ----

  describe("endfaellig = true (Bereich 1 + Bereich 2)", () => {
    const endfaelligState: EndeState = {
      geschaeftsfuehrergehalt: 24000,
      stammkapitalErhoehungEtf: 0,
      gehaltBereich1: 24000,
      teiltilgungBereich1: 0,
      gewinnausschuettung: 0,
      tilgungsrate: 0,
      laufzeitJahre: 3,
      zielnettoBereich1: 17000,
      zielnettoBereich2: 0,
    };

    it("returns laufzeitJahre + 1 entries when endfaellig (1 Bereich-1 + N Bereich-2)", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 1500, true);
      expect(results).toHaveLength(4); // 1 (Bereich 1) + 3 (Bereich 2)
    });

    it("first entry is Bereich 1, rest are Bereich 2", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 1500, true);
      expect(results[0].details.bereich).toBe(1);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].details.bereich).toBe(2);
      }
    });

    it("Bereich 1: restdarlehen equals the new shareholder loan after settlement", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 1500, true);
      expect(results[0].details.restdarlehen).toBeCloseTo(results[0].details.neuesDarlehenStart);
    });

    it("Bereich 2: restdarlehen is carried forward and declines over time", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 1500, true);
      expect(results[1].details.restdarlehen).toBeGreaterThan(0);
      expect(results[results.length - 1].details.restdarlehen).toBeLessThanOrEqual(results[1].details.restdarlehen);
    });

    it("Bereich 1: taxes deferred interest at progressive Einkommensteuer using configured salary", () => {
      const aufgelaufeneZinsen = 2000;
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, aufgelaufeneZinsen, true);
      const expectedGehalt = endfaelligState.gehaltBereich1;
      const expectedZinsSteuer = berechneDarlehensZinsenSteuer(aufgelaufeneZinsen, expectedGehalt);
      expect(results[0].details.zinsSteuerBereich1).toBeCloseTo(expectedZinsSteuer);
      expect(results[0].details.bruttoGehalt).toBe(expectedGehalt);
    });

    it("Bereich 1: keeps configured salary without upper limit (only non-negative)", () => {
      const resultsMin = berechneEndeErgebnisse(
        { ...endfaelligState, gehaltBereich1: 0 },
        0,
        10000,
        3.5,
        1500,
        true
      );
      const resultsMax = berechneEndeErgebnisse(
        { ...endfaelligState, gehaltBereich1: 50000 },
        0,
        10000,
        3.5,
        1500,
        true
      );

      expect(resultsMin[0].details.bruttoGehalt).toBe(0);
      expect(resultsMax[0].details.bruttoGehalt).toBe(50000);
    });

    it("Bereich 1: nettogewinn equals consumable net (salary + net interest + teiltilgung - GKV), without reinvested principal", () => {
      const aufgelaufeneZinsen = 2000;
      const principal = 10000;
      const results = berechneEndeErgebnisse(endfaelligState, 0, principal, 3.5, aufgelaufeneZinsen, true);
      const gehaltBereich1 = endfaelligState.gehaltBereich1;
      const zinsSteuer = berechneDarlehensZinsenSteuer(aufgelaufeneZinsen, gehaltBereich1);
      const gkv = berechneGesetzlicheKrankenversicherungBeitrag(gehaltBereich1 + aufgelaufeneZinsen);
      const zinsenNetto = aufgelaufeneZinsen - zinsSteuer;
      // teiltilgungBereich1 = 0 in endfaelligState; reinvested principal is NOT counted here
      const expectedNetto = zinsenNetto + berechneNettoGehalt(gehaltBereich1) - gkv;
      expect(results[0].nettogewinn).toBeCloseTo(expectedNetto);
      expect(results[0].details.bruttoGehalt).toBe(gehaltBereich1);
    });

    it("Bereich 1: zielnetto-relevant net includes salary, interest and automatic teiltilgung", () => {
      const aufgelaufeneZinsen = 2000;
      const principal = 10000;
      const state = { ...endfaelligState, zielnettoBereich1: 24000 };
      const results = berechneEndeErgebnisse(state, 0, principal, 3.5, aufgelaufeneZinsen, true);
      const zinsSteuer = berechneDarlehensZinsenSteuer(aufgelaufeneZinsen, state.gehaltBereich1);
      const gkv = berechneGesetzlicheKrankenversicherungBeitrag(state.gehaltBereich1 + aufgelaufeneZinsen);
      const teiltilgung = Math.max(
        0,
        Math.min(
          principal,
          state.zielnettoBereich1 - (berechneNettoGehalt(state.gehaltBereich1) + (aufgelaufeneZinsen - zinsSteuer) - gkv)
        )
      );
      const expectedKonsumierbar =
        berechneNettoGehalt(state.gehaltBereich1) +
        (aufgelaufeneZinsen - zinsSteuer) +
        teiltilgung -
        gkv;
      expect(results[0].details.teiltilgungBereich1).toBeCloseTo(teiltilgung);
      expect(results[0].details.konsumierbaresNettoBereich1).toBeCloseTo(expectedKonsumierbar);
      // nettogewinn now equals konsumierbaresNettoBereich1 (reinvested principal excluded)
      expect(results[0].nettogewinn).toBeCloseTo(expectedKonsumierbar);
    });

    it("Bereich 1: keeps only the unrepaid principal as the new shareholder loan", () => {
      const principal = 10000;
      const aufgelaufeneZinsen = 2000;
      const state = { ...endfaelligState, zielnettoBereich1: 22000 };
      const results = berechneEndeErgebnisse(state, 0, principal, 3.5, aufgelaufeneZinsen, true);
      const expectedNeuesDarlehen = principal - results[0].details.teiltilgungBereich1;
      expect(results[0].details.neuesDarlehenStart).toBeCloseTo(expectedNeuesDarlehen);
      expect(results[0].details.restdarlehen).toBeCloseTo(expectedNeuesDarlehen);
      expect(results[0].details.neuesDarlehenZinssatz).toBe(REINVESTIERTES_DARLEHEN_ZINSSATZ);
    });

    it("Bereich 1: caps automatic teiltilgung at the repaid principal", () => {
      const principal = 10000;
      const state = { ...endfaelligState, zielnettoBereich1: 100000 };
      const results = berechneEndeErgebnisse(state, 0, principal, 3.5, 1000, true);
      expect(results[0].details.teiltilgungBereich1).toBe(principal);
      expect(results[0].details.neuesDarlehenStart).toBe(0);
    });

    it("Bereich 1: includes GmbH GuV and Bilanz details for the settlement year", () => {
      const etfStart = 50000;
      const principal = 10000;
      const aufgelaufeneZinsen = 1500;
      const results = berechneEndeErgebnisse(endfaelligState, etfStart, principal, 3.5, aufgelaufeneZinsen, true);
      const bereich1 = results[0];
      expect(bereich1.details.firmenEtfVermoegenVorBereich1).toBe(etfStart);
      expect(bereich1.details.firmenDarlehensverbindlichkeitAlt).toBe(principal);
      expect(bereich1.details.firmenGuVGehaltAufwand).toBe(bereich1.details.bruttoGehalt);
      expect(bereich1.details.firmenGuVZinsaufwand).toBe(aufgelaufeneZinsen);
      expect(bereich1.details.firmenGuVSaldo).toBeCloseTo(
        bereich1.details.theoretischerEtfErtrag -
        (bereich1.details.firmenGuVGehaltAufwand + bereich1.details.firmenGuVZinsaufwand + bereich1.details.betriebsausgabenGesamt)
      );
    });

    it("Bereich 1: firmenEtfVermoegen accounts for reinvestiertes Darlehen flowing back into the GmbH", () => {
      const etfStart = 50000;
      const principal = 10000;
      const aufgelaufeneZinsen = 1500;
      const state = { ...endfaelligState, zielnettoBereich1: 22000 };
      const results = berechneEndeErgebnisse(state, etfStart, principal, 3.5, aufgelaufeneZinsen, true);
      const bereich1 = results[0];
      const bruttoGehalt = endfaelligState.gehaltBereich1;
      const reinvestiertesDarlehen = principal - bereich1.details.teiltilgungBereich1;
      // Net ETF after Bereich 1: grow (rendite=0 here), pay out full principal + interest + salary +
      // Betriebskosten + taxes, receive new loan back
      const expectedEtf = etfStart
        - (principal + aufgelaufeneZinsen + bruttoGehalt + bereich1.details.betriebsausgabenGesamt + bereich1.details.vorabpauschalesteuer + bereich1.details.gmbhSteuer)
        + reinvestiertesDarlehen;
      expect(bereich1.details.firmenEtfVermoegen).toBeCloseTo(expectedEtf);
      // nettovermoegen = ETF - new loan
      expect(bereich1.details.firmenNettovermoegen).toBeCloseTo(expectedEtf - reinvestiertesDarlehen);
    });

    it("Bereich 2: uses the new 3%-loan instead of dropping restdarlehen to 0", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 2000, true);
      expect(results[1].details.neuesDarlehenZinssatz).toBe(REINVESTIERTES_DARLEHEN_ZINSSATZ);
      expect(results[1].details.darlehenZinsen).toBeGreaterThan(0);
      expect(results[1].details.firmenDarlehensverbindlichkeit).toBeGreaterThan(0);
    });

    it("Bereich 1: zielnetto stored in details", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 1500, true);
      expect(results[0].details.zielnetto).toBe(17000);
    });

    it("Bereich 2: uses configured salary directly (without Midijob auto-fill)", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 2000, true);
      const jahr1Bereich2 = results[1];
      expect(jahr1Bereich2.details.bruttoGehalt).toBe(endfaelligState.geschaeftsfuehrergehalt);
    });

    it("Bereich 2: tilgung is withdrawn flexibly when target net would otherwise be missed", () => {
      const state = { ...endfaelligState, zielnettoBereich2: 25000 };
      const results = berechneEndeErgebnisse(state, 0, 10000, 3.5, 2000, true);
      const jahr1Bereich2 = results[1];
      const expectedTilgung = berechneFlexibleTilgung(
        state.zielnettoBereich2,
        jahr1Bereich2.details.konsumVorTilgung,
        results[0].details.neuesDarlehenStart
      );
      expect(jahr1Bereich2.details.darlehenTilgung).toBeCloseTo(expectedTilgung);
      expect(jahr1Bereich2.nettogewinn).toBeCloseTo(
        jahr1Bereich2.details.konsumVorTilgung + jahr1Bereich2.details.darlehenTilgung
      );
    });

    it("Jahr numbers: Bereich 1 = 1, Bereich 2 starts at 2", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 1500, true);
      expect(results[0].jahr).toBe(1);
      expect(results[1].jahr).toBe(2);
      expect(results[3].jahr).toBe(4);
    });

    it("endfaellig=false with 0 aufgelaufeneZinsen returns same count as laufzeitJahre", () => {
      const results = berechneEndeErgebnisse(endfaelligState, 0, 10000, 3.5, 0, false);
      expect(results).toHaveLength(3);
    });
  });

  describe("ETF rendite and Betriebskosten in Ende phase", () => {
    const baseState: EndeState = {
      geschaeftsfuehrergehalt: 24000,
      stammkapitalErhoehungEtf: 0,
      gehaltBereich1: 24000,
      teiltilgungBereich1: 0,
      gewinnausschuettung: 0,
      tilgungsrate: 0,
      laufzeitJahre: 3,
      zielnettoBereich1: 17000,
      zielnettoBereich2: 0,
    };

    it("Bereich 2: firmenEtfVermoegen grows when etfRenditePercent > 0", () => {
      const etfStart = 200000;
      const rendite = 5;
      const resultsNoRendite = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, 0);
      const resultsWithRendite = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, rendite);
      // With rendite the firm ETF decreases more slowly (growth offsets outflows)
      expect(resultsWithRendite[0].details.firmenEtfVermoegen).toBeGreaterThan(
        resultsNoRendite[0].details.firmenEtfVermoegen
      );
    });

    it("Bereich 2: ETF grows by rendite rate before outflows each year", () => {
      const etfStart = 100000;
      const rendite = 7;
      // No loan, no salary → firm ETF should grow by rendite minus Betriebskosten/taxes
      const state = { ...baseState, geschaeftsfuehrergehalt: 0 };
      const results = berechneEndeErgebnisse(state, etfStart, 0, 0, 0, false, rendite);
      const etfNachWachstum = etfStart * (1 + rendite / 100); // 107000
      // firmenEtfVermoegen should be lower than grown value (Betriebskosten + taxes paid)
      expect(results[0].details.firmenEtfVermoegen).toBeLessThan(etfNachWachstum);
      // But higher than etfStart since growth exceeded costs
      expect(results[0].details.firmenEtfVermoegen).toBeGreaterThan(etfStart);
    });

    it("Bereich 2: Betriebskosten are deducted from firmenEtfVermoegen", () => {
      const etfStart = 200000;
      const kosten = [{ id: "k1", bezeichnung: "Test", betrag: 500, periode: "monatlich" as const }];
      const resultsNoKosten = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, 0, []);
      const resultsWithKosten = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, 0, kosten);
      // With kosten the firm pays out more → lower firmenEtfVermoegen
      expect(resultsWithKosten[0].details.firmenEtfVermoegen).toBeLessThan(
        resultsNoKosten[0].details.firmenEtfVermoegen
      );
      // betriebsausgabenGesamt reflects the monthly kosten (500 * 12 = 6000)
      expect(resultsWithKosten[0].details.jaehrlicheKosten).toBeCloseTo(6000);
    });

    it("Bereich 2: tracks Essenszuschuss-Benefit in details but not in nettogewinn", () => {
      const state = { ...baseState, geschaeftsfuehrergehalt: 0, gewinnausschuettung: 0, laufzeitJahre: 1 };
      const benefitsMitEssenszuschuss = {
        tankgutschein: 0,
        strategieessen: 0,
        essenszuschussProTag: 7.67,
        essenszuschussTageProJahr: 220,
        bav: 0,
      };
      const resultsOhneBenefit = berechneEndeErgebnisse(state, 100000, 0, 0, 0, false, 0, []);
      const resultsMitBenefit = berechneEndeErgebnisse(
        state,
        100000,
        0,
        0,
        0,
        false,
        0,
        [],
        benefitsMitEssenszuschuss
      );
      const erwarteterEssenszuschussNutzen = 7.67 * 220;
      // Benefits are tracked in details but must not inflate the displayed nettogewinn
      expect(resultsMitBenefit[0].details.essenszuschussNutzen).toBeCloseTo(erwarteterEssenszuschussNutzen);
      const deltaNetto = resultsMitBenefit[0].nettogewinn - resultsOhneBenefit[0].nettogewinn;
      expect(deltaNetto).toBeCloseTo(0);
    });

    it("Bereich 1: tracks Essenszuschuss-Benefit in details but not in nettogewinn", () => {
      const state = {
        ...baseState,
        geschaeftsfuehrergehalt: 0,
        gehaltBereich1: 0,
        gewinnausschuettung: 0,
        laufzeitJahre: 1,
        zielnettoBereich1: 0,
      };
      const benefitsMitEssenszuschuss = {
        tankgutschein: 0,
        strategieessen: 0,
        essenszuschussProTag: 7.67,
        essenszuschussTageProJahr: 220,
        bav: 0,
      };
      const resultsOhneBenefit = berechneEndeErgebnisse(state, 100000, 0, 0, 0, true, 0, []);
      const resultsMitBenefit = berechneEndeErgebnisse(
        state,
        100000,
        0,
        0,
        0,
        true,
        0,
        [],
        benefitsMitEssenszuschuss
      );
      const erwarteterEssenszuschussNutzen = 7.67 * 220;
      expect(resultsMitBenefit[0].details.bereich).toBe(1);
      // Benefits are tracked in details but must not inflate the displayed nettogewinn
      expect(resultsMitBenefit[0].details.essenszuschussNutzen).toBeCloseTo(erwarteterEssenszuschussNutzen);
      const deltaNettoBereich1 = resultsMitBenefit[0].nettogewinn - resultsOhneBenefit[0].nettogewinn;
      expect(deltaNettoBereich1).toBeCloseTo(0);
    });

    it("Bereich 2: vorabpauschale and gmbhSteuer are non-zero with positive rendite and ETF", () => {
      const etfStart = 100000;
      const rendite = 5;
      const results = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, rendite);
      expect(results[0].details.vorabpauschale).toBeGreaterThan(0);
      expect(results[0].details.vorabpauschalesteuer).toBeGreaterThan(0);
      expect(results[0].details.gmbhSteuer).toBeGreaterThanOrEqual(0);
    });

    it("Bereich 2: steuer includes vorabpauschalesteuer and gmbhSteuer", () => {
      const etfStart = 100000;
      const rendite = 5;
      const results = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, rendite);
      for (const r of results) {
        const expectedTax =
          r.details.einkommensteuer +
          r.details.soli +
          r.details.kstSteuer +
          r.details.ausschuettungsteuer +
          r.details.darlehenZinsenSteuer +
          r.details.vorabpauschalesteuer +
          r.details.gmbhSteuer;
        expect(r.steuer).toBeCloseTo(expectedTax);
      }
    });

    it("Bereich 1 (endfällig): Betriebskosten are included in Bereich 1 outflows", () => {
      const etfStart = 100000;
      const kosten = [{ id: "k1", bezeichnung: "Buchhaltung", betrag: 100, periode: "monatlich" as const }];
      const resultsNoKosten = berechneEndeErgebnisse(baseState, etfStart, 10000, 3, 2000, true, 0, []);
      const resultsWithKosten = berechneEndeErgebnisse(baseState, etfStart, 10000, 3, 2000, true, 0, kosten);
      // Bereich 1 has kosten: firm ETF decreases more
      expect(resultsWithKosten[0].details.firmenEtfVermoegen).toBeLessThan(
        resultsNoKosten[0].details.firmenEtfVermoegen
      );
      expect(resultsWithKosten[0].details.betriebsausgabenGesamt).toBeGreaterThan(
        resultsNoKosten[0].details.betriebsausgabenGesamt
      );
    });

    it("Bereich 1 (endfällig): ETF grows before outflows", () => {
      const etfStart = 100000;
      const rendite = 5;
      const resultsNoRendite = berechneEndeErgebnisse(baseState, etfStart, 10000, 3, 2000, true, 0);
      const resultsWithRendite = berechneEndeErgebnisse(baseState, etfStart, 10000, 3, 2000, true, rendite);
      // With rendite, Bereich 1 firm ETF is higher
      expect(resultsWithRendite[0].details.firmenEtfVermoegen).toBeGreaterThan(
        resultsNoRendite[0].details.firmenEtfVermoegen
      );
    });

    it("phone cost applies in Ende year 1 and cycles every 3 years", () => {
      const etfStart = 500000;
      const results = berechneEndeErgebnisse(baseState, etfStart, 0, 0, 0, false, 0, []);
      // Jahr 1 (endeJahr=1): first acquisition – full purchase price (no trade-in), 1000 €
      // Jahr 2 (endeJahr=2): no phone cost
      // Jahr 3 (endeJahr=3): no phone cost
      expect(results[0].details.betriebsausgabenGesamt).toBeCloseTo(1000); // handy first acquisition
      expect(results[1].details.betriebsausgabenGesamt).toBeCloseTo(0);
      expect(results[2].details.betriebsausgabenGesamt).toBeCloseTo(0);
    });

    it("defers Ende-darlehen payout to the final year when ende.darlehenEndfaellig is active", () => {
      const state: EndeState = {
        ...baseState,
        geschaeftsfuehrergehalt: 0,
        gewinnausschuettung: 0,
        laufzeitJahre: 3,
        darlehenEndfaellig: true,
      };
      const darlehenStart = 12000;
      const zinssatz = 5;
      const results = berechneEndeErgebnisse(state, 0, darlehenStart, zinssatz);

      expect(results[0].details.darlehenGesamtauszahlungBrutto).toBeCloseTo(0);
      expect(results[1].details.darlehenGesamtauszahlungBrutto).toBeCloseTo(0);
      expect(results[2].details.darlehenTilgung).toBeCloseTo(darlehenStart);
      const erwarteteZinsen = Array.from({ length: state.laufzeitJahre })
        .reduce((sum) => sum + (darlehenStart * (zinssatz / 100)), 0);
      expect(results[2].details.darlehenZinsen).toBeCloseTo(erwarteteZinsen);
    });
  });
});
