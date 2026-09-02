import { BetriebState, JahresErgebnis, KostenPosition } from "../types";

export * from "./steuer";
export * from "./etf";
export * from "./benefits";
export * from "./darlehen";
export * from "./investition";
export * from "./privatvergleich";

import {
  DEFAULT_KOERPERSCHAFTSTEUER_SATZ,
  DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ,
  DEFAULT_GEWERBESTEUER_SATZ,
  GEWERBESTEUER_FREIBETRAG,
  TEILFREISTELLUNG_AKTIEN_GMBH,
  berechneGmbhSteuerRaten,
  berechneVerlustvortragAnrechnung,
  berechneEinkommensteuerBetrieb,
  berechneSoliBetrieb,
  berechneGesetzlicheKrankenversicherungBeitrag,
  berechneStillerGesellschafterSteuer,
  berechneStillenGesellschafterKosten,
} from "./steuer";

import {
  DEFAULT_FIRMENHANDY_CONFIG,
  DEFAULT_GF_GEHALT_BETRIEB,
  DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB,
  berechneHandyNettoKostenProJahr,
  berechneBenefitsKosten,
  berechneKonsumNutzenwertProJahr,
  berechneTankgutscheinJaehrlich,
  berechneBavJaehrlich,
  berechneInternetPauschaleJaehrlich,
  berechneVermoegenswirksameLeistungenJaehrlich,
  berechneEssenszuschussJaehrlich,
  berechneDienstwagenGmbhKosten,
  berechneDienstwagenGeldwerterVorteil,
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
  sumEtfWertNachTyp,
  verkaufeEtfLotsSteueroptimal,
  wachseEtfLots,
} from "./etf";

/**
 * Sum all operating cost positions (monthly × 12 + annual).
 * Supports KostenPositions with periode: 'monatlich' (multiplied by 12) or 'jaehrlich' (as-is).
 */
/**
 * Discounts a nominal monetary amount to real purchasing power based on an annual inflation rate.
 * Realwert = Nominalwert / (1 + inflationsratePercent / 100) ^ jahre
 */
export function berechneRealwert(
  nominalwert: number,
  inflationsratePercent: number = 2,
  jahre: number = 0
): number {
  if (jahre <= 0 || inflationsratePercent === 0) {
    return nominalwert;
  }
  return nominalwert / Math.pow(1 + inflationsratePercent / 100, jahre);
}

export function berechneBetriebskosten(kosten: KostenPosition[]): number {
  return kosten.reduce((sum, k) => {
    return sum + berechneKostenPositionJahresBetrag(k);
  }, 0);
}

function berechneKostenPositionJahresBetrag(kostenPosition: KostenPosition): number {
  return kostenPosition.periode === 'monatlich' ? kostenPosition.betrag * 12 : kostenPosition.betrag;
}

