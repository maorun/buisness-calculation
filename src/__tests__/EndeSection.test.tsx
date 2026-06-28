/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { EndeSection } from "@/components/EndeSection";
import { useCalculatorStore } from "@/store/calculatorStore";
import {
  berechneGesamtvergleichKpi,
  formatSignedEuro,
  formatSignedPercent,
} from "@/lib/calculations/gesamtvergleich";

function setStoreState(partialState?: Partial<ReturnType<typeof useCalculatorStore.getState>>) {
  useCalculatorStore.setState({
    gruendung: {
      kosten: [],
    },
    betrieb: {
      startkapital: 12500,
      jaehrlicherCashZuschuss: 2400,
      simulierterGewinn: 0,
      zielnettoGesellschafter: 36000,
      geschaeftsfuehrergehalt: 17000,
      darlehen: {
        betrag: 47500,
        zinssatz: 3,
        monatlicherZuschuss: 0,
        endfaellig: true,
      },
      etfRendite: 5,
      laufzeitJahre: 10,
      kosten: [],
      benefits: {
        tankgutschein: 50,
        strategieessen: 0,
        essenszuschussProTag: 0,
        essenszuschussTageProJahr: 0,
        bav: 0,
      },
      firmenhandy: {
        aktiv: true,
        anschaffungskosten: 1000,
        restwertQuote: 0.1,
        ersatzzyklusJahre: 3,
        erstanschaffungJahr: 1,
      },
      stillerGesellschafter: {
        aktiv: false,
        typ: "typisch",
        einlage: 25000,
        gewinnbeteiligungProzent: 20,
        zinssatz: 4,
      },
    },
    ende: {
      geschaeftsfuehrergehalt: 0,
      stammkapitalErhoehungEtf: 0,
      gehaltBereich1: 0,
      teiltilgungBereich1: 0,
      gewinnausschuettung: 0,
      tilgungsrate: 0,
      laufzeitJahre: 5,
      zielnettoBereich1: 17000,
      zielnettoBereich2: 17000,
    },
    ...partialState,
  });
}

describe("EndeSection", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoreState();
  });

  it("shows the overall advantage KPI in the fixed summary bar", () => {
    const state = useCalculatorStore.getState();
    const gesamtvergleich = berechneGesamtvergleichKpi(
      state.betrieb,
      state.ende.laufzeitJahre,
      state.getEndeErgebnisse(),
      state.getBetriebsErgebnisse()
    );

    render(<EndeSection />);

    expect(screen.getByText("Gesamtvergleich Betrieb + Ende")).toBeTruthy();
    expect(screen.getByText(`${formatSignedEuro(gesamtvergleich.vorteil)} Vorteil vs. Privat`)).toBeTruthy();
    expect(screen.getByText(`Relativ: ${formatSignedPercent(gesamtvergleich.vorteilProzent)}`)).toBeTruthy();
  });

  it("shows meal subsidy in the benefits overview", () => {
    setStoreState({
      betrieb: {
        ...useCalculatorStore.getState().betrieb,
        benefits: {
          tankgutschein: 50,
          strategieessen: 0,
          essenszuschussProTag: 7.67,
          essenszuschussTageProJahr: 220,
          bav: 0,
        },
      },
    });

    render(<EndeSection />);

    expect(screen.getByText("Essenszuschuss")).toBeTruthy();
    expect(screen.getByText("7,67 €/Tag")).toBeTruthy();
    expect(screen.getByText("220 Tage/Jahr · 1.687,40 €/Jahr")).toBeTruthy();
  });

  it("keeps investments in the overall comparison on both GmbH and private sides", () => {
    setStoreState({
      betrieb: {
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
          bav: 0,
        },
        firmenhandy: {
          aktiv: false,
          anschaffungskosten: 1000,
          restwertQuote: 0.1,
          ersatzzyklusJahre: 3,
          erstanschaffungJahr: 1,
        },
        stillerGesellschafter: {
          aktiv: false,
          typ: "typisch",
          einlage: 0,
          gewinnbeteiligungProzent: 0,
          zinssatz: 0,
        },
        investitionen: [{
          id: "inv-1",
          bezeichnung: "Immobilie",
          kapital: 10000,
          gewinnVerlustProJahr: 0,
          wertsteigerung: 0,
          kredit: 0,
          zinssatz: 0,
          tilgungsrateJaehrlich: 0,
        }],
      },
      ende: {
        geschaeftsfuehrergehalt: 0,
        stammkapitalErhoehungEtf: 0,
        gehaltBereich1: 0,
        teiltilgungBereich1: 0,
        gewinnausschuettung: 0,
        tilgungsrate: 0,
        laufzeitJahre: 1,
        zielnettoBereich1: 0,
        zielnettoBereich2: 0,
      },
    });
    const state = useCalculatorStore.getState();
    const gesamtvergleich = berechneGesamtvergleichKpi(
      state.betrieb,
      state.ende.laufzeitJahre,
      state.getEndeErgebnisse(),
      state.getBetriebsErgebnisse()
    );

    expect(gesamtvergleich.gmbhGesamtwert).toBeCloseTo(10000);
    expect(gesamtvergleich.privatGesamtwert).toBeCloseTo(10000);
    expect(gesamtvergleich.vorteil).toBeCloseTo(0);
  });

  it("shows Zielnetto Bereich 2 when Ende loan is non-endfällig", () => {
    setStoreState({
      betrieb: {
        ...useCalculatorStore.getState().betrieb,
        darlehen: {
          ...useCalculatorStore.getState().betrieb.darlehen,
          endfaellig: false,
        },
      },
      ende: {
        ...useCalculatorStore.getState().ende,
        darlehenEndfaellig: false,
      },
    });

    render(<EndeSection />);

    expect(screen.queryByText("Zielnetto Bereich 2 (€/Jahr)")).not.toBeNull();
    expect(screen.queryByText("Zielabgleich Auszahlungsphase")).not.toBeNull();
  });
});
