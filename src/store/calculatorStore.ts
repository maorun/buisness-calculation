import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CalculatorScenario, CalculatorState, GruendungState, BetriebState, EndeState, KostenPosition, InvestitionsPosition } from "@/lib/types";
import {
  berechneBetriebsErgebnisse,
  berechneGmbhSteuerRaten,
  berechneAlleInvestitionsErgebnisse,
  fuegeEtfLotHinzu,
  EtfLot,
  DEFAULT_DIENSTWAGEN_CONFIG,
  DEFAULT_ESSENSZUSCHUSS_PRO_TAG,
  DEFAULT_FIRMENHANDY_CONFIG,
  DEFAULT_KAPITALERTRAGSTEUER_SATZ,
  DEFAULT_SPARERPAUSCHBETRAG,
  DEFAULT_KOERPERSCHAFTSTEUER_SATZ,
  DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ,
  DEFAULT_GEWERBESTEUER_SATZ,
  DEFAULT_STILLER_GESELLSCHAFTER_CONFIG,
} from "@/lib/calculations/betrieb";
import { berechneEndeErgebnisse, berechneHoldingSzenarioVergleich, HoldingSzenarioVergleich } from "@/lib/calculations/ende";
import { berechneGesamtkosten } from "@/lib/calculations/gruendung";
import { JahresErgebnis } from "@/lib/types";

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

const defaultGruendungskosten: KostenPosition[] = [
  { id: generateId(), bezeichnung: "Notar (Gesellschaftsvertrag)", betrag: 1500, kategorie: "Notar" },
  { id: generateId(), bezeichnung: "Handelsregister-Eintragung", betrag: 150, kategorie: "Amtsgericht" },
  { id: generateId(), bezeichnung: "Stammkapital (Einlage)", betrag: 25000, kategorie: "Kapital" },
  { id: generateId(), bezeichnung: "Steuerberater (Gründung)", betrag: 1000, kategorie: "Beratung" },
  { id: generateId(), bezeichnung: "Gewerbeanmeldung", betrag: 30, kategorie: "Ämter" },
  { id: generateId(), bezeichnung: "Geschäftskonto Eröffnung", betrag: 0, kategorie: "Bank" },
];

const defaultBetriebskosten: KostenPosition[] = [
  { id: generateId(), bezeichnung: "Buchhaltungssoftware", betrag: 50, kategorie: "Software", periode: 'monatlich' },
  { id: generateId(), bezeichnung: "IHK-Beitrag", betrag: 250, kategorie: "Pflichtbeiträge", periode: 'jaehrlich' },
  { id: generateId(), bezeichnung: "Bankgebühren", betrag: 20, kategorie: "Bank", periode: 'monatlich' },
  { id: generateId(), bezeichnung: "Transparenzregister", betrag: 20, kategorie: "Pflichtbeiträge", periode: 'jaehrlich' },
  { id: generateId(), bezeichnung: "Bundesanzeiger", betrag: 100, kategorie: "Pflichtbeiträge", periode: 'jaehrlich' },
  { id: generateId(), bezeichnung: "Berufsgenossenschaft", betrag: 150, kategorie: "Pflichtbeiträge", periode: 'jaehrlich' },
  { id: generateId(), bezeichnung: "LEI Gebühren", betrag: 60, kategorie: "Pflichtbeiträge", periode: 'jaehrlich' },
];

