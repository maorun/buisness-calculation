import { BetriebState, BenefitConfig, DarlehenConfig, JahresErgebnis, KostenPosition } from "../types";

// 2024 Basiszins for Vorabpauschale calculation
export const BASISZINS_2024 = 0.0229;

// German capital gains tax (Abgeltungssteuer) + Solidaritätszuschlag
export const ABGELTUNGSSTEUER = 0.25;
export const SOLI = 0.055;
// Effective Abgeltungssteuer including Soli
export const ABGELTUNGSSTEUER_GESAMT = ABGELTUNGSSTEUER * (1 + SOLI); // ~26.375%

// Equity ETF Teilfreistellung:
// - Privatperson: 30% tax-free
// - GmbH/Körperschaft: 80% tax-free
export const TEILFREISTELLUNG_AKTIEN_PRIVAT = 0.3;
export const TEILFREISTELLUNG_AKTIEN_GMBH = 0.8;
// Backward-compatible alias for existing callsites using the private-person default.
export const TEILFREISTELLUNG_AKTIEN = TEILFREISTELLUNG_AKTIEN_PRIVAT;

// GmbH Körperschaftsteuer + Soli
export const KST = 0.15;
export const KST_GESAMT = KST * (1 + SOLI); // 15.825%

// Gewerbesteuer (municipality average ~14%)
export const GEWERBESTEUER = 0.14;

// Total GmbH tax rate on profits
export const GMBH_STEUER_GESAMT = KST_GESAMT + GEWERBESTEUER; // ~29.825%
export const HANDY_ANSCHAFFUNGSKOSTEN = 1000;
export const HANDY_VERKAUFSQUOTE = 0.1;
export const HANDY_ERSATZZYKLUS_JAHRE = 3;
export const MAX_SALE_CONVERGENCE_ITERATIONS = 20;
export const SALE_CONVERGENCE_THRESHOLD = 0.01;
export const DARLEHEN_MONATE_PRO_JAHR = 12;
export const MIN_ETF_LOT_WERT = 0.000001;
export const ETF_SORT_EPSILON = 0.0000000001;

type EtfLotTyp = "startkapital" | "darlehen" | "zuzahlung";

interface EtfLot {
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
  basiszins: number = BASISZINS_2024
): number {
  const basisertrag = basiszins * 0.7 * navStart;
  const actualReturn = Math.max(0, navEnd - navStart);
  // Vorabpauschale is capped at actual return
  return Math.min(basisertrag, actualReturn);
}

/**
 * Tax on Vorabpauschale using Abgeltungssteuer with Teilfreistellung.
 * For equity ETFs: 30% tax-free → tax applies to 70% of Vorabpauschale.
 */
export function berechneVorabpauschalesteuer(
  vorabpauschale: number,
  teilfreistellung: number = TEILFREISTELLUNG_AKTIEN
): number {
  const steuerpflichtig = vorabpauschale * (1 - teilfreistellung);
  return steuerpflichtig * ABGELTUNGSSTEUER_GESAMT;
}

/**
 * Tax on realized ETF gains when selling units.
 * In this GmbH simulation, ETF sales default to the Körperschafts-Teilfreistellung (80%).
 */
