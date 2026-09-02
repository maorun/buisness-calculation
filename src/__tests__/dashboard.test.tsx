/** @jest-environment jsdom */

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { useCalculatorStore } from "@/store/calculatorStore";

function resetStoreState() {
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

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStoreState();
  });

  it("renders the summary dashboard with the key KPI labels on the main page", () => {
    render(<Home />);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Kritische Kennzahlen")).toBeTruthy();
    expect(screen.getByText("Endvermögen")).toBeTruthy();
    expect(screen.getByText("Nettogewinn")).toBeTruthy();
    expect(screen.getByText("Steuerlast")).toBeTruthy();
    expect(screen.getByText("Liquidität")).toBeTruthy();
    expect(screen.getByText("Darlehensentwicklung")).toBeTruthy();
    expect(screen.getByText("Annualized Cashflow")).toBeTruthy();
  });

  it("updates the dashboard values when the underlying store changes", () => {
    render(<Home />);

    const endCard = screen.getByText("Endvermögen").closest("div");
    const previousValue = endCard?.textContent ?? "";

    act(() => {
      useCalculatorStore.setState((state) => ({
        ...state,
        betrieb: {
          ...state.betrieb,
          startkapital: 250000,
        },
      }));
    });

    const updatedCard = screen.getByText("Endvermögen").closest("div");
    const nextValue = updatedCard?.textContent ?? "";

    expect(nextValue).not.toBe(previousValue);
  });

  it("provides direct access to documented tax assumptions", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Steuerannahmen" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Steuersätze und Freibeträge")).toBeTruthy();
    expect(screen.getByText("Steuerjahr", { exact: true })).toBeTruthy();
    expect(screen.getByText("Die Vorabpauschale verwendet 70 % des jeweiligen Basiszinses; negative Werte werden nicht angesetzt.")).toBeTruthy();
  });
});
