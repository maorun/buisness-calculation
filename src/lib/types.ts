export interface KostenPosition {
  id: string;
  bezeichnung: string;
  betrag: number;
  beschreibung?: string;
  kategorie?: string;
  /** Whether the amount is per month or per year. Defaults to 'jaehrlich'. */
  periode?: 'monatlich' | 'jaehrlich';
}

export interface GruendungState {
  kosten: KostenPosition[];
}

export interface DarlehenConfig {
  betrag: number;
  zinssatz: number; // in percent, e.g. 3.5 means 3.5%
  monatlicherZuschuss: number; // monthly additional shareholder loan amount
  endfaellig: boolean; // if true, interest deferred to end
  tilgungsdatum?: string; // ISO date for early repayment
}

export type DienstwagenMethode = 'pauschal' | 'fahrtenbuch';
export type DienstwagenAntriebsart = 'benzin_diesel' | 'hybrid' | 'elektro';

export interface DienstwagenConfig {
  /** Whether the company car programme is active. */
  aktiv: boolean;
  /** Gross list price (Bruttolistenpreis) including VAT and optional equipment in €. */
  bruttolistenpreis: number;
  /** Method of tax calculation: 'pauschal' (1%-Regelung) or 'fahrtenbuch'. */
  methode: DienstwagenMethode;
  /** Engine type: 'benzin_diesel' (1%), 'hybrid' (0.5%), 'elektro' (0.25% up to 70k, else 0.5%). */
  antriebsart: DienstwagenAntriebsart;
  /** Total annual costs incurred by GmbH (leasing, electricity/fuel, insurance, maintenance). */
  jaehrlicheGesamtkosten: number;
  /** Percentage of private use (used for Fahrtenbuch and feasibility check, e.g. 30 = 30%). */
  anteilPrivatProzent: number;
  /** One-way distance between home and office in km (Entfernung Wohnung-Arbeitsstätte). */
  entfernungWohnungArbeitsstaetteKm: number;
}

export interface BenefitConfig {
  tankgutschein: number; // monthly fuel voucher (tax-free up to 50€/month)
  /** Whether the fuel-voucher benefit is active. Defaults to true. */
  tankgutscheinAktiv?: boolean;
  /** Employer contribution to company pension plan (bAV), annual amount in €. */
  bavBeitragJaehrlich?: number;
  /** Whether the bAV contribution is active. */
  bavAktiv?: boolean;
  /** Internet flat-rate benefit, monthly amount in €. Max. 50 €/month tax-free. */
  internetPauschaleMonatlich?: number;
  /** Whether the Internet flat-rate benefit is active. */
  internetPauschaleAktiv?: boolean;
  /** Employer-funded VL (vermögenswirksame Leistungen), monthly amount in €. */
  vermoegenswirksameLeistungenMonatlich?: number;
  /** Whether VL is active. */
  vermoegenswirksameLeistungenAktiv?: boolean;
  strategieessen: number; // annual strategy dinner (deductible)
  /** Whether the strategy-dinner benefit is active. Defaults to true. */
  strategieessenAktiv?: boolean;
  essenszuschussProTag: number; // daily meal subsidy (UI default: 7.67€/day)
  essenszuschussTageProJahr: number; // subsidized meal days per year
  /** Whether the meal-subsidy benefit is active. Defaults to true. */
  essenszuschussAktiv?: boolean;
  /** Configuration for company car (Dienstwagen). */
  dienstwagen?: DienstwagenConfig;
}

export interface StillerGesellschafterConfig {
  /** Whether the silent partner arrangement is active. */
  aktiv: boolean;
  /**
   * Participation type:
   * - 'typisch': standard silent partner – only shares in profits/losses, not in hidden reserves.
   * - 'atypisch': creates a Mitunternehmerschaft – also participates in hidden reserves and goodwill.
   */
  typ: 'typisch' | 'atypisch';
  /** Capital contribution of the silent partner in €. Invested into the ETF pool at the start. */
  einlage: number;
  /** Annual profit share paid to the silent partner (% of simulated operating profit). */
  gewinnbeteiligungProzent: number;
  /** Minimum annual interest on the Einlage (% p.a.), paid regardless of profit. */
  zinssatz: number;
}

