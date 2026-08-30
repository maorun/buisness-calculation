import { BenefitConfig, DienstwagenConfig, FirmenhandyConfig } from "../types";
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

export const ELEKTRO_AUTO_BLP_SCHWELLE = 70000;

export const DEFAULT_DIENSTWAGEN_CONFIG: DienstwagenConfig = {
  aktiv: false,
  bruttolistenpreis: 50000,
  methode: "pauschal",
  antriebsart: "benzin_diesel",
  jaehrlicheGesamtkosten: 6000,
  anteilPrivatProzent: 30,
  entfernungWohnungArbeitsstaetteKm: 0,
};

export interface DienstwagenPruefung {
  moeglich: boolean;
  hinweisTyp: "ok" | "warnung" | "kritisch";
  nachricht: string;
  betrieblicheNutzungProzent: number;
  einprozentRegelungErlaubt: boolean;
}

/**
 * Checks if the company car arrangement is tax-compliant under German tax law.
 *
 * Rules:
 * - Business use < 10% (private use > 90%): Car cannot be business property (§ 6 Abs. 1 Nr. 4 EStG).
 *   High risk of verdeckte Gewinnausschüttung (vGA). 1%-Regelung is NOT allowed.
 * - Business use 10% - 50%: Gewillkürtes Betriebsvermögen. 1%-Regelung NOT allowed (requires > 50% business use).
 *   Fahrtenbuch or cost allocation is mandatory.
 * - Business use > 50%: 1%-Regelung and Fahrtenbuch both permitted.
 */
export function pruefeDienstwagenMoeglichkeit(config?: DienstwagenConfig): DienstwagenPruefung {
  const dw = config ?? DEFAULT_DIENSTWAGEN_CONFIG;
  const privat = Math.min(100, Math.max(0, dw.anteilPrivatProzent));
  const betrieblich = 100 - privat;

  if (betrieblich < 10) {
    return {
      moeglich: false,
      hinweisTyp: "kritisch",
      nachricht: "Bei unter 10 % betrieblicher Nutzung ist eine steuerliche Zuordnung zum Betriebsvermögen unzulässig (Risiko verdeckte Gewinnausschüttung / vGA).",
      betrieblicheNutzungProzent: betrieblich,
      einprozentRegelungErlaubt: false,
    };
  }

  if (betrieblich <= 50) {
    const einprozentDisallowed = dw.methode === "pauschal";
    return {
      moeglich: true,
      hinweisTyp: "warnung",
      nachricht: einprozentDisallowed
        ? "Bei 10 % bis 50 % betrieblicher Nutzung ist die 1 %-Regelung steuerlich NICHT zulässig. Es muss ein Fahrtenbuch geführt werden."
        : "Bei 10 % bis 50 % betrieblicher Nutzung ist Fahrtenbuch erforderlich (gewillkürtes Betriebsvermögen).",
      betrieblicheNutzungProzent: betrieblich,
      einprozentRegelungErlaubt: false,
    };
  }

  return {
    moeglich: true,
    hinweisTyp: "ok",
    nachricht: "Dienstwagen ist steuerlich anerkannt (betriebliche Nutzung > 50 %).",
    betrieblicheNutzungProzent: betrieblich,
    einprozentRegelungErlaubt: true,
  };
}

/**
 * Calculates the monetary advantage (geldwerter Vorteil) of a company car for the shareholder/employee per year.
 *
 * 1%-Regelung (pauschal):
 * - BLP rounded down to full 100 €
 * - Monthly rate factor:
 *   - Benzin/Diesel: 1.0% per month (12% p.a.)
 *   - Hybrid: 0.5% per month (6% p.a.)
 *   - Elektro: 0.25% per month (3% p.a.) if BLP <= 70.000 €, else 0.5% per month (6% p.a.)
 * - Commute (Wohnung - Arbeitsstätte): 0.03% * (reduced BLP basis) * km * 12 months
 * - Capped at actual annual vehicle costs (Kostendeckelung).
 *
 * Fahrtenbuch:
 * - Actual annual costs * private use %
 */
export function berechneDienstwagenGeldwerterVorteil(config?: DienstwagenConfig): number {
  if (!config || !config.aktiv) return 0;

  const gesamtkosten = Math.max(0, config.jaehrlicheGesamtkosten);

  if (config.methode === "fahrtenbuch") {
    const privatQuote = Math.min(1, Math.max(0, config.anteilPrivatProzent / 100));
    return gesamtkosten * privatQuote;
  }

  // 1%-Regelung (pauschal)
  const blpAbgerundet = Math.floor(Math.max(0, config.bruttolistenpreis) / 100) * 100;
  let bemessungsfaktor = 1.0;
  if (config.antriebsart === "hybrid") {
    bemessungsfaktor = 0.5;
  } else if (config.antriebsart === "elektro") {
    bemessungsfaktor = blpAbgerundet <= ELEKTRO_AUTO_BLP_SCHWELLE ? 0.25 : 0.5;
  }

  const monatlicherWert = blpAbgerundet * 0.01 * bemessungsfaktor;
  const jaehrlicherPrivatwert = monatlicherWert * MONATE_PRO_JAHR;

  const km = Math.max(0, config.entfernungWohnungArbeitsstaetteKm);
  const monatlicherAnfahrtswert = blpAbgerundet * 0.0003 * bemessungsfaktor * km;
  const jaehrlicherAnfahrtswert = monatlicherAnfahrtswert * MONATE_PRO_JAHR;

  const ungecapterVorteil = jaehrlicherPrivatwert + jaehrlicherAnfahrtswert;

  // Kostendeckelung: geldwerter Vorteil cannot exceed actual vehicle expenses
  return Math.min(ungecapterVorteil, gesamtkosten);
}

/**
 * Annual company car costs borne by the GmbH (deductible operating expense).
 */
export function berechneDienstwagenGmbhKosten(benefits: BenefitConfig): number {
  const dw = benefits.dienstwagen;
  if (!dw || !dw.aktiv) return 0;
  return Math.max(0, dw.jaehrlicheGesamtkosten);
}

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
  const dienstwagenKosten = berechneDienstwagenGmbhKosten(benefits);
  return tankJahr + essenszuschussJahr + strategieessen + dienstwagenKosten;
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
  const dienstwagenPrivatNutzen = benefits.dienstwagen?.aktiv
    ? (benefits.dienstwagen.methode === "fahrtenbuch"
        ? benefits.dienstwagen.jaehrlicheGesamtkosten * (Math.min(100, Math.max(0, benefits.dienstwagen.anteilPrivatProzent)) / 100)
        : berechneDienstwagenGeldwerterVorteil(benefits.dienstwagen))
    : 0;

  return berechneTankgutscheinJaehrlich(benefits)
    + berechneEssenszuschussJaehrlich(benefits)
    + berechneHandyNettoKostenProJahr(jahr, handyConfig)
    + dienstwagenPrivatNutzen;
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
