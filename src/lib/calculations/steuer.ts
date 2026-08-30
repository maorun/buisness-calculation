import { Steuerjahr, getSteuerjahrParameter } from "../parameters";
import { StillerGesellschafterConfig } from "../types";

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

// Configurable GmbH tax rate defaults (in percent, e.g. 15 means 15%)
export const DEFAULT_KOERPERSCHAFTSTEUER_SATZ = 15;
export const DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ = 5.5;
export const DEFAULT_GEWERBESTEUER_SATZ = 14;

/** Gewerbesteuer Freibetrag for Personengesellschaften / Mitunternehmerschaften (§ 11 Abs. 1 Satz 3 Nr. 1 GewStG). */
export const GEWERBESTEUER_FREIBETRAG = 24500;

export const DEFAULT_KAPITALERTRAGSTEUER_SATZ = 26.375;
export const DEFAULT_SPARERPAUSCHBETRAG = 1000;
export const SOLI_MILDERUNG_FAKTOR = 0.119;

/** Default configuration for the silent partner (stiller Gesellschafter). */
export const DEFAULT_STILLER_GESELLSCHAFTER_CONFIG: StillerGesellschafterConfig = {
  aktiv: false,
  typ: 'typisch',
  einlage: 25000,
  gewinnbeteiligungProzent: 20,
  zinssatz: 4,
};

/**
 * Calculates loss carryforward utilization and remaining loss carryforward balance
 * according to German tax law (§ 10d EStG / § 8 Abs. 1 KStG).
 *
 * Minimum taxation rule (Mindestbesteuerung):
 * - Up to 1,000,000 €: offset 100% of profit.
 * - Exceeding 1,000,000 €: offset up to 60% of the profit exceeding 1,000,000 €.
 */
export function berechneVerlustvortragAnrechnung(
  gewinnVorVerlustvortrag: number,
  aktuellerVerlustvortrag: number
): {
  versteuerterGewinn: number;
  verlustVortragGenutzt: number;
  neuerVerlustvortrag: number;
} {
  if (gewinnVorVerlustvortrag <= 0) {
    return {
      versteuerterGewinn: 0,
      verlustVortragGenutzt: 0,
      neuerVerlustvortrag: aktuellerVerlustvortrag + Math.abs(gewinnVorVerlustvortrag),
    };
  }

  if (aktuellerVerlustvortrag <= 0) {
    return {
      versteuerterGewinn: gewinnVorVerlustvortrag,
      verlustVortragGenutzt: 0,
      neuerVerlustvortrag: 0,
    };
  }

  const maxAnrechenbar = gewinnVorVerlustvortrag <= 1_000_000
    ? Math.min(aktuellerVerlustvortrag, gewinnVorVerlustvortrag)
    : Math.min(aktuellerVerlustvortrag, 1_000_000 + 0.6 * (gewinnVorVerlustvortrag - 1_000_000));

  const versteuerterGewinn = Math.max(0, gewinnVorVerlustvortrag - maxAnrechenbar);
  const neuerVerlustvortrag = Math.max(0, aktuellerVerlustvortrag - maxAnrechenbar);

  return {
    versteuerterGewinn,
    verlustVortragGenutzt: maxAnrechenbar,
    neuerVerlustvortrag,
  };
}

/** Derive the effective GmbH total tax rate from configurable inputs (all in %). */
export function berechneGmbhSteuerRaten(
  koerperschaftsteuerSatz: number,
  solidaritaetszuschlagSatz: number,
  gewerbesteuerSatz: number
): { kstGesamt: number; gewerbesteuer: number; gmbhSteuerGesamt: number } {
  const kst = Math.max(0, koerperschaftsteuerSatz) / 100;
  const soli = Math.max(0, solidaritaetszuschlagSatz) / 100;
  const gst = Math.max(0, gewerbesteuerSatz) / 100;
  const kstGesamt = kst * (1 + soli);
  return { kstGesamt, gewerbesteuer: gst, gmbhSteuerGesamt: kstGesamt + gst };
}

/**
 * Progressive German income tax brackets according to selected Steuerjahr.
 */
export function berechneEinkommensteuer(zvE: number, steuerjahr?: Steuerjahr): number {
  const params = getSteuerjahrParameter(steuerjahr);
  if (zvE <= params.grundfreibetrag) return 0;

  if (zvE <= params.zone1Max) {
    const y = (zvE - params.grundfreibetrag) / 10000;
    return Math.floor((params.zone1A * y + params.zone1B) * y);
  }

  if (zvE <= params.zone2Max) {
    const z = (zvE - params.zone1Max) / 10000;
    return Math.floor((params.zone2A * z + params.zone2B) * z + params.zone2C);
  }

  if (zvE <= params.spitzensteuerStart) {
    return Math.floor(0.42 * zvE - params.offset42);
  }

  return Math.floor(0.45 * zvE - params.offset45);
}

export const berechneEinkommensteuerBetrieb = berechneEinkommensteuer;

/**
 * Solidaritätszuschlag on income tax according to selected Steuerjahr.
 */
export function berechneSoli(einkommensteuer: number, steuerjahr?: Steuerjahr): number {
  const params = getSteuerjahrParameter(steuerjahr);
  if (einkommensteuer <= params.soliFreigrenzeEinkommensteuer) return 0;
  const volleSoli = einkommensteuer * SOLI;
  const milderungsSoli = (einkommensteuer - params.soliFreigrenzeEinkommensteuer) * params.soliMilderungFaktor;
  return Math.floor(Math.min(volleSoli, milderungsSoli));
}

export const berechneSoliBetrieb = berechneSoli;

