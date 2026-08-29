import { BenefitConfig, FirmenhandyConfig } from "../types";
import { GMBH_STEUER_GESAMT } from "./steuer";

export const DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB = 36000;
export const DEFAULT_GF_GEHALT_BETRIEB = 17000;

export const HANDY_ANSCHAFFUNGSKOSTEN = 1000;
export const HANDY_VERKAUFSQUOTE = 0.1;
export const HANDY_ERSATZZYKLUS_JAHRE = 3;
export const MAX_TANKGUTSCHEIN_MONATLICH = 50;

// Current tax-free reference value for the meal subsidy under German tax guidance.
// The UI uses it as the default starting value, but it is intentionally not
// enforced as a hard cap so the calculator can adapt when that threshold changes.
export const DEFAULT_ESSENSZUSCHUSS_PRO_TAG = 7.67;
export const MAX_ESSENSZUSCHUSS_TAGE_PRO_JAHR = 366;
export const MONATE_PRO_JAHR = 12;
export const UMSATZSTEUER_SATZ = 0.19;

/** Default configuration for the company mobile-phone programme. */
export const DEFAULT_FIRMENHANDY_CONFIG: FirmenhandyConfig = {
  aktiv: true,
  anschaffungskosten: HANDY_ANSCHAFFUNGSKOSTEN,
  restwertQuote: HANDY_VERKAUFSQUOTE,
  ersatzzyklusJahre: HANDY_ERSATZZYKLUS_JAHRE,
  erstanschaffungJahr: 1,
};

/**
 * Tax saving from benefits in a GmbH:
 * - Tankgutschein (fuel voucher): up to 50 €/month tax-free as Sachbezug
 * - Essenszuschuss: employer meal subsidy (defaults to 7.67 €/day in the UI)
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
  const tankJahr = berechneTankgutscheinJaehrlich(benefits);
  const essenszuschussJahr = berechneEssenszuschussJaehrlich(benefits);
  const strategieessen = (benefits.strategieessenAktiv ?? true) ? Math.max(0, benefits.strategieessen) : 0;
  return tankJahr + essenszuschussJahr + strategieessen;
}

export function berechneTankgutscheinJaehrlich(benefits: BenefitConfig): number {
  if (!(benefits.tankgutscheinAktiv ?? true)) return 0;
  const clampedTankMonthly = Math.min(Math.max(benefits.tankgutschein, 0), MAX_TANKGUTSCHEIN_MONATLICH);
  return clampedTankMonthly * MONATE_PRO_JAHR;
}

export function berechneEssenszuschussJaehrlich(benefits: BenefitConfig): number {
  if (!(benefits.essenszuschussAktiv ?? true)) return 0;
  const proTag = Math.max(benefits.essenszuschussProTag ?? 0, 0);
  const tage = Math.min(
    Math.max(Math.floor(benefits.essenszuschussTageProJahr ?? 0), 0),
    MAX_ESSENSZUSCHUSS_TAGE_PRO_JAHR
  );
  return proTag * tage;
}

export function berechneKonsumNutzenwertProJahr(
  jahr: number,
  benefits: BenefitConfig,
  handyConfig: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG
): number {
  return berechneTankgutscheinJaehrlich(benefits)
    + berechneEssenszuschussJaehrlich(benefits)
    + berechneHandyNettoKostenProJahr(jahr, handyConfig);
}

export function berechneGmbhKonsumwertProJahr(
  jahr: number,
  benefits: BenefitConfig,
  handyConfig: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG,
  steuerRate: number = GMBH_STEUER_GESAMT,
  umsatzsteuerSatz: number = UMSATZSTEUER_SATZ
): number {
  const tankgutscheinEffektiv = berechneTankgutscheinJaehrlich(benefits) * (1 - steuerRate);
  const essenszuschussEffektiv = berechneEssenszuschussJaehrlich(benefits) * (1 - steuerRate);
  const handyKostenNominal = berechneHandyNettoKostenProJahr(jahr, handyConfig);
  const handyKostenNachVorsteuer = handyKostenNominal / (1 + umsatzsteuerSatz);
  const handyEffektiv = handyKostenNachVorsteuer * (1 - steuerRate);
  return tankgutscheinEffektiv + essenszuschussEffektiv + handyEffektiv;
}

/**
 * Firmenhandy als Betriebsausgabe.
 *
 * In Germany, digital hardware (including smartphones) qualifies for immediate
 * full write-off (Sofortabschreibung) in the year of purchase per the BMF letter
 * of 26 Feb 2021 (BStBl I 2021, 298), so the full purchase price is deductible in
 * the acquisition year – no multi-year linear depreciation is required.
 *
 * When an old phone is sold before buying its replacement (from the second cycle
 * onward), the sale proceeds reduce the net cost.  The very first purchase has no
 * prior device to sell, so the full acquisition cost applies.
 *
 * @param jahr  1-based year within the current phase (Betrieb or Ende).
 * @param config  Configuration for the phone programme; defaults to DEFAULT_FIRMENHANDY_CONFIG.
 */
export function berechneHandyNettoKostenProJahr(
  jahr: number,
  config: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG
): number {
  const erstJahr = config.erstanschaffungJahr ?? 1;
  if (!config.aktiv || jahr < erstJahr) {
    return 0;
  }
  const jahreNachErstanschaffung = jahr - erstJahr;
  if (jahreNachErstanschaffung % config.ersatzzyklusJahre !== 0) {
    return 0;
  }
  // First acquisition: no old device to sell – full purchase price is the expense.
  if (jahreNachErstanschaffung === 0) {
    return config.anschaffungskosten;
  }
  // Replacement purchase: proceeds from selling the old phone offset the new cost.
  const verkaufserloes = config.anschaffungskosten * config.restwertQuote;
  return config.anschaffungskosten - verkaufserloes;
}
