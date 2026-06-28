import { EndeState, JahresErgebnis, KostenPosition, BenefitConfig, FirmenhandyConfig } from "../types";
import {
  berechneVorabpauschale,
  berechneVorabpauschalesteuer,
  berechneBetriebskosten,
  berechneBetriebskostenPosten,
  berechneHandyNettoKostenProJahr,
  berechneBenefitsKosten,
  DEFAULT_FIRMENHANDY_CONFIG,
  TEILFREISTELLUNG_AKTIEN_GMBH,
  GMBH_STEUER_GESAMT,
} from "./betrieb";

export const DEFAULT_ZIELNETTO_BEREICH1 = 17000;
export const DEFAULT_ZIELNETTO_BEREICH2 = 17000;
// Annualized lower bound of the 556 € monthly Übergangsbereich threshold (§ 20 Abs. 2 SGB IV).
export const MIDIJOB_MONAT_MIN = 556;
export const MIDIJOB_JAHR_MIN = MIDIJOB_MONAT_MIN * 12;
export const MIDIJOB_JAHR_MAX = 24000;
export const REINVESTIERTES_DARLEHEN_ZINSSATZ = 3;
export const GKV_BEITRAGSSATZ = 0.146 + 0.025; // allgemeiner Satz + durchschnittlicher Zusatzbeitrag
export const GKV_BEMESSUNG_MONAT_MAX = 5512.5;
export const GKV_BEMESSUNG_JAHR_MAX = GKV_BEMESSUNG_MONAT_MAX * 12;

// Progressive German income tax brackets 2024 (approximation)
// https://www.bundesfinanzministerium.de
export function berechneEinkommensteuer(zvE: number): number {
  if (zvE <= 11604) return 0; // Grundfreibetrag 2024

  if (zvE <= 17005) {
    const y = (zvE - 11604) / 10000;
    return Math.floor((922.98 * y + 1400) * y);
  }

  if (zvE <= 66760) {
    const z = (zvE - 17005) / 10000;
    return Math.floor((181.19 * z + 2397) * z + 1025.38);
  }

  if (zvE <= 277825) {
    return Math.floor(0.42 * zvE - 10602.13);
  }

  // Top rate (Spitzensteuersatz / Reichensteuersatz)
  return Math.floor(0.45 * zvE - 17374.99);
}

/**
 * Solidaritätszuschlag on income tax (abolished for most taxpayers since 2021,
 * but still applies to higher incomes).
 */
export function berechneSoli(einkommensteuer: number): number {
  // Soli abolished below ~16,956 € ESt (2024)
  if (einkommensteuer <= 16956) return 0;
  return Math.floor(einkommensteuer * 0.055);
}

/**
 * Net salary after income tax and Soli.
 * (Simplified: no church tax, no social security – GmbH-GF can opt out of some)
 */
export function berechneNettoGehalt(bruttoGehalt: number): number {
  const est = berechneEinkommensteuer(bruttoGehalt);
  const soli = berechneSoli(est);
  return bruttoGehalt - est - soli;
}

/**
 * Tax on Gewinnausschüttung (profit distribution from GmbH to shareholder).
 *
 * Two options in German law:
 * 1. Abgeltungssteuer: flat 25% + Soli = 26.375%
 * 2. Teileinkünfteverfahren: 60% taxable at personal rate (useful if marginal rate < 41.67%)
 *
 * We calculate both and return the more favourable one.
 */
export function berechneGewinnausschuettungsteuer(
  ausschuettung: number,
  persönlicherSteuersatz: number = 0.42
): { steuer: number; methode: string } {
  // Option 1: Abgeltungssteuer
  const abgeltungssteuer = ausschuettung * 0.25 * (1 + 0.055);

  // Option 2: Teileinkünfteverfahren – 60% taxable
  const teileinkuenfte = ausschuettung * 0.6 * persönlicherSteuersatz;
  const teileinkuenfteSoli = berechneSoli(teileinkuenfte);
  const teileinkuenfteGesamt = teileinkuenfte + teileinkuenfteSoli;

  if (abgeltungssteuer <= teileinkuenfteGesamt) {
    return { steuer: abgeltungssteuer, methode: "Abgeltungssteuer" };
  }
  return { steuer: teileinkuenfteGesamt, methode: "Teileinkünfteverfahren" };
}