export interface HoldingConfig {
  /** Whether the GmbH is structured as a holding company with preferential treatment for dividends / sales. */
  aktiv: boolean;
  /** Tax-free share of profit distribution / sale proceeds in %, e.g. 95 means 95% tax-free. */
  steuerfreibetragProzent?: number;
}

export interface FirmenhandyConfig {
  /** Whether the company-phone programme is active at all. */
  aktiv: boolean;
  /** Purchase price of the phone in €. */
  anschaffungskosten: number;
  /**
   * Fraction of the purchase price recovered as resale proceeds when the old
   * phone is sold before buying a new one (0–1, e.g. 0.1 = 10 %).
   * Applies from the second purchase onward; the first purchase has no old
   * device to sell.
   */
  restwertQuote: number;
  /** How many years between phone replacements. */
  ersatzzyklusJahre: number;
  /**
   * The operating-phase year in which the very first phone is purchased
   * (1-based, default 1 = first year of the Betrieb phase).
   * Years before this are treated as if the phone programme hasn't started yet.
   */
  erstanschaffungJahr?: number;
}

export interface InvestitionsPosition {
  id: string;
  bezeichnung: string;
  /** Initial capital invested (€). */
  kapital: number;
  /** Annual profit (positive) or loss (negative) in €. */
  gewinnVerlustProJahr: number;
  /** Annual capital appreciation rate in % (e.g. 3 means 3 % p.a.). */
  wertsteigerung: number;
  /** Loan amount taken to finance this investment (€). Optional. */
  kredit?: number;
  /** Annual interest rate on the investment loan (%, e.g. 3 means 3 % p.a.). */
  zinssatz?: number;
  /** Annual principal repayment on the investment loan (€). */
  tilgungsrateJaehrlich?: number;
}

export interface InvestitionsErgebnis {
  id: string;
  bezeichnung: string;
  endkapital: number;
  gesamtGewinnVerlust: number;
  gesamtRendite: number;
  jahreswerte: {
    jahr: number;
    kapital: number;
    kumulierterGewinnVerlust: number;
    zinsaufwand: number;
    tilgung: number;
    restschuld: number;
    nettoCashflow: number;
    kumulierterNettoCashflow: number;
  }[];
}

import { Steuerjahr } from "./parameters";
import type { EtfLot } from "./calculations/etf";

export interface BetriebState {
  steuerjahr?: Steuerjahr;
  anzahlKinder?: number;
  startkapital: number;
  /** Annual cash inflow that stays liquid and is not invested into ETFs. */
  jaehrlicherCashZuschuss: number;
  /** Capital gains tax rate for private ETF taxation (in %, e.g. 15). */
  kapitalertragsteuerSatz?: number;
  /** Annual tax-free allowance for private capital gains (Sparerpauschbetrag § 20 Abs. 9 EStG). Default: 1000 €. */
  sparerpauschbetrag?: number;
  /** Körperschaftsteuer rate for the GmbH (in %, e.g. 15). Default: 15. */
  koerperschaftsteuerSatz?: number;
  /** Solidaritätszuschlag rate applied on top of Körperschaftsteuer (in %, e.g. 5.5). Default: 5.5. */
  solidaritaetszuschlagSatz?: number;
  /** Gewerbesteuer rate for the GmbH (in %, e.g. 14). Default: 14. */
  gewerbesteuerSatz?: number;
  /** One-off investment deduction amount (IAB) in the selected Betriebs year. */
  investitionsabzugsbetrag?: number;
  /** Betriebs year in which the IAB is claimed (1-based). */
  investitionsabzugsbetragJahr?: number;
  /** Annual simulated operating profit during Betrieb phase. */
  simulierterGewinn?: number;
  /** Personal marginal tax rate of the shareholder (in %, e.g. 42). Used only for private comparison of operating profit. */
  persoenlicherGrenzsteuersatz?: number;
  /** Annual overall target net amount during Betrieb phase. */
  zielnettoGesellschafter?: number;
  /** Annual gross managing-director salary treated as operating expense. */
  geschaeftsfuehrergehalt?: number;
  darlehen: DarlehenConfig;
  etfRendite: number; // in percent, e.g. 7 means 7% p.a.
  /** Optional annual inflation rate (in %, e.g. 2 means 2% p.a.). Default: 2. */
  inflationsrate?: number;
  /** Whether to display real values (purchasing power / Kaufkraft) discounted for inflation. Default: false. */
  realwerteAnzeigen?: boolean;
  laufzeitJahre: number;
  kosten: KostenPosition[];
  benefits: BenefitConfig;
  /** Configuration for the company mobile-phone programme. */
  firmenhandy?: FirmenhandyConfig;
  /** Configuration for the silent partner (stiller Gesellschafter). */
  stillerGesellschafter?: StillerGesellschafterConfig;
  /** Holding-structure configuration for 95 %-tax-free dividend / exit treatment. */
  holding?: HoldingConfig;
  /** List of additional investments in the GmbH. */
  investitionen?: InvestitionsPosition[];
}