export function berechneBetriebskostenPosten(
  kosten: KostenPosition[],
  benefits: BetriebState['benefits'],
  handyNettoKosten: number,
  handyConfig = DEFAULT_FIRMENHANDY_CONFIG,
  geschaeftsfuehrergehalt: number = 0,
  stillerGesellschafterKosten: number = 0,
  steuerjahr: number = 2025
): { label: string; wert: number }[] {
  const kostenPosten = kosten.map((kostenPosition) => ({
    label: kostenPosition.bezeichnung,
    wert: berechneKostenPositionJahresBetrag(kostenPosition),
  }));

  const tankgutscheinJaehrlich = berechneTankgutscheinJaehrlich(benefits);
  const essenszuschussJaehrlich = berechneEssenszuschussJaehrlich(benefits);
  const dienstwagenGmbhKosten = berechneDienstwagenGmbhKosten(benefits);
  const bAVJaehrlich = berechneBavJaehrlich(benefits, steuerjahr);
  const internetJaehrlich = berechneInternetPauschaleJaehrlich(benefits);
  const vlJaehrlich = berechneVermoegenswirksameLeistungenJaehrlich(benefits);
  const benefitsPosten = [
    { label: "Tankgutschein", wert: tankgutscheinJaehrlich },
    { label: "Essenszuschuss", wert: essenszuschussJaehrlich },
    { label: "bAV-Beitrag", wert: bAVJaehrlich },
    { label: "Internetpauschale", wert: internetJaehrlich },
    { label: "Vermögenswirksame Leistungen", wert: vlJaehrlich },
    { label: "Strategieessen", wert: (benefits.strategieessenAktiv ?? true) ? Math.max(0, benefits.strategieessen) : 0 },
    ...(dienstwagenGmbhKosten > 0 ? [{ label: "Dienstwagen (GmbH-Kosten)", wert: dienstwagenGmbhKosten }] : []),
    { label: `Firmenhandy (alle ${handyConfig.ersatzzyklusJahre} Jahre)`, wert: handyNettoKosten },
    { label: "GF-Gehalt", wert: Math.max(0, geschaeftsfuehrergehalt) },
    ...(stillerGesellschafterKosten > 0
      ? [{ label: "Stiller Gesellschafter (Zinsen + Gewinnbeteiligung)", wert: stillerGesellschafterKosten }]
      : []),
  ];

  return [...kostenPosten, ...benefitsPosten];
}

/**
 * Calculate yearly Betrieb results for each year of the operating phase.
 */
