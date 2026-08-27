import { BetriebState, BenefitConfig, DarlehenConfig, JahresErgebnis, KostenPosition, FirmenhandyConfig, StillerGesellschafterConfig, InvestitionsPosition, InvestitionsErgebnis } from "../types";

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

// Gewerbesteuer-Hinzurechnung § 8 Nr. 1 GewStG
export const GEWERBESTEUER_HINZURECHNUNG_FREIBETRAG = 200000;
export const GEWERBESTEUER_HINZURECHNUNG_SATZ = 0.25;

/**
 * Calculates trade tax add-back (Gewerbesteuer-Hinzurechnung) under § 8 Nr. 1 GewStG.
 * 25% of financing costs above a combined allowance (Freibetrag) of 200.000 € are added back to trade profit.
 */
export function berechneGewerbesteuerHinzurechnung(
  finanzierungskosten: number,
  freibetrag: number = GEWERBESTEUER_HINZURECHNUNG_FREIBETRAG
): number {
  if (finanzierungskosten <= freibetrag) return 0;
  return (finanzierungskosten - freibetrag) * GEWERBESTEUER_HINZURECHNUNG_SATZ;
}

// Configurable GmbH tax rate defaults (in percent, e.g. 15 means 15%)
export const DEFAULT_KOERPERSCHAFTSTEUER_SATZ = 15;
export const DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ = 5.5;
export const DEFAULT_GEWERBESTEUER_SATZ = 14;

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

export const HANDY_ANSCHAFFUNGSKOSTEN = 1000;
export const HANDY_VERKAUFSQUOTE = 0.1;
export const HANDY_ERSATZZYKLUS_JAHRE = 3;
export const MAX_TANKGUTSCHEIN_MONATLICH = 50;
// Current tax-free reference value for the meal subsidy under German tax guidance.
// The UI uses it as the default starting value, but it is intentionally not
// enforced as a hard cap so the calculator can adapt when that threshold changes.
export const DEFAULT_ESSENSZUSCHUSS_PRO_TAG = 7.67;
export const DEFAULT_KAPITALERTRAGSTEUER_SATZ = 26.375;
export const MAX_ESSENSZUSCHUSS_TAGE_PRO_JAHR = 366;
export const DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB = 36000;
export const DEFAULT_GF_GEHALT_BETRIEB = 17000;
export const MONATE_PRO_JAHR = 12;
export const UMSATZSTEUER_SATZ = 0.19;
// Einkommensteuer-Parameter 2024 (vereinfachte Näherung wie in Ende-Berechnung).
const GRUNDFREIBETRAG_2024 = 11604;
const EINKOMMENSTEUER_ZONE_1_MAX = 17005;
const EINKOMMENSTEUER_ZONE_2_MAX = 66760;
const EINKOMMENSTEUER_SPITZENSTEUER_START = 277825;
const EINKOMMENSTEUER_ZONE_1_A = 922.98;
const EINKOMMENSTEUER_ZONE_1_B = 1400;
const EINKOMMENSTEUER_ZONE_2_A = 181.19;
const EINKOMMENSTEUER_ZONE_2_B = 2397;
const EINKOMMENSTEUER_ZONE_2_C = 1025.38;
const EINKOMMENSTEUER_SATZ_42 = 0.42;
const EINKOMMENSTEUER_OFFSET_42 = 10602.13;
const EINKOMMENSTEUER_SATZ_45 = 0.45;
const EINKOMMENSTEUER_OFFSET_45 = 17374.99;
const SOLI_FREIGRENZE_EINKOMMENSTEUER_2024 = 16956;

/** Default configuration for the company mobile-phone programme. */
export const DEFAULT_FIRMENHANDY_CONFIG: FirmenhandyConfig = {
  aktiv: true,
  anschaffungskosten: HANDY_ANSCHAFFUNGSKOSTEN,
  restwertQuote: HANDY_VERKAUFSQUOTE,
  ersatzzyklusJahre: HANDY_ERSATZZYKLUS_JAHRE,
  erstanschaffungJahr: 1,
};
export const MAX_SALE_CONVERGENCE_ITERATIONS = 20;
export const SALE_CONVERGENCE_THRESHOLD = 0.01;
export const DARLEHEN_MONATE_PRO_JAHR = MONATE_PRO_JAHR;
export const MIN_ETF_LOT_WERT = 0.000001;
export const ETF_SORT_EPSILON = 0.0000000001;

/** Default configuration for the silent partner (stiller Gesellschafter). */
export const DEFAULT_STILLER_GESELLSCHAFTER_CONFIG: StillerGesellschafterConfig = {
  aktiv: false,
  typ: 'typisch',
  einlage: 25000,
  gewinnbeteiligungProzent: 20,
  zinssatz: 4,
};

