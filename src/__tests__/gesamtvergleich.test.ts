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
    bav: 0,
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
    // Private comparison mirrors the standalone private timeline over the same horizon.
    const privat = berechnePrivatVergleichZeitreihe({ ...basisBetrieb, laufzeitJahre: 2 });
    expect(zeitreihe[0].privat).toBe(privat[0].gesamtwertMitKonsum);
    expect(zeitreihe[1].privat).toBe(privat[1].gesamtwertMitKonsum);
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
});
