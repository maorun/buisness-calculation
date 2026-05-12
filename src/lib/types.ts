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
}

export interface BetriebState {
  startkapital: number;
  darlehen: DarlehenConfig;
  etfRendite: number; // in percent, e.g. 7 means 7% p.a.
  laufzeitJahre: number;
  kosten: KostenPosition[];
  benefits: BenefitConfig;
}

export interface EndeState {
  geschaeftsfuehrergehalt: number; // annual gross salary for Bereich 2 (regular payout phase)
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
}