/**
 * Annual costs the GmbH pays to the silent partner:
 * - Minimum interest on the Einlage (always, regardless of profit)
 * - Profit share on the simulated operating profit
 *
 * Both are fully deductible as Betriebsausgaben for both typisch and atypisch.
 *
 * Note: For the atypisch variant the profit share additionally creates a
 * Mitunternehmerschaft, which shifts part of the GmbH's taxable base to the
 * partner's income tax sphere.  The GmbH-side deduction is identical to the
 * typisch treatment within this model; the difference lies at the partner level
 * (income characterisation and loss-offset rules differ).
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

export function berechneEinkommensteuerBetrieb(zvE: number): number {
  if (zvE <= GRUNDFREIBETRAG_2024) return 0;

  if (zvE <= EINKOMMENSTEUER_ZONE_1_MAX) {
    const y = (zvE - GRUNDFREIBETRAG_2024) / 10000;
    return Math.floor((EINKOMMENSTEUER_ZONE_1_A * y + EINKOMMENSTEUER_ZONE_1_B) * y);
  }

  if (zvE <= EINKOMMENSTEUER_ZONE_2_MAX) {
    const z = (zvE - EINKOMMENSTEUER_ZONE_1_MAX) / 10000;
    return Math.floor((EINKOMMENSTEUER_ZONE_2_A * z + EINKOMMENSTEUER_ZONE_2_B) * z + EINKOMMENSTEUER_ZONE_2_C);
  }

  if (zvE <= EINKOMMENSTEUER_SPITZENSTEUER_START) {
    return Math.floor(EINKOMMENSTEUER_SATZ_42 * zvE - EINKOMMENSTEUER_OFFSET_42);
  }

  return Math.floor(EINKOMMENSTEUER_SATZ_45 * zvE - EINKOMMENSTEUER_OFFSET_45);
}

export function berechneSoliBetrieb(einkommensteuer: number): number {
  if (einkommensteuer <= SOLI_FREIGRENZE_EINKOMMENSTEUER_2024) return 0;
  return Math.floor(einkommensteuer * SOLI);
}

export function berechneNettoGehaltBetrieb(bruttoGehalt: number): number {
  // Vereinfachung analog zur Ende-Phase: ohne Sozialversicherungsabzüge.
  const est = berechneEinkommensteuerBetrieb(bruttoGehalt);
  const soli = berechneSoliBetrieb(est);
  return bruttoGehalt - est - soli;
}

export function berechneDarlehensZinsenSteuerBetrieb(
  zinsen: number,
  bruttoGehalt: number
): number {
  if (zinsen <= 0) return 0;
  const gehaltNorm = Math.max(0, bruttoGehalt);
  const estNurGehalt = berechneEinkommensteuerBetrieb(gehaltNorm);
  const soliNurGehalt = berechneSoliBetrieb(estNurGehalt);
  const estKombiniert = berechneEinkommensteuerBetrieb(gehaltNorm + zinsen);
  const soliKombiniert = berechneSoliBetrieb(estKombiniert);
  return (estKombiniert + soliKombiniert) - (estNurGehalt + soliNurGehalt);
}

function berechneSimulierterGewinnSteuerPrivat(
  simulierterGewinn: number,
  persoenlicherGrenzsteuersatz?: number
): { einkommensteuer: number; soli: number } {
  const gewinn = Math.max(0, simulierterGewinn);
  const grenztarif = Math.max(0, Math.min(100, persoenlicherGrenzsteuersatz ?? 0));
  if (grenztarif > 0) {
    const einkommensteuer = gewinn * (grenztarif / 100);
    const soli = einkommensteuer * SOLI;
    return { einkommensteuer, soli };
  }

  const einkommensteuer = berechneEinkommensteuerBetrieb(gewinn);
  const soli = berechneSoliBetrieb(einkommensteuer);
  return { einkommensteuer, soli };
}

type EtfLotTyp = "startkapital" | "darlehen" | "zuzahlung" | "stillerGesellschafter";

interface EtfLot {
  typ: EtfLotTyp;
  wert: number;
  einstandswert: number;
}

export interface PrivatVergleichErgebnis {
  anfangskapitalPrivat: number;
  kumulierterEtfVerkauf: number;
  verbleibenderEtfWert: number;
  endwert: number;
  investitionsNettovermoegen: number;
  kumulierterKonsumwert: number;
  gesamtwertMitKonsum: number;
  kumulierteSteuern: number;
  kumulierteVorabpauschalesteuer: number;
  kumulierteEtfVerkaufssteuer: number;
  kumulierteEntnahmen: number;
  kumulierterSparplan: number;
}

export interface PrivatVergleichJahreswert {
  jahr: number;
  jaehrlicherCashZuschuss: number;
  darlehensZuschussJaehrlich: number;
  simulierterGewinnNetto: number;
  konsumNutzenwert: number;
  sparplanNetto: number;
  gehaltsEntnahme: number;
  zinsEntnahme: number;
  entnahmeAusSparplanDefizit: number;
  stillerGesellschafterEntnahme: number;
  entnahmenVorSteuern: number;
  etfVerkauf: number;
  vorabpauschalesteuer: number;
  etfVerkaufssteuer: number;
  gesamtSteuer: number;
  kumulierterEtfVerkauf: number;
  verbleibenderEtfWert: number;
  endwert: number;
  investitionsNettovermoegen: number;
  kumulierterKonsumwert: number;
  gesamtwertMitKonsum: number;
}

export interface InvestitionsZusammenfassungJahreswert {
  jahr: number;
  kapitalGesamt: number;
  kreditRestschuld: number;
  nettovermoegen: number;
  nettoCashflow: number;
  kumulierterNettoCashflow: number;
}

export interface InvestitionsZusammenfassung {
  kapitalGesamt: number;
  kreditRestschuld: number;
  nettovermoegen: number;
  kumulierterNettoCashflow: number;
  jahreswerte: InvestitionsZusammenfassungJahreswert[];
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
  steuersatz: number = ABGELTUNGSSTEUER_GESAMT
): number {
  const steuerpflichtig = vorabpauschale * (1 - teilfreistellung);
  return steuerpflichtig * steuersatz;
}

/**
 * Tax on realized ETF gains when selling units.
 * In this GmbH simulation, ETF sales default to the Körperschafts-Teilfreistellung (80%).
 */
export function berechneEtfVerkaufssteuer(
  realisierterEtfErtrag: number,
  teilfreistellung: number = TEILFREISTELLUNG_AKTIEN_GMBH,
  steuersatz: number = GMBH_STEUER_GESAMT
): number {
  if (realisierterEtfErtrag <= 0) {
    return 0;
  }
  const steuerpflichtig = realisierterEtfErtrag * (1 - teilfreistellung);
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
    return sum + berechneKostenPositionJahresBetrag(k);
  }, 0);
}

