/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { EndeSection } from "@/components/EndeSection";
import { useCalculatorStore } from "@/store/calculatorStore";
import { berechnePrivatVergleichErgebnis } from "@/lib/calculations/betrieb";

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

function formatSignedEuro(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
}

describe("EndeSection", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoreState();
  });

  it("shows the overall advantage KPI in the fixed summary bar", () => {
    const state = useCalculatorStore.getState();
    const endeErgebnisse = state.getEndeErgebnisse();
    const betriebsErgebnisse = state.getBetriebsErgebnisse();
    const letzterBetriebsstand = betriebsErgebnisse[betriebsErgebnisse.length - 1];
    const letzterEndeStand = endeErgebnisse[endeErgebnisse.length - 1];
    const gmbhBetriebKonsumwert = letzterBetriebsstand?.details.kumulierterKonsumwert ?? 0;
    const gmbhGesamtwert = (letzterEndeStand?.gesamtvermoegen ?? 0) + gmbhBetriebKonsumwert;
    const privatVergleich = berechnePrivatVergleichErgebnis({
      ...state.betrieb,
      laufzeitJahre: state.betrieb.laufzeitJahre + state.ende.laufzeitJahre + 1,
    });
    const gesamtVorteil = gmbhGesamtwert - privatVergleich.gesamtwertMitKonsum;
    const gesamtVorteilProzent = (gesamtVorteil / privatVergleich.gesamtwertMitKonsum) * 100;

    render(<EndeSection />);

    expect(screen.getByText("Gesamtvergleich Betrieb + Ende")).toBeTruthy();
    expect(screen.getByText(`${formatSignedEuro(gesamtVorteil)} Vorteil vs. Privat`)).toBeTruthy();
    expect(screen.getByText(`Relativ: ${gesamtVorteilProzent >= 0 ? "+" : "-"}${Math.abs(gesamtVorteilProzent).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} % vs. Privat`)).toBeTruthy();
  });
});
