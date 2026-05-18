import { BetriebState, BenefitConfig, DarlehenConfig, JahresErgebnis, KostenPosition, FirmenhandyConfig, StillerGesellschafterConfig } from "../types";

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
export const MAX_TANKGUTSCHEIN_MONATLICH = 50;
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
/** Maximum tax-free bAV employer contribution per year (§ 3 Nr. 63 EStG, 2024):
 *  8 % of the Beitragsbemessungsgrenze Rentenversicherung West (90 600 €). */
export const BAV_MAX_STEUERFREIER_BEITRAG = 7248;
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
  sparplanNetto: number;
  sparplanAusCashZuschuss: number;
  sparplanAusGewinnBrutto: number;
  sparplanAusGewinnSteuer: number;
  sparplanAusGewinnSoli: number;
  sparplanAusGewinnNetto: number;
  sparplanAusDarlehensZuzahlung: number;
  sparplanAbzugKonsum: number;
  entnahmenVorSteuern: number;
  etfVerkaufFuerGehalt: number;
  etfVerkaufFuerZinsen: number;
  etfVerkaufFuerSparplanDefizit: number;
  etfVerkaufFuerStillenGesellschafter: number;
  etfVerkaufFuerVorabpauschalesteuer: number;
  etfVerkaufFuerEtfVerkaufssteuer: number;
  etfVerkaufVerwendungszweckGesamt: number;
  etfVerkauf: number;
  vorabpauschalesteuer: number;
  etfVerkaufssteuer: number;
  gesamtSteuer: number;
  kumulierterEtfVerkauf: number;
  verbleibenderEtfWert: number;
  endwert: number;
  kumulierterKonsumwert: number;
  gesamtwertMitKonsum: number;
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
  const strategieessen = benefits.strategieessen;
  const bav = Math.max(0, benefits.bav ?? 0);
  return tankJahr + strategieessen + bav;
}

export function berechneTankgutscheinJaehrlich(benefits: BenefitConfig): number {
  const clampedTankMonthly = Math.min(Math.max(benefits.tankgutschein, 0), MAX_TANKGUTSCHEIN_MONATLICH);
  return clampedTankMonthly * MONATE_PRO_JAHR;
}

export function berechneKonsumNutzenwertProJahr(
  jahr: number,
  benefits: BenefitConfig,
  handyConfig: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG
): number {
  return berechneTankgutscheinJaehrlich(benefits) + berechneHandyNettoKostenProJahr(jahr, handyConfig);
}

