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

export interface BenefitConfig {
  tankgutschein: number; // monthly fuel voucher (tax-free up to 50€/month)
  strategieessen: number; // annual strategy dinner (deductible)
  /** Annual employer contribution to company pension scheme (bAV, § 3 Nr. 63 EStG).
   *  Tax-free for the GF up to 8% of the Beitragsbemessungsgrenze (BBG), fully
   *  deductible as a business expense for the GmbH. */
  bav: number;
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

export interface BetriebState {
  startkapital: number;
  /** Annual cash inflow that stays liquid and is not invested into ETFs. */
  jaehrlicherCashZuschuss: number;
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
  laufzeitJahre: number;
  kosten: KostenPosition[];
  benefits: BenefitConfig;
  /** Configuration for the company mobile-phone programme. */
  firmenhandy?: FirmenhandyConfig;
  /** Configuration for the silent partner (stiller Gesellschafter). */
  stillerGesellschafter?: StillerGesellschafterConfig;
  /** List of additional investments in the GmbH. */
  investitionen?: InvestitionsPosition[];
}

export interface EndeState {
  geschaeftsfuehrergehalt: number; // annual gross salary for Bereich 2 (regular payout phase)
  /** One-time equity increase invested into ETF at the start of the Ende phase. */
  stammkapitalErhoehungEtf: number;
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
}