const initialState: CalculatorState = {
  gruendung: {
    kosten: defaultGruendungskosten,
  },
  betrieb: {
    steuerjahr: 2025,
    anzahlKinder: 0,
    startkapital: 12500,
    jaehrlicherCashZuschuss: 2400,
    kapitalertragsteuerSatz: DEFAULT_KAPITALERTRAGSTEUER_SATZ,
    sparerpauschbetrag: DEFAULT_SPARERPAUSCHBETRAG,
    koerperschaftsteuerSatz: 15,
    solidaritaetszuschlagSatz: 5.5,
    gewerbesteuerSatz: 14,
    investitionsabzugsbetrag: 0,
    investitionsabzugsbetragJahr: 0,
    simulierterGewinn: 0,
    zielnettoGesellschafter: 36000,
    geschaeftsfuehrergehalt: 17000,
    darlehen: {
      betrag: 47500,
      zinssatz: 3,
      monatlicherZuschuss: 0,
      endfaellig: true,
    },
    etfRendite: 7,
    inflationsrate: 2,
    realwerteAnzeigen: false,
    laufzeitJahre: 10,
    kosten: defaultBetriebskosten,
    benefits: {
      tankgutschein: 50,
      tankgutscheinAktiv: true,
      bavBeitragJaehrlich: 0,
      bavAktiv: false,
      internetPauschaleMonatlich: 0,
      internetPauschaleAktiv: false,
      vermoegenswirksameLeistungenMonatlich: 0,
      vermoegenswirksameLeistungenAktiv: false,
      strategieessen: 0,
      strategieessenAktiv: true,
      essenszuschussProTag: DEFAULT_ESSENSZUSCHUSS_PRO_TAG,
      essenszuschussTageProJahr: 220,
      essenszuschussAktiv: true,
      dienstwagen: { ...DEFAULT_DIENSTWAGEN_CONFIG },
    },
    firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG },
    stillerGesellschafter: { ...DEFAULT_STILLER_GESELLSCHAFTER_CONFIG },
    holding: { aktiv: false, steuerfreibetragProzent: 95 },
  },
  ende: {
    geschaeftsfuehrergehalt: 0,
    simulierterGewinn: 0,
    persoenlicherSteuersatz: 42,
    stammkapitalErhoehungEtf: 0,
    holding: { aktiv: false, steuerfreibetragProzent: 95 },
    gehaltBereich1: 0,
    teiltilgungBereich1: 0,
    gewinnausschuettung: 0,
    tilgungsrate: 0,
    laufzeitJahre: 5,
    zielnettoBereich1: 17000,
    zielnettoBereich2: 17000,
    darlehenEndfaellig: false,
    privatDarlehenBetrag: 0,
    privatDarlehenZinssatz: 3,
    benefitAktiv: {
      tankgutscheinAktiv: true,
      essenszuschussAktiv: true,
      strategieessenAktiv: true,
      firmenhandyAktiv: true,
      dienstwagenAktiv: false,
    },
  },
};

const presetScenarios = (): CalculatorScenario[] => [
  {
    id: "basis",
    name: "Basisszenario",
    beschreibung: "Aktuelle Eingaben als Ausgangspunkt.",
    state: { ...initialState },
  },
  {
    id: "konservativ",
    name: "Konservativ",
    beschreibung: "Vorsichtige Renditeannahme von 4 %.",
    state: { ...initialState, betrieb: { ...initialState.betrieb, etfRendite: 4 } },
  },
  {
    id: "optimistisch",
    name: "Optimistisch",
    beschreibung: "Höhere Renditeannahme von 9 %.",
    state: { ...initialState, betrieb: { ...initialState.betrieb, etfRendite: 9 } },
  },
];

interface CalculatorStore extends CalculatorState {
  scenarios: CalculatorScenario[];
  // Actions
  setGruendung: (state: Partial<GruendungState>) => void;
  setBetrieb: (state: Partial<BetriebState>) => void;
  setEnde: (state: Partial<EndeState>) => void;
  loadState: (state: Partial<CalculatorState>) => void;
  saveScenario: (name: string, beschreibung?: string) => string;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;

  // Kosten list management
  addGruendungskosten: (position: Omit<KostenPosition, "id">) => void;
  updateGruendungskosten: (id: string, position: Partial<KostenPosition>) => void;
  removeGruendungskosten: (id: string) => void;

  addBetriebskosten: (position: Omit<KostenPosition, "id">) => void;
  updateBetriebskosten: (id: string, position: Partial<KostenPosition>) => void;
  removeBetriebskosten: (id: string) => void;