/**
 * Net dividend after GmbH has already paid Körperschaftsteuer (KSt) and
 * after shareholder pays dividend tax.
 *
 * @param gewinnVorKSt  Profit before corporate tax
 * @param kstRate       KSt + Soli rate (default 15.825%)
 */
export function berechneNettoAusschuettung(
  gewinnVorKSt: number,
  kstRate: number = 0.15825
): { nettoAusschuettung: number; kstSteuer: number; ausschuettungsteuer: number } {
  const kstSteuer = gewinnVorKSt * kstRate;
  const ausschuettung = gewinnVorKSt - kstSteuer;
  const { steuer: ausschuettungsteuer } = berechneGewinnausschuettungsteuer(ausschuettung);
  const nettoAusschuettung = ausschuettung - ausschuettungsteuer;
  return { nettoAusschuettung, kstSteuer, ausschuettungsteuer };
}

export const KAPITALERTRAGSTEUER_MIT_SOLI_RATE = 0.25 * (1 + 0.055);

/**
 * Marginal income tax attributable to shareholder-loan interest.
 *
 * For a shareholder holding ≥10% of a GmbH the interest on their loan to the GmbH
 * is excluded from the flat Abgeltungssteuer and instead taxed at the personal
 * progressive rate (§ 32d Abs. 2 Nr. 1b EStG).
 *
 * We compute the marginal tax by comparing combined (salary + interest) tax to
 * salary-only tax. This gives the exact additional tax burden the interest causes.
 */
export function berechneDarlehensZinsenSteuer(
  zinsen: number,
  bruttoGehalt: number
): number {
  if (zinsen <= 0) return 0;
  const gehaltNorm = Math.max(0, bruttoGehalt);
  const estNurGehalt = berechneEinkommensteuer(gehaltNorm);
  const soliNurGehalt = berechneSoli(estNurGehalt);
  const estKombiniert = berechneEinkommensteuer(gehaltNorm + zinsen);
  const soliKombiniert = berechneSoli(estKombiniert);
  return (estKombiniert + soliKombiniert) - (estNurGehalt + soliNurGehalt);
}

/**
 * Calculates how much annual gross salary can still be paid before the
 * shareholder's taxable salary + interest reaches the Midijob ceiling.
 */
export function berechneRestlichesMidijobGehalt(
  zinsen: number,
  jahreslimit: number = MIDIJOB_JAHR_MAX
): number {
  return Math.max(0, jahreslimit - Math.max(0, zinsen));
}

/**
 * Calculates the flexible principal withdrawal needed to close a yearly
 * Zielnetto gap after salary, interest and any distribution have been counted.
 */
export function berechneFlexibleTilgung(
  zielnetto: number,
  konsumVorTilgung: number,
  restdarlehen: number
): number {
  if (zielnetto <= 0 || restdarlehen <= 0) return 0;
  const lueckeZumZielnetto = Math.max(0, zielnetto - konsumVorTilgung);
  return Math.min(lueckeZumZielnetto, restdarlehen);
}

/**
 * Gesetzlicher Krankenversicherungsbeitrag für freiwillig gesetzlich versicherte
 * Personen (vereinfachte Näherung mit Beitragsbemessungsgrenze).
 * Wird aus dem bereits versteuerten Netto getragen.
 */
export function berechneGesetzlicheKrankenversicherungBeitrag(
  jahresEinnahmen: number,
  beitragssatz: number = GKV_BEITRAGSSATZ,
  beitragsbemessungJahrMax: number = GKV_BEMESSUNG_JAHR_MAX
): number {
  const einnahmen = Math.max(0, jahresEinnahmen);
  const beitragspflichtigeEinnahmen = Math.min(einnahmen, beitragsbemessungJahrMax);
  return beitragspflichtigeEinnahmen * Math.max(0, beitragssatz);
}