function berechneKostenPositionJahresBetrag(kostenPosition: KostenPosition): number {
  return kostenPosition.periode === 'monatlich' ? kostenPosition.betrag * 12 : kostenPosition.betrag;
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

export function berechneBetriebskostenPosten(
  kosten: KostenPosition[],
  benefits: BenefitConfig,
  handyNettoKosten: number,
  handyConfig: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG,
  geschaeftsfuehrergehalt: number = 0,
  stillerGesellschafterKosten: number = 0
): { label: string; wert: number }[] {
  const kostenPosten = kosten.map((kostenPosition) => ({
    label: kostenPosition.bezeichnung,
    wert: berechneKostenPositionJahresBetrag(kostenPosition),
  }));

  const tankgutscheinJaehrlich = berechneTankgutscheinJaehrlich(benefits);
  const essenszuschussJaehrlich = berechneEssenszuschussJaehrlich(benefits);
  const benefitsPosten = [
    { label: "Tankgutschein", wert: tankgutscheinJaehrlich },
    { label: "Essenszuschuss", wert: essenszuschussJaehrlich },
    { label: "Strategieessen", wert: (benefits.strategieessenAktiv ?? true) ? Math.max(0, benefits.strategieessen) : 0 },
    { label: `Firmenhandy (alle ${handyConfig.ersatzzyklusJahre} Jahre)`, wert: handyNettoKosten },
    { label: "GF-Gehalt", wert: Math.max(0, geschaeftsfuehrergehalt) },
    ...(stillerGesellschafterKosten > 0
      ? [{ label: "Stiller Gesellschafter (Zinsen + Gewinnbeteiligung)", wert: stillerGesellschafterKosten }]
      : []),
  ];

  return [...kostenPosten, ...benefitsPosten];
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

function simulierePrivatVergleich(
  state: BetriebState,
  entnahmenOverride?: (number | undefined)[],
  offeneDarlehenOverride?: (number | undefined)[],
  gehaltsEntnahmeOverride?: (number | undefined)[]
): {
  ergebnis: PrivatVergleichErgebnis;
  jahreswerte: PrivatVergleichJahreswert[];
} {
  let etfLots: EtfLot[] = [];
  const stillerGesellschafterEinlage = state.stillerGesellschafter?.aktiv
    ? Math.max(0, state.stillerGesellschafter.einlage)
    : 0;
  const kapitalertragsteuerRate =
    Math.max(0, Math.min(100, state.kapitalertragsteuerSatz ?? DEFAULT_KAPITALERTRAGSTEUER_SATZ)) / 100;
  const anfangskapitalPrivat = Math.max(0, state.startkapital) + Math.max(0, state.darlehen.betrag) + stillerGesellschafterEinlage;
  etfLots = fuegeEtfLotHinzu(etfLots, "startkapital", anfangskapitalPrivat);

  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  let kumulierterEtfVerkauf = 0;
  let kumulierteVorabpauschalesteuer = 0;
  let kumulierteEtfVerkaufssteuer = 0;
  let kumulierteEntnahmen = 0;
  let kumulierterSparplan = 0;
  let kumulierterKonsumwert = 0;
  const investitionsZusammenfassung = berechneInvestitionsZusammenfassung(state.investitionen, state.laufzeitJahre);
  const jahreswerte: PrivatVergleichJahreswert[] = [];

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const investitionsJahreswert = investitionsZusammenfassung.jahreswerte[jahr - 1];
    const etfWertVorjahrEnde = sumEtfWert(etfLots);
    const etfLotsNachWachstum = wachseEtfLots(etfLots, state.etfRendite);
    const etfWertNachWachstum = sumEtfWert(etfLotsNachWachstum);
    const vorabpauschaleBrutto = berechneVorabpauschale(etfWertVorjahrEnde, etfWertNachWachstum);

    const { zinsenJaehrlich, darlehenBetragEnde } = berechneDarlehensjahr(
      offenesDarlehen,
      state.darlehen.zinssatz,
      state.darlehen.monatlicherZuschuss
    );
    offenesDarlehen = darlehenBetragEnde;

    const jaehrlicherCashZuschuss = Math.max(0, state.jaehrlicherCashZuschuss ?? 0);
    const simulierterGewinn = Math.max(0, state.simulierterGewinn ?? 0);
    const { einkommensteuer: simulierterGewinnSteuer, soli: simulierterGewinnSoli } =
      berechneSimulierterGewinnSteuerPrivat(simulierterGewinn, state.persoenlicherGrenzsteuersatz);
    const simulierterGewinnNetto = simulierterGewinn - simulierterGewinnSteuer - simulierterGewinnSoli;
    const darlehensZuschussJaehrlich = Math.max(0, state.darlehen.monatlicherZuschuss) * DARLEHEN_MONATE_PRO_JAHR;

    // Allow the caller to override the annual withdrawal amount for specific years (e.g. Ende phase).
    // When an override is present, we skip the normal salary/interest/sparplan components and use
    // the override value directly as entnahmenVorSteuern.
    const jahresOverride = entnahmenOverride ? entnahmenOverride[jahr - 1] : undefined;
    const gehaltsOverrideJahr = gehaltsEntnahmeOverride ? gehaltsEntnahmeOverride[jahr - 1] : undefined;

    // Ende-phase years are identified by a gehaltsEntnahmeOverride being set for the year.
    // In these years the private comparison should NOT reinvest the simulated business income
    // (the GmbH is paying out from its ETF, not from ongoing operations), but the benefit
    // consumption value is still relevant: the GmbH continues to provide benefits tax-free while
    // the private person pays for the same goods out of pocket.  Setting sparplanNetto to the
    // negative benefit cost (instead of income − cost) ensures:
    //   • The ETF is sold to cover the benefit expenditure (private person pays for benefits).
    //   • kumulierterKonsumwert is still credited, keeping the comparison fair (neutral net effect).
    //   • No spurious business-income reinvestment inflates the private ETF during the Ende phase.
    const isEndeJahr = gehaltsOverrideJahr !== undefined;
    // Benefits are relevant unless a full explicit withdrawal override (jahresOverride) is active,
    // in which case the withdrawal already encodes the net GmbH payout and crediting benefits
    // separately would inflate the private total without a matching cost deduction.
    // For Ende years (identified by isEndeJahr / gehaltsEntnahmeOverride) benefits still apply:
    // the GmbH keeps paying them tax-free while the private person buys the same goods out of pocket.
    const konsumNutzenwert = jahresOverride === undefined
      ? berechneKonsumNutzenwertProJahr(jahr, state.benefits, state.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG)
      : 0;
    const investitionsNettoCashflow = investitionsJahreswert?.nettoCashflow ?? 0;
    const sparplanNetto = isEndeJahr
      ? -konsumNutzenwert
      : jaehrlicherCashZuschuss + simulierterGewinnNetto + darlehensZuschussJaehrlich + investitionsNettoCashflow - konsumNutzenwert;
    if (!isEndeJahr) {
      kumulierterSparplan += sparplanNetto;
    }
    kumulierterKonsumwert += konsumNutzenwert;

    let gehaltsEntnahme: number;
    let zinsEntnahme: number;
    let entnahmeAusSparplanDefizit: number;
    let stillerGesellschafterEntnahme: number;
    let entnahmenVorSteuern: number;
    if (jahresOverride !== undefined) {
      gehaltsEntnahme = gehaltsOverrideJahr !== undefined ? Math.max(0, gehaltsOverrideJahr) : 0;
      zinsEntnahme = 0;
      entnahmeAusSparplanDefizit = 0;
      stillerGesellschafterEntnahme = 0;
      entnahmenVorSteuern = Math.max(0, jahresOverride);
    } else {
      gehaltsEntnahme = gehaltsOverrideJahr !== undefined
        ? Math.max(0, gehaltsOverrideJahr)
        : Math.max(0, state.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB);
      zinsEntnahme = state.darlehen.endfaellig ? 0 : zinsenJaehrlich;
      entnahmeAusSparplanDefizit = Math.max(0, -sparplanNetto);
      stillerGesellschafterEntnahme = berechneStillenGesellschafterKosten(
        state.stillerGesellschafter,
        simulierterGewinn
      );
      entnahmenVorSteuern = gehaltsEntnahme + zinsEntnahme + entnahmeAusSparplanDefizit + stillerGesellschafterEntnahme;
    }
    kumulierteEntnahmen += entnahmenVorSteuern;

    const sortierteLotIndizes = sortiereEtfLotIndizesNachSteueroptimierung(etfLotsNachWachstum);
    let etfVerkauf = Math.min(etfWertNachWachstum, Math.max(0, entnahmenVorSteuern));
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const verkaufIteration = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
      const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, verkaufIteration.etfGewinn);
      const vorabpauschalesteuer = berechneVorabpauschalesteuer(
        vorabpauschale,
        TEILFREISTELLUNG_AKTIEN_PRIVAT,
        kapitalertragsteuerRate
      );
      const etfVerkaufssteuer = berechneEtfVerkaufssteuer(
        verkaufIteration.etfGewinn,
        TEILFREISTELLUNG_AKTIEN_PRIVAT,
        kapitalertragsteuerRate
      );
      const benoetigterVerkauf = Math.min(
        etfWertNachWachstum,
        Math.max(0, entnahmenVorSteuern + vorabpauschalesteuer + etfVerkaufssteuer)
      );
      if (Math.abs(benoetigterVerkauf - etfVerkauf) < SALE_CONVERGENCE_THRESHOLD) {
        etfVerkauf = benoetigterVerkauf;
        break;
      }
      etfVerkauf = benoetigterVerkauf;
    }

    const verkauf = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
    const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, verkauf.etfGewinn);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(
      vorabpauschale,
      TEILFREISTELLUNG_AKTIEN_PRIVAT,
      kapitalertragsteuerRate
    );
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(
      verkauf.etfGewinn,
      TEILFREISTELLUNG_AKTIEN_PRIVAT,
      kapitalertragsteuerRate
    );

    kumulierterEtfVerkauf += verkauf.etfVerkauf;
    kumulierteVorabpauschalesteuer += vorabpauschalesteuer;
    kumulierteEtfVerkaufssteuer += etfVerkaufssteuer;

    etfLots = verkauf.lots;
    // Only re-invest the sparplan surplus in genuine Betrieb-phase years (isEndeJahr = false).
    // In Ende years sparplanNetto equals -konsumNutzenwert (≤ 0), so the guard also prevents
    // a negative reinvestment, but the explicit !isEndeJahr check makes the intent clear.
    if (!isEndeJahr && sparplanNetto > 0) {
      etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", sparplanNetto);
    }

    const verbleibenderEtfWertJahr = sumEtfWert(etfLots);
    const endwertJahr = kumulierterEtfVerkauf + verbleibenderEtfWertJahr;
    const investitionsNettovermoegenJahr = investitionsJahreswert?.nettovermoegen ?? 0;

    // Override offenesDarlehen at the end of this year when the caller supplied per-year values
    // (e.g. to mirror the GmbH Ende-phase restdarlehen after endfällig settlement in Bereich 1).
    const darlehenOverrideJahr = offeneDarlehenOverride ? offeneDarlehenOverride[jahr - 1] : undefined;
    if (darlehenOverrideJahr !== undefined) {
      offenesDarlehen = Math.max(0, darlehenOverrideJahr);
    }

    jahreswerte.push({
      jahr,
      jaehrlicherCashZuschuss,
      darlehensZuschussJaehrlich,
      simulierterGewinnNetto,
      konsumNutzenwert,
      sparplanNetto,
      gehaltsEntnahme,
      zinsEntnahme,
      entnahmeAusSparplanDefizit,
      stillerGesellschafterEntnahme,
      entnahmenVorSteuern,
      etfVerkauf: verkauf.etfVerkauf,
      vorabpauschalesteuer,
      etfVerkaufssteuer,
      gesamtSteuer: vorabpauschalesteuer + etfVerkaufssteuer,
      kumulierterEtfVerkauf,
      verbleibenderEtfWert: verbleibenderEtfWertJahr,
      endwert: endwertJahr,
      investitionsNettovermoegen: investitionsNettovermoegenJahr,
      kumulierterKonsumwert,
      gesamtwertMitKonsum: endwertJahr + investitionsNettovermoegenJahr + kumulierterKonsumwert - offenesDarlehen,
    });
  }

  const verbleibenderEtfWert = sumEtfWert(etfLots);
  const endwert = kumulierterEtfVerkauf + verbleibenderEtfWert;
  const investitionsNettovermoegen = investitionsZusammenfassung.nettovermoegen;
  const gesamtwertMitKonsum = endwert + investitionsNettovermoegen + kumulierterKonsumwert - offenesDarlehen;
  const kumulierteSteuern = kumulierteVorabpauschalesteuer + kumulierteEtfVerkaufssteuer;

  return {
    ergebnis: {
      anfangskapitalPrivat,
      kumulierterEtfVerkauf,
      verbleibenderEtfWert,
      endwert,
      investitionsNettovermoegen,
      kumulierterKonsumwert,
      gesamtwertMitKonsum,
      kumulierteSteuern,
      kumulierteVorabpauschalesteuer,
      kumulierteEtfVerkaufssteuer,
      kumulierteEntnahmen,
      kumulierterSparplan,
    },
    jahreswerte,
  };
}

