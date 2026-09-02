import { berechneBetriebsErgebnisse } from "./betrieb";
import { CalculatorScenario, CalculatorState } from "../types";

export interface SzenarioKennzahlen {
  endvermoegen: number;
  steuerlast: number;
  jaehrlicherCashflow: number;
  jahreswerte: { jahr: number; endvermoegen: number }[];
}

export function berechneSzenarioKennzahlen(state: CalculatorState): SzenarioKennzahlen {
  const ergebnisse = berechneBetriebsErgebnisse(state.betrieb);
  const jahreswerte = ergebnisse.map((ergebnis) => ({
    jahr: ergebnis.jahr,
    endvermoegen: ergebnis.details.nettovermoegen ?? ergebnis.gesamtvermoegen,
  }));
  return {
    endvermoegen: jahreswerte.at(-1)?.endvermoegen ?? 0,
    steuerlast: ergebnisse.reduce((sum, ergebnis) => sum + ergebnis.steuer, 0),
    jaehrlicherCashflow: ergebnisse.length
      ? ergebnisse.reduce((sum, ergebnis) => sum + ergebnis.nettogewinn, 0) / ergebnisse.length
      : 0,
    jahreswerte,
  };
}

export function vergleicheSzenarien(szenarien: CalculatorScenario[]) {
  return szenarien.map((szenario) => ({
    ...szenario,
    kennzahlen: berechneSzenarioKennzahlen(szenario.state),
  }));
}
