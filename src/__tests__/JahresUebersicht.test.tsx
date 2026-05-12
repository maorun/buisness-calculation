/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { JahresUebersicht } from "@/components/JahresUebersicht";
import { JahresErgebnis } from "@/lib/types";

describe("JahresUebersicht", () => {
  it("lists the operating expense items in the yearly details", () => {
    const ergebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 100000,
      gewinn: 1000,
      steuer: 100,
      nettogewinn: 900,
      details: {
        etfGewinn: 1200,
        etfEinstandswertVerkauft: 800,
        theoretischerEtfErtrag: 1500,
        etfVerkauf: 2500,
        jaehrlicheKosten: 1200,
        handyNettoKosten: 900,
        benefitsKosten: 2100,
        betriebsausgabenGesamt: 4200,
        ausZuzahlungenBeglicheneBetriebsausgaben: 0,
        ungedeckteBetriebsausgaben: 4200,
        freieDarlehensZuzahlungen: 0,
        jaehrlicheZinsen: 0,
        aufgelaufeneZinsen: 0,
        gewinnNachBetriebsausgaben: 1000,
        vorabpauschale: 100,
        vorabpauschalesteuer: 10,
        etfVerkaufssteuer: 5,
        gmbhSteuer: 20,
        deckungssaldoNachAusgabenUndSteuern: 0,
        cashReserve: 900,
        cashReserveZugang: 900,
        offenesDarlehen: 0,
        nettovermoegen: 100000,
        etfWert: 99100,
        startkapitalEtfWert: 99100,
        darlehenEtfWert: 0,
        zuzahlungenEtfWert: 0,
      },
      betriebskostenPosten: [
        { label: "Software", wert: 1200 },
        { label: "Tankgutschein", wert: 600 },
        { label: "Strategieessen", wert: 1500 },
        { label: "Firmenhandy (alle 3 Jahre)", wert: 900 },
      ],
    }];

    render(<JahresUebersicht ergebnisse={ergebnisse} />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("• Software")).toBeTruthy();
    expect(screen.getByText("• Tankgutschein")).toBeTruthy();
    expect(screen.getByText("• Strategieessen")).toBeTruthy();
    expect(screen.getByText("• Firmenhandy (alle 3 Jahre)")).toBeTruthy();
  });
});
