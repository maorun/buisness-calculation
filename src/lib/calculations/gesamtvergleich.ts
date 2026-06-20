import { berechneInvestitionsZusammenfassung, berechnePrivatVergleichErgebnis } from "./betrieb";
import { BetriebState, JahresErgebnis, SteuerModus } from "../types";

const PERCENT_REFERENCE_EPSILON = 0.01;

export interface GesamtvergleichKpi {
  gmbhGesamtwert: number;
  privatGesamtwert: number;
  vorteil: number;
  vorteilProzent: number | null;
  gewinnerText: string;
  zeitraumJahre: number;
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

/** Human-readable entity name for the given modus. */
export function berechneEntityName(steuerModus: SteuerModus | undefined): string {
  return steuerModus === 'familienstiftung' ? 'Familienstiftung' : 'GmbH';
}

export function berechneGesamtvergleichKpi(
  betrieb: BetriebState,
  endeLaufzeitJahre: number,
  endeErgebnisse: JahresErgebnis[],
  betriebsErgebnisse: JahresErgebnis[]
): GesamtvergleichKpi {
  const entityName = berechneEntityName(betrieb.steuerModus);
  const endfaelligkeitsAbwicklungsjahre = betrieb.darlehen.endfaellig ? 1 : 0;
  const zeitraumJahre = Math.max(
    1,
    Math.max(0, betrieb.laufzeitJahre) + Math.max(0, endeLaufzeitJahre) + endfaelligkeitsAbwicklungsjahre
  );
  const privatVergleich = berechnePrivatVergleichErgebnis({ ...betrieb, laufzeitJahre: zeitraumJahre });
  const investitionsZusammenfassung = berechneInvestitionsZusammenfassung(betrieb.investitionen, zeitraumJahre);
  const letzterBetriebsstand = betriebsErgebnisse.length > 0
    ? betriebsErgebnisse[betriebsErgebnisse.length - 1]
    : undefined;
  const letzterEndeStand = endeErgebnisse.length > 0
    ? endeErgebnisse[endeErgebnisse.length - 1]
    : undefined;
  const gmbhBetriebKonsumwert = letzterBetriebsstand?.details.kumulierterKonsumwert ?? 0;
  const gmbhBetriebNettovermoegen = letzterBetriebsstand?.details.nettovermoegen ?? 0;
  const gmbhGesamtwert =
    (letzterEndeStand?.gesamtvermoegen ?? gmbhBetriebNettovermoegen) +
    gmbhBetriebKonsumwert +
    (letzterEndeStand ? investitionsZusammenfassung.nettovermoegen : 0);
  const privatGesamtwert = privatVergleich.gesamtwertMitKonsum;
  const vorteil = gmbhGesamtwert - privatGesamtwert;
  const vorteilProzent = Math.abs(privatGesamtwert) >= PERCENT_REFERENCE_EPSILON
    ? (vorteil / privatGesamtwert) * 100
    : null;
  const gewinnerText = vorteil > 0
    ? `${entityName} gewinnt`
    : vorteil < 0 ? "Privat gewinnt" : "Unentschieden";

  return {
    gmbhGesamtwert,
    privatGesamtwert,
    vorteil,
    vorteilProzent,
    gewinnerText,
    zeitraumJahre,
  };
}
