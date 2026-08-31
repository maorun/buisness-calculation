import { berechneGesamtvergleichKpi, berechneGesamtvergleichZeitreihe } from "@/lib/calculations/gesamtvergleich";
import { berechnePrivatVergleichZeitreihe } from "@/lib/calculations/betrieb";
import { BetriebState, JahresErgebnis } from "@/lib/types";

const basisBetrieb: BetriebState = {
  startkapital: 0,
  jaehrlicherCashZuschuss: 0,
  simulierterGewinn: 0,
  zielnettoGesellschafter: 0,
  geschaeftsfuehrergehalt: 0,
  darlehen: {
    betrag: 0,
    zinssatz: 0,
    monatlicherZuschuss: 0,
    endfaellig: false,
  },
  etfRendite: 0,
  laufzeitJahre: 1,
  kosten: [],
  benefits: {
    tankgutschein: 0,
    strategieessen: 0,
    essenszuschussProTag: 0,
    essenszuschussTageProJahr: 0,
  },
};

describe("berechneGesamtvergleichKpi", () => {
  it("uses debt-adjusted Ende value for GmbH total wealth", () => {
    const betriebsErgebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 0,
      gewinn: 0,
      steuer: 0,
      nettogewinn: 0,
      details: {
        nettovermoegen: 20000,
        kumulierterKonsumwert: 5000,
      },
    }];
    const endeErgebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 100000,
      gewinn: 0,
      steuer: 0,
      nettogewinn: 0,
      details: {
        firmenDarlehensverbindlichkeit: 30000,
        restdarlehen: 30000,
      },
    }];

    const kpi = berechneGesamtvergleichKpi(basisBetrieb, 1, endeErgebnisse, betriebsErgebnisse);

    expect(kpi.gmbhGesamtwert).toBe(75000);
  });

  it("falls back to Betrieb net wealth when Ende phase is missing", () => {
    const betriebsErgebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 0,
      gewinn: 0,
      steuer: 0,
      nettogewinn: 0,
      details: {
        nettovermoegen: 20000,
        kumulierterKonsumwert: 5000,
      },
    }];

    const kpi = berechneGesamtvergleichKpi(basisBetrieb, 0, [], betriebsErgebnisse);

    expect(kpi.gmbhGesamtwert).toBe(25000);
  });

  it("applies Ende GF salary to every Ende year in private comparison", () => {
    const betriebMitStartkapital: BetriebState = {
      ...basisBetrieb,
      startkapital: 50000,
      etfRendite: 10,
      laufzeitJahre: 1,
      geschaeftsfuehrergehalt: 0,
      firmenhandy: {
        aktiv: false,
        anschaffungskosten: 1000,
        restwertQuote: 0.1,
        ersatzzyklusJahre: 3,
        erstanschaffungJahr: 1,
      },
    };
    const betriebsErgebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 50000,
      gewinn: 0,
      steuer: 0,
      nettogewinn: 0,
      details: {
        nettovermoegen: 50000,
        kumulierterKonsumwert: 0,
      },
    }];
    const endeErgebnisseOhneGehalt: JahresErgebnis[] = [
      {
        jahr: 1,
        gesamtvermoegen: 50000,
        gewinn: 0,
        steuer: 0,
        nettogewinn: 0,
        details: { firmenDarlehensverbindlichkeit: 0, restdarlehen: 0, bruttoGehalt: 0, kumulierterKonsumwert: 0 },
      },
      {
        jahr: 2,
        gesamtvermoegen: 50000,
        gewinn: 0,
        steuer: 0,
        nettogewinn: 0,
        details: { firmenDarlehensverbindlichkeit: 0, restdarlehen: 0, bruttoGehalt: 0, kumulierterKonsumwert: 0 },
      },
    ];
    const endeErgebnisseMitGehaltImZweitenJahr: JahresErgebnis[] = [
      endeErgebnisseOhneGehalt[0],
      {
        ...endeErgebnisseOhneGehalt[1],
        details: {
          ...endeErgebnisseOhneGehalt[1].details,
          bruttoGehalt: 10000,
        },
      },
    ];

    const privatDirektOhneGehalt = berechnePrivatVergleichZeitreihe(
      { ...betriebMitStartkapital, laufzeitJahre: 3 },
      undefined,
      [undefined, 0, 0],
      [undefined, 0, 0]
    );
    const privatDirektMitGehalt = berechnePrivatVergleichZeitreihe(
      { ...betriebMitStartkapital, laufzeitJahre: 3 },
      undefined,
      [undefined, 0, 0],
      [undefined, 0, 10000]
    );
    const zeitreiheOhneGehalt = berechneGesamtvergleichZeitreihe(
      betriebMitStartkapital,
      2,
      endeErgebnisseOhneGehalt,
      betriebsErgebnisse
    );
    const zeitreiheMitGehalt = berechneGesamtvergleichZeitreihe(
      betriebMitStartkapital,
      2,
      endeErgebnisseMitGehaltImZweitenJahr,
      betriebsErgebnisse
    );
    const kpiOhneGehalt = berechneGesamtvergleichKpi(
      betriebMitStartkapital,
      2,
      endeErgebnisseOhneGehalt,
      betriebsErgebnisse
    );
    const kpiMitGehalt = berechneGesamtvergleichKpi(
      betriebMitStartkapital,
      2,
      endeErgebnisseMitGehaltImZweitenJahr,
      betriebsErgebnisse
    );

    expect(privatDirektOhneGehalt[2].gehaltsEntnahme).toBe(0);
    expect(privatDirektMitGehalt[2].gehaltsEntnahme).toBe(10000);
    expect(privatDirektMitGehalt[2].entnahmenVorSteuern).toBeGreaterThan(privatDirektOhneGehalt[2].entnahmenVorSteuern);
    expect(zeitreiheOhneGehalt[2].privat).toBeCloseTo(privatDirektOhneGehalt[2].gesamtwertMitKonsum);
    expect(zeitreiheMitGehalt[2].privat).toBeCloseTo(privatDirektMitGehalt[2].gesamtwertMitKonsum);
    expect(kpiOhneGehalt.privatGesamtwert).toBeCloseTo(privatDirektOhneGehalt[2].gesamtwertMitKonsum);
    expect(kpiMitGehalt.privatGesamtwert).toBeCloseTo(privatDirektMitGehalt[2].gesamtwertMitKonsum);
  });

  it("does NOT reinvest simulated business income into the private ETF during Ende phase years", () => {
    // Regression test: prior to the fix, sparplanNetto (= simulierterGewinnNetto − konsumNutzenwert)
    // was added back into the private ETF in Ende years, inflating the private comparison value.
    // After the fix, Ende years only charge benefit costs (no business income reinvestment).
    const betriebMitGewinn: BetriebState = {
      ...basisBetrieb,
      startkapital: 20000,
      etfRendite: 5,
      laufzeitJahre: 1,
      simulierterGewinn: 12000,
      persoenlicherGrenzsteuersatz: 40,
      firmenhandy: { aktiv: false, anschaffungskosten: 0, restwertQuote: 0, ersatzzyklusJahre: 3, erstanschaffungJahr: 1 },
    };

    const endeGehalt = 6000;
    // One Betrieb year (no override) + one Ende year (gehaltsOverride = endeGehalt)
    const privatMitEnde = berechnePrivatVergleichZeitreihe(
      { ...betriebMitGewinn, laufzeitJahre: 2 },
      undefined,
      [undefined, 0],
      [undefined, endeGehalt]
    );
    // One Betrieb year only (no Ende year, i.e. no salary override at all)
    const privatOhneEnde = berechnePrivatVergleichZeitreihe(
      { ...betriebMitGewinn, laufzeitJahre: 2 },
      undefined,
      [undefined, 0],
      undefined
    );

    // In the Ende year the private comparison must NOT reinvest simulierterGewinnNetto.
    // Therefore the ETF in the Ende-year result should be strictly less than the scenario
    // without an Ende override (where business income IS reinvested every year).
    // The difference must be at least simulierterGewinnNetto (≈ 12000 × (1−0.4) × (1−0.055) ≈ 6,784),
    // because that is the minimum "missing" reinvestment when the income is suppressed.
    const simulierterGewinnNetto = 12000 * (1 - 0.4) * (1 - 0.055); // ~6,784 after ESt + SolZ
    const etfDelta = privatOhneEnde[1].verbleibenderEtfWert - privatMitEnde[1].verbleibenderEtfWert;
    expect(etfDelta).toBeGreaterThan(simulierterGewinnNetto);

    // The sparplanNetto for an Ende year equals -konsumNutzenwert (≤ 0), never the positive
    // business-income surplus that would appear in a normal Betrieb year.
    expect(privatMitEnde[1].sparplanNetto).toBeLessThanOrEqual(0);
    expect(privatOhneEnde[1].sparplanNetto).toBeGreaterThan(0); // normal Betrieb year has positive sparplan
  });
});