  addInvestition: (position: Omit<InvestitionsPosition, "id">) => void;
  updateInvestition: (id: string, position: Partial<InvestitionsPosition>) => void;
  removeInvestition: (id: string) => void;

  // Derived getters
  getGruendungsGesamtkosten: () => number;
  getBetriebsErgebnisse: () => JahresErgebnis[];
  getEndeErgebnisse: (endeOverride?: Partial<EndeState>) => JahresErgebnis[];
  getHoldingSzenarioVergleich: () => HoldingSzenarioVergleich;
}

type PersistedCalculatorState = Partial<CalculatorState> & { scenarios?: CalculatorScenario[] };

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
  ...initialState,
  scenarios: presetScenarios(),

  setGruendung: (partial) =>
    set((state) => ({ gruendung: { ...state.gruendung, ...partial } })),

  setBetrieb: (partial) =>
    set((state) => ({ betrieb: { ...state.betrieb, ...partial } })),

  setEnde: (partial) =>
    set((state) => ({ ende: { ...state.ende, ...partial } })),

  loadState: (partial) =>
    set((state) => ({
      gruendung: partial.gruendung
        ? { ...state.gruendung, ...partial.gruendung }
        : state.gruendung,
      betrieb: partial.betrieb
        ? ({
            ...state.betrieb,
            ...partial.betrieb,
            darlehen: { ...state.betrieb.darlehen, ...(partial.betrieb.darlehen ?? {}) },
            benefits: { ...state.betrieb.benefits, ...(partial.betrieb.benefits ?? {}) },
            firmenhandy: { ...initialState.betrieb.firmenhandy, ...(partial.betrieb.firmenhandy ?? {}) },
            stillerGesellschafter: { ...initialState.betrieb.stillerGesellschafter, ...(partial.betrieb.stillerGesellschafter ?? {}) },
            holding: { ...initialState.betrieb.holding, ...(partial.betrieb.holding ?? {}) },
          } as BetriebState)
        : state.betrieb,
      ende: partial.ende
        ? { ...state.ende, ...partial.ende, holding: { ...initialState.ende.holding, ...(partial.ende.holding ?? {}) } }
        : state.ende,
    })),

  saveScenario: (name, beschreibung) => {
    const id = generateId();
    const state = get();
    set((current) => ({
      scenarios: [...current.scenarios, {
        id,
        name: name.trim() || `Szenario ${current.scenarios.length + 1}`,
        beschreibung,
        state: {
          gruendung: structuredClone(state.gruendung),
          betrieb: structuredClone(state.betrieb),
          ende: structuredClone(state.ende),
        },
      }],
    }));
    return id;
  },

  loadScenario: (id) => {
    const scenario = get().scenarios.find((item) => item.id === id);
    if (scenario) get().loadState(scenario.state);
  },

  deleteScenario: (id) =>
    set((state) => ({ scenarios: state.scenarios.filter((scenario) => scenario.id !== id) })),

  addGruendungskosten: (position) =>
    set((state) => ({
      gruendung: {
        ...state.gruendung,
        kosten: [...state.gruendung.kosten, { ...position, id: generateId() }],
      },
    })),

  updateGruendungskosten: (id, position) =>
    set((state) => ({
      gruendung: {
        ...state.gruendung,
        kosten: state.gruendung.kosten.map((k) =>
          k.id === id ? { ...k, ...position } : k
        ),
      },
    })),

  removeGruendungskosten: (id) =>
    set((state) => ({
      gruendung: {
        ...state.gruendung,
        kosten: state.gruendung.kosten.filter((k) => k.id !== id),
      },
    })),

  addBetriebskosten: (position) =>
    set((state) => ({
      betrieb: {
        ...state.betrieb,
        kosten: [...state.betrieb.kosten, { ...position, id: generateId() }],
      },
    })),

  updateBetriebskosten: (id, position) =>
    set((state) => ({
      betrieb: {
        ...state.betrieb,
        kosten: state.betrieb.kosten.map((k) =>
          k.id === id ? { ...k, ...position } : k
        ),
      },
    })),

  removeBetriebskosten: (id) =>
    set((state) => ({
      betrieb: {
        ...state.betrieb,
        kosten: state.betrieb.kosten.filter((k) => k.id !== id),
      },
    })),

  addInvestition: (position) =>
    set((state) => ({
      betrieb: {
        ...state.betrieb,
        investitionen: [...(state.betrieb.investitionen ?? []), { ...position, id: generateId() }],
      },
    })),

  updateInvestition: (id, position) =>
    set((state) => ({
      betrieb: {
        ...state.betrieb,
        investitionen: (state.betrieb.investitionen ?? []).map((inv) =>
          inv.id === id ? { ...inv, ...position } : inv
        ),
      },
    })),

  removeInvestition: (id) =>
    set((state) => ({
      betrieb: {
        ...state.betrieb,
        investitionen: (state.betrieb.investitionen ?? []).filter((inv) => inv.id !== id),
      },
    })),

  getGruendungsGesamtkosten: () => berechneGesamtkosten(get().gruendung.kosten),

  getBetriebsErgebnisse: () => berechneBetriebsErgebnisse(get().betrieb),

  getEndeErgebnisse: (endeOverride) => {
    const endeState = { ...get().ende, ...endeOverride };
    const betriebErgebnisse = berechneBetriebsErgebnisse(get().betrieb);
    const letztesBetriebsergebnis = betriebErgebnisse.length > 0
      ? betriebErgebnisse[betriebErgebnisse.length - 1]
      : undefined;
    // Pass the full ETF lots from the last Betrieb year (if available), adding any liquid cashReserve
    // as a new lot so that cost bases per lot are fully preserved from Betrieb to Ende phase.
    const lastEtfLots = letztesBetriebsergebnis?.etfLots;
    const cashReserve = letztesBetriebsergebnis?.details.cashReserve ?? 0;
    let initialEtfInput: EtfLot[] | number;
    if (lastEtfLots && lastEtfLots.length > 0) {
      initialEtfInput = lastEtfLots.map((lot) => ({ ...lot }));
      if (cashReserve > 0) {
        initialEtfInput = fuegeEtfLotHinzu(initialEtfInput, "zuzahlung", cashReserve);
      }
    } else {
      initialEtfInput = (letztesBetriebsergebnis?.details.etfWert ?? 0) + cashReserve;
    }
    const offenesDarlehen = letztesBetriebsergebnis?.details.offenesDarlehen
      ?? Math.max(0, get().betrieb.darlehen.betrag);
    const aufgelaufeneZinsen = letztesBetriebsergebnis?.details.aufgelaufeneZinsen ?? 0;
    const betriebDarlehenEndfaellig = get().betrieb.darlehen.endfaellig;
    const verlustvortragBetriebEnde = letztesBetriebsergebnis?.details.verlustvortrag ?? 0;
    const { gmbhSteuerGesamt, kstGesamt, gewerbesteuer } = berechneGmbhSteuerRaten(
      get().betrieb.koerperschaftsteuerSatz ?? DEFAULT_KOERPERSCHAFTSTEUER_SATZ,
      get().betrieb.solidaritaetszuschlagSatz ?? DEFAULT_SOLIDARITAETSZUSCHLAG_SATZ,
      get().betrieb.gewerbesteuerSatz ?? DEFAULT_GEWERBESTEUER_SATZ,
    );

    const investitionen = get().betrieb.investitionen ?? [];
    let initialInvestitionsKapitalWerte: number[] | undefined;
    let initialInvestitionsKreditRestschuldWerte: number[] | undefined;
    if (investitionen.length > 0 && get().betrieb.laufzeitJahre > 0) {
      const investitionsErgebnisse = berechneAlleInvestitionsErgebnisse(investitionen, get().betrieb.laufzeitJahre);
      initialInvestitionsKapitalWerte = investitionsErgebnisse.map(
        (ergebnis) => ergebnis.jahreswerte[get().betrieb.laufzeitJahre - 1]?.kapital ?? 0
      );
      initialInvestitionsKreditRestschuldWerte = investitionsErgebnisse.map(
        (ergebnis) => ergebnis.jahreswerte[get().betrieb.laufzeitJahre - 1]?.restschuld ?? 0
      );
    }

    return berechneEndeErgebnisse(
      endeState,
      initialEtfInput,
      offenesDarlehen,
      get().betrieb.darlehen.zinssatz,
      aufgelaufeneZinsen,
      betriebDarlehenEndfaellig,
      get().betrieb.etfRendite,
      get().betrieb.kosten,
      {
        ...get().betrieb.benefits,
        ...get().ende.benefitAktiv,
      },

      {
        ...(get().betrieb.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG),
        aktiv: get().ende.benefitAktiv?.firmenhandyAktiv ?? (get().betrieb.firmenhandy?.aktiv ?? DEFAULT_FIRMENHANDY_CONFIG.aktiv),
      },
      gmbhSteuerGesamt,
      kstGesamt,
      gewerbesteuer,
      get().betrieb.steuerjahr,
      verlustvortragBetriebEnde,
      get().betrieb.anzahlKinder,
      investitionen,
      initialInvestitionsKapitalWerte,
      initialInvestitionsKreditRestschuldWerte
    );
  },

  getHoldingSzenarioVergleich: () => {
    const mitHolding = get().getEndeErgebnisse();
    const ohneHolding = get().getEndeErgebnisse({
      holding: { ...get().ende.holding, aktiv: false },
    });
    return berechneHoldingSzenarioVergleich(mitHolding, ohneHolding);
  },
    }),
    {
      name: "gmbh-kalkulator",
      version: 8,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, persistedVersion) => {
        const state = persistedState as PersistedCalculatorState;
        const shouldMigrateMealDaysDefault =
          (persistedVersion ?? 0) < 2
          && (state?.betrieb?.benefits?.essenszuschussTageProJahr ?? 0) === 0;
        return {
          ...initialState,
          scenarios: state?.scenarios ?? presetScenarios(),
          ...state,
          gruendung: {
            ...initialState.gruendung,
            ...state?.gruendung,
          },
          betrieb: {
            ...initialState.betrieb,
            anzahlKinder: state?.betrieb?.anzahlKinder ?? initialState.betrieb.anzahlKinder,
            inflationsrate: state?.betrieb?.inflationsrate ?? initialState.betrieb.inflationsrate,
            realwerteAnzeigen: state?.betrieb?.realwerteAnzeigen ?? initialState.betrieb.realwerteAnzeigen,
            ...state?.betrieb,
            darlehen: {
              ...initialState.betrieb.darlehen,
              ...state?.betrieb?.darlehen,
            },
            benefits: {
              ...initialState.betrieb.benefits,
              ...state?.betrieb?.benefits,
              dienstwagen: {
                ...initialState.betrieb.benefits.dienstwagen,
                ...state?.betrieb?.benefits?.dienstwagen,
              },
              ...(shouldMigrateMealDaysDefault
                ? { essenszuschussTageProJahr: initialState.betrieb.benefits.essenszuschussTageProJahr }
                : {}),
            },
            firmenhandy: {
              ...initialState.betrieb.firmenhandy,
              ...state?.betrieb?.firmenhandy,
            },
            stillerGesellschafter: {
              ...initialState.betrieb.stillerGesellschafter,
              ...state?.betrieb?.stillerGesellschafter,
            },
            investitionen: state?.betrieb?.investitionen ?? initialState.betrieb.investitionen,
          },
          ende: {
            ...initialState.ende,
            ...state?.ende,
            benefitAktiv: {
              ...initialState.ende.benefitAktiv,
              ...state?.ende?.benefitAktiv,
            },
          },
        };
      },
      partialize: (state) => ({
        gruendung: state.gruendung,
        betrieb: state.betrieb,
        ende: state.ende,
        scenarios: state.scenarios,
      }),
    }
  )
);
