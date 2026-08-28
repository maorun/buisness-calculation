import { BetriebState } from "../types";
import {
  DEFAULT_KAPITALERTRAGSTEUER_SATZ,
  DEFAULT_SPARERPAUSCHBETRAG,
  TEILFREISTELLUNG_AKTIEN_PRIVAT,
  berechneSimulierterGewinnSteuerPrivat,
  berechneStillerGesellschafterSteuer,
  berechneStillenGesellschafterKosten,
} from "./steuer";
import {
  DEFAULT_GF_GEHALT_BETRIEB,
  DEFAULT_FIRMENHANDY_CONFIG,
  berechneKonsumNutzenwertProJahr,
} from "./benefits";
import {
  DARLEHEN_MONATE_PRO_JAHR,
  berechneDarlehensjahr,
} from "./darlehen";
import {
  EtfLot,
  MAX_SALE_CONVERGENCE_ITERATIONS,
  SALE_CONVERGENCE_THRESHOLD,
  berechneVorabpauschale,
  berechneVorabpauschaleNachEtfVerkauf,
  berechneVorabpauschalesteuer,
  berechneEtfVerkaufssteuer,
  fuegeEtfLotHinzu,
  sortiereEtfLotIndizesNachSteueroptimierung,
  sumEtfWert,
  verkaufeEtfLotsSteueroptimal,
  wachseEtfLots,
} from "./etf";
import { berechneInvestitionsZusammenfassung } from "./betrieb";

export interface PrivatVergleichErgebnis {
  anfangskapitalPrivat: number;
  kumulierterEtfVerkauf: number;
  verbleibenderEtfWert: number;
  endwert: number;
  investitionsNettovermoegen: number;
  kumulierterKonsumwert: number;
  gesamtwertMitKonsum: number;
  kumulierteSteuern: number;
  kumulierteVorabpauschalesteuer: number;
  kumulierteEtfVerkaufssteuer: number;
  kumulierteEntnahmen: number;
  kumulierterSparplan: number;
}

export interface PrivatVergleichJahreswert {
  jahr: number;
  jaehrlicherCashZuschuss: number;
  darlehensZuschussJaehrlich: number;
  simulierterGewinnNetto: number;
  konsumNutzenwert: number;
  sparplanNetto: number;
  gehaltsEntnahme: number;
  zinsEntnahme: number;
  entnahmeAusSparplanDefizit: number;
  stillerGesellschafterEntnahme: number;
  stillerGesellschafterSteuer?: number;
  stillerGesellschafterNetto?: number;
  entnahmenVorSteuern: number;
  etfVerkauf: number;
  vorabpauschalesteuer: number;
  etfVerkaufssteuer: number;
  gesamtSteuer: number;
  kumulierterEtfVerkauf: number;
  verbleibenderEtfWert: number;
  endwert: number;
  investitionsNettovermoegen: number;
  kumulierterKonsumwert: number;
  gesamtwertMitKonsum: number;
}