export function berechneEtfVerkaufssteuer(
  realisierterEtfErtrag: number,
  teilfreistellung: number = TEILFREISTELLUNG_AKTIEN_GMBH
): number {
  if (realisierterEtfErtrag <= 0) {
    return 0;
  }
  const steuerpflichtig = realisierterEtfErtrag * (1 - teilfreistellung);
  return steuerpflichtig * ABGELTUNGSSTEUER_GESAMT;
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

/**
 * Sum all operating cost positions (monthly × 12 + annual).
 * Supports KostenPositions with periode: 'monatlich' (multiplied by 12) or 'jaehrlich' (as-is).
 */
export function berechneBetriebskosten(kosten: KostenPosition[]): number {
  return kosten.reduce((sum, k) => {
    const jahresBetrag = k.periode === 'monatlich' ? k.betrag * 12 : k.betrag;
    return sum + jahresBetrag;
  }, 0);
}

/**
 * Tax saving from benefits in a GmbH:
 * - Tankgutschein (fuel voucher): up to 50 €/month tax-free as Sachbezug
 * - Strategieessen (annual strategy dinner): fully deductible business expense
 *
 * Returns the annual tax saving (at GmbH tax rate) from deductible benefits.
 * Used as a reporting helper while benefits themselves are part of Betriebsausgaben.
 */
export function berechneBenefitsSteuerersparnis(
  benefits: BenefitConfig,
  steuerRate: number = GMBH_STEUER_GESAMT
): number {
  const totalAbzug = berechneBenefitsKosten(benefits);
  return totalAbzug * steuerRate;
}

/**
 * Benefits are deductible operating expenses and therefore part of annual Betriebsausgaben.
 */
export function berechneBenefitsKosten(benefits: BenefitConfig): number {
  const clampedTankMonthly = Math.min(Math.max(benefits.tankgutschein, 0), 50);
  const tankJahr = clampedTankMonthly * 12;
  const strategieessen = benefits.strategieessen;
  return tankJahr + strategieessen;
}

/**
 * Firmenhandy als Betriebsausgabe:
 * alle 3 Jahre 1.000 € Anschaffung, gegenläufig 10% Verkaufserlös.
 */
export function berechneHandyNettoKostenProJahr(
  jahr: number,
  anschaffungskosten: number = HANDY_ANSCHAFFUNGSKOSTEN
): number {
  if (jahr < 1 || (jahr - 1) % HANDY_ERSATZZYKLUS_JAHRE !== 0) {
    return 0;
  }
  const verkaufserloes = anschaffungskosten * HANDY_VERKAUFSQUOTE;
  return anschaffungskosten - verkaufserloes;
}

function sumEtfWert(lots: EtfLot[]): number {
  return lots.reduce((sum, lot) => sum + lot.wert, 0);
}

function sumEtfWertNachTyp(lots: EtfLot[], typ: EtfLotTyp): number {
  return lots
    .filter((lot) => lot.typ === typ)
    .reduce((sum, lot) => sum + lot.wert, 0);
}

function wachseEtfLots(lots: EtfLot[], renditePercent: number): EtfLot[] {
  return lots.map((lot) => ({
    ...lot,
    wert: berechneEtfWachstum(lot.wert, renditePercent),
  }));
}

function fuegeEtfLotHinzu(lots: EtfLot[], typ: EtfLotTyp, betrag: number): EtfLot[] {
  if (betrag <= 0) {
    return lots;
  }

  return [...lots, { typ, wert: betrag, einstandswert: betrag }];
}

function berechneWertsteigerungsanteil(lot: EtfLot): number {
  if (lot.wert <= MIN_ETF_LOT_WERT) {
    return -1;
  }

  return Math.max(0, (lot.wert - lot.einstandswert) / lot.wert);
}

function sortiereEtfLotIndizesNachSteueroptimierung(lots: EtfLot[]): number[] {
  const typPrioritaet: Record<EtfLotTyp, number> = {
    zuzahlung: 0,
    darlehen: 1,
    startkapital: 2,
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

function verkaufeEtfLotsSteueroptimal(
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

/**
 * Calculate yearly Betrieb results for each year of the operating phase.
 */
export function berechneBetriebsErgebnisse(state: BetriebState): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  let etfLots: EtfLot[] = [];
  etfLots = fuegeEtfLotHinzu(etfLots, "startkapital", Math.max(0, state.startkapital));
  etfLots = fuegeEtfLotHinzu(etfLots, "darlehen", Math.max(0, state.darlehen.betrag));
  let cashReserve = 0;
  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  // For endfällig loans, interest is deferred to end and NOT deducted annually.
  // For regular loans, interest is paid (and deductible) each year.
  let aufgelaufeneZinsen = 0;

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const etfWertVorjahrEnd = sumEtfWert(etfLots);
    const etfLotsNachWachstum = wachseEtfLots(etfLots, state.etfRendite);
    const etfWertNachWachstum = sumEtfWert(etfLotsNachWachstum);
    const theoretischerEtfErtrag = Math.max(0, etfWertNachWachstum - etfWertVorjahrEnd);

    // Vorabpauschale tax
    const vorabpauschale = berechneVorabpauschale(etfWertVorjahrEnd, etfWertNachWachstum);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(vorabpauschale);
    // Recompute costs inside the yearly loop so changed expense inputs are reflected directly.
    const jaehrlicheKosten = berechneBetriebskosten(state.kosten);

    // Phone costs are operating expenses (Betriebsausgabe), deducted from taxable profit.
    const handyNettoKosten = berechneHandyNettoKostenProJahr(jahr);
    const benefitsKosten = berechneBenefitsKosten(state.benefits);
    const betriebsausgabenGesamt = jaehrlicheKosten + handyNettoKosten + benefitsKosten;

    const { zinsenJaehrlich: darlehenszinsJaehrlich, darlehenBetragEnde } = berechneDarlehensjahr(
      offenesDarlehen,
      state.darlehen.zinssatz,
      state.darlehen.monatlicherZuschuss
    );
    const darlehensZuzahlungenJaehrlich = Math.max(0, state.darlehen.monatlicherZuschuss) * DARLEHEN_MONATE_PRO_JAHR;
    const ausZuzahlungenBeglicheneBetriebsausgaben = Math.min(darlehensZuzahlungenJaehrlich, betriebsausgabenGesamt);
    const ungedeckteBetriebsausgaben = Math.max(0, betriebsausgabenGesamt - ausZuzahlungenBeglicheneBetriebsausgaben);
    const freieDarlehensZuzahlungen = Math.max(0, darlehensZuzahlungenJaehrlich - ausZuzahlungenBeglicheneBetriebsausgaben);
    const jaehrlicheZinsen = state.darlehen.endfaellig ? 0 : darlehenszinsJaehrlich;
    const sortierteLotIndizes = sortiereEtfLotIndizesNachSteueroptimierung(etfLotsNachWachstum);

    // Accumulate deferred interest for endfällig loans (informational).
    if (state.darlehen.endfaellig) {
      aufgelaufeneZinsen += darlehenszinsJaehrlich;
    }

    const fixeAuszahlungen = ungedeckteBetriebsausgaben + jaehrlicheZinsen + vorabpauschalesteuer;

    // Solve sale amount iteratively because taxes depend on realized sale gain.
    let etfVerkauf = Math.min(etfWertNachWachstum, fixeAuszahlungen);
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const verkaufIteration = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
      const realisierterEtfErtragIter = verkaufIteration.etfGewinn;
      const etfVerkaufssteuerIter = berechneEtfVerkaufssteuer(realisierterEtfErtragIter);
      const gewinnNachBetriebsausgabenIter =
        realisierterEtfErtragIter - betriebsausgabenGesamt - jaehrlicheZinsen;
      const gmbhSteuerIter = gewinnNachBetriebsausgabenIter > 0
        ? gewinnNachBetriebsausgabenIter * GMBH_STEUER_GESAMT
        : 0;
      const benoetigterVerkauf = Math.min(
        etfWertNachWachstum,
        fixeAuszahlungen + gmbhSteuerIter + etfVerkaufssteuerIter
      );
      if (Math.abs(benoetigterVerkauf - etfVerkauf) < SALE_CONVERGENCE_THRESHOLD) {
        etfVerkauf = benoetigterVerkauf;
        break;
      }
      etfVerkauf = benoetigterVerkauf;
    }

    const verkauf = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
    const einstandswertVerkauft = verkauf.etfEinstandswertVerkauft;
    const realisierterEtfErtrag = verkauf.etfGewinn;
    // gewinnNachBetriebsausgaben is the taxable profit base (after all deductible expenses)
    const gewinnNachBetriebsausgaben =
      realisierterEtfErtrag - betriebsausgabenGesamt - jaehrlicheZinsen;

    // GmbH taxes (KSt + GewSt) on positive profit, paid to Finanzamt
    const gmbhSteuer = gewinnNachBetriebsausgaben > 0
      ? gewinnNachBetriebsausgaben * GMBH_STEUER_GESAMT
      : 0;

    // Tax on realized ETF gain due to selling
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(realisierterEtfErtrag);

    // Additional taxes
    const gesamtSteuer = gmbhSteuer + vorabpauschalesteuer + etfVerkaufssteuer;

    // Net gain after all taxes
    const nettogewinn =
      gewinnNachBetriebsausgaben - gmbhSteuer - vorabpauschalesteuer - etfVerkaufssteuer;
    const deckungssaldoNachAusgabenUndSteuern =
      etfVerkauf - ungedeckteBetriebsausgaben - jaehrlicheZinsen - vorabpauschalesteuer - gmbhSteuer - etfVerkaufssteuer;

    // Positive retained result is held as cash reserve (Aktiva).
    const cashReserveZugang = Math.max(0, nettogewinn);
    cashReserve += cashReserveZugang;

    // Update ETF value: after growth, deduct all cash outflows funded by ETF sales.
    etfLots = verkauf.lots;
    etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", freieDarlehensZuzahlungen);
    const etfWert = sumEtfWert(etfLots);
    const startkapitalEtfWert = sumEtfWertNachTyp(etfLots, "startkapital");
    const darlehenEtfWert = sumEtfWertNachTyp(etfLots, "darlehen");
    const zuzahlungenEtfWert = sumEtfWertNachTyp(etfLots, "zuzahlung");

    offenesDarlehen = darlehenBetragEnde;

    // Gesamtvermögen = total gross assets (ETF + cash reserve).
    // The outstanding loan is a liability shown separately; net worth = assets - offenesDarlehen.
    const gesamtvermoegen = etfWert + cashReserve;
    const nettovermoegen = gesamtvermoegen - offenesDarlehen;

    ergebnisse.push({
      jahr,
      gesamtvermoegen,
      gewinn: gewinnNachBetriebsausgaben,
      steuer: gesamtSteuer,
      nettogewinn,
        details: {
          etfWert,
          startkapitalEtfWert,
          darlehenEtfWert,
          zuzahlungenEtfWert,
          etfGewinn: realisierterEtfErtrag,
          etfEinstandswertVerkauft: einstandswertVerkauft,
          theoretischerEtfErtrag,
          etfVerkauf,
          jaehrlicheKosten,
        handyNettoKosten,
          benefitsKosten,
          betriebsausgabenGesamt,
          ausZuzahlungenBeglicheneBetriebsausgaben,
          ungedeckteBetriebsausgaben,
          freieDarlehensZuzahlungen,
          jaehrlicheZinsen,
          aufgelaufeneZinsen: state.darlehen.endfaellig ? aufgelaufeneZinsen : 0,
          gewinnNachBetriebsausgaben,
        vorabpauschale,
        vorabpauschalesteuer,
        etfVerkaufssteuer,
        gmbhSteuer,
        deckungssaldoNachAusgabenUndSteuern,
        cashReserve,
        cashReserveZugang,
        offenesDarlehen,
        nettovermoegen,
      },
    });
  }

  return ergebnisse;
}