export function berechneGmbhKonsumwertProJahr(
  jahr: number,
  benefits: BenefitConfig,
  handyConfig: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG,
  steuerRate: number = GMBH_STEUER_GESAMT,
  umsatzsteuerSatz: number = UMSATZSTEUER_SATZ
): number {
  const tankgutscheinEffektiv = berechneTankgutscheinJaehrlich(benefits) * (1 - steuerRate);
  const handyKostenNominal = berechneHandyNettoKostenProJahr(jahr, handyConfig);
  const handyKostenNachVorsteuer = handyKostenNominal / (1 + umsatzsteuerSatz);
  const handyEffektiv = handyKostenNachVorsteuer * (1 - steuerRate);
  return tankgutscheinEffektiv + handyEffektiv;
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
  const benefitsPosten = [
    { label: "Tankgutschein", wert: tankgutscheinJaehrlich },
    { label: "Strategieessen", wert: Math.max(0, benefits.strategieessen) },
    { label: "bAV-Beitrag", wert: Math.max(0, benefits.bav ?? 0) },
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

function simulierePrivatVergleich(state: BetriebState): {
  ergebnis: PrivatVergleichErgebnis;
  jahreswerte: PrivatVergleichJahreswert[];
} {
  let etfLots: EtfLot[] = [];
  const stillerGesellschafterEinlage = state.stillerGesellschafter?.aktiv
    ? Math.max(0, state.stillerGesellschafter.einlage)
    : 0;
  const anfangskapitalPrivat = Math.max(0, state.startkapital) + Math.max(0, state.darlehen.betrag) + stillerGesellschafterEinlage;
  etfLots = fuegeEtfLotHinzu(etfLots, "startkapital", anfangskapitalPrivat);

  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  let kumulierterEtfVerkauf = 0;
  let kumulierteVorabpauschalesteuer = 0;
  let kumulierteEtfVerkaufssteuer = 0;
  let kumulierteEntnahmen = 0;
  let kumulierterSparplan = 0;
  let kumulierterKonsumwert = 0;
  const jahreswerte: PrivatVergleichJahreswert[] = [];

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
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
    const simulierterGewinnSteuer = berechneEinkommensteuerBetrieb(simulierterGewinn);
    const simulierterGewinnSoli = berechneSoliBetrieb(simulierterGewinnSteuer);
    const simulierterGewinnNetto = simulierterGewinn - simulierterGewinnSteuer - simulierterGewinnSoli;
    const darlehensZuschussJaehrlich = Math.max(0, state.darlehen.monatlicherZuschuss) * DARLEHEN_MONATE_PRO_JAHR;
    const konsumNutzenwert = berechneKonsumNutzenwertProJahr(
      jahr,
      state.benefits,
      state.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG
    );
    const sparplanNetto = jaehrlicherCashZuschuss + simulierterGewinnNetto + darlehensZuschussJaehrlich - konsumNutzenwert;
    kumulierterSparplan += sparplanNetto;
    kumulierterKonsumwert += konsumNutzenwert;

    const gehaltsEntnahme = Math.max(0, state.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB);
    const zinsEntnahme = state.darlehen.endfaellig ? 0 : zinsenJaehrlich;
    const entnahmeAusSparplanDefizit = Math.max(0, -sparplanNetto);
    const stillerGesellschafterEntnahme = berechneStillenGesellschafterKosten(
      state.stillerGesellschafter,
      simulierterGewinn
    );
    const entnahmenVorSteuern = gehaltsEntnahme + zinsEntnahme + entnahmeAusSparplanDefizit + stillerGesellschafterEntnahme;
    kumulierteEntnahmen += entnahmenVorSteuern;

    const sortierteLotIndizes = sortiereEtfLotIndizesNachSteueroptimierung(etfLotsNachWachstum);
    let etfVerkauf = Math.min(etfWertNachWachstum, Math.max(0, entnahmenVorSteuern));
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const verkaufIteration = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
      const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, verkaufIteration.etfGewinn);
      const vorabpauschalesteuer = berechneVorabpauschalesteuer(
        vorabpauschale,
        TEILFREISTELLUNG_AKTIEN_PRIVAT,
        ABGELTUNGSSTEUER_GESAMT
      );
      const etfVerkaufssteuer = berechneEtfVerkaufssteuer(
        verkaufIteration.etfGewinn,
        TEILFREISTELLUNG_AKTIEN_PRIVAT,
        ABGELTUNGSSTEUER_GESAMT
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
      ABGELTUNGSSTEUER_GESAMT
    );
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(
      verkauf.etfGewinn,
      TEILFREISTELLUNG_AKTIEN_PRIVAT,
      ABGELTUNGSSTEUER_GESAMT
    );

    kumulierterEtfVerkauf += verkauf.etfVerkauf;
    kumulierteVorabpauschalesteuer += vorabpauschalesteuer;
    kumulierteEtfVerkaufssteuer += etfVerkaufssteuer;

    etfLots = verkauf.lots;
    if (sparplanNetto > 0) {
      etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", sparplanNetto);
    }

    const verbleibenderEtfWertJahr = sumEtfWert(etfLots);
    const endwertJahr = kumulierterEtfVerkauf + verbleibenderEtfWertJahr;
    jahreswerte.push({
      jahr,
      sparplanNetto,
      sparplanAusCashZuschuss: jaehrlicherCashZuschuss,
      sparplanAusGewinnBrutto: simulierterGewinn,
      sparplanAusGewinnSteuer: simulierterGewinnSteuer,
      sparplanAusGewinnSoli: simulierterGewinnSoli,
      sparplanAusGewinnNetto: simulierterGewinnNetto,
      sparplanAusDarlehensZuzahlung: darlehensZuschussJaehrlich,
      sparplanAbzugKonsum: konsumNutzenwert,
      entnahmenVorSteuern,
      etfVerkaufFuerGehalt: gehaltsEntnahme,
      etfVerkaufFuerZinsen: zinsEntnahme,
      etfVerkaufFuerSparplanDefizit: entnahmeAusSparplanDefizit,
      etfVerkaufFuerStillenGesellschafter: stillerGesellschafterEntnahme,
      etfVerkaufFuerVorabpauschalesteuer: vorabpauschalesteuer,
      etfVerkaufFuerEtfVerkaufssteuer: etfVerkaufssteuer,
      etfVerkaufVerwendungszweckGesamt:
        entnahmenVorSteuern + vorabpauschalesteuer + etfVerkaufssteuer,
      etfVerkauf: verkauf.etfVerkauf,
      vorabpauschalesteuer,
      etfVerkaufssteuer,
      gesamtSteuer: vorabpauschalesteuer + etfVerkaufssteuer,
      kumulierterEtfVerkauf,
      verbleibenderEtfWert: verbleibenderEtfWertJahr,
      endwert: endwertJahr,
      kumulierterKonsumwert,
      gesamtwertMitKonsum: endwertJahr + kumulierterKonsumwert,
    });
  }

  const verbleibenderEtfWert = sumEtfWert(etfLots);
  const endwert = kumulierterEtfVerkauf + verbleibenderEtfWert;
  const gesamtwertMitKonsum = endwert + kumulierterKonsumwert;
  const kumulierteSteuern = kumulierteVorabpauschalesteuer + kumulierteEtfVerkaufssteuer;

  return {
    ergebnis: {
      anfangskapitalPrivat,
      kumulierterEtfVerkauf,
      verbleibenderEtfWert,
      endwert,
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

export function berechnePrivatVergleichErgebnis(state: BetriebState): PrivatVergleichErgebnis {
  return simulierePrivatVergleich(state).ergebnis;
}

export function berechnePrivatVergleichZeitreihe(state: BetriebState): PrivatVergleichJahreswert[] {
  return simulierePrivatVergleich(state).jahreswerte;
}

/**
 * Calculate yearly Betrieb results for each year of the operating phase.
 */
export function berechneBetriebsErgebnisse(state: BetriebState): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
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

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const etfWertVorjahrEnd = sumEtfWert(etfLots);
    const etfLotsNachWachstum = wachseEtfLots(etfLots, state.etfRendite);
    const etfWertNachWachstum = sumEtfWert(etfLotsNachWachstum);
    const theoretischerEtfErtrag = Math.max(0, etfWertNachWachstum - etfWertVorjahrEnd);

    // Vorabpauschale tax – GmbH uses 80% Teilfreistellung and corporate tax rate (KSt + GewSt)
    const vorabpauschaleBrutto = berechneVorabpauschale(etfWertVorjahrEnd, etfWertNachWachstum);
    // Recompute costs inside the yearly loop so changed expense inputs are reflected directly.
    const jaehrlicheKosten = berechneBetriebskosten(state.kosten);

    // Phone costs are operating expenses (Betriebsausgabe), deducted from taxable profit.
    const handyConfig = state.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;
    const handyNettoKosten = berechneHandyNettoKostenProJahr(jahr, handyConfig);
    const benefitsKosten = berechneBenefitsKosten(state.benefits);
    const konsumNutzenwert = berechneGmbhKonsumwertProJahr(jahr, state.benefits, handyConfig);
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

    const auszahlungenOhneVerkaufssteuern = ungedeckteBetriebsausgaben + jaehrlicheZinsen;
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
      const vorabpauschalesteuerIter = berechneVorabpauschalesteuer(vorabpauschaleIter, TEILFREISTELLUNG_AKTIEN_GMBH, GMBH_STEUER_GESAMT);
      const etfVerkaufssteuerIter = berechneEtfVerkaufssteuer(realisierterEtfErtragIter);
      const gewinnNachBetriebsausgabenIter =
        simulierterGewinn + realisierterEtfErtragIter - betriebsausgabenGesamt - jaehrlicheZinsen;
      const gmbhSteuerIter = gewinnNachBetriebsausgabenIter > 0
        ? gewinnNachBetriebsausgabenIter * GMBH_STEUER_GESAMT
        : 0;
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
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(vorabpauschale, TEILFREISTELLUNG_AKTIEN_GMBH, GMBH_STEUER_GESAMT);
    // gewinnNachBetriebsausgaben is the taxable profit base (after all deductible expenses)
    const gewinnNachBetriebsausgaben =
      simulierterGewinn + realisierterEtfErtrag - betriebsausgabenGesamt - jaehrlicheZinsen;

    // GmbH taxes (KSt + GewSt) on positive profit, paid to Finanzamt
    const gmbhSteuer = gewinnNachBetriebsausgaben > 0
      ? gewinnNachBetriebsausgaben * GMBH_STEUER_GESAMT
      : 0;

    // Tax on realized ETF gain due to selling
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(realisierterEtfErtrag);
    const gesamtauszahlungen = ungedeckteBetriebsausgaben + jaehrlicheZinsen + vorabpauschalesteuer + gmbhSteuer + etfVerkaufssteuer;
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
    const cashReserveZugang = Math.max(0, nettogewinn - gewinnNachSteuernEtfZufluss);
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

    // Gesamtvermögen = total gross assets (ETF + cash reserve).
    // The outstanding loan is a liability shown separately; net worth = assets - offenesDarlehen.
    const gesamtvermoegen = etfWert + cashReserve;
    const nettovermoegen = gesamtvermoegen - offenesDarlehen;
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
        deckungssaldoNachAusgabenUndSteuern,
        cashReserve,
        cashReserveZugang,
        offenesDarlehen,
        nettovermoegen,
        stillerGesellschafterKosten,
        stillerGesellschafterEinlage: sumEtfWertNachTyp(etfLots, "stillerGesellschafter"),
      },
      betriebskostenPosten,
    });
  }

  return ergebnisse;
}