/**
 * Per-benefit active flags for the Ende (payout) phase.
 * When a flag is undefined the value falls back to the corresponding Betrieb flag.
 */
export interface EndeBenefitAktivConfig {
  tankgutscheinAktiv?: boolean;
  essenszuschussAktiv?: boolean;
  strategieessenAktiv?: boolean;
  /** Whether the company-phone programme counts in the Ende phase. */
  firmenhandyAktiv?: boolean;
  /** Whether the company-car programme counts in the Ende phase. */
  dienstwagenAktiv?: boolean;
}

export interface EndeState {
  geschaeftsfuehrergehalt: number; // annual gross salary for Bereich 2 (regular payout phase)
  /** Annual simulated operating profit during Ende phase (before Betriebsausgaben and benefits). */
  simulierterGewinn?: number;
  /** Personal marginal tax rate of shareholder for dividend taxation (in %, e.g. 42). Default: 42. */
  persoenlicherSteuersatz?: number;
  /** Per-benefit active overrides for the Ende phase (independent from Betrieb toggles). */
  benefitAktiv?: EndeBenefitAktivConfig;
  /** One-time equity increase invested into ETF at the start of the Ende phase. */
  stammkapitalErhoehungEtf: number;
  /** Optional holding-structure configuration for the exit phase. */
  holding?: HoldingConfig;
  /** Annual gross salary for Bereich 1 settlement year (frei konfigurierbar, nur >= 0). */
  gehaltBereich1: number;
  /** Tax-free principal payout consumed in Bereich 1 before the remaining principal becomes the new shareholder loan. */
  teiltilgungBereich1: number;
  gewinnausschuettung: number; // annual profit distribution
  tilgungsrate: number; // annual principal repayment in payout phase (0 = linear by remaining years)
  laufzeitJahre: number;
  /** Target net income for Bereich 1 (the single year that settles deferred interest). Default 17 000 €. */
  zielnettoBereich1: number;
  /** Target net income per year for Bereich 2 (regular payout years, darlehen = 0). */
  zielnettoBereich2: number;
  /** Whether the payout-phase shareholder loan should be endfällig (settled at the end). */
  darlehenEndfaellig?: boolean;
  /**
   * Additional shareholder loan granted to the GmbH from private funds at the start of Bereich 2.
   * The capital is invested into the ETF; interest is paid annually and taxed at the progressive
   * Einkommensteuer rate (§ 32d Abs. 2 Nr. 1b EStG). The principal remains in the GmbH until
   * the end of the Ende phase and is tracked as a liability (firmenDarlehensverbindlichkeit).
   */
  privatDarlehenBetrag?: number;
  /** Annual interest rate on the private-side shareholder loan (% p.a., e.g. 3 means 3 %). */
  privatDarlehenZinssatz?: number;
}

export interface CalculatorState {
  gruendung: GruendungState;
  betrieb: BetriebState;
  ende: EndeState;
}

export interface JahresErgebnis {
  jahr: number;
  gesamtvermoegen: number;
  gewinn: number;
  steuer: number;
  nettogewinn: number;
  details: Record<string, number>;
  betriebskostenPosten?: {
    label: string;
    wert: number;
  }[];
  etfLots?: EtfLot[];
}