describe("berechneGesamtvergleichZeitreihe", () => {
  const betriebsErgebnisse: JahresErgebnis[] = [{
    jahr: 1,
    gesamtvermoegen: 0,
    gewinn: 0,
    steuer: 0,
    nettogewinn: 0,
    details: {
      nettovermoegen: 20000,
      kumulierterKonsumwert: 5000,
    },
  }];
  const endeErgebnisse: JahresErgebnis[] = [{
    jahr: 1,
    gesamtvermoegen: 100000,
    gewinn: 0,
    steuer: 0,
    nettogewinn: 0,
    details: {
      firmenDarlehensverbindlichkeit: 30000,
      restdarlehen: 30000,
    },
  }];

  it("stitches Betrieb and Ende years into one continuous timeline", () => {
    const zeitreihe = berechneGesamtvergleichZeitreihe(basisBetrieb, 1, endeErgebnisse, betriebsErgebnisse);

    expect(zeitreihe).toHaveLength(2);
    expect(zeitreihe.map((p) => p.jahr)).toEqual([1, 2]);
    // Betrieb year: nettovermoegen + kumulierterKonsumwert
    expect(zeitreihe[0].gmbh).toBe(25000);
    // Ende year: (gesamtvermoegen - Darlehen) + Betriebskonsumwert + investitions
    expect(zeitreihe[1].gmbh).toBe(75000);
    // Betrieb year (year 1): no override → private comparison uses normal salary/interest logic.
    // With all-zero basisBetrieb, gesamtwertMitKonsum = 0.
    const privat = berechnePrivatVergleichZeitreihe({ ...basisBetrieb, laufzeitJahre: 2 });
    expect(zeitreihe[0].privat).toBe(privat[0].gesamtwertMitKonsum);
    // Ende year (year 2): offeneDarlehenOverride = 30000; ETF = 0, kumulierterKonsumwert = 1000
    // (default firmenhandy adds 1000 in year 1) → gesamtwertMitKonsum = 0 + 1000 - 30000 = -29000.
    expect(zeitreihe[1].privat).toBe(-29000);
  });

  it("matches the aggregate KPI in the final year", () => {
    const kpi = berechneGesamtvergleichKpi(basisBetrieb, 1, endeErgebnisse, betriebsErgebnisse);
    const zeitreihe = berechneGesamtvergleichZeitreihe(basisBetrieb, 1, endeErgebnisse, betriebsErgebnisse);

    expect(zeitreihe[zeitreihe.length - 1].gmbh).toBe(kpi.gmbhGesamtwert);
    expect(zeitreihe[zeitreihe.length - 1].privat).toBe(kpi.privatGesamtwert);
  });

  it("returns an empty series when GmbH and Privat horizons do not align", () => {
    const zeitreihe = berechneGesamtvergleichZeitreihe(basisBetrieb, 1, [], betriebsErgebnisse);

    expect(zeitreihe).toEqual([]);
  });

  it("accurately reflects dynamic investment net worth in Ende phase without double counting", () => {
    const betriebsErgebnisseWithInv: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 100000,
      gewinn: 0,
      steuer: 0,
      nettogewinn: 0,
      details: {
        nettovermoegen: 100000, // Includes investment capital (100k)
        kumulierterKonsumwert: 0,
      },
    }];
    const endeErgebnisseWithInv: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 103000, // Capital grew to 103k
      gewinn: 0,
      steuer: 0,
      nettogewinn: 0,
      details: {
        firmenDarlehensverbindlichkeit: 0,
        investitionsKreditRestschuld: 0,
        kumulierterKonsumwert: 0,
      },
    }];

    const kpi = berechneGesamtvergleichKpi(basisBetrieb, 1, endeErgebnisseWithInv, betriebsErgebnisseWithInv);
    const zeitreihe = berechneGesamtvergleichZeitreihe(basisBetrieb, 1, endeErgebnisseWithInv, betriebsErgebnisseWithInv);

    // In year 2 (Ende Y1), gmbhGesamtwert should equal 103000, NOT 103000 + 100000 (no double counting)
    expect(kpi.gmbhGesamtwert).toBe(103000);
    expect(zeitreihe[1].gmbh).toBe(103000);
  });
});
