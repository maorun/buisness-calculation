import { berechneGesamtvergleichKpi } from "@/lib/calculations/gesamtvergleich";
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