export function berechnePrivatVergleichErgebnis(
  state: BetriebState,
  entnahmenOverride?: (number | undefined)[],
  offeneDarlehenOverride?: (number | undefined)[],
  gehaltsEntnahmeOverride?: (number | undefined)[]
): PrivatVergleichErgebnis {
  return simulierePrivatVergleich(state, entnahmenOverride, offeneDarlehenOverride, gehaltsEntnahmeOverride).ergebnis;
}

export function berechnePrivatVergleichZeitreihe(
  state: BetriebState,
  entnahmenOverride?: (number | undefined)[],
  offeneDarlehenOverride?: (number | undefined)[],
  gehaltsEntnahmeOverride?: (number | undefined)[]
): PrivatVergleichJahreswert[] {
  return simulierePrivatVergleich(state, entnahmenOverride, offeneDarlehenOverride, gehaltsEntnahmeOverride).jahreswerte;
}

/**
 * Calculate yearly Betrieb results for each year of the operating phase.
 */
export function berechneBetriebsErgebnisse(state: BetriebState): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  const { kstGesamt: effKstGesamt, gewerbesteuer: effGewerbesteuer, gmbhSteuerGesamt: effGmbhSteuerGesamt } =
    berechneGmbhSteuerRaten(
      state.koerperschaftsteuerSatz ?? DEFAULT_KOERPERSCHAFTSTEUER_SATZ,
      state.solidaritaetszuschlagSatz ?? DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ,
      state.gewerbesteuerSatz ?? DEFAULT_GEWERBESTEUER_SATZ,
    );
  let etfLots: EtfLot[] = [];
  etfLots = fuegeEtfLotHinzu(etfLots, "startkapital", Math.max(0, state.startkapital));
  etfLots = fuegeEtfLotHinzu(etfLots, "darlehen", Math.max(0, state.darlehen.betrag));
  const stillerGesellschafterEinlage = state.stillerGesellschafter?.aktiv
    ? Math.max(0, state.stillerGesellschafter.einlage)
    : 0;
  if (stillerGesellschafterEinlage > 0) {
    etfLots = fuegeEtfLotHinzu(etfLots, "stillerGesellschafter", stillerGesellschafterEinlage);
  }
  let cashReserve = 0;
  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  // For endfällig loans, interest is deferred to end and NOT deducted annually.
  // For regular loans, interest is paid (and deductible) each year.
  let aufgelaufeneZinsen = 0;
  let kumulierterCashZuschuss = 0;
  let kumulierterKonsumwert = 0;

  // Track investment capital values (compound growth per year)
  const investitionen = state.investitionen ?? [];
  let investitionsKapitalWerte: number[] = investitionen.map((inv) => Math.max(0, inv.kapital));
  let investitionsKumulierterGewinnVerlust = 0;
  // Track remaining loan balances for each investment
  let investitionsKreditRestschuldWerte: number[] = investitionen.map((inv) => Math.max(0, inv.kredit ?? 0));
  let investitionsKumulierterNettoCashflow = 0;

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const etfWertVorjahrEnd = sumEtfWert(etfLots);
    const etfLotsNachWachstum = wachseEtfLots(etfLots, state.etfRendite);
    const etfWertNachWachstum = sumEtfWert(etfLotsNachWachstum);
    const theoretischerEtfErtrag = Math.max(0, etfWertNachWachstum - etfWertVorjahrEnd);
    investitionsKapitalWerte = investitionsKapitalWerte.map((kap, i) =>
      kap * (1 + (investitionen[i]?.wertsteigerung ?? 0) / 100)
    );
    const investitionsKapitalGesamt = investitionsKapitalWerte.reduce((sum, k) => sum + k, 0);
    const investitionsGewinnVerlustProJahr = investitionen.reduce((sum, inv) => sum + inv.gewinnVerlustProJahr, 0);
    investitionsKumulierterGewinnVerlust += investitionsGewinnVerlustProJahr;

    // Compute per-investment loan cashflow: interest, repayment, remaining balance
    let investitionsZinsaufwandProJahr = 0;
    let investitionsTilgungProJahr = 0;
    investitionsKreditRestschuldWerte = investitionsKreditRestschuldWerte.map((restschuld, i) => {
      const inv = investitionen[i];
      if (!inv || restschuld <= 0) return 0;
      const zinssatz = Math.max(0, inv.zinssatz ?? 0);
      const tilgung = Math.max(0, inv.tilgungsrateJaehrlich ?? 0);
      const zinsaufwand = restschuld * (zinssatz / 100);
      const tatsaechlicheTilgung = Math.min(tilgung, restschuld);
      investitionsZinsaufwandProJahr += zinsaufwand;
      investitionsTilgungProJahr += tatsaechlicheTilgung;
      return Math.max(0, restschuld - tatsaechlicheTilgung);
    });
    const investitionsKreditRestschuld = investitionsKreditRestschuldWerte.reduce((sum, r) => sum + r, 0);
    const investitionsNettoCashflowProJahr = investitionsGewinnVerlustProJahr - investitionsZinsaufwandProJahr - investitionsTilgungProJahr;
    investitionsKumulierterNettoCashflow += investitionsNettoCashflowProJahr;
    const investitionsCashZufluss = Math.max(0, investitionsNettoCashflowProJahr);
    const investitionsCashAbfluss = Math.max(0, -investitionsNettoCashflowProJahr);
    const cashReserveVorInvestition = cashReserve;
    cashReserve += investitionsCashZufluss;

    // Vorabpauschale tax – GmbH uses 80% Teilfreistellung and corporate tax rate (KSt + GewSt)
    const vorabpauschaleBrutto = berechneVorabpauschale(etfWertVorjahrEnd, etfWertNachWachstum);
    // Recompute costs inside the yearly loop so changed expense inputs are reflected directly.
    const jaehrlicheKosten = berechneBetriebskosten(state.kosten);

    // Phone costs are operating expenses (Betriebsausgabe), deducted from taxable profit.
    const handyConfig = state.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;
    const handyNettoKosten = berechneHandyNettoKostenProJahr(jahr, handyConfig);
    const benefitsKosten = berechneBenefitsKosten(state.benefits);
    // Use the nominal consumption value (what the shareholder actually receives) rather than the
    // GmbH's net cost after tax deduction.  The tax saving on benefits is already reflected in a
    // lower gmbhSteuer → higher ETF value, so crediting only the after-tax cost would zero-out
    // the benefit advantage instead of correctly showing the tax saving as a GmbH gain.
    const konsumNutzenwert = berechneKonsumNutzenwertProJahr(jahr, state.benefits, handyConfig);
    kumulierterKonsumwert += konsumNutzenwert;
    const geschaeftsfuehrergehalt = Math.max(0, state.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB);
    const gehaelterGesamt = geschaeftsfuehrergehalt;
    const simulierterGewinn = Math.max(0, state.simulierterGewinn ?? 0);
    const stillerGesellschafterKosten = berechneStillenGesellschafterKosten(
      state.stillerGesellschafter,
      simulierterGewinn
    );
    const betriebsausgabenGesamt = jaehrlicheKosten + handyNettoKosten + benefitsKosten + gehaelterGesamt + stillerGesellschafterKosten;
    const betriebskostenPosten = berechneBetriebskostenPosten(
      state.kosten,
      state.benefits,
      handyNettoKosten,
      handyConfig,
      geschaeftsfuehrergehalt,
      stillerGesellschafterKosten
    );

    const { zinsenJaehrlich: darlehenszinsJaehrlich, darlehenBetragEnde } = berechneDarlehensjahr(
      offenesDarlehen,
      state.darlehen.zinssatz,
      state.darlehen.monatlicherZuschuss
    );
    const jaehrlicherCashZuschuss = Math.max(0, state.jaehrlicherCashZuschuss ?? 0);
    kumulierterCashZuschuss += jaehrlicherCashZuschuss;
    const darlehensZuzahlungenJaehrlich = Math.max(0, state.darlehen.monatlicherZuschuss) * DARLEHEN_MONATE_PRO_JAHR;
    const cashReserveVorjahr = cashReserve;
    const ausGewinnBeglicheneBetriebsausgaben = Math.min(simulierterGewinn, betriebsausgabenGesamt);
    const betriebsausgabenNachGewinn = Math.max(0, betriebsausgabenGesamt - ausGewinnBeglicheneBetriebsausgaben);
    const verbleibenderGewinnVorSteuern = Math.max(0, simulierterGewinn - ausGewinnBeglicheneBetriebsausgaben);
    const ausCashZuschussBeglicheneBetriebsausgaben = Math.min(jaehrlicherCashZuschuss, betriebsausgabenNachGewinn);
    const betriebsausgabenNachCashZuschuss = Math.max(0, betriebsausgabenNachGewinn - ausCashZuschussBeglicheneBetriebsausgaben);
    const ausCashReserveBeglicheneBetriebsausgaben = Math.min(cashReserveVorjahr, betriebsausgabenNachCashZuschuss);
    const betriebsausgabenNachCashReserve = Math.max(0, betriebsausgabenNachCashZuschuss - ausCashReserveBeglicheneBetriebsausgaben);
    const unverbrauchterCashZuschuss = jaehrlicherCashZuschuss - ausCashZuschussBeglicheneBetriebsausgaben;
    cashReserve = cashReserveVorjahr + unverbrauchterCashZuschuss - ausCashReserveBeglicheneBetriebsausgaben;
    const ausZuzahlungenBeglicheneBetriebsausgaben = Math.min(darlehensZuzahlungenJaehrlich, betriebsausgabenNachCashReserve);
    const ungedeckteBetriebsausgaben = Math.max(0, betriebsausgabenNachCashReserve - ausZuzahlungenBeglicheneBetriebsausgaben);
    const verbleibendeDarlehensZuzahlungen = Math.max(0, darlehensZuzahlungenJaehrlich - ausZuzahlungenBeglicheneBetriebsausgaben);
    const jaehrlicheZinsen = state.darlehen.endfaellig ? 0 : darlehenszinsJaehrlich;
    const sortierteLotIndizes = sortiereEtfLotIndizesNachSteueroptimierung(etfLotsNachWachstum);

    // Accumulate deferred interest for endfällig loans (informational).
    if (state.darlehen.endfaellig) {
      aufgelaufeneZinsen += darlehenszinsJaehrlich;
    }

    const auszahlungenOhneVerkaufssteuern = ungedeckteBetriebsausgaben + jaehrlicheZinsen + investitionsCashAbfluss;
    const verfuegbareLiquiditaetVorEtfVerkauf = verbleibenderGewinnVorSteuern + cashReserve + verbleibendeDarlehensZuzahlungen;

    // Solve sale amount iteratively because taxes depend on realized sale gain.
    let etfVerkauf = Math.min(
      etfWertNachWachstum,
      Math.max(0, auszahlungenOhneVerkaufssteuern - verfuegbareLiquiditaetVorEtfVerkauf)
    );
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const verkaufIteration = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
      const realisierterEtfErtragIter = verkaufIteration.etfGewinn;
      const vorabpauschaleIter = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, realisierterEtfErtragIter);
      const vorabpauschalesteuerIter = berechneVorabpauschalesteuer(vorabpauschaleIter, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt);
      const etfVerkaufssteuerIter = berechneEtfVerkaufssteuer(realisierterEtfErtragIter, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt);
      const finanzierungskostenIter = jaehrlicheZinsen + investitionsZinsaufwandProJahr;
      const hinzurechnungIter = berechneGewerbesteuerHinzurechnung(finanzierungskostenIter);
      const gewinnNachBetriebsausgabenIter =
        simulierterGewinn + realisierterEtfErtragIter + investitionsGewinnVerlustProJahr - investitionsZinsaufwandProJahr - betriebsausgabenGesamt - jaehrlicheZinsen;
      const kstIter = gewinnNachBetriebsausgabenIter > 0
        ? gewinnNachBetriebsausgabenIter * effKstGesamt
        : 0;
      const gewStBemessungIter = gewinnNachBetriebsausgabenIter + hinzurechnungIter;
      const gewStIter = gewStBemessungIter > 0
        ? gewStBemessungIter * effGewerbesteuer
        : 0;
      const gmbhSteuerIter = kstIter + gewStIter;
      const benoetigterVerkauf = Math.min(
        etfWertNachWachstum,
        Math.max(
          0,
          auszahlungenOhneVerkaufssteuern + vorabpauschalesteuerIter + gmbhSteuerIter + etfVerkaufssteuerIter - verfuegbareLiquiditaetVorEtfVerkauf
        )
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
    const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, realisierterEtfErtrag);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(vorabpauschale, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt);
    // gewinnNachBetriebsausgaben is the taxable profit base (after all deductible expenses)
    const gewinnNachBetriebsausgaben =
      simulierterGewinn + realisierterEtfErtrag + investitionsGewinnVerlustProJahr - investitionsZinsaufwandProJahr - betriebsausgabenGesamt - jaehrlicheZinsen;

    const finanzierungskosten = jaehrlicheZinsen + investitionsZinsaufwandProJahr;
    const hinzurechnung = berechneGewerbesteuerHinzurechnung(finanzierungskosten);

    // GmbH taxes (KSt + GewSt) on positive profit, paid to Finanzamt
    const gmbhSteuerKst = gewinnNachBetriebsausgaben > 0
      ? gewinnNachBetriebsausgaben * effKstGesamt
      : 0;
    const gewStBemessungsgrundlage = gewinnNachBetriebsausgaben + hinzurechnung;
    const gmbhSteuerGewSt = gewStBemessungsgrundlage > 0
      ? gewStBemessungsgrundlage * effGewerbesteuer
      : 0;
    const gmbhSteuer = gmbhSteuerKst + gmbhSteuerGewSt;

    // Tax on realized ETF gain due to selling
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(realisierterEtfErtrag, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt);
    const gesamtauszahlungen =
      ungedeckteBetriebsausgaben + jaehrlicheZinsen + investitionsCashAbfluss + vorabpauschalesteuer + gmbhSteuer + etfVerkaufssteuer;
    const liquiditaetsabflussOhneEtfVerkauf = Math.min(gesamtauszahlungen, verfuegbareLiquiditaetVorEtfVerkauf);
    const ausCashReserveBeglicheneSonstigeAuszahlungen = Math.min(cashReserve, liquiditaetsabflussOhneEtfVerkauf);
    cashReserve -= ausCashReserveBeglicheneSonstigeAuszahlungen;
    const ausDarlehensZuzahlungenBeglicheneSonstigeAuszahlungen = Math.min(
      verbleibendeDarlehensZuzahlungen,
      Math.max(0, liquiditaetsabflussOhneEtfVerkauf - ausCashReserveBeglicheneSonstigeAuszahlungen)
    );
    const verbleibendeDarlehensZuzahlungenNachAuszahlungen = Math.max(
      0,
      verbleibendeDarlehensZuzahlungen - ausDarlehensZuzahlungenBeglicheneSonstigeAuszahlungen
    );
    const deckungssaldoNachAusgabenUndSteuern =
      etfVerkauf + verfuegbareLiquiditaetVorEtfVerkauf - gesamtauszahlungen;
    const ueberdeckungAusEtfVerkauf = Math.max(
      0,
      deckungssaldoNachAusgabenUndSteuern - cashReserve - verbleibendeDarlehensZuzahlungenNachAuszahlungen
    );
    const freieDarlehensZuzahlungen = etfVerkauf > 0
      ? 0
      : verbleibendeDarlehensZuzahlungenNachAuszahlungen;
    cashReserve += ueberdeckungAusEtfVerkauf;
    if (etfVerkauf > 0) {
      cashReserve += verbleibendeDarlehensZuzahlungenNachAuszahlungen;
    }

    const gewinnNachSteuernEtfZufluss = Math.min(
      cashReserve,
      Math.max(0, verbleibenderGewinnVorSteuern - gmbhSteuer)
    );
    cashReserve -= gewinnNachSteuernEtfZufluss;

    // Additional taxes
    const gesamtSteuer = gmbhSteuer + vorabpauschalesteuer + etfVerkaufssteuer;

    // Net gain after all taxes
    const nettogewinn =
      gewinnNachBetriebsausgaben - gmbhSteuer - vorabpauschalesteuer - etfVerkaufssteuer;
    const gesellschafterBruttoEinkommen = gehaelterGesamt + darlehenszinsJaehrlich;
    const gesellschafterEinkommensteuer = berechneEinkommensteuerBetrieb(gesellschafterBruttoEinkommen);
    const gesellschafterSoli = berechneSoliBetrieb(gesellschafterEinkommensteuer);
    const gesellschafterSteuerGesamt = gesellschafterEinkommensteuer + gesellschafterSoli;
    const gehaelterEinkommensteuer = berechneEinkommensteuerBetrieb(gehaelterGesamt);
    const gehaelterSoli = berechneSoliBetrieb(gehaelterEinkommensteuer);
    const gehaelterSteuerGesamt = gehaelterEinkommensteuer + gehaelterSoli;
    const gehaelterNetto = gehaelterGesamt - gehaelterSteuerGesamt;
    const darlehenszinsenSteuer = Math.max(0, gesellschafterSteuerGesamt - gehaelterSteuerGesamt);
    const darlehenszinsenNetto = Math.max(0, darlehenszinsJaehrlich - darlehenszinsenSteuer);
    const zielnettoGesellschafter = Math.max(
      0,
      state.zielnettoGesellschafter ?? DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB
    );
    const gesellschafterNetto = gehaelterNetto + darlehenszinsenNetto;
    const zielnettoDifferenz = gesellschafterNetto - zielnettoGesellschafter;

    // Positive retained result is held as cash reserve (Aktiva).
    // Investment cash (investitionsCashZufluss) is already in cashReserve from above; subtract only
    // the portion that is still there (not consumed by expenses or taxes) to avoid double-counting.
    const investitionsCashNochInReserve = Math.max(0, Math.min(investitionsCashZufluss, cashReserve - cashReserveVorInvestition));
    const cashReserveZugang = Math.max(0, nettogewinn - investitionsCashNochInReserve - gewinnNachSteuernEtfZufluss);
    cashReserve += cashReserveZugang;

    // Update ETF value: after growth, deduct all cash outflows funded by ETF sales.
    etfLots = verkauf.lots;
    etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", freieDarlehensZuzahlungen);
    etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", gewinnNachSteuernEtfZufluss);
    const etfWert = sumEtfWert(etfLots);
    const startkapitalEtfWert = sumEtfWertNachTyp(etfLots, "startkapital");
    const darlehenEtfWert = sumEtfWertNachTyp(etfLots, "darlehen");
    const zuzahlungenEtfWert = sumEtfWertNachTyp(etfLots, "zuzahlung");

    offenesDarlehen = darlehenBetragEnde;

    // Gesamtvermögen = total gross assets (ETF + cash reserve + investments).
    // The outstanding loan is a liability shown separately; net worth = assets - offenesDarlehen.
    const gesamtvermoegen = etfWert + cashReserve + investitionsKapitalGesamt;
    const nettovermoegen = gesamtvermoegen - offenesDarlehen - investitionsKreditRestschuld;
    const haftungskapitalEingeflossen = Math.max(0, state.startkapital) + kumulierterCashZuschuss;

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
        konsumNutzenwert,
        kumulierterKonsumwert,
        geschaeftsfuehrergehalt,
        gehaelterGesamt,
        betriebsausgabenGesamt,
        gehaelterEinkommensteuer,
        gehaelterSoli,
        gehaelterNetto,
        simulierterGewinn,
        ausGewinnBeglicheneBetriebsausgaben,
        gewinnNachSteuernEtfZufluss,
        gesellschafterBruttoEinkommen,
        gesellschafterEinkommensteuer,
        gesellschafterSoli,
        gesellschafterSteuerGesamt,
        darlehenszinsenSteuer,
        darlehenszinsenNetto,
        gesellschafterNetto,
        zielnettoGesellschafter,
        zielnettoDifferenz,
        jaehrlicherCashZuschuss,
        kumulierterCashZuschuss,
        haftungskapitalEingeflossen,
        ausCashZuschussBeglicheneBetriebsausgaben,
        ausCashReserveBeglicheneBetriebsausgaben,
        ausZuzahlungenBeglicheneBetriebsausgaben,
        ausCashReserveBeglicheneSonstigeAuszahlungen,
        ausDarlehensZuzahlungenBeglicheneSonstigeAuszahlungen,
        ungedeckteBetriebsausgaben,
        freieDarlehensZuzahlungen,
        jaehrlicheZinsen,
        aufgelaufeneZinsen: state.darlehen.endfaellig ? aufgelaufeneZinsen : 0,
        gewinnNachBetriebsausgaben,
        vorabpauschaleVorAnrechnung: vorabpauschaleBrutto,
        vorabpauschale,
        vorabpauschalesteuer,
        etfVerkaufssteuer,
        gmbhSteuer,
        gmbhSteuerKst,
        gmbhSteuerGewSt,
        deckungssaldoNachAusgabenUndSteuern,
        cashReserve,
        cashReserveZugang,
        offenesDarlehen,
        nettovermoegen,
        stillerGesellschafterKosten,
        stillerGesellschafterEinlage: sumEtfWertNachTyp(etfLots, "stillerGesellschafter"),
        investitionsKapitalGesamt,
        investitionsGewinnVerlustProJahr,
        investitionsKumulierterGewinnVerlust,
        investitionsZinsaufwandProJahr,
        investitionsTilgungProJahr,
        investitionsNettoCashflowProJahr,
        investitionsKumulierterNettoCashflow,
        investitionsKreditRestschuld,
      },
      betriebskostenPosten,
    });
  }

  return ergebnisse;
}

