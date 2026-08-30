import { Steuerjahr, getSteuerjahrParameter } from "../parameters";
import {
  ABGELTUNGSSTEUER_GESAMT,
  TEILFREISTELLUNG_AKTIEN,
  TEILFREISTELLUNG_AKTIEN_GMBH,
  GMBH_STEUER_GESAMT,
} from "./steuer";

// 2024 Basiszins for Vorabpauschale calculation (retained for backward compatibility)
export const BASISZINS_2024 = 0.0229;

export const MAX_SALE_CONVERGENCE_ITERATIONS = 20;
export const SALE_CONVERGENCE_THRESHOLD = 0.01;
export const MIN_ETF_LOT_WERT = 0.000001;
export const ETF_SORT_EPSILON = 0.0000000001;

export type EtfLotTyp = "startkapital" | "darlehen" | "zuzahlung" | "stillerGesellschafter";

export interface EtfLot {
  typ: EtfLotTyp;
  wert: number;
  einstandswert: number;
}

/**
 * Vorabpauschale: German annual pre-tax for accumulating ETFs.
 * = max(0, Basiszins × 0.7 × NAV_start, actualReturn)
 * Tax handling (private vs. GmbH) is controlled by the Teilfreistellung parameter
 * in the corresponding tax functions.
 */
export function berechneVorabpauschale(
  navStart: number,
  navEnd: number,
  basiszins?: number,
  steuerjahr?: Steuerjahr
): number {
  const effBasiszins = basiszins ?? getSteuerjahrParameter(steuerjahr).basiszins;
  const basisertrag = effBasiszins * 0.7 * navStart;
  const actualReturn = Math.max(0, navEnd - navStart);
  // Vorabpauschale is capped at actual return
  return Math.min(basisertrag, actualReturn);
}

/**
 * Already realized ETF gains (through sales in the same year) are credited
 * against the Vorabpauschale to avoid taxing more than the actual gain basis.
 */
export function berechneVorabpauschaleNachEtfVerkauf(
  vorabpauschale: number,
  realisierterEtfErtrag: number
): number {
  return Math.max(0, vorabpauschale - realisierterEtfErtrag);
}

/**
 * Tax on Vorabpauschale with Teilfreistellung.
 * For private investors (equity ETFs): 30% tax-free → Abgeltungssteuer on 70%.
 * For GmbH/Körperschaft (equity ETFs): 80% tax-free → corporate tax (KSt+GewSt) on 20%.
 * Pass TEILFREISTELLUNG_AKTIEN_GMBH and GMBH_STEUER_GESAMT when calling from a GmbH context.
 */
export function berechneVorabpauschalesteuer(
  vorabpauschale: number,
  teilfreistellung: number = TEILFREISTELLUNG_AKTIEN,
  steuersatz: number = ABGELTUNGSSTEUER_GESAMT,
  sparerpauschbetrag: number = 0
): number {
  const steuerpflichtig = Math.max(0, vorabpauschale * (1 - teilfreistellung) - Math.max(0, sparerpauschbetrag));
  return steuerpflichtig * steuersatz;
}

/**
 * Tax on realized ETF gains when selling units.
 * In this GmbH simulation, ETF sales default to the Körperschafts-Teilfreistellung (80%).
 */
export function berechneEtfVerkaufssteuer(
  realisierterEtfErtrag: number,
  teilfreistellung: number = TEILFREISTELLUNG_AKTIEN_GMBH,
  steuersatz: number = GMBH_STEUER_GESAMT,
  sparerpauschbetrag: number = 0
): number {
  if (realisierterEtfErtrag <= 0) {
    return 0;
  }
  const steuerpflichtig = Math.max(0, realisierterEtfErtrag * (1 - teilfreistellung) - Math.max(0, sparerpauschbetrag));
  return steuerpflichtig * steuersatz;
}

/**
 * ETF value after one year of compound growth.
 */
