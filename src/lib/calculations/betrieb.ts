import { BetriebState, BenefitConfig, DarlehenConfig, JahresErgebnis, KostenPosition } from "../types";

// 2024 Basiszins for Vorabpauschale calculation
export const BASISZINS_2024 = 0.0229;

// German capital gains tax (Abgeltungssteuer) + Solidaritätszuschlag
export const ABGELTUNGSSTEUER = 0.25;
export const SOLI = 0.055;
// Effective Abgeltungssteuer including Soli
export const ABGELTUNGSSTEUER_GESAMT = ABGELTUNGSSTEUER * (1 + SOLI); // ~26.375%

// Equity ETF Teilfreistellung: 30% of gains are tax-free
export const TEILFREISTELLUNG_AKTIEN = 0.3;

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

/**
 * Vorabpauschale: German annual pre-tax for accumulating ETFs.
 * = max(0, Basiszins × 0.7 × NAV_start, actualReturn)
 * For GmbH holding ETFs, Teilfreistellung of 20% applies (not 30% individual).
 * Here we use the standard equity fund Teilfreistellung of 30% for simplicity
 * (adjust if needed for institutional/GmbH context).
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
 * Uses same Teilfreistellung/Abgeltungssteuer logic as ETF taxation.
 */
export function berechneEtfVerkaufssteuer(
  realisierterEtfErtrag: number,
  teilfreistellung: number = TEILFREISTELLUNG_AKTIEN
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

/**
 * Calculate yearly Betrieb results for each year of the operating phase.
 */
export function berechneBetriebsErgebnisse(state: BetriebState): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  let etfWert = state.startkapital;
  let etfEinstandswert = state.startkapital;
  let cashReserve = 0;
  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  // For endfällig loans, interest is deferred to end and NOT deducted annually.
  // For regular loans, interest is paid (and deductible) each year.
  let aufgelaufeneZinsen = 0;

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const etfWertVorjahrEnd = etfWert;
    const etfWertNachWachstum = berechneEtfWachstum(etfWert, state.etfRendite);
    const theoretischerEtfErtrag = Math.max(0, etfWertNachWachstum - etfWertVorjahrEnd);

    // Vorabpauschale tax
    const vorabpauschale = berechneVorabpauschale(etfWert, etfWertNachWachstum);
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
    const jaehrlicheZinsen = state.darlehen.endfaellig ? 0 : darlehenszinsJaehrlich;

    // Accumulate deferred interest for endfällig loans (informational).
    if (state.darlehen.endfaellig) {
      aufgelaufeneZinsen += darlehenszinsJaehrlich;
    }

    // Realized ETF gain only comes from actually sold ETF units.
    const etfBasisQuote = etfWertNachWachstum > 0
      ? Math.min(1, Math.max(0, etfEinstandswert / etfWertNachWachstum))
      : 0;
    const fixeAuszahlungen = betriebsausgabenGesamt + jaehrlicheZinsen + vorabpauschalesteuer;

    // Solve sale amount iteratively because taxes depend on realized sale gain.
    let etfVerkauf = Math.min(etfWertNachWachstum, fixeAuszahlungen);
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const einstandswertVerkauftIter = etfVerkauf * etfBasisQuote;
      const realisierterEtfErtragIter = Math.max(0, etfVerkauf - einstandswertVerkauftIter);
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

    const einstandswertVerkauft = etfVerkauf * etfBasisQuote;
    const realisierterEtfErtrag = Math.max(0, etfVerkauf - einstandswertVerkauft);
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
      etfVerkauf - betriebsausgabenGesamt - jaehrlicheZinsen - vorabpauschalesteuer - gmbhSteuer - etfVerkaufssteuer;

    // Positive retained result is held as cash reserve (Aktiva).
    const cashReserveZugang = Math.max(0, nettogewinn);
    cashReserve += cashReserveZugang;

    // Update ETF value: after growth, deduct all cash outflows funded by ETF sales.
    etfWert = Math.max(0, etfWertNachWachstum - etfVerkauf);
    etfEinstandswert = Math.max(0, etfEinstandswert - einstandswertVerkauft);

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
        etfGewinn: realisierterEtfErtrag,
        etfEinstandswertVerkauft: einstandswertVerkauft,
        theoretischerEtfErtrag,
        etfVerkauf,
        jaehrlicheKosten,
        handyNettoKosten,
        benefitsKosten,
        betriebsausgabenGesamt,
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