/**
 * Calculate annual results for a single investment position.
 *
 * In each year the capital grows by `wertsteigerung` percent and the
 * `gewinnVerlustProJahr` cash flow is received (or paid out if negative).
 * The cumulative profit/loss includes both the annual cash flows and the
 * capital appreciation.
 */
export function berechneInvestitionsErgebnis(
  investition: InvestitionsPosition,
  laufzeitJahre: number
): InvestitionsErgebnis {
  const jahreswerte: InvestitionsErgebnis["jahreswerte"] = [];
  let kapital = Math.max(0, investition.kapital);
  let kumulierterGewinnVerlust = 0;
  const anfangskapital = kapital;
  const kredit = Math.max(0, investition.kredit ?? 0);
  const zinssatz = Math.max(0, investition.zinssatz ?? 0);
  const tilgungsrate = Math.max(0, investition.tilgungsrateJaehrlich ?? 0);
  let restschuld = kredit;
  let kumulierterNettoCashflow = 0;

  for (let jahr = 1; jahr <= laufzeitJahre; jahr++) {
    kapital = kapital * (1 + investition.wertsteigerung / 100);
    kumulierterGewinnVerlust += investition.gewinnVerlustProJahr;
    const zinsaufwand = restschuld * (zinssatz / 100);
    const tilgung = Math.min(tilgungsrate, restschuld);
    restschuld = Math.max(0, restschuld - tilgung);
    const nettoCashflow = investition.gewinnVerlustProJahr - zinsaufwand - tilgung;
    kumulierterNettoCashflow += nettoCashflow;
    jahreswerte.push({ jahr, kapital, kumulierterGewinnVerlust, zinsaufwand, tilgung, restschuld, nettoCashflow, kumulierterNettoCashflow });
  }

  const endkapital = kapital;
  const kapitalzuwachs = endkapital - anfangskapital;
  const gesamtGewinnVerlust = kapitalzuwachs + kumulierterGewinnVerlust;
  const gesamtRendite = anfangskapital > 0 ? (gesamtGewinnVerlust / anfangskapital) * 100 : 0;

  return {
    id: investition.id,
    bezeichnung: investition.bezeichnung,
    endkapital,
    gesamtGewinnVerlust,
    gesamtRendite,
    jahreswerte,
  };
}

