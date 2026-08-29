import { DarlehenConfig } from "../types";
import { Steuerjahr } from "../parameters";
import { berechneEinkommensteuerBetrieb, berechneSoliBetrieb } from "./steuer";
import { MONATE_PRO_JAHR } from "./benefits";

export const DARLEHEN_MONATE_PRO_JAHR = MONATE_PRO_JAHR;

/**
 * Annual loan interest (simple: interest on full principal each year).
 * For non-deferred loans, principal stays constant (interest-only / Tilgungsdarlehen varies).
 * For endfaellig loans the interest accrues and is paid at end.
 */
export function berechneDarlehenszinsen(darlehen: DarlehenConfig): number {
  return darlehen.betrag * (darlehen.zinssatz / 100);
}

/**
 * Yearly loan interest with monthly shareholder top-ups.
 * Interest is calculated on opening monthly principal, then monthly top-up increases principal.
 */
export function berechneDarlehensjahr(
  darlehenBetragStart: number,
  zinssatzPercent: number,
  monatlicherZuschuss: number
): { zinsenJaehrlich: number; darlehenBetragEnde: number } {
  const zinssatzMonatlich = zinssatzPercent / 100 / DARLEHEN_MONATE_PRO_JAHR;
  let darlehenBetrag = Math.max(0, darlehenBetragStart);
  let zinsenJaehrlich = 0;

  for (let monat = 0; monat < DARLEHEN_MONATE_PRO_JAHR; monat++) {
    zinsenJaehrlich += darlehenBetrag * zinssatzMonatlich;
    darlehenBetrag += Math.max(0, monatlicherZuschuss);
  }

  return { zinsenJaehrlich, darlehenBetragEnde: darlehenBetrag };
}

export function berechneDarlehensZinsenSteuerBetrieb(
  zinsen: number,
  bruttoGehalt: number,
  steuerjahr?: Steuerjahr
): number {
  if (zinsen <= 0) return 0;
  const gehaltNorm = Math.max(0, bruttoGehalt);
  const estNurGehalt = berechneEinkommensteuerBetrieb(gehaltNorm, steuerjahr);
  const soliNurGehalt = berechneSoliBetrieb(estNurGehalt, steuerjahr);
  const estKombiniert = berechneEinkommensteuerBetrieb(gehaltNorm + zinsen, steuerjahr);
  const soliKombiniert = berechneSoliBetrieb(estKombiniert, steuerjahr);
  return (estKombiniert + soliKombiniert) - (estNurGehalt + soliNurGehalt);
}
