import { EndeState, JahresErgebnis } from "../types";

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

const KAPITALERTRAGSTEUER_MIT_SOLI_RATE = 0.25 * (1 + 0.055);

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
 * Income sources:
 * - Geschäftsführergehalt (salary) – taxed at progressive Einkommensteuer
 * - Darlehensauszahlung (shareholder loan servicing):
 *   - Zinsanteil taxed at 26.375% Abgeltungssteuer
 *   - Tilgungsanteil tax-free principal repayment
 * - Gewinnausschüttung (profit distribution) – taxed at best-of Abgeltungssteuer / Teileinkünfte
 * - Benefits (ongoing non-cash perks from GmbH)
 */
export function berechneEndeErgebnisse(
  state: EndeState,
  etfWertAnfang: number = 0,
  darlehenRestschuldAnfang: number = 0,
  darlehenZinssatzPercent: number = 0
): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  let restvermoegen = etfWertAnfang;
  let firmenEtfVermoegen = Math.max(0, etfWertAnfang);
  let restdarlehen = Math.max(0, darlehenRestschuldAnfang);

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const bruttoGehalt = state.geschaeftsfuehrergehalt;
    const nettoGehalt = berechneNettoGehalt(bruttoGehalt);
    const einkommensteuer = berechneEinkommensteuer(bruttoGehalt);
    const soli = berechneSoli(einkommensteuer);

    const verbleibendeJahre = state.laufzeitJahre - jahr + 1;
    const {
      zinsertragBrutto: darlehenZinsen,
      tilgungsanteil: darlehenTilgung,
      gesamtauszahlungBrutto: darlehenGesamtauszahlungBrutto,
    } = berechneDarlehensAuszahlung(
      restdarlehen,
      darlehenZinssatzPercent,
      verbleibendeJahre,
      state.tilgungsrate
    );
    const darlehenZinsenSteuer = darlehenZinsen * KAPITALERTRAGSTEUER_MIT_SOLI_RATE;
    const darlehenZinsenNetto = darlehenZinsen - darlehenZinsenSteuer;
    const darlehenGesamtauszahlungNetto = darlehenZinsenNetto + darlehenTilgung;

    const { nettoAusschuettung, kstSteuer, ausschuettungsteuer } =
      berechneNettoAusschuettung(state.gewinnausschuettung);

    const gesamtBrutto = bruttoGehalt + state.gewinnausschuettung + darlehenGesamtauszahlungBrutto;
    const gesamtSteuer = einkommensteuer + soli + kstSteuer + ausschuettungsteuer + darlehenZinsenSteuer;
    const gesamtNetto = nettoGehalt + nettoAusschuettung + darlehenGesamtauszahlungNetto;
    const firmenAuszahlungBrutto = bruttoGehalt + state.gewinnausschuettung + darlehenGesamtauszahlungBrutto + kstSteuer;

    restvermoegen += gesamtNetto;
    firmenEtfVermoegen = Math.max(0, firmenEtfVermoegen - firmenAuszahlungBrutto);
    restdarlehen = Math.max(0, restdarlehen - darlehenTilgung);
    const firmenNettovermoegen = firmenEtfVermoegen - restdarlehen;

    ergebnisse.push({
      jahr,
      gesamtvermoegen: restvermoegen,
      gewinn: gesamtBrutto,
      steuer: gesamtSteuer,
      nettogewinn: gesamtNetto,
      details: {
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
        firmenAuszahlungBrutto,
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
