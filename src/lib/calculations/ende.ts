import { EndeState, JahresErgebnis } from "../types";

export const DEFAULT_ZIELNETTO_BEREICH1 = 17000;
export const MIDIJOB_JAHR_MAX = 24000;
export const REINVESTIERTES_DARLEHEN_ZINSSATZ = 3;

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
 *   - The shareholder salary is automatically reduced so that salary + deferred interest
 *     only fills up to the Midijob upper limit.
 *   - The net principal plus after-tax deferred interest becomes a new shareholder loan
 *     to the GmbH at 3% p.a. for the following payout years.
 *   - The zielnetto target for this settlement year is state.zielnettoBereich1
 *     (default 17 000 €/a).
 *
 * **Bereich 2** (remaining laufzeitJahre years):
 *   - For endfällig loans, the new 3%-loan from Bereich 1 is carried forward.
 *   - The salary is automatically topped up so that salary + annual interest reaches at most
 *     the Midijob upper limit.
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
 */
export function berechneEndeErgebnisse(
  state: EndeState,
  etfWertAnfang: number = 0,
  darlehenRestschuldAnfang: number = 0,
  darlehenZinssatzPercent: number = 0,
  aufgelaufeneZinsen: number = 0,
  endfaellig: boolean = false
): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  let restvermoegen = etfWertAnfang;
  let firmenEtfVermoegen = Math.max(0, etfWertAnfang);
  let reinvestiertesDarlehen = 0;

  // --- Bereich 1: settlement year for endfällig deferred interest ---
  if (endfaellig) {
    const aufgelaufeneZinsenNorm = Math.max(0, aufgelaufeneZinsen);
    const darlehensrueckzahlung = Math.max(0, darlehenRestschuldAnfang); // principal, tax-free
    const firmenEtfVermoegenVorBereich1 = firmenEtfVermoegen;
    const firmenDarlehensverbindlichkeitAlt = darlehensrueckzahlung;

    // Salary in Bereich 1 is only high enough to fill up to the Midijob limit together
    // with the deferred interest that becomes taxable in this year.
    const bruttoGehalt = berechneRestlichesMidijobGehalt(aufgelaufeneZinsenNorm);
    const einkommensteuer = berechneEinkommensteuer(bruttoGehalt);
    const soli = berechneSoli(einkommensteuer);
    const nettoGehalt = berechneNettoGehalt(bruttoGehalt);

    // Tax on deferred interest: progressive Einkommensteuer (§ 32d Abs. 2 Nr. 1b EStG),
    // NOT flat Abgeltungssteuer. Marginal tax = combined(salary + interest) - salary-only tax.
    const zinsSteuer = berechneDarlehensZinsenSteuer(aufgelaufeneZinsenNorm, bruttoGehalt);
    const zinsenNetto = aufgelaufeneZinsenNorm - zinsSteuer;

    // Net loan return (principal + after-tax interest)
    const darlehenNettoAuszahlung = darlehensrueckzahlung + zinsenNetto;
    reinvestiertesDarlehen = darlehenNettoAuszahlung;

    // Bereich 1 target net only counts freely consumable shareholder cash.
    // The repaid principal plus the after-tax interest is immediately recycled
    // into the new shareholder loan for Bereich 2 and therefore is not part of
    // the Bereich-1 zielnetto comparison.
    const konsumierbaresNettoBereich1 = nettoGehalt;
    // gesamtNetto still tracks the full wealth effect of the year, including
    // the new shareholder-loan asset that remains invested in the GmbH.
    const gesamtNetto = darlehenNettoAuszahlung + nettoGehalt;
    const gesamtBrutto = darlehensrueckzahlung + aufgelaufeneZinsenNorm + bruttoGehalt;
    const gesamtSteuer = zinsSteuer + einkommensteuer + soli;

    // The GmbH ETF must fund the full gross repayment + salary
    const firmenGesamtabfluss = darlehensrueckzahlung + aufgelaufeneZinsenNorm + bruttoGehalt;
    firmenEtfVermoegen = Math.max(0, firmenEtfVermoegen - firmenGesamtabfluss);
    const firmenGuVGehaltAufwand = bruttoGehalt;
    const firmenGuVZinsaufwand = aufgelaufeneZinsenNorm;
    const firmenGuVSummeAufwand = firmenGuVGehaltAufwand + firmenGuVZinsaufwand;
    const firmenGuVSaldo = -firmenGuVSummeAufwand;

    restvermoegen += gesamtNetto;

    ergebnisse.push({
      jahr: 1,
      gesamtvermoegen: restvermoegen,
      gewinn: gesamtBrutto,
      steuer: gesamtSteuer,
      nettogewinn: gesamtNetto,
      details: {
        bereich: 1,
        zielnetto: state.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1,
        bruttoGehalt,
        nettoGehalt,
        einkommensteuer,
        soli,
        // Deferred-interest settlement
        aufgelaufeneZinsen: aufgelaufeneZinsenNorm,
        zinsSteuerBereich1: zinsSteuer,
        zinsenNettoBereich1: zinsenNetto,
        darlehensrueckzahlung,
        darlehenNettoAuszahlung,
        // No ongoing tilgung in Bereich 1 (full repayment in one shot)
        darlehenZinsen: aufgelaufeneZinsenNorm,
        darlehenZinsenSteuer: zinsSteuer,
        darlehenZinsenNetto: zinsenNetto,
        darlehenTilgung: darlehensrueckzahlung,
        darlehenGesamtauszahlungBrutto: gesamtBrutto - bruttoGehalt,
        darlehenGesamtauszahlungNetto: darlehenNettoAuszahlung,
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
        firmenNettovermoegen: firmenEtfVermoegen - reinvestiertesDarlehen,
        gewinnausschuettung: 0,
        nettoAusschuettung: 0,
        kstSteuer: 0,
        ausschuettungsteuer: 0,
      },
    });
  }

  // --- Bereich 2: regular payout years (darlehen = 0 after Bereich 1, or normal flow) ---
  // When endfaellig, Bereich 1 creates a new shareholder loan at 3%; otherwise use the given restschuld.
  let restdarlehen = endfaellig ? reinvestiertesDarlehen : Math.max(0, darlehenRestschuldAnfang);
  const bereich2StartJahr = endfaellig ? 2 : 1;

  for (let i = 1; i <= state.laufzeitJahre; i++) {
    const jahr = bereich2StartJahr + i - 1;

    const verbleibendeJahre = state.laufzeitJahre - i + 1;
    const {
      zinsertragBrutto: berechneteDarlehenZinsen,
      tilgungsanteil: berechneteDarlehenTilgung,
    } = berechneDarlehensAuszahlung(
      restdarlehen,
      endfaellig ? REINVESTIERTES_DARLEHEN_ZINSSATZ : darlehenZinssatzPercent,
      verbleibendeJahre,
      state.tilgungsrate
    );
    const bruttoGehalt = endfaellig
      ? berechneRestlichesMidijobGehalt(berechneteDarlehenZinsen)
      : state.geschaeftsfuehrergehalt;
    const nettoGehalt = berechneNettoGehalt(bruttoGehalt);
    const einkommensteuer = berechneEinkommensteuer(bruttoGehalt);
    const soli = berechneSoli(einkommensteuer);

    const darlehenZinsen = berechneteDarlehenZinsen;
    const darlehenZinsenSteuer = berechneDarlehensZinsenSteuer(darlehenZinsen, bruttoGehalt);
    const darlehenZinsenNetto = darlehenZinsen - darlehenZinsenSteuer;

    const { nettoAusschuettung, kstSteuer, ausschuettungsteuer } =
      berechneNettoAusschuettung(state.gewinnausschuettung);
    const zielnetto = endfaellig ? (state.zielnettoBereich2 ?? 0) : 0;
    const konsumVorTilgung = nettoGehalt + nettoAusschuettung + darlehenZinsenNetto;
    const darlehenTilgung = endfaellig
      ? berechneFlexibleTilgung(zielnetto, konsumVorTilgung, restdarlehen)
      : berechneteDarlehenTilgung;
    const darlehenGesamtauszahlungBrutto = darlehenZinsen + darlehenTilgung;
    const darlehenGesamtauszahlungNetto = darlehenZinsenNetto + darlehenTilgung;

    const gesamtBrutto = bruttoGehalt + state.gewinnausschuettung + darlehenGesamtauszahlungBrutto;
    const gesamtSteuer = einkommensteuer + soli + kstSteuer + ausschuettungsteuer + darlehenZinsenSteuer;
    const gesamtNetto = nettoGehalt + nettoAusschuettung + darlehenGesamtauszahlungNetto;
    const firmenGesamtabfluss = bruttoGehalt + state.gewinnausschuettung + darlehenGesamtauszahlungBrutto + kstSteuer;

    restvermoegen += gesamtNetto;
    firmenEtfVermoegen = Math.max(0, firmenEtfVermoegen - firmenGesamtabfluss);
    restdarlehen = Math.max(0, restdarlehen - darlehenTilgung);
    const firmenNettovermoegen = firmenEtfVermoegen - restdarlehen;

    ergebnisse.push({
      jahr,
      gesamtvermoegen: restvermoegen,
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
        neuesDarlehenZinssatz: endfaellig ? REINVESTIERTES_DARLEHEN_ZINSSATZ : darlehenZinssatzPercent,
        konsumVorTilgung,
        firmenGesamtabfluss,
        firmenEtfVermoegen,
        firmenDarlehensverbindlichkeit: restdarlehen,
        firmenNettovermoegen,
        gewinnausschuettung: state.gewinnausschuettung,
        nettoAusschuettung,
        kstSteuer,
        ausschuettungsteuer,
      },
    });
  }

  return ergebnisse;
}