export function berechneBetriebsErgebnisse(state: BetriebState): JahresErgebnis[] {
  const ergebnisse: JahresErgebnis[] = [];
  const { kstGesamt: effKstGesamt, gewerbesteuer: effGewerbesteuer, gmbhSteuerGesamt: effGmbhSteuerGesamt } =
    berechneGmbhSteuerRaten(
      state.koerperschaftsteuerSatz ?? DEFAULT_KOERPERSCHAFTSTEUER_SATZ,
      state.solidaritaetszuschlagSatz ?? DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ,
      state.gewerbesteuerSatz ?? DEFAULT_GEWERBESTEUER_SATZ,
    );
  const holdingSteuerfreibetrag = state.holding?.aktiv
    ? Math.min(0.95, Math.max(0, (state.holding.steuerfreibetragProzent ?? 95) / 100))
    : 0;
  let etfLots: EtfLot[] = [];
  etfLots = fuegeEtfLotHinzu(etfLots, "startkapital", Math.max(0, state.startkapital));
  etfLots = fuegeEtfLotHinzu(etfLots, "darlehen", Math.max(0, state.darlehen.betrag));
  const stillerGesellschafterEinlage = state.stillerGesellschafter?.aktiv
    ? Math.max(0, state.stillerGesellschafter.einlage)
    : 0;
  if (stillerGesellschafterEinlage > 0) {
    etfLots = fuegeEtfLotHinzu(etfLots, "stillerGesellschafter", stillerGesellschafterEinlage);
  }
  let cashReserve = 0;
  let verlustvortrag = 0;
  let offenesDarlehen = Math.max(0, state.darlehen.betrag);
  // For endfällig loans, interest is deferred to end and NOT deducted annually.
  // For regular loans, interest is paid (and deductible) each year.
  let aufgelaufeneZinsen = 0;
  let kumulierterCashZuschuss = 0;
  let kumulierterKonsumwert = 0;

  // Track investment capital values (compound growth per year)
  const investitionen = state.investitionen ?? [];
  let investitionsKapitalWerte: number[] = investitionen.map((inv) => Math.max(0, inv.kapital));
  let investitionsKumulierterGewinnVerlust = 0;
  // Track remaining loan balances for each investment
  let investitionsKreditRestschuldWerte: number[] = investitionen.map((inv) => Math.max(0, inv.kredit ?? 0));
  let investitionsKumulierterNettoCashflow = 0;

  for (let jahr = 1; jahr <= state.laufzeitJahre; jahr++) {
    const etfWertVorjahrEnd = sumEtfWert(etfLots);
    const etfLotsNachWachstum = wachseEtfLots(etfLots, state.etfRendite);
    const etfWertNachWachstum = sumEtfWert(etfLotsNachWachstum);
    const theoretischerEtfErtrag = Math.max(0, etfWertNachWachstum - etfWertVorjahrEnd);
    investitionsKapitalWerte = investitionsKapitalWerte.map((kap, i) =>
      kap * (1 + (investitionen[i]?.wertsteigerung ?? 0) / 100)
    );
    const investitionsKapitalGesamt = investitionsKapitalWerte.reduce((sum, k) => sum + k, 0);
    const investitionsGewinnVerlustProJahr = investitionen.reduce((sum, inv) => sum + inv.gewinnVerlustProJahr, 0);
    investitionsKumulierterGewinnVerlust += investitionsGewinnVerlustProJahr;

    // Compute per-investment loan cashflow: interest, repayment, remaining balance
    let investitionsZinsaufwandProJahr = 0;
    let investitionsTilgungProJahr = 0;
    investitionsKreditRestschuldWerte = investitionsKreditRestschuldWerte.map((restschuld, i) => {
      const inv = investitionen[i];
      if (!inv || restschuld <= 0) return 0;
      const zinssatz = Math.max(0, inv.zinssatz ?? 0);
      const tilgung = Math.max(0, inv.tilgungsrateJaehrlich ?? 0);
      const zinsaufwand = restschuld * (zinssatz / 100);
      const tatsaechlicheTilgung = Math.min(tilgung, restschuld);
      investitionsZinsaufwandProJahr += zinsaufwand;
      investitionsTilgungProJahr += tatsaechlicheTilgung;
      return Math.max(0, restschuld - tatsaechlicheTilgung);
    });
    const investitionsKreditRestschuld = investitionsKreditRestschuldWerte.reduce((sum, r) => sum + r, 0);
    const investitionsNettoCashflowProJahr = investitionsGewinnVerlustProJahr - investitionsZinsaufwandProJahr - investitionsTilgungProJahr;
    investitionsKumulierterNettoCashflow += investitionsNettoCashflowProJahr;
    const investitionsCashZufluss = Math.max(0, investitionsNettoCashflowProJahr);
    const investitionsCashAbfluss = Math.max(0, -investitionsNettoCashflowProJahr);
    const cashReserveVorInvestition = cashReserve;
    cashReserve += investitionsCashZufluss;

    // Vorabpauschale tax – GmbH uses 80% Teilfreistellung and corporate tax rate (KSt + GewSt)
    const vorabpauschaleBrutto = berechneVorabpauschale(etfWertVorjahrEnd, etfWertNachWachstum, undefined, state.steuerjahr);
    // Recompute costs inside the yearly loop so changed expense inputs are reflected directly.
    const jaehrlicheKosten = berechneBetriebskosten(state.kosten);

    // Phone costs are operating expenses (Betriebsausgabe), deducted from taxable profit.
    const handyConfig = state.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;
    const handyNettoKosten = berechneHandyNettoKostenProJahr(jahr, handyConfig);
    const benefitsKosten = berechneBenefitsKosten(state.benefits);
    const iabJahr = Math.max(0, state.investitionsabzugsbetragJahr ?? 0);
    const iabJaehrlich = jahr === iabJahr ? Math.max(0, state.investitionsabzugsbetrag ?? 0) : 0;
    const dienstwagenGmbhKosten = berechneDienstwagenGmbhKosten(state.benefits);
    const dienstwagenGeldwerterVorteil = state.benefits.dienstwagen?.aktiv
      ? berechneDienstwagenGeldwerterVorteil(state.benefits.dienstwagen)
      : 0;
    // Use the nominal consumption value (what the shareholder actually receives) rather than the
    // GmbH's net cost after tax deduction. The tax saving on benefits is already reflected in a
    // lower gmbhSteuer → higher ETF value, so crediting only the after-tax cost would zero-out
    // the benefit advantage instead of correctly showing the tax saving as a GmbH gain.
    const konsumNutzenwert = berechneKonsumNutzenwertProJahr(jahr, state.benefits, handyConfig);
    kumulierterKonsumwert += konsumNutzenwert;
    const geschaeftsfuehrergehalt = Math.max(0, state.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB);
    const gehaelterGesamt = geschaeftsfuehrergehalt;
    const simulierterGewinn = Math.max(0, state.simulierterGewinn ?? 0);
    const stillerGesellschafterKosten = berechneStillenGesellschafterKosten(
      state.stillerGesellschafter,
      simulierterGewinn
    );
    const betriebsausgabenGesamt = jaehrlicheKosten + handyNettoKosten + benefitsKosten + gehaelterGesamt + stillerGesellschafterKosten + iabJaehrlich;
    const betriebskostenPosten = berechneBetriebskostenPosten(
      state.kosten,
      state.benefits,
      handyNettoKosten,
      handyConfig,
      geschaeftsfuehrergehalt,
      stillerGesellschafterKosten,
      state.steuerjahr ?? 2025
    );
    if (iabJaehrlich > 0) {
      betriebskostenPosten.push({ label: "Investitionsabzugsbetrag (IAB)", wert: iabJaehrlich });
    }

    const { zinsenJaehrlich: darlehenszinsJaehrlich, darlehenBetragEnde } = berechneDarlehensjahr(
      offenesDarlehen,
      state.darlehen.zinssatz,
      state.darlehen.monatlicherZuschuss
    );
    const jaehrlicherCashZuschuss = Math.max(0, state.jaehrlicherCashZuschuss ?? 0);
    kumulierterCashZuschuss += jaehrlicherCashZuschuss;
    const darlehensZuzahlungenJaehrlich = Math.max(0, state.darlehen.monatlicherZuschuss) * DARLEHEN_MONATE_PRO_JAHR;
    const cashReserveVorjahr = cashReserve;
    const ausGewinnBeglicheneBetriebsausgaben = Math.min(simulierterGewinn, betriebsausgabenGesamt);
    const betriebsausgabenNachGewinn = Math.max(0, betriebsausgabenGesamt - ausGewinnBeglicheneBetriebsausgaben);
    const verbleibenderGewinnVorSteuern = Math.max(0, simulierterGewinn - ausGewinnBeglicheneBetriebsausgaben);
    const ausCashZuschussBeglicheneBetriebsausgaben = Math.min(jaehrlicherCashZuschuss, betriebsausgabenNachGewinn);
    const betriebsausgabenNachCashZuschuss = Math.max(0, betriebsausgabenNachGewinn - ausCashZuschussBeglicheneBetriebsausgaben);
    const ausCashReserveBeglicheneBetriebsausgaben = Math.min(cashReserveVorjahr, betriebsausgabenNachCashZuschuss);
    const betriebsausgabenNachCashReserve = Math.max(0, betriebsausgabenNachCashZuschuss - ausCashReserveBeglicheneBetriebsausgaben);
    const unverbrauchterCashZuschuss = jaehrlicherCashZuschuss - ausCashZuschussBeglicheneBetriebsausgaben;
    cashReserve = cashReserveVorjahr + unverbrauchterCashZuschuss - ausCashReserveBeglicheneBetriebsausgaben;
    const ausZuzahlungenBeglicheneBetriebsausgaben = Math.min(darlehensZuzahlungenJaehrlich, betriebsausgabenNachCashReserve);
    const ungedeckteBetriebsausgaben = Math.max(0, betriebsausgabenNachCashReserve - ausZuzahlungenBeglicheneBetriebsausgaben);
    const verbleibendeDarlehensZuzahlungen = Math.max(0, darlehensZuzahlungenJaehrlich - ausZuzahlungenBeglicheneBetriebsausgaben);
    const jaehrlicheZinsen = state.darlehen.endfaellig ? 0 : darlehenszinsJaehrlich;
    const sortierteLotIndizes = sortiereEtfLotIndizesNachSteueroptimierung(etfLotsNachWachstum);

    // Accumulate deferred interest for endfällig loans (informational).
    if (state.darlehen.endfaellig) {
      aufgelaufeneZinsen += darlehenszinsJaehrlich;
    }

    const auszahlungenOhneVerkaufssteuern = ungedeckteBetriebsausgaben + jaehrlicheZinsen + investitionsCashAbfluss;
    const verfuegbareLiquiditaetVorEtfVerkauf = verbleibenderGewinnVorSteuern + cashReserve + verbleibendeDarlehensZuzahlungen;

    const isAtypischStiller = Boolean(state.stillerGesellschafter?.aktiv && state.stillerGesellschafter?.typ === 'atypisch');

    // Solve sale amount iteratively because taxes depend on realized sale gain.
    let etfVerkauf = Math.min(
      etfWertNachWachstum,
      Math.max(0, auszahlungenOhneVerkaufssteuern - verfuegbareLiquiditaetVorEtfVerkauf)
    );
    for (let i = 0; i < MAX_SALE_CONVERGENCE_ITERATIONS; i++) {
      const verkaufIteration = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
      const realisierterEtfErtragIter = verkaufIteration.etfGewinn;
      const vorabpauschaleIter = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, realisierterEtfErtragIter);
      const vorabpauschalesteuerIter = berechneVorabpauschalesteuer(vorabpauschaleIter, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt, 0, holdingSteuerfreibetrag);
      const etfVerkaufssteuerIter = berechneEtfVerkaufssteuer(realisierterEtfErtragIter, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt, 0, holdingSteuerfreibetrag);
      const gewinnNachBetriebsausgabenIter =
        simulierterGewinn + realisierterEtfErtragIter + investitionsGewinnVerlustProJahr - investitionsZinsaufwandProJahr - betriebsausgabenGesamt - jaehrlicheZinsen;
      const { versteuerterGewinn: versteuerterGewinnIter } =
        berechneVerlustvortragAnrechnung(gewinnNachBetriebsausgabenIter, verlustvortrag);
      const gewerbeertragGewStIter = isAtypischStiller
        ? Math.max(0, versteuerterGewinnIter - GEWERBESTEUER_FREIBETRAG)
        : versteuerterGewinnIter;
      const gmbhSteuerKstIter = versteuerterGewinnIter > 0 ? versteuerterGewinnIter * effKstGesamt : 0;
      const gmbhSteuerGewStIter = gewerbeertragGewStIter > 0 ? gewerbeertragGewStIter * effGewerbesteuer : 0;
      const gmbhSteuerIter = gmbhSteuerKstIter + gmbhSteuerGewStIter;
      const benoetigterVerkauf = Math.min(
        etfWertNachWachstum,
        Math.max(
          0,
          auszahlungenOhneVerkaufssteuern + vorabpauschalesteuerIter + gmbhSteuerIter + etfVerkaufssteuerIter - verfuegbareLiquiditaetVorEtfVerkauf
        )
      );
      if (Math.abs(benoetigterVerkauf - etfVerkauf) < SALE_CONVERGENCE_THRESHOLD) {
        etfVerkauf = benoetigterVerkauf;
        break;
      }
      etfVerkauf = benoetigterVerkauf;
    }

    const verkauf = verkaufeEtfLotsSteueroptimal(etfLotsNachWachstum, etfVerkauf, sortierteLotIndizes);
    const einstandswertVerkauft = verkauf.etfEinstandswertVerkauft;
    const realisierterEtfErtrag = verkauf.etfGewinn;
    const vorabpauschale = berechneVorabpauschaleNachEtfVerkauf(vorabpauschaleBrutto, realisierterEtfErtrag);
    const vorabpauschalesteuer = berechneVorabpauschalesteuer(vorabpauschale, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt, 0, holdingSteuerfreibetrag);
    // gewinnNachBetriebsausgaben is the taxable profit base (after all deductible expenses)
    const gewinnNachBetriebsausgaben =
      simulierterGewinn + realisierterEtfErtrag + investitionsGewinnVerlustProJahr - investitionsZinsaufwandProJahr - betriebsausgabenGesamt - jaehrlicheZinsen;

    const {
      versteuerterGewinn,
      verlustVortragGenutzt,
      neuerVerlustvortrag,
    } = berechneVerlustvortragAnrechnung(gewinnNachBetriebsausgaben, verlustvortrag);
    verlustvortrag = neuerVerlustvortrag;

    // GmbH taxes (KSt + GewSt) on positive taxable profit after loss carryforward, paid to Finanzamt.
    // For atypisch stiller Gesellschafter, a Mitunternehmerschaft (GmbH & Still) exists,
    // granting a Gewerbesteuer Freibetrag of 24.500 € (§ 11 Abs. 1 S. 3 Nr. 1 GewStG).
    const gewerbeertragGewSt = isAtypischStiller
      ? Math.max(0, versteuerterGewinn - GEWERBESTEUER_FREIBETRAG)
      : versteuerterGewinn;
    const gmbhSteuerKst = versteuerterGewinn > 0
      ? versteuerterGewinn * effKstGesamt
      : 0;
    const gmbhSteuerGewSt = gewerbeertragGewSt > 0
      ? gewerbeertragGewSt * effGewerbesteuer
      : 0;
    const gmbhSteuer = gmbhSteuerKst + gmbhSteuerGewSt;

    // Tax on realized ETF gain due to selling
    const etfVerkaufssteuer = berechneEtfVerkaufssteuer(realisierterEtfErtrag, TEILFREISTELLUNG_AKTIEN_GMBH, effGmbhSteuerGesamt, 0, holdingSteuerfreibetrag);
    const gesamtauszahlungen =
      ungedeckteBetriebsausgaben + jaehrlicheZinsen + investitionsCashAbfluss + vorabpauschalesteuer + gmbhSteuer + etfVerkaufssteuer;
    const liquiditaetsabflussOhneEtfVerkauf = Math.min(gesamtauszahlungen, verfuegbareLiquiditaetVorEtfVerkauf);
    const ausCashReserveBeglicheneSonstigeAuszahlungen = Math.min(cashReserve, liquiditaetsabflussOhneEtfVerkauf);
    cashReserve -= ausCashReserveBeglicheneSonstigeAuszahlungen;
    const ausDarlehensZuzahlungenBeglicheneSonstigeAuszahlungen = Math.min(
      verbleibendeDarlehensZuzahlungen,
      Math.max(0, liquiditaetsabflussOhneEtfVerkauf - ausCashReserveBeglicheneSonstigeAuszahlungen)
    );
    const verbleibendeDarlehensZuzahlungenNachAuszahlungen = Math.max(
      0,
      verbleibendeDarlehensZuzahlungen - ausDarlehensZuzahlungenBeglicheneSonstigeAuszahlungen
    );
    const deckungssaldoNachAusgabenUndSteuern =
      etfVerkauf + verfuegbareLiquiditaetVorEtfVerkauf - gesamtauszahlungen;
    const ueberdeckungAusEtfVerkauf = Math.max(
      0,
      deckungssaldoNachAusgabenUndSteuern - cashReserve - verbleibendeDarlehensZuzahlungenNachAuszahlungen
    );
    const freieDarlehensZuzahlungen = etfVerkauf > 0
      ? 0
      : verbleibendeDarlehensZuzahlungenNachAuszahlungen;
    cashReserve += ueberdeckungAusEtfVerkauf;
    if (etfVerkauf > 0) {
      cashReserve += verbleibendeDarlehensZuzahlungenNachAuszahlungen;
    }

    const gewinnNachSteuernEtfZufluss = Math.min(
      cashReserve,
      Math.max(0, verbleibenderGewinnVorSteuern - gmbhSteuer)
    );
    cashReserve -= gewinnNachSteuernEtfZufluss;

    // Additional taxes
    const gesamtSteuer = gmbhSteuer + vorabpauschalesteuer + etfVerkaufssteuer;

    // Net gain after all taxes
    const nettogewinn =
      gewinnNachBetriebsausgaben - gmbhSteuer - vorabpauschalesteuer - etfVerkaufssteuer;
    const gesellschafterBruttoEinkommen = gehaelterGesamt + darlehenszinsJaehrlich + dienstwagenGeldwerterVorteil;
    const gesellschafterEinkommensteuer = berechneEinkommensteuerBetrieb(gesellschafterBruttoEinkommen, state.steuerjahr);
    const gesellschafterSoli = berechneSoliBetrieb(gesellschafterEinkommensteuer, state.steuerjahr);
    const gesellschafterSteuerGesamt = gesellschafterEinkommensteuer + gesellschafterSoli;
    const gehaelterEinkommensteuer = berechneEinkommensteuerBetrieb(gehaelterGesamt, state.steuerjahr);
    const gehaelterSoli = berechneSoliBetrieb(gehaelterEinkommensteuer, state.steuerjahr);
    const gehaelterSteuerGesamt = gehaelterEinkommensteuer + gehaelterSoli;
    const gehaelterNetto = gehaelterGesamt - gehaelterSteuerGesamt;
    const darlehenszinsenSteuer = Math.max(0, gesellschafterSteuerGesamt - gehaelterSteuerGesamt);
    const darlehenszinsenNetto = Math.max(0, darlehenszinsJaehrlich - darlehenszinsenSteuer);
    const beitragspflichtigeEinnahmenGkv = gesellschafterBruttoEinkommen;
    const gesetzlicheKrankenversicherungBeitrag = berechneGesetzlicheKrankenversicherungBeitrag(
      beitragspflichtigeEinnahmenGkv,
      undefined,
      undefined,
      state.steuerjahr,
      state.anzahlKinder
    );
    const zielnettoGesellschafter = Math.max(
      0,
      state.zielnettoGesellschafter ?? DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB
    );
    const gesellschafterNetto = gehaelterNetto + darlehenszinsenNetto - gesetzlicheKrankenversicherungBeitrag;
    const zielnettoDifferenz = gesellschafterNetto - zielnettoGesellschafter;

    // Positive retained result is held as cash reserve (Aktiva).
    // Investment cash (investitionsCashZufluss) is already in cashReserve from above; subtract only
    // the portion that is still there (not consumed by expenses or taxes) to avoid double-counting.
    const investitionsCashNochInReserve = Math.max(0, Math.min(investitionsCashZufluss, cashReserve - cashReserveVorInvestition));
    const cashReserveZugang = Math.max(0, nettogewinn - investitionsCashNochInReserve - gewinnNachSteuernEtfZufluss);
    cashReserve += cashReserveZugang;

    // Update ETF value: after growth, deduct all cash outflows funded by ETF sales.
    etfLots = verkauf.lots;
    etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", freieDarlehensZuzahlungen);
    etfLots = fuegeEtfLotHinzu(etfLots, "zuzahlung", gewinnNachSteuernEtfZufluss);
    const etfWert = sumEtfWert(etfLots);
    const startkapitalEtfWert = sumEtfWertNachTyp(etfLots, "startkapital");
    const darlehenEtfWert = sumEtfWertNachTyp(etfLots, "darlehen");
    const zuzahlungenEtfWert = sumEtfWertNachTyp(etfLots, "zuzahlung");

    offenesDarlehen = darlehenBetragEnde;

    // Gesamtvermögen = total gross assets (ETF + cash reserve + investments).
    // The outstanding loan is a liability shown separately; net worth = assets - offenesDarlehen.
    const gesamtvermoegen = etfWert + cashReserve + investitionsKapitalGesamt;
    const nettovermoegen = gesamtvermoegen - offenesDarlehen - investitionsKreditRestschuld;
    const haftungskapitalEingeflossen = Math.max(0, state.startkapital) + kumulierterCashZuschuss;

    ergebnisse.push({
      jahr,
      gesamtvermoegen,
      gewinn: gewinnNachBetriebsausgaben,
      steuer: gesamtSteuer,
      nettogewinn,
      details: {
        etfWert,
        startkapitalEtfWert,
        darlehenEtfWert,
        zuzahlungenEtfWert,
        etfGewinn: realisierterEtfErtrag,
        etfEinstandswertVerkauft: einstandswertVerkauft,
        theoretischerEtfErtrag,
        etfVerkauf,
        jaehrlicheKosten,
        handyNettoKosten,
        benefitsKosten,
        konsumNutzenwert,
        kumulierterKonsumwert,
        geschaeftsfuehrergehalt,
        gehaelterGesamt,
        betriebsausgabenGesamt,
        gehaelterEinkommensteuer,
        gehaelterSoli,
        gehaelterNetto,
        simulierterGewinn,
        ausGewinnBeglicheneBetriebsausgaben,
        gewinnNachSteuernEtfZufluss,
        gesellschafterBruttoEinkommen,
        gesellschafterEinkommensteuer,
        gesellschafterSoli,
        gesellschafterSteuerGesamt,
        beitragspflichtigeEinnahmenGkv,
        gesetzlicheKrankenversicherungBeitrag,
        darlehenszinsenSteuer,
        darlehenszinsenNetto,
        gesellschafterNetto,
        zielnettoGesellschafter,
        zielnettoDifferenz,
        jaehrlicherCashZuschuss,
        kumulierterCashZuschuss,
        haftungskapitalEingeflossen,
        ausCashZuschussBeglicheneBetriebsausgaben,
        ausCashReserveBeglicheneBetriebsausgaben,
        ausZuzahlungenBeglicheneBetriebsausgaben,
        ausCashReserveBeglicheneSonstigeAuszahlungen,
        ausDarlehensZuzahlungenBeglicheneSonstigeAuszahlungen,
        ungedeckteBetriebsausgaben,
        freieDarlehensZuzahlungen,
        jaehrlicheZinsen,
        aufgelaufeneZinsen: state.darlehen.endfaellig ? aufgelaufeneZinsen : 0,
        gewinnNachBetriebsausgaben,
        steuerpflichtigerGewinn: versteuerterGewinn,
        verlustvortrag,
        verlustVortragGenutzt,
        vorabpauschaleVorAnrechnung: vorabpauschaleBrutto,
        vorabpauschale,
        vorabpauschalesteuer,
        etfVerkaufssteuer,
        gmbhSteuer,
        gmbhSteuerKst,
        gmbhSteuerGewSt,
        deckungssaldoNachAusgabenUndSteuern,
        cashReserve,
        cashReserveZugang,
        offenesDarlehen,
        nettovermoegen,
        dienstwagenGmbhKosten,
        dienstwagenGeldwerterVorteil,
        stillerGesellschafterKosten,
        stillerGesellschafterSteuer: berechneStillerGesellschafterSteuer(
          stillerGesellschafterKosten,
          state.stillerGesellschafter,
          state.persoenlicherGrenzsteuersatz,
          state.kapitalertragsteuerSatz,
          state.sparerpauschbetrag,
          state.steuerjahr
        ).steuer,
        stillerGesellschafterNetto: Math.max(
          0,
          stillerGesellschafterKosten -
            berechneStillerGesellschafterSteuer(
              stillerGesellschafterKosten,
              state.stillerGesellschafter,
              state.persoenlicherGrenzsteuersatz,
              state.kapitalertragsteuerSatz,
              state.sparerpauschbetrag,
              state.steuerjahr
            ).steuer
        ),
        stillerGesellschafterEinlage: sumEtfWertNachTyp(etfLots, "stillerGesellschafter"),
        investitionsKapitalGesamt,
        investitionsGewinnVerlustProJahr,
        investitionsKumulierterGewinnVerlust,
        investitionsZinsaufwandProJahr,
        investitionsTilgungProJahr,
        investitionsNettoCashflowProJahr,
        investitionsKumulierterNettoCashflow,
        investitionsKreditRestschuld,
      },
      betriebskostenPosten,
      etfLots: etfLots.map((lot) => ({ ...lot })),
    });
  }

  return ergebnisse;
}