/**
 * Calculate results for all investment positions.
 */
export function berechneAlleInvestitionsErgebnisse(
  investitionen: InvestitionsPosition[] | undefined,
  laufzeitJahre: number
): InvestitionsErgebnis[] {
  if (!investitionen || investitionen.length === 0) return [];
  return investitionen.map((inv) => berechneInvestitionsErgebnis(inv, laufzeitJahre));
}

export function berechneInvestitionsZusammenfassung(
  investitionen: InvestitionsPosition[] | undefined,
  laufzeitJahre: number
): InvestitionsZusammenfassung {
  const ergebnisse = berechneAlleInvestitionsErgebnisse(investitionen, laufzeitJahre);
  const jahreswerte: InvestitionsZusammenfassungJahreswert[] = Array.from(
    { length: Math.max(0, laufzeitJahre) },
    (_, index) => {
      const jahr = index + 1;
      const kapitalGesamt = ergebnisse.reduce((sum, ergebnis) => sum + (ergebnis.jahreswerte[index]?.kapital ?? 0), 0);
      const kreditRestschuld = ergebnisse.reduce((sum, ergebnis) => sum + (ergebnis.jahreswerte[index]?.restschuld ?? 0), 0);
      const nettoCashflow = ergebnisse.reduce((sum, ergebnis) => sum + (ergebnis.jahreswerte[index]?.nettoCashflow ?? 0), 0);
      const kumulierterNettoCashflow = ergebnisse.reduce(
        (sum, ergebnis) => sum + (ergebnis.jahreswerte[index]?.kumulierterNettoCashflow ?? 0),
        0
      );

      return {
        jahr,
        kapitalGesamt,
        kreditRestschuld,
        nettovermoegen: kapitalGesamt - kreditRestschuld,
        nettoCashflow,
        kumulierterNettoCashflow,
      };
    }
  );
  const letztesJahr = jahreswerte[jahreswerte.length - 1];

  return {
    kapitalGesamt: letztesJahr?.kapitalGesamt ?? 0,
    kreditRestschuld: letztesJahr?.kreditRestschuld ?? 0,
    nettovermoegen: letztesJahr?.nettovermoegen ?? 0,
    kumulierterNettoCashflow: letztesJahr?.kumulierterNettoCashflow ?? 0,
    jahreswerte,
  };
}