/**
 * Gesetzlicher Kranken- und Pflegeversicherungsbeitrag (GKV + PV) für freiwillig
 * gesetzlich versicherte Personen (vereinfachte Näherung mit Beitragsbemessungsgrenze).
 * Enthält Krankenversicherung (14,6% + Zusatzbeitrag) sowie Pflegeversicherung (~4,0%).
 * Wird aus dem bereits versteuerten Netto getragen.
 */
export function berechneGesetzlicheKrankenversicherungBeitrag(
  jahresEinnahmen: number,
  beitragssatz?: number,
  beitragsbemessungJahrMax?: number,
  steuerjahr?: Steuerjahr,
  anzahlKinder?: number
): number {
  const params = getSteuerjahrParameter(steuerjahr, anzahlKinder);
  const bss = beitragssatz ?? params.gkvBeitragssatz;
  const maxBbm = beitragsbemessungJahrMax ?? params.gkvBemessungJahrMax;
  const einnahmen = Math.max(0, jahresEinnahmen);
  const beitragspflichtigeEinnahmen = Math.min(einnahmen, maxBbm);
  return beitragspflichtigeEinnahmen * Math.max(0, bss);
}

/**
 * Net salary after income tax and Soli.
 */
export function berechneNettoGehalt(bruttoGehalt: number, steuerjahr?: Steuerjahr): number {
  const est = berechneEinkommensteuer(bruttoGehalt, steuerjahr);
  const soli = berechneSoli(est, steuerjahr);
  return bruttoGehalt - est - soli;
}

export const berechneNettoGehaltBetrieb = berechneNettoGehalt;

/**
 * Annual costs the GmbH pays to the silent partner:
 * - Minimum interest on the Einlage (always, regardless of profit)
 * - Profit share on the simulated operating profit
 *
 * Both are deductible as Betriebsausgaben for both typisch and atypisch.
 */
export function berechneStillenGesellschafterKosten(
  config: StillerGesellschafterConfig | undefined,
  simulierterGewinn: number
): number {
  if (!config?.aktiv) return 0;
  const zinsen = Math.max(0, config.einlage) * (config.zinssatz / 100);
  const gewinnbeteiligung = Math.max(0, simulierterGewinn) * (config.gewinnbeteiligungProzent / 100);
  return zinsen + gewinnbeteiligung;
}

/**
 * Calculates income tax for the silent partner on their received interest and profit share.
 * - 'typisch': Income from capital assets (§ 20 EStG) taxed at capital gains tax rate (Abgeltungssteuer), Sparerpauschbetrag applies.
 * - 'atypisch': Income from trade or business (§ 15 EStG - Mitunternehmerschaft) taxed at personal income tax / marginal rate, NO Sparerpauschbetrag.
 */
export function berechneStillerGesellschafterSteuer(
  bruttoEinkommen: number,
  config: StillerGesellschafterConfig | undefined,
  persoenlicherGrenzsteuersatz?: number,
  kapitalertragsteuerSatz?: number,
  sparerpauschbetrag: number = 0,
  steuerjahr?: Steuerjahr
): { steuer: number; einkommensteuer: number; soli: number } {
  if (!config?.aktiv || bruttoEinkommen <= 0) {
    return { steuer: 0, einkommensteuer: 0, soli: 0 };
  }

  if (config.typ === 'atypisch') {
    // Atypisch stiller Gesellschafter: gewerbliche Einkünfte (§ 15 EStG - Mitunternehmerschaft).
    // Taxed with personal income tax / marginal tax rate (+ Soli), NO Sparerpauschbetrag.
    const grenztarif = Math.max(0, Math.min(100, persoenlicherGrenzsteuersatz ?? 0));
    if (grenztarif > 0) {
      const einkommensteuer = bruttoEinkommen * (grenztarif / 100);
      const soli = einkommensteuer * SOLI;
      return { steuer: einkommensteuer + soli, einkommensteuer, soli };
    }
    const einkommensteuer = berechneEinkommensteuerBetrieb(bruttoEinkommen, steuerjahr);
    const soli = berechneSoliBetrieb(einkommensteuer, steuerjahr);
    return { steuer: einkommensteuer + soli, einkommensteuer, soli };
  } else {
    // Typisch stiller Gesellschafter: Einkünfte aus Kapitalvermögen (§ 20 EStG).
    // Taxed at Abgeltungssteuer rate, Sparerpauschbetrag applies.
    const kestRate = Math.max(0, Math.min(100, kapitalertragsteuerSatz ?? DEFAULT_KAPITALERTRAGSTEUER_SATZ)) / 100;
    const steuerpflichtig = Math.max(0, bruttoEinkommen - Math.max(0, sparerpauschbetrag));
    const steuer = steuerpflichtig * kestRate;
    const einkommensteuer = steuer / (1 + SOLI);
    const soli = steuer - einkommensteuer;
    return { steuer, einkommensteuer, soli };
  }
}

export function berechneSimulierterGewinnSteuerPrivat(
  simulierterGewinn: number,
  persoenlicherGrenzsteuersatz?: number,
  steuerjahr?: Steuerjahr
): { einkommensteuer: number; soli: number } {
  const gewinn = Math.max(0, simulierterGewinn);
  const grenztarif = Math.max(0, Math.min(100, persoenlicherGrenzsteuersatz ?? 0));
  if (grenztarif > 0) {
    const einkommensteuer = gewinn * (grenztarif / 100);
    const soli = einkommensteuer * SOLI;
    return { einkommensteuer, soli };
  }

  const einkommensteuer = berechneEinkommensteuerBetrieb(gewinn, steuerjahr);
  const soli = berechneSoliBetrieb(einkommensteuer, steuerjahr);
  return { einkommensteuer, soli };
}
