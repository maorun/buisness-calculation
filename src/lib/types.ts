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
  endfaellig: boolean; // if true, interest deferred to end
  tilgungsdatum?: string; // ISO date for early repayment
}

export interface BenefitConfig {
  handy: number; // monthly phone benefit (tax-free up to 50€/month)
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
  geschaeftsfuehrergehalt: number; // annual gross salary
  gewinnausschuettung: number; // annual profit distribution
  darlehenZinsen: number; // annual interest income from shareholder loan to GmbH
  laufzeitJahre: number;
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
