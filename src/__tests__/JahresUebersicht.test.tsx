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
        jaehrlicherCashZuschuss: 1200,
        ausCashZuschussBeglicheneBetriebsausgaben: 1200,
        ausCashReserveBeglicheneBetriebsausgaben: 600,
        ausZuzahlungenBeglicheneBetriebsausgaben: 0,
        ungedeckteBetriebsausgaben: 2400,
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
    expect(screen.getByText("Betriebsausgaben aus Cash-Zuschuss")).toBeTruthy();
    expect(screen.getByText("Betriebsausgaben aus Cash-Reserve")).toBeTruthy();
  });

  it("shows Betriebsausgaben details in Ende yearly details", () => {
    const ergebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 100000,
      gewinn: 1000,
      steuer: 100,
      nettogewinn: 900,
      details: {
        bereich: 2,
        bruttoGehalt: 0,
        nettoGehalt: 0,
        einkommensteuer: 0,
        soli: 0,
        darlehenZinsen: 0,
        darlehenZinsenSteuer: 0,
        darlehenZinsenNetto: 0,
        darlehenTilgung: 0,
        darlehenGesamtauszahlungBrutto: 0,
        darlehenGesamtauszahlungNetto: 0,
        restdarlehen: 0,
        firmenEtfVermoegen: 100000,
        firmenDarlehensverbindlichkeit: 0,
        firmenNettovermoegen: 100000,
        theoretischerEtfErtrag: 2000,
        vorabpauschale: 100,
        vorabpauschalesteuer: 10,
        jaehrlicheKosten: 1200,
        betriebsausgabenGesamt: 4200,
        gmbhSteuer: 20,
      },
      betriebskostenPosten: [
        { label: "Software", wert: 1200 },
        { label: "Tankgutschein", wert: 600 },
      ],
    }];

    render(<JahresUebersicht ergebnisse={ergebnisse} />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("− Betriebsausgaben")).toBeTruthy();
    expect(screen.getByText("• Software")).toBeTruthy();
    expect(screen.getByText("• Tankgutschein")).toBeTruthy();
  });

  it("shows BetriebBilanz layout for Ende data when variant=betrieb is passed", () => {
    const ergebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 100000,
      gewinn: 1000,
      steuer: 100,
      nettogewinn: 900,
      details: {
        bereich: 2,
        bruttoGehalt: 0,
        nettoGehalt: 0,
        einkommensteuer: 0,
        soli: 0,
        darlehenZinsen: 0,
        darlehenZinsenSteuer: 0,
        darlehenZinsenNetto: 0,
        darlehenTilgung: 0,
        darlehenGesamtauszahlungBrutto: 0,
        darlehenGesamtauszahlungNetto: 0,
        restdarlehen: 0,
        firmenEtfVermoegen: 100000,
        firmenDarlehensverbindlichkeit: 5000,
        firmenNettovermoegen: 95000,
        theoretischerEtfErtrag: 2000,
        vorabpauschale: 100,
        vorabpauschalesteuer: 10,
        jaehrlicheKosten: 1200,
        betriebsausgabenGesamt: 4200,
        gmbhSteuer: 20,
      },
      betriebskostenPosten: [
        { label: "Software", wert: 1200 },
      ],
    }];

    render(<JahresUebersicht ergebnisse={ergebnisse} variant="betrieb" />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("Gewinn- und Verlustrechnung")).toBeTruthy();
    expect(screen.getAllByText("Steuern (Finanzamt)").length).toBeGreaterThan(0);
    expect(screen.getByText("Bilanz (Jahresende)")).toBeTruthy();
    expect(screen.getByText("− Betriebsausgaben")).toBeTruthy();
    expect(screen.getByText("• Software")).toBeTruthy();
    expect(screen.getByText("= Nettogewinn (Buchgewinn)")).toBeTruthy();
    expect(screen.getByText("Gesamter ETF-Wert")).toBeTruthy();
    expect(screen.getByText("= Nettovermögen (Eigenkapital)")).toBeTruthy();
    expect(screen.getByText("Offenes Darlehen (Verbindlichkeit)")).toBeTruthy();
  });

  it("renders loss carryforward utilization and remaining loss carryforward", () => {
    const ergebnisse: JahresErgebnis[] = [{
      jahr: 1,
      gesamtvermoegen: 100000,
      gewinn: 5000,
      steuer: 100,
      nettogewinn: 4900,
      details: {
        etfGewinn: 0,
        etfVerkauf: 0,
        betriebsausgabenGesamt: 1000,
        gmbhSteuer: 500,
        gmbhSteuerKst: 250,
        gmbhSteuerGewSt: 250,
        verlustVortragGenutzt: 2000,
        verlustvortrag: 3000,
        steuerpflichtigerGewinn: 3000,
      },
    }];

    render(<JahresUebersicht ergebnisse={ergebnisse} variant="betrieb" />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("− Verlustvortrag verrechnet")).toBeTruthy();
    expect(screen.getByText("Verbleibender Verlustvortrag")).toBeTruthy();
  });
});