export function berechneDarlehensAuszahlung(
  restschuld: number,
  zinssatzPercent: number,
  verbleibendeJahre: number,
  tilgungsrateJaehrlich: number = 0
): { zinsertragBrutto: number; tilgungsanteil: number; gesamtauszahlungBrutto: number } {
  const normalizedRestschuld = Math.max(0, restschuld);
  const normalizedZinssatz = Math.max(0, zinssatzPercent);
  const normalizedVerbleibendeJahre = Math.max(1, verbleibendeJahre);
  const normalizedTilgungsrate = Math.max(0, tilgungsrateJaehrlich);

  if (normalizedRestschuld === 0) {
    return { zinsertragBrutto: 0, tilgungsanteil: 0, gesamtauszahlungBrutto: 0 };
  }

  const zinsertragBrutto = normalizedRestschuld * (normalizedZinssatz / 100);
  const tilgungsanteilLinear = normalizedRestschuld / normalizedVerbleibendeJahre;
  const tilgungsanteil = normalizedTilgungsrate > 0
    ? Math.min(normalizedRestschuld, normalizedTilgungsrate)
    : tilgungsanteilLinear;
  return {
    zinsertragBrutto,
    tilgungsanteil,
    gesamtauszahlungBrutto: zinsertragBrutto + tilgungsanteil,
  };
}

/**
 * Calculate yearly Ende results.
 * The Ende phase represents the wind-down / distribution phase.
 *
 * Two parties are involved:
 * - **GmbH** (Party 1): holds the ETF portfolio and outstanding shareholder loan obligation.
 * - **Gesellschafter** (Party 2 / shareholder): receives loan repayments, interest, salary and
 *   optional Gewinnausschüttung. The GmbH is NOT liquidated; it continues operating.
 *
 * When the Betrieb loan is endfällig (interest deferred to end), the Ende phase is split:
 *
 * **Bereich 1** (single settlement year, only when endfaellig = true):
 *   - The GmbH repays the full loan principal (tax-free for the shareholder) and all
 *     accumulated deferred interest (taxed at progressive Einkommensteuer) to the shareholder.
 *   - The shareholder salary is freely configurable (only non-negative).
 *   - A configurable Teil-Tilgung can be consumed directly in Bereich 1.
 *   - Interest payments count towards the Bereich-1 Zielnetto as well.
 *   - The remaining principal becomes a new shareholder loan to the GmbH at 3% p.a.
 *     for the following payout years.
 *   - The zielnetto target for this settlement year is state.zielnettoBereich1
 *     (default 17 000 €/a).
 *
 * **Bereich 2** (remaining laufzeitJahre years):
 *   - For endfällig loans, the new 3%-loan from Bereich 1 is carried forward.
 *   - The salary is taken from state.geschaeftsfuehrergehalt (freely configurable).
 *   - If the annual netto from salary + interest + Ausschüttung is still below the target,
 *     principal is withdrawn flexibly from the new shareholder loan.
 *   - For non-endfällig loans, the previous salary and tilgung logic stays unchanged.
 *   - The zielnetto target is state.zielnettoBereich2.
 *
 * Income sources (per year):
 * - Geschäftsführergehalt (salary) – taxed at progressive Einkommensteuer
 * - Darlehensauszahlung (shareholder loan servicing):
 *   - Zinsanteil taxed at progressive Einkommensteuer
 *   - Tilgungsanteil tax-free principal repayment
 * - Gewinnausschüttung (profit distribution) – taxed at best-of Abgeltungssteuer / Teileinkünfte
 * - Gesetzliche Krankenversicherung (vereinfachte Näherung) – paid from net income
 */
