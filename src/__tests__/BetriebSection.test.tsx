/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { BetriebSection } from "@/components/BetriebSection";
import { useCalculatorStore } from "@/store/calculatorStore";
import {
  berechneGesamtvergleichKpi,
  formatSignedEuro,
  formatSignedPercent,
} from "@/lib/calculations/gesamtvergleich";

function setStoreState() {
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
  });
}

describe("BetriebSection", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoreState();
  });

  it("shows Geldentwicklung im Betrieb with total money development (GmbH net change + Gesellschafter netto)", () => {
    render(<BetriebSection />);

    expect(screen.getByText("Geldentwicklung im Betrieb (Jahr 1)")).toBeTruthy();
    // Should NOT show the old misleading label
    expect(screen.queryByText("GmbH-Geldentwicklung (Jahr 1)")).toBeNull();
    // The aria-label should reflect the overall Betrieb, not just the GmbH
    const ariaEl =
      screen.queryByLabelText("Gesamter Betrieb generiert Überschuss") ??
      screen.queryByLabelText("Gesamter Betrieb generiert Fehlbetrag");
    expect(ariaEl).not.toBeNull();
  });

  it("merges the overall Betrieb-und-Ende KPI into the existing decision area", () => {
    const state = useCalculatorStore.getState();
    const gesamtvergleich = berechneGesamtvergleichKpi(
      state.betrieb,
      state.ende.laufzeitJahre,
      state.getEndeErgebnisse(),
      state.getBetriebsErgebnisse()
    );

    render(<BetriebSection />);

    expect(screen.getByText("Entscheidungsfläche: Lohnt sich die GmbH?")).toBeTruthy();
    expect(screen.getByText(/Vorteilhaftigkeitskennzahl gesamt \(Betrieb \+ Ende\):/)).toBeTruthy();
    expect(screen.getByText(`Vorteilhaftigkeitskennzahl gesamt (Betrieb + Ende): ${formatSignedEuro(gesamtvergleich.vorteil)} gegenüber Privat`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${gesamtvergleich.gewinnerText}.*${formatSignedPercent(gesamtvergleich.vorteilProzent).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))).toBeTruthy();
    expect(screen.getByText("Gesamtvergleich Betrieb + Ende")).toBeTruthy();
  });
});
