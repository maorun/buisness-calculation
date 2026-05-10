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
 * - Handy (phone): up to 50 €/month tax-free as Sachbezug
 * - Tankgutschein (fuel voucher): up to 50 €/month tax-free as Sachbezug
 * - Strategieessen (annual strategy dinner): fully deductible business expense
 *
 * Returns the annual tax saving (at GmbH tax rate) from deductible benefits.
 */
export function berechneBenefitsSteuerersparnis(
  benefits: BenefitConfig,
  steuerRate: number = GMBH_STEUER_GESAMT
): number {
  const handyJahr = Math.min(benefits.handy, 50) * 12;
  const tankJahr = Math.min(benefits.tankgutschein, 50) * 12;
  const strategieessen = benefits.strategieessen;
  const totalAbzug = handyJahr + tankJahr + strategieessen;
  return totalAbzug * steuerRate;
}

/**
 * Calculate yearly Betrieb results for each year of the operating phase.
 */
export function berechneBetriebsErgebnisse(state: BetriebState): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  let etfWert = state.startkapital;
  const jaehrlicheKosten = berechneBetriebskosten(state.kosten);
  const jaehrlicheZinsen = berechneDarlehenszinsen(state.darlehen);
  const benefitSteuerersparnis = berechneBenefitsSteuerersparnis(state.benefits);

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const etfWertVorjahrEnd = etfWert;
    const etfWertNachWachstum = berechneEtfWachstum(etfWert, state.etfRendite);

    // Vorabpauschale tax
    const vorabpauschale = berechneVorabpauschale(etfWert, etfWertNachWachstum);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(vorabpauschale);

    // GmbH profit = ETF gains − operating costs − loan interest + benefit deduction
    // Simplified: taxable profit at GmbH level
    const etfGewinn = etfWertNachWachstum - etfWertVorjahrEnd;
    const gewinnVorSteuer = etfGewinn - jaehrlicheKosten - jaehrlicheZinsen;

    // GmbH taxes on positive profit
    const gmbhSteuer = gewinnVorSteuer > 0
      ? gewinnVorSteuer * GMBH_STEUER_GESAMT
      : 0;

    // Additional tax on Vorabpauschale (withheld at ETF level)
    const gesamtSteuer = gmbhSteuer + vorabpauschalesteuer;

    // Net gain after all taxes
    const nettogewinn = gewinnVorSteuer - gmbhSteuer - vorabpauschalesteuer + benefitSteuerersparnis;

    // Update ETF value (Vorabpauschale tax reduces cash, not ETF directly)
    etfWert = etfWertNachWachstum;

    // Total wealth = ETF value − outstanding loan
    // For endfaellig loans, the full principal is always outstanding (repaid at end).
    // For regular loans we model interest-only here (principal tracked separately).
    const offenesDarlehen = state.darlehen.betrag;
    const gesamtvermoegen = etfWert - offenesDarlehen;

    ergebnisse.push({
      jahr,
      gesamtvermoegen,
      gewinn: gewinnVorSteuer,
      steuer: gesamtSteuer,
      nettogewinn,
      details: {
        etfWert,
        etfGewinn,
        vorabpauschale,
        vorabpauschalesteuer,
        jaehrlicheKosten,
        jaehrlicheZinsen,
        gmbhSteuer,
        benefitSteuerersparnis,
        offenesDarlehen,
      },
    });
  }

  return ergebnisse;
}
