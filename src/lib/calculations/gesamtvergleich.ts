import {
  berechneInvestitionsZusammenfassung,
  berechnePrivatVergleichErgebnis,
  berechnePrivatVergleichZeitreihe,
} from "./betrieb";
import { BetriebState, JahresErgebnis } from "../types";

const PERCENT_REFERENCE_EPSILON = 0.01;

export interface GesamtvergleichKpi {
  gmbhGesamtwert: number;
  privatGesamtwert: number;
  vorteil: number;
  vorteilProzent: number | null;
  gewinnerText: string;
  zeitraumJahre: number;
}

export interface GesamtvergleichZeitreihePunkt {
  jahr: number;
  gmbh: number;
  privat: number;
}

export function formatSignedEuro(value: number): string {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
}

export function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "Privat-Vergleich = 0 €";
  }

  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} % vs. Privat`;
}

/**
 * Builds per-year override arrays for the private comparison from the Ende results.
 *
 * For Betrieb years: no override (private comparison uses its own salary/interest logic).
 * For Ende years: use the GmbH Ende-phase net income (nettogewinn) as entnahmenVorSteuern so
 *   the private person "consumes" the same amount as the GmbH shareholder each year.
 *   The firmenDarlehensverbindlichkeit is used to override offenesDarlehen so the outstanding
 *   loan balance stays in sync between the GmbH and private comparison (critical for endfällig
 *   loans where Bereich 1 settles the old loan and Bereich 2 starts a smaller new one).
 */
function berechnePrivatVergleichOverrides(
  betriebLaufzeitJahre: number,
  endeErgebnisse: JahresErgebnis[]
): {
  entnahmenOverride: (number | undefined)[];
  offeneDarlehenOverride: (number | undefined)[];
} {
  const zeitraumJahre = betriebLaufzeitJahre + endeErgebnisse.length;
  const entnahmenOverride: (number | undefined)[] = new Array(zeitraumJahre).fill(undefined);
  const offeneDarlehenOverride: (number | undefined)[] = new Array(zeitraumJahre).fill(undefined);

  for (let i = 0; i < endeErgebnisse.length; i++) {
    const idx = betriebLaufzeitJahre + i;
    const e = endeErgebnisse[i];
    entnahmenOverride[idx] = e.nettogewinn ?? 0;
    const fdb = e.details.firmenDarlehensverbindlichkeit;
    offeneDarlehenOverride[idx] = fdb !== undefined ? Math.max(0, fdb) : 0;
  }

  return { entnahmenOverride, offeneDarlehenOverride };
}

export function berechneGesamtvergleichKpi(
  betrieb: BetriebState,
  endeLaufzeitJahre: number,
  endeErgebnisse: JahresErgebnis[],
  betriebsErgebnisse: JahresErgebnis[]
): GesamtvergleichKpi {
  const endfaelligkeitsAbwicklungsjahre = betrieb.darlehen.endfaellig ? 1 : 0;
  const zeitraumJahre = Math.max(
    1,
    Math.max(0, betrieb.laufzeitJahre) + Math.max(0, endeLaufzeitJahre) + endfaelligkeitsAbwicklungsjahre
  );
  const { entnahmenOverride, offeneDarlehenOverride } = berechnePrivatVergleichOverrides(
    betrieb.laufzeitJahre,
    endeErgebnisse
  );
  const privatVergleich = berechnePrivatVergleichErgebnis(
    { ...betrieb, laufzeitJahre: zeitraumJahre },
    entnahmenOverride,
    offeneDarlehenOverride
  );
  const investitionsZusammenfassung = berechneInvestitionsZusammenfassung(betrieb.investitionen, zeitraumJahre);
  const letzterBetriebsstand = betriebsErgebnisse.length > 0
    ? betriebsErgebnisse[betriebsErgebnisse.length - 1]
    : undefined;
  const letzterEndeStand = endeErgebnisse.length > 0
    ? endeErgebnisse[endeErgebnisse.length - 1]
    : undefined;
  const gmbhBetriebKonsumwert = letzterBetriebsstand?.details.kumulierterKonsumwert ?? 0;
  const gmbhBetriebNettovermoegen = letzterBetriebsstand?.details.nettovermoegen ?? 0;
  const endeFirmenDarlehensverbindlichkeit = Math.max(
    0,
    letzterEndeStand?.details.firmenDarlehensverbindlichkeit ?? 0
  );
  const gmbhEndeNettovermoegen = letzterEndeStand
    ? letzterEndeStand.gesamtvermoegen - endeFirmenDarlehensverbindlichkeit
    : gmbhBetriebNettovermoegen;
  const gmbhGesamtwert =
    gmbhEndeNettovermoegen +
    gmbhBetriebKonsumwert +
    (letzterEndeStand ? investitionsZusammenfassung.nettovermoegen : 0);
  const privatGesamtwert = privatVergleich.gesamtwertMitKonsum;
  const vorteil = gmbhGesamtwert - privatGesamtwert;
  const vorteilProzent = Math.abs(privatGesamtwert) >= PERCENT_REFERENCE_EPSILON
    ? (vorteil / privatGesamtwert) * 100
    : null;
  const gewinnerText = vorteil > 0 ? "GmbH gewinnt" : vorteil < 0 ? "Privat gewinnt" : "Unentschieden";

  return {
    gmbhGesamtwert,
    privatGesamtwert,
    vorteil,
    vorteilProzent,
    gewinnerText,
    zeitraumJahre,
  };
}

/**
 * Builds a per-year GmbH-vs-Privat wealth timeline across the full horizon
 * (Betrieb + Ende phase). The GmbH series stitches together the operating-phase
 * net worth incl. accumulated benefit consumption with the Ende-phase total
 * wealth (net of the internal shareholder loan, plus the carried-over Betrieb
 * consumption value and investment net worth). Its final value matches
 * `berechneGesamtvergleichKpi(...).gmbhGesamtwert`; the private series' final
 * value matches `privatGesamtwert`.
 *
 * Returns an empty array when the assembled GmbH series and the private series
 * do not cover the same number of years (so the caller can hide the chart
 * instead of showing misaligned data).
 */
export function berechneGesamtvergleichZeitreihe(
  betrieb: BetriebState,
  endeLaufzeitJahre: number,
  endeErgebnisse: JahresErgebnis[],
  betriebsErgebnisse: JahresErgebnis[]
): GesamtvergleichZeitreihePunkt[] {
  const endfaelligkeitsAbwicklungsjahre = betrieb.darlehen.endfaellig ? 1 : 0;
  const zeitraumJahre = Math.max(
    1,
    Math.max(0, betrieb.laufzeitJahre) + Math.max(0, endeLaufzeitJahre) + endfaelligkeitsAbwicklungsjahre
  );
  const { entnahmenOverride, offeneDarlehenOverride } = berechnePrivatVergleichOverrides(
    betrieb.laufzeitJahre,
    endeErgebnisse
  );
  const privatZeitreihe = berechnePrivatVergleichZeitreihe(
    { ...betrieb, laufzeitJahre: zeitraumJahre },
    entnahmenOverride,
    offeneDarlehenOverride
  );
  const investitionsNettovermoegen = berechneInvestitionsZusammenfassung(
    betrieb.investitionen,
    zeitraumJahre
  ).nettovermoegen;
  const gmbhBetriebKonsumwert =
    betriebsErgebnisse.length > 0
      ? betriebsErgebnisse[betriebsErgebnisse.length - 1].details.kumulierterKonsumwert ?? 0
      : 0;

  const gmbhWerte: number[] = [
    ...betriebsErgebnisse.map(
      (e) => (e.details.nettovermoegen ?? 0) + (e.details.kumulierterKonsumwert ?? 0)
    ),
    ...endeErgebnisse.map((e) => {
      const firmenDarlehensverbindlichkeit = Math.max(
        0,
        e.details.firmenDarlehensverbindlichkeit ?? 0
      );
      const gmbhEndeNettovermoegen = e.gesamtvermoegen - firmenDarlehensverbindlichkeit;
      return gmbhEndeNettovermoegen + gmbhBetriebKonsumwert + investitionsNettovermoegen;
    }),
  ];

  if (gmbhWerte.length !== privatZeitreihe.length) {
    return [];
  }

  return gmbhWerte.map((gmbh, index) => ({
    jahr: index + 1,
    gmbh,
    privat: privatZeitreihe[index].gesamtwertMitKonsum,
  }));
}
