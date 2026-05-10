import { create } from "zustand";
import { CalculatorState, GruendungState, BetriebState, EndeState, KostenPosition } from "@/lib/types";
import { berechneBetriebsErgebnisse } from "@/lib/calculations/betrieb";
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
  { id: generateId(), bezeichnung: "Steuerberatung (jährlich)", betrag: 3000, kategorie: "Beratung", periode: 'jaehrlich' },
  { id: generateId(), bezeichnung: "Buchhaltungssoftware", betrag: 50, kategorie: "Software", periode: 'monatlich' },
  { id: generateId(), bezeichnung: "IHK-Beitrag", betrag: 250, kategorie: "Pflichtbeiträge", periode: 'jaehrlich' },
  { id: generateId(), bezeichnung: "Bankgebühren", betrag: 20, kategorie: "Bank", periode: 'monatlich' },
];

const initialState: CalculatorState = {
  gruendung: {
    kosten: defaultGruendungskosten,
  },
  betrieb: {
    startkapital: 50000,
    darlehen: {
      betrag: 25000,
      zinssatz: 3.5,
      endfaellig: false,
    },
    etfRendite: 7,
    laufzeitJahre: 10,
    kosten: defaultBetriebskosten,
    benefits: {
      tankgutschein: 50,
      strategieessen: 1500,
    },
  },
  ende: {
    geschaeftsfuehrergehalt: 60000,
    gewinnausschuettung: 40000,
    darlehenZinsen: 875, // 3.5% on 25.000€ shareholder loan
    laufzeitJahre: 5,
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

export const useCalculatorStore = create<CalculatorStore>((set, get) => ({
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
    const letzterEtfWert =
      betriebErgebnisse.length > 0
        ? betriebErgebnisse[betriebErgebnisse.length - 1].details.etfWert ?? 0
        : 0;
    return berechneEndeErgebnisse(get().ende, letzterEtfWert);
  },
}));