function simulierePrivatVergleich(
  state: BetriebState,
  entnahmenOverride?: (number | undefined)[],
  offeneDarlehenOverride?: (number | undefined)[],
  gehaltsEntnahmeOverride?: (number | undefined)[]
): {
  ergebnis: PrivatVergleichErgebnis;
  jahreswerte: PrivatVergleichJahreswert[];
} {
  let etfLots: EtfLot[] = [];
  const stillerGesellschafterEinlage = state.stillerGesellschafter?.aktiv
    ? Math.max(0, state.stillerGesellschafter.einlage)
    : 0;
  const kapitalertragsteuerRate =
    Math.max(0, Math.min(100, state.kapitalertragsteuerSatz ?? DEFAULT_KAPITALERTRAGSTEUER_SATZ)) / 100;
  const anfangskapitalPrivat = Math.max(0, state.startkapital) + Math.max(0, state.darlehen.betrag) + stillerGesellschafterEinlage;
  etfLots = fuegeEtfLotHinzu(etfLots, "startkapital", anfangskapitalPrivat);

  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  let kumulierterEtfVerkauf = 0;
  let kumulierteVorabpauschalesteuer = 0;
  let kumulierteEtfVerkaufssteuer = 0;
  let kumulierteEntnahmen = 0;
  let kumulierterSparplan = 0;
  let kumulierterKonsumwert = 0;
  const investitionsZusammenfassung = berechneInvestitionsZusammenfassung(state.investitionen, state.laufzeitJahre);
  const jahreswerte: PrivatVergleichJahreswert[] = [];

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const investitionsJahreswert = investitionsZusammenfassung.jahreswerte[jahr - 1];
    const etfWertVorjahrEnde = sumEtfWert(etfLots);
    const etfLotsNachWachstum = wachseEtfLots(etfLots, state.etfRendite);
    const etfWertNachWachstum = sumEtfWert(etfLotsNachWachstum);
    const vorabpauschaleBrutto = berechneVorabpauschale(etfWertVorjahrEnde, etfWertNachWachstum, undefined, state.steuerjahr);

    const { zinsenJaehrlich, darlehenBetragEnde } = berechneDarlehensjahr(
      offenesDarlehen,
      state.darlehen.zinssatz,
      state.darlehen.monatlicherZuschuss
    );
    offenesDarlehen = darlehenBetragEnde;

    const jaehrlicherCashZuschuss = Math.max(0, state.jaehrlicherCashZuschuss ?? 0);
    const simulierterGewinn = Math.max(0, state.simulierterGewinn ?? 0);
    const { einkommensteuer: simulierterGewinnSteuer, soli: simulierterGewinnSoli } =
      berechneSimulierterGewinnSteuerPrivat(simulierterGewinn, state.persoenlicherGrenzsteuersatz, state.steuerjahr);
    const simulierterGewinnNetto = simulierterGewinn - simulierterGewinnSteuer - simulierterGewinnSoli;
    const darlehensZuschussJaehrlich = Math.max(0, state.darlehen.monatlicherZuschuss) * DARLEHEN_MONATE_PRO_JAHR;

    // Allow the caller to override the annual withdrawal amount for specific years (e.g. Ende phase).
    // When an override is present, we skip the normal salary/interest/sparplan components and use
    // the override value directly as entnahmenVorSteuern.
    const jahresOverride = entnahmenOverride ? entnahmenOverride[jahr - 1] : undefined;
    const gehaltsOverrideJahr = gehaltsEntnahmeOverride ? gehaltsEntnahmeOverride[jahr - 1] : undefined;

    // Ende-phase years are identified by a gehaltsEntnahmeOverride being set for the year.
    // In these years the private comparison should NOT reinvest the simulated business income
    // (the GmbH is paying out from its ETF, not from ongoing operations), but the benefit
    // consumption value is still relevant: the GmbH continues to provide benefits tax-free while
    // the private person pays for the same goods out of pocket. Setting sparplanNetto to the
    // negative benefit cost (instead of income − cost) ensures:
    // • The ETF is sold to cover the benefit expenditure (private person pays for benefits).
    // • kumulierterKonsumwert is still credited, keeping the comparison fair (neutral net effect).
    // • No spurious business-income reinvestment inflates the private ETF during the Ende phase.
    const isEndeJahr = gehaltsOverrideJahr !== undefined;
    // Benefits are relevant unless a full explicit withdrawal override (jahresOverride) is active,
    // in which case the withdrawal already encodes the net GmbH payout and crediting benefits
    // separately would inflate the private total without a matching cost deduction.
    // For Ende years (identified by isEndeJahr / gehaltsEntnahmeOverride) benefits still apply:
    // the GmbH keeps paying them tax-free while the private person buys the same goods out of pocket.
    const konsumNutzenwert = jahresOverride === undefined
      ? berechneKonsumNutzenwertProJahr(jahr, state.benefits, state.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG)
      : 0;
    const investitionsNettoCashflow = investitionsJahreswert?.nettoCashflow ?? 0;
    const sparplanNetto = isEndeJahr
      ? -konsumNutzenwert
      : jaehrlicherCashZuschuss + simulierterGewinnNetto + darlehensZuschussJaehrlich + investitionsNettoCashflow - konsumNutzenwert;
    if (!isEndeJahr) {
      kumulierterSparplan += sparplanNetto;
    }
    kumulierterKonsumwert += konsumNutzenwert;

    let gehaltsEntnahme: number;
    let zinsEntnahme: number;
    let entnahmeAusSparplanDefizit: number;
    let stillerGesellschafterEntnahme: number;
    let stillerGesellschafterSteuerPrivat: number = 0;
    let stillerGesellschafterNettoPrivat: number = 0;
    let entnahmenVorSteuern: number;
    if (jahresOverride !== undefined) {
      gehaltsEntnahme = gehaltsOverrideJahr !== undefined ? Math.max(0, gehaltsOverrideJahr) : 0;
      zinsEntnahme = 0;
      entnahmeAusSparplanDefizit = 0;
      stillerGesellschafterEntnahme = 0;
      entnahmenVorSteuern = Math.max(0, jahresOverride);
    } else {
      gehaltsEntnahme = gehaltsOverrideJahr !== undefined
        ? Math.max(0, gehaltsOverrideJahr)
        : Math.max(0, state.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB);
      zinsEntnahme = state.darlehen.endfaellig ? 0 : zinsenJaehrlich;
      entnahmeAusSparplanDefizit = Math.max(0, -sparplanNetto);
      stillerGesellschafterEntnahme = berechneStillenGesellschafterKosten(
        state.stillerGesellschafter,
        simulierterGewinn
      );
      const sgtRes = berechneStillerGesellschafterSteuer(
        stillerGesellschafterEntnahme,
        state.stillerGesellschafter,
        state.persoenlicherGrenzsteuersatz,
        state.kapitalertragsteuerSatz,
        state.sparerpauschbetrag,
        state.steuerjahr
      );
      stillerGesellschafterSteuerPrivat = sgtRes.steuer;
      stillerGesellschafterNettoPrivat = Math.max(0, stillerGesellschafterEntnahme - stillerGesellschafterSteuerPrivat);
      entnahmenVorSteuern = gehaltsEntnahme + zinsEntnahme + entnahmeAusSparplanDefizit + stillerGesellschafterEntnahme;
    }
    kumulierteEntnahmen += entnahmenVorSteuern;

    const jahresSparerpauschbetrag = Math.max(0, state.sparerpauschbetrag ?? DEFAULT_SPARERPAUSCHBETRAG);
    const sortierteLotIndizes = sortiereEtfLotIndizesNachSteueroptimierung(etfLotsNachWachstum);
    let etfVerkauf = Math.min(etfWertNachWachstum, Math.max(0, entnahmenVorSteuern));
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const verkaufIteration = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
      const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, verkaufIteration.etfGewinn);
      const steuerpflichtigeVorabpauschale = vorabpauschale * (1 - TEILFREISTELLUNG_AKTIEN_PRIVAT);
      const genutzterFreibetragVp = Math.min(jahresSparerpauschbetrag, steuerpflichtigeVorabpauschale);
      const vorabpauschalesteuer = berechneVorabpauschalesteuer(
        vorabpauschale,
        TEILFREISTELLUNG_AKTIEN_PRIVAT,
        kapitalertragsteuerRate,
        genutzterFreibetragVp
      );
      const restSparerpauschbetrag = Math.max(0, jahresSparerpauschbetrag - genutzterFreibetragVp);
      const etfVerkaufssteuer = berechneEtfVerkaufssteuer(
        verkaufIteration.etfGewinn,
        TEILFREISTELLUNG_AKTIEN_PRIVAT,
        kapitalertragsteuerRate,
        restSparerpauschbetrag
      );
      const benoetigterVerkauf = Math.min(
        etfWertNachWachstum,
        Math.max(0, entnahmenVorSteuern + vorabpauschalesteuer + etfVerkaufssteuer)
      );
      if (Math.abs(benoetigterVerkauf - etfVerkauf) < SALE_CONVERGENCE_THRESHOLD) {
        etfVerkauf = benoetigterVerkauf;
        break;
      }
      etfVerkauf = benoetigterVerkauf;
    }

    const verkauf = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
    const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, verkauf.etfGewinn);
    const steuerpflichtigeVorabpauschale = vorabpauschale * (1 - TEILFREISTELLUNG_AKTIEN_PRIVAT);
    const genutzterFreibetragVp = Math.min(jahresSparerpauschbetrag, steuerpflichtigeVorabpauschale);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(
      vorabpauschale,
      TEILFREISTELLUNG_AKTIEN_PRIVAT,
      kapitalertragsteuerRate,
      genutzterFreibetragVp
    );
    const restSparerpauschbetrag = Math.max(0, jahresSparerpauschbetrag - genutzterFreibetragVp);
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(
      verkauf.etfGewinn,
      TEILFREISTELLUNG_AKTIEN_PRIVAT,
      kapitalertragsteuerRate,
      restSparerpauschbetrag
    );

    kumulierterEtfVerkauf += verkauf.etfVerkauf;
    kumulierteVorabpauschalesteuer += vorabpauschalesteuer;
    kumulierteEtfVerkaufssteuer += etfVerkaufssteuer;

    etfLots = verkauf.lots;
    // Only re-invest the sparplan surplus in genuine Betrieb-phase years (isEndeJahr = false).
    // In Ende years sparplanNetto equals -konsumNutzenwert (≤ 0), so the guard also prevents
    // a negative reinvestment, but the explicit !isEndeJahr check makes the intent clear.
    if (!isEndeJahr && sparplanNetto > 0) {
      etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", sparplanNetto);
    }

    const verbleibenderEtfWertJahr = sumEtfWert(etfLots);
    const endwertJahr = kumulierterEtfVerkauf + verbleibenderEtfWertJahr;
    const investitionsNettovermoegenJahr = investitionsJahreswert?.nettovermoegen ?? 0;

    // Override offenesDarlehen at the end of this year when the caller supplied per-year values
    // (e.g. to mirror the GmbH Ende-phase restdarlehen after endfällig settlement in Bereich 1).
    const darlehenOverrideJahr = offeneDarlehenOverride ? offeneDarlehenOverride[jahr - 1] : undefined;
    if (darlehenOverrideJahr !== undefined) {
      offenesDarlehen = Math.max(0, darlehenOverrideJahr);
    }

    jahreswerte.push({
      jahr,
      jaehrlicherCashZuschuss,
      darlehensZuschussJaehrlich,
      simulierterGewinnNetto,
      konsumNutzenwert,
      sparplanNetto,
      gehaltsEntnahme,
      zinsEntnahme,
      entnahmeAusSparplanDefizit,
      stillerGesellschafterEntnahme,
      stillerGesellschafterSteuer: stillerGesellschafterSteuerPrivat,
      stillerGesellschafterNetto: stillerGesellschafterNettoPrivat,
      entnahmenVorSteuern,
      etfVerkauf: verkauf.etfVerkauf,
      vorabpauschalesteuer,
      etfVerkaufssteuer,
      gesamtSteuer: vorabpauschalesteuer + etfVerkaufssteuer,
      kumulierterEtfVerkauf,
      verbleibenderEtfWert: verbleibenderEtfWertJahr,
      endwert: endwertJahr,
      investitionsNettovermoegen: investitionsNettovermoegenJahr,
      kumulierterKonsumwert,
      gesamtwertMitKonsum: endwertJahr + investitionsNettovermoegenJahr + kumulierterKonsumwert - offenesDarlehen,
    });
  }

  const verbleibenderEtfWert = sumEtfWert(etfLots);
  const endwert = kumulierterEtfVerkauf + verbleibenderEtfWert;
  const investitionsNettovermoegen = investitionsZusammenfassung.nettovermoegen;
  const gesamtwertMitKonsum = endwert + investitionsNettovermoegen + kumulierterKonsumwert - offenesDarlehen;
  const kumulierteSteuern = kumulierteVorabpauschalesteuer + kumulierteEtfVerkaufssteuer;

  return {
    ergebnis: {
      anfangskapitalPrivat,
      kumulierterEtfVerkauf,
      verbleibenderEtfWert,
      endwert,
      investitionsNettovermoegen,
      kumulierterKonsumwert,
      gesamtwertMitKonsum,
      kumulierteSteuern,
      kumulierteVorabpauschalesteuer,
      kumulierteEtfVerkaufssteuer,
      kumulierteEntnahmen,
      kumulierterSparplan,
    },
    jahreswerte,
  };
}

export function berechnePrivatVergleichErgebnis(
  state: BetriebState,
  entnahmenOverride?: (number | undefined)[],
  offeneDarlehenOverride?: (number | undefined)[],
  gehaltsEntnahmeOverride?: (number | undefined)[]
): PrivatVergleichErgebnis {
  return simulierePrivatVergleich(state, entnahmenOverride, offeneDarlehenOverride, gehaltsEntnahmeOverride).ergebnis;
}

export function berechnePrivatVergleichZeitreihe(
  state: BetriebState,
  entnahmenOverride?: (number | undefined)[],
  offeneDarlehenOverride?: (number | undefined)[],
  gehaltsEntnahmeOverride?: (number | undefined)[]
): PrivatVergleichJahreswert[] {
  return simulierePrivatVergleich(state, entnahmenOverride, offeneDarlehenOverride, gehaltsEntnahmeOverride).jahreswerte;
}
