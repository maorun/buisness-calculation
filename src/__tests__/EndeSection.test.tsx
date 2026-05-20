/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { EndeSection } from "@/components/EndeSection";
import { useCalculatorStore } from "@/store/calculatorStore";

describe("EndeSection", () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  it("shows the overall advantage KPI in the fixed summary bar", () => {
    render(<EndeSection />);

    expect(screen.getByText("Gesamtvergleich Betrieb + Ende")).toBeTruthy();
    expect(screen.getByText(/Vorteil vs\. Privat/)).toBeTruthy();
    expect(screen.getByText(/Relativ:/)).toBeTruthy();
  });
});