export function berechneEtfWachstum(
  navStart: number,
  renditePercent: number
): number {
  return navStart * (1 + renditePercent / 100);
}

export function sumEtfWert(lots: EtfLot[]): number {
  return lots.reduce((sum, lot) => sum + lot.wert, 0);
}

export function sumEtfWertNachTyp(lots: EtfLot[], typ: EtfLotTyp): number {
  return lots
    .filter((lot) => lot.typ === typ)
    .reduce((sum, lot) => sum + lot.wert, 0);
}

export function wachseEtfLots(lots: EtfLot[], renditePercent: number): EtfLot[] {
  return lots.map((lot) => ({
    ...lot,
    wert: berechneEtfWachstum(lot.wert, renditePercent),
  }));
}

export function fuegeEtfLotHinzu(lots: EtfLot[], typ: EtfLotTyp, betrag: number): EtfLot[] {
  if (betrag <= 0) {
    return lots;
  }

  return [...lots, { typ, wert: betrag, einstandswert: betrag }];
}

export function berechneWertsteigerungsanteil(lot: EtfLot): number {
  if (lot.wert <= MIN_ETF_LOT_WERT) {
    return -1;
  }

  return Math.max(0, (lot.wert - lot.einstandswert) / lot.wert);
}

export function sortiereEtfLotIndizesNachSteueroptimierung(lots: EtfLot[]): number[] {
  const typPrioritaet: Record<EtfLotTyp, number> = {
    zuzahlung: 0,
    darlehen: 1,
    startkapital: 2,
    stillerGesellschafter: 3,
  };

  return lots
    .map((lot, index) => ({ lot, index }))
    .filter(({ lot }) => lot.wert > MIN_ETF_LOT_WERT)
    .sort((a, b) => {
      const steuerlastDifferenz = berechneWertsteigerungsanteil(a.lot) - berechneWertsteigerungsanteil(b.lot);
      if (Math.abs(steuerlastDifferenz) > ETF_SORT_EPSILON) {
        return steuerlastDifferenz;
      }

      const typDifferenz = typPrioritaet[a.lot.typ] - typPrioritaet[b.lot.typ];
      if (typDifferenz !== 0) {
        return typDifferenz;
      }

      return a.index - b.index;
    })
    .map(({ index }) => index);
}

export function verkaufeEtfLotsSteueroptimal(
  lots: EtfLot[],
  zielVerkauf: number,
  sortierteLotIndizes: number[]
): { lots: EtfLot[]; etfVerkauf: number; etfEinstandswertVerkauft: number; etfGewinn: number } {
  let restVerkauf = Math.max(0, zielVerkauf);
  let etfVerkauf = 0;
  let etfEinstandswertVerkauft = 0;
  const aktualisierteLots = lots.map((lot) => ({ ...lot }));

  for (const lotIndex of sortierteLotIndizes) {
    if (restVerkauf <= 0) {
      break;
    }

    const aktuellerLot = aktualisierteLots[lotIndex];
    if (!aktuellerLot || aktuellerLot.wert <= MIN_ETF_LOT_WERT) {
      continue;
    }

    const verkaufsbetrag = Math.min(restVerkauf, aktuellerLot.wert);
    const verkaufsquote = aktuellerLot.wert > 0 ? verkaufsbetrag / aktuellerLot.wert : 0;
    const einstandswertVerkauft = aktuellerLot.einstandswert * verkaufsquote;

    aktuellerLot.wert -= verkaufsbetrag;
    aktuellerLot.einstandswert -= einstandswertVerkauft;

    restVerkauf -= verkaufsbetrag;
    etfVerkauf += verkaufsbetrag;
    etfEinstandswertVerkauft += einstandswertVerkauft;
  }

  return {
    lots: aktualisierteLots.filter((lot) => lot.wert > MIN_ETF_LOT_WERT),
    etfVerkauf,
    etfEinstandswertVerkauft,
    etfGewinn: Math.max(0, etfVerkauf - etfEinstandswertVerkauft),
  };
}