export function berechneEndeErgebnisse(
  state: EndeState,
  etfWertAnfang: number = 0,
  darlehenRestschuldAnfang: number = 0,
  darlehenZinssatzPercent: number = 0,
  aufgelaufeneZinsen: number = 0,
  endfaellig: boolean = false,
  etfRenditePercent: number = 0,
  kosten: KostenPosition[] = [],
  benefits: BenefitConfig = {
    tankgutschein: 0,
    strategieessen: 0,
    essenszuschussProTag: 0,
    essenszuschussTageProJahr: 0,
    bav: 0,
  },
  firmenhandy: FirmenhandyConfig = DEFAULT_FIRMENHANDY_CONFIG
): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  const stammkapitalErhoehungEtf = Math.max(0, state.stammkapitalErhoehungEtf ?? 0);
  let privatvermoegen = 0;
  let firmenEtfVermoegen = Math.max(0, etfWertAnfang) + stammkapitalErhoehungEtf;
  let reinvestiertesDarlehen = 0;
  // Tracks the sequential year within the Ende phase for the 3-year phone replacement cycle.
  let endePhaseJahr = 1;

  // --- Bereich 1: settlement year for endfällig deferred interest ---
  if (endfaellig) {
    const aufgelaufeneZinsenNorm = Math.max(0, aufgelaufeneZinsen);
    const darlehensrueckzahlung = Math.max(0, darlehenRestschuldAnfang); // principal, tax-free
    const firmenEtfVermoegenVorBereich1 = firmenEtfVermoegen;
    const firmenDarlehensverbindlichkeitAlt = darlehensrueckzahlung;
    const bruttoGehalt = Math.max(0, state.gehaltBereich1);

    // ETF growth for Bereich 1
    const etfVorWachstumB1 = firmenEtfVermoegen;
    const etfNachWachstumB1 = etfVorWachstumB1 * (1 + etfRenditePercent / 100);
    const theoretischerEtfErtragB1 = Math.max(0, etfNachWachstumB1 - etfVorWachstumB1);
    const vorabpauschaleB1 = berechneVorabpauschale(etfVorWachstumB1, etfNachWachstumB1);
    const vorabpauschalesteuerB1 = berechneVorabpauschalesteuer(vorabpauschaleB1, TEILFREISTELLUNG_AKTIEN_GMBH, GMBH_STEUER_GESAMT);

    // Betriebskosten for Bereich 1 (running GmbH costs continue in Ende phase)
    const jaehrlicheKostenB1 = berechneBetriebskosten(kosten);
    const handyNettoKostenB1 = berechneHandyNettoKostenProJahr(endePhaseJahr, firmenhandy);
    const benefitsKostenB1 = berechneBenefitsKosten(benefits);
    const betriebskostenPostenB1 = berechneBetriebskostenPosten(kosten, benefits, handyNettoKostenB1, firmenhandy);
    const betriebsausgabenGesamtB1 = jaehrlicheKostenB1 + handyNettoKostenB1 + benefitsKostenB1;
    const gewinnNachBetriebsausgabenB1 = theoretischerEtfErtragB1 - betriebsausgabenGesamtB1;
    const gmbhSteuerB1 = gewinnNachBetriebsausgabenB1 > 0 ? gewinnNachBetriebsausgabenB1 * GMBH_STEUER_GESAMT : 0;
    endePhaseJahr++;

    const einkommensteuer = berechneEinkommensteuer(bruttoGehalt);
    const soli = berechneSoli(einkommensteuer);
    const nettoGehalt = berechneNettoGehalt(bruttoGehalt);

    // Tax on deferred interest: progressive Einkommensteuer (§ 32d Abs. 2 Nr. 1b EStG),
    // NOT flat Abgeltungssteuer. Marginal tax = combined(salary + interest) - salary-only tax.
    const zinsSteuer = berechneDarlehensZinsenSteuer(aufgelaufeneZinsenNorm, bruttoGehalt);
    const zinsenNetto = aufgelaufeneZinsenNorm - zinsSteuer;

    // Net loan return (principal + after-tax interest)
    const darlehenNettoAuszahlung = darlehensrueckzahlung + zinsenNetto;

    // Bereich 1 target net counts salary, after-tax interest and the configurable
    // partial principal repayment that is not rolled into the new shareholder loan.
    const beitragspflichtigeEinnahmenGkv = bruttoGehalt + aufgelaufeneZinsenNorm;
    const gesetzlicheKrankenversicherungBeitrag = berechneGesetzlicheKrankenversicherungBeitrag(
      beitragspflichtigeEinnahmenGkv
    );
    const zielnettoBereich1 = state.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1;
    const konsumVorAutomatischerTilgungBereich1 = nettoGehalt + zinsenNetto - gesetzlicheKrankenversicherungBeitrag;
    const teiltilgungBereich1 = berechneFlexibleTilgung(
      zielnettoBereich1,
      konsumVorAutomatischerTilgungBereich1,
      darlehensrueckzahlung
    );
    reinvestiertesDarlehen = Math.max(0, darlehensrueckzahlung - teiltilgungBereich1);
    const konsumierbaresNettoBereich1VorGkv = nettoGehalt + zinsenNetto + teiltilgungBereich1;
    const konsumierbaresNettoBereich1 = konsumierbaresNettoBereich1VorGkv - gesetzlicheKrankenversicherungBeitrag;
    const gesamtBrutto = darlehensrueckzahlung + aufgelaufeneZinsenNorm + bruttoGehalt;
    const gesamtSteuer = zinsSteuer + einkommensteuer + soli + vorabpauschalesteuerB1 + gmbhSteuerB1;

    // The GmbH ETF grows first, then funds the full gross repayment + salary + running costs.
    // The shareholder immediately relends the reinvestiertesDarlehen portion back to the GmbH,
    // so the net ETF outflow is only (teiltilgungBereich1 + interest + salary + Betriebskosten).
    const firmenGesamtabfluss = darlehensrueckzahlung + aufgelaufeneZinsenNorm + bruttoGehalt + betriebsausgabenGesamtB1 + vorabpauschalesteuerB1 + gmbhSteuerB1;
    firmenEtfVermoegen = Math.max(0, etfNachWachstumB1 - firmenGesamtabfluss + reinvestiertesDarlehen);
    const firmenGuVGehaltAufwand = bruttoGehalt;
    const firmenGuVZinsaufwand = aufgelaufeneZinsenNorm;
    const firmenGuVSummeAufwand = firmenGuVGehaltAufwand + firmenGuVZinsaufwand + betriebsausgabenGesamtB1;
    const firmenGuVSaldo = theoretischerEtfErtragB1 - firmenGuVSummeAufwand;

    // Only the consumable net (salary + net interest + teiltilgung - GKV) accrues to the
    // shareholder's wealth here. The reinvested principal (reinvestiertesDarlehen) is NOT
    // a new gain – it is the same loan reorganised into a new 3%-instrument and will be
    // counted when it is actually repaid in Bereich 2.
    privatvermoegen += konsumierbaresNettoBereich1;
    const firmenNettovermoegenBereich1 = firmenEtfVermoegen - reinvestiertesDarlehen;

    ergebnisse.push({
      jahr: 1,
      gesamtvermoegen: privatvermoegen + firmenNettovermoegenBereich1,
      gewinn: gesamtBrutto,
      steuer: gesamtSteuer,
      nettogewinn: konsumierbaresNettoBereich1,
      details: {
        bereich: 1,
        zielnetto: zielnettoBereich1,
        bruttoGehalt,
        nettoGehalt,
        einkommensteuer,
        soli,
        // Deferred-interest settlement
        aufgelaufeneZinsen: aufgelaufeneZinsenNorm,
        zinsSteuerBereich1: zinsSteuer,
        zinsenNettoBereich1: zinsenNetto,
        gesetzlicheKrankenversicherungBeitrag,
        beitragspflichtigeEinnahmenGkv,
        darlehensrueckzahlung,
        darlehenNettoAuszahlung,
        teiltilgungBereich1,
        // No ongoing tilgung in Bereich 1 (full repayment in one shot)
        darlehenZinsen: aufgelaufeneZinsenNorm,
        darlehenZinsenSteuer: zinsSteuer,
        darlehenZinsenNetto: zinsenNetto,
        darlehenTilgung: darlehensrueckzahlung,
        darlehenGesamtauszahlungBrutto: gesamtBrutto - bruttoGehalt,
        darlehenGesamtauszahlungNetto: darlehenNettoAuszahlung,
        konsumierbaresNettoBereich1VorGkv,
        konsumierbaresNettoBereich1,
        restdarlehen: reinvestiertesDarlehen,
        neuesDarlehenStart: reinvestiertesDarlehen,
        neuesDarlehenZinssatz: REINVESTIERTES_DARLEHEN_ZINSSATZ,
        firmenEtfVermoegenVorBereich1,
        firmenDarlehensverbindlichkeitAlt,
        firmenGuVGehaltAufwand,
        firmenGuVZinsaufwand,
        firmenGuVSummeAufwand,
        firmenGuVSaldo,
        firmenGesamtabfluss,
        firmenEtfVermoegen,
        firmenDarlehensverbindlichkeit: reinvestiertesDarlehen,
        firmenNettovermoegen: firmenNettovermoegenBereich1,
        stammkapitalErhoehungEtf,
        gewinnausschuettung: 0,
        nettoAusschuettung: 0,
        kstSteuer: 0,
        ausschuettungsteuer: 0,
        // ETF growth and Betriebskosten details
        theoretischerEtfErtrag: theoretischerEtfErtragB1,
        vorabpauschale: vorabpauschaleB1,
        vorabpauschalesteuer: vorabpauschalesteuerB1,
        jaehrlicheKosten: jaehrlicheKostenB1,
        betriebsausgabenGesamt: betriebsausgabenGesamtB1,
        gmbhSteuer: gmbhSteuerB1,
      },
      betriebskostenPosten: betriebskostenPostenB1,
    });
  }

  const endeDarlehenEndfaelligAktiv = state.darlehenEndfaellig ?? false;
  // --- Bereich 2: regular payout years (darlehen = 0 after Bereich 1, or normal flow) ---
  // When endfaellig, Bereich 1 creates a new shareholder loan at 3%; otherwise use the given restschuld.
  let restdarlehen = endfaellig ? reinvestiertesDarlehen : Math.max(0, darlehenRestschuldAnfang);
  let aufgelaufeneEndeDarlehenszinsen = 0;
  const bereich2StartJahr = endfaellig ? 2 : 1;

  for (let i = 1; i <= state.laufzeitJahre; i++) {
    const jahr = bereich2StartJahr + i - 1;

    // ETF growth for this year
    const etfVorWachstum = firmenEtfVermoegen;
    const etfNachWachstum = etfVorWachstum * (1 + etfRenditePercent / 100);
    const theoretischerEtfErtrag = Math.max(0, etfNachWachstum - etfVorWachstum);
    const vorabpauschale = berechneVorabpauschale(etfVorWachstum, etfNachWachstum);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(vorabpauschale, TEILFREISTELLUNG_AKTIEN_GMBH, GMBH_STEUER_GESAMT);

    // Betriebskosten for this year (running GmbH costs continue in Ende phase)
    const jaehrlicheKosten = berechneBetriebskosten(kosten);
    const handyNettoKosten = berechneHandyNettoKostenProJahr(endePhaseJahr, firmenhandy);
    const benefitsKosten = berechneBenefitsKosten(benefits);
    const betriebskostenPosten = berechneBetriebskostenPosten(kosten, benefits, handyNettoKosten, firmenhandy);
    const betriebsausgabenGesamt = jaehrlicheKosten + handyNettoKosten + benefitsKosten;
    endePhaseJahr++;

    const verbleibendeJahre = state.laufzeitJahre - i + 1;
    const darlehenZinssatz = endfaellig ? REINVESTIERTES_DARLEHEN_ZINSSATZ : darlehenZinssatzPercent;
    const {
      zinsertragBrutto: berechneteDarlehenZinsen,
      tilgungsanteil: berechneteDarlehenTilgung,
    } = berechneDarlehensAuszahlung(
      restdarlehen,
      darlehenZinssatz,
      verbleibendeJahre,
      state.tilgungsrate
    );
    const bruttoGehalt = Math.max(0, state.geschaeftsfuehrergehalt);
    const nettoGehalt = berechneNettoGehalt(bruttoGehalt);
    const einkommensteuer = berechneEinkommensteuer(bruttoGehalt);
    const soli = berechneSoli(einkommensteuer);

    const istLetztesBereich2Jahr = i === state.laufzeitJahre;
    if (endeDarlehenEndfaelligAktiv && restdarlehen > 0) {
      aufgelaufeneEndeDarlehenszinsen += restdarlehen * (Math.max(0, darlehenZinssatz) / 100);
    }
    const darlehenZinsen = endeDarlehenEndfaelligAktiv
      ? (istLetztesBereich2Jahr ? aufgelaufeneEndeDarlehenszinsen : 0)
      : berechneteDarlehenZinsen;
    const darlehenZinsenSteuer = berechneDarlehensZinsenSteuer(darlehenZinsen, bruttoGehalt);
    const darlehenZinsenNetto = darlehenZinsen - darlehenZinsenSteuer;

    const { nettoAusschuettung, kstSteuer, ausschuettungsteuer } =
      berechneNettoAusschuettung(state.gewinnausschuettung);
    const zielnetto = endeDarlehenEndfaelligAktiv ? 0 : (state.zielnettoBereich2 ?? DEFAULT_ZIELNETTO_BEREICH2);
    const beitragspflichtigeEinnahmenGkv = bruttoGehalt + darlehenZinsen + state.gewinnausschuettung;
    const gesetzlicheKrankenversicherungBeitrag = berechneGesetzlicheKrankenversicherungBeitrag(
      beitragspflichtigeEinnahmenGkv
    );
    const konsumVorTilgungVorGkv = nettoGehalt + nettoAusschuettung + darlehenZinsenNetto;
    const konsumVorTilgung = konsumVorTilgungVorGkv - gesetzlicheKrankenversicherungBeitrag;
    const darlehenTilgung = endeDarlehenEndfaelligAktiv
      ? (istLetztesBereich2Jahr ? restdarlehen : 0)
      : (endfaellig
        ? berechneFlexibleTilgung(zielnetto, konsumVorTilgung, restdarlehen)
        : berechneteDarlehenTilgung);
    const darlehenGesamtauszahlungBrutto = darlehenZinsen + darlehenTilgung;
    const darlehenGesamtauszahlungNetto = darlehenZinsenNetto + darlehenTilgung;

    // GmbH tax on net ETF gain after Betriebskosten and deductible interest
    const steuerpflichtigerGewinn = theoretischerEtfErtrag - betriebsausgabenGesamt - darlehenZinsen;
    const gmbhSteuer = steuerpflichtigerGewinn > 0 ? steuerpflichtigerGewinn * GMBH_STEUER_GESAMT : 0;

    const gesamtBrutto = bruttoGehalt + state.gewinnausschuettung + darlehenGesamtauszahlungBrutto;
    const gesamtSteuer = einkommensteuer + soli + kstSteuer + ausschuettungsteuer + darlehenZinsenSteuer + vorabpauschalesteuer + gmbhSteuer;
    const gesamtNetto =
      nettoGehalt + nettoAusschuettung + darlehenGesamtauszahlungNetto - gesetzlicheKrankenversicherungBeitrag;
    const firmenGesamtabfluss = bruttoGehalt + state.gewinnausschuettung + darlehenGesamtauszahlungBrutto + kstSteuer + betriebsausgabenGesamt + vorabpauschalesteuer + gmbhSteuer;

    privatvermoegen += gesamtNetto;
    firmenEtfVermoegen = Math.max(0, etfNachWachstum - firmenGesamtabfluss);
    restdarlehen = Math.max(0, restdarlehen - darlehenTilgung);
    const firmenNettovermoegen = firmenEtfVermoegen - restdarlehen;

    ergebnisse.push({
      jahr,
      gesamtvermoegen: privatvermoegen + firmenNettovermoegen,
      gewinn: gesamtBrutto,
      steuer: gesamtSteuer,
      nettogewinn: gesamtNetto,
      details: {
        bereich: 2,
        zielnetto,
        bruttoGehalt,
        nettoGehalt,
        einkommensteuer,
        soli,
        darlehenZinsen,
        darlehenZinsenSteuer,
        darlehenZinsenNetto,
        darlehenTilgung,
        darlehenGesamtauszahlungBrutto,
        darlehenGesamtauszahlungNetto,
        restdarlehen,
        aufgelaufeneEndeDarlehenszinsen: endeDarlehenEndfaelligAktiv ? aufgelaufeneEndeDarlehenszinsen : 0,
        neuesDarlehenZinssatz: endfaellig ? REINVESTIERTES_DARLEHEN_ZINSSATZ : darlehenZinssatzPercent,
        beitragspflichtigeEinnahmenGkv,
        gesetzlicheKrankenversicherungBeitrag,
        konsumVorTilgungVorGkv,
        konsumVorTilgung,
        firmenGesamtabfluss,
        firmenEtfVermoegen,
        firmenDarlehensverbindlichkeit: restdarlehen,
        firmenNettovermoegen,
        stammkapitalErhoehungEtf,
        gewinnausschuettung: state.gewinnausschuettung,
        nettoAusschuettung,
        kstSteuer,
        ausschuettungsteuer,
        // ETF growth and Betriebskosten details
        theoretischerEtfErtrag,
        vorabpauschale,
        vorabpauschalesteuer,
        jaehrlicheKosten,
        betriebsausgabenGesamt,
        gmbhSteuer,
      },
      betriebskostenPosten,
    });
  }

  return ergebnisse;
}
