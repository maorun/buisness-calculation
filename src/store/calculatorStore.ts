import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CalculatorState, GruendungState, BetriebState, EndeState, KostenPosition } from "@/lib/types";
import { berechneBetriebsErgebnisse, DEFAULT_FIRMENHANDY_CONFIG, DEFAULT_STILLER_GESELLSCHAFTER_CONFIG } from "@/lib/calculations/betrieb";
import { berechneEndeErgebnisse } from "@/lib/calculations/ende";
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
    startkapital: 12500,
    jaehrlicherCashZuschuss: 2400,
    simulierterGewinn: 0,
    zielnettoGesellschafter: 36000,
    geschaeftsfuehrergehalt: 17000,
    darlehen: {
      betrag: 47500,
      zinssatz: 3,
      monatlicherZuschuss: 0,
      endfaellig: true,
    },
    etfRendite: 5,
    laufzeitJahre: 10,
    kosten: defaultBetriebskosten,
    benefits: {
      tankgutschein: 50,
      strategieessen: 0,
      bav: 0,
    },
    firmenhandy: { ...DEFAULT_FIRMENHANDY_CONFIG },
    stillerGesellschafter: { ...DEFAULT_STILLER_GESELLSCHAFTER_CONFIG },
  },
  ende: {
    geschaeftsfuehrergehalt: 0,
    stammkapitalErhoehungEtf: 0,
    gehaltBereich1: 0,
    teiltilgungBereich1: 0,
    gewinnausschuettung: 0,
    tilgungsrate: 0,
    laufzeitJahre: 5,
    zielnettoBereich1: 17000,
    zielnettoBereich2: 17000,
  },
};

interface CalculatorStore extends CalculatorState {
  // Actions
  setGruendung: (state: Partial<GruendungState>) => void;
  setBetrieb: (state: Partial<BetriebState>) => void;
  setEnde: (state: Partial<EndeState>) => void;

  // Kosten list management
  addGruendungskosten: (position: Omit<KostenPosition, "id">) => void;
  updateGruendungskosten: (id: string, position: Partial<KostenPosition>) => void;
  removeGruendungskosten: (id: string) => void;

  addBetriebskosten: (position: Omit<KostenPosition, "id">) => void;
  updateBetriebskosten: (id: string, position: Partial<KostenPosition>) => void;
  removeBetriebskosten: (id: string) => void;

  // Derived getters
  getGruendungsGesamtkosten: () => number;
  getBetriebsErgebnisse: () => JahresErgebnis[];
  getEndeErgebnisse: () => JahresErgebnis[];
}

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
  ...initialState,

  setGruendung: (partial) =>
    set((state) => ({ gruendung: { ...state.gruendung, ...partial } })),

  setBetrieb: (partial) =>
    set((state) => ({ betrieb: { ...state.betrieb, ...partial } })),

  setEnde: (partial) =>
    set((state) => ({ ende: { ...state.ende, ...partial } })),

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

  getGruendungsGesamtkosten: () => berechneGesamtkosten(get().gruendung.kosten),

  getBetriebsErgebnisse: () => berechneBetriebsErgebnisse(get().betrieb),

  getEndeErgebnisse: () => {
    const betriebErgebnisse = berechneBetriebsErgebnisse(get().betrieb);
    const letztesBetriebsergebnis = betriebErgebnisse.length > 0
      ? betriebErgebnisse[betriebErgebnisse.length - 1]
      : undefined;
    const letzterEtfWert = letztesBetriebsergebnis?.details.etfWert ?? 0;
    const offenesDarlehen = letztesBetriebsergebnis?.details.offenesDarlehen
      ?? Math.max(0, get().betrieb.darlehen.betrag);
    const aufgelaufeneZinsen = letztesBetriebsergebnis?.details.aufgelaufeneZinsen ?? 0;
    const endfaellig = get().betrieb.darlehen.endfaellig;
    return berechneEndeErgebnisse(
      get().ende,
      letzterEtfWert,
      offenesDarlehen,
      get().betrieb.darlehen.zinssatz,
      aufgelaufeneZinsen,
      endfaellig,
      get().betrieb.etfRendite,
      get().betrieb.kosten,
      get().betrieb.benefits,
      get().betrieb.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG
    );
  },
    }),
    {
      name: "gmbh-kalkulator",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        gruendung: state.gruendung,
        betrieb: state.betrieb,
        ende: state.ende,
      }),
    }
  )
);
