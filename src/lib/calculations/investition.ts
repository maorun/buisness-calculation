import { InvestitionsPosition, InvestitionsErgebnis } from "../types";

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
