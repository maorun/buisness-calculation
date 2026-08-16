import { berechneBetriebsErgebnisse } from "@/lib/calculations/betrieb";
import { berechneEndeErgebnisse } from "@/lib/calculations/ende";

const betriebParams = {
  startkapital: 12500, jaehrlicherCashZuschuss: 0,
  kapitalertragsteuerSatz: 25, koerperschaftsteuerSatz: 15,
  solidaritaetszuschlagSatz: 5.5, gewerbesteuerSatz: 14,
  simulierterGewinn: 8400, zielnettoGesellschafter: 36000,
  geschaeftsfuehrergehalt: 0,
  darlehen: { betrag: 0, zinssatz: 3, monatlicherZuschuss: 0, endfaellig: false },
  etfRendite: 5, laufzeitJahre: 10,
  kosten: [
    { id: "1", bezeichnung: "Buchhaltungssoftware", betrag: 50, kategorie: "Software", periode: "monatlich" as const },
    { id: "2", bezeichnung: "IHK-Beitrag", betrag: 250, kategorie: "Pflichtbeiträge", periode: "jaehrlich" as const },
    { id: "3", bezeichnung: "Bankgebühren", betrag: 20, kategorie: "Bank", periode: "monatlich" as const },
    { id: "4", bezeichnung: "Transparenzregister", betrag: 20, kategorie: "Pflichtbeiträge", periode: "jaehrlich" as const },
    { id: "5", bezeichnung: "Bundesanzeiger", betrag: 100, kategorie: "Pflichtbeiträge", periode: "jaehrlich" as const },
    { id: "6", bezeichnung: "Berufsgenossenschaft", betrag: 150, kategorie: "Pflichtbeiträge", periode: "jaehrlich" as const },
    { id: "7", bezeichnung: "LEI Gebühren", betrag: 60, kategorie: "Pflichtbeiträge", periode: "jaehrlich" as const },
  ],
  benefits: {
    tankgutschein: 50, tankgutscheinAktiv: true,
    strategieessen: 0, strategieessenAktiv: true,
    essenszuschussProTag: 7.67, essenszuschussTageProJahr: 200, essenszuschussAktiv: true,
    bav: 0, bavAktiv: false,
  },
  firmenhandy: { aktiv: true, anschaffungskosten: 1000, restwertQuote: 0.1, ersatzzyklusJahre: 3, erstanschaffungJahr: 2 },
  stillerGesellschafter: { aktiv: false, typ: "typisch" as const, einlage: 1000, gewinnbeteiligungProzent: 2, zinssatz: 0 },
  persoenlicherGrenzsteuersatz: 40, investitionen: [],
};

test("kink trace year by year", () => {
  const betriebErgebnisse = berechneBetriebsErgebnisse(betriebParams);
  
  console.log("\nBetrieb year-by-year:");
  let prev = 0;
  for (const e of betriebErgebnisse) {
    const chart = (e.details.nettovermoegen ?? 0) + (e.details.kumulierterKonsumwert ?? 0);
    console.log(`  Jahr ${e.jahr}: netto=${e.details.nettovermoegen?.toFixed(0)}, cashReserve=${e.details.cashReserve?.toFixed(0)}, etf=${e.details.etfWert?.toFixed(0)}, konsumKumul=${e.details.kumulierterKonsumwert?.toFixed(0)}, chart=${chart.toFixed(0)}, Δ=${(chart - prev).toFixed(0)}`);
    prev = chart;
  }

  const letztes = betriebErgebnisse[betriebErgebnisse.length - 1];
  const etfWertAnfang = (letztes?.details.etfWert ?? 0) + (letztes?.details.cashReserve ?? 0);
  const gmbhSteuerGesamt = 0.15 * (1 + 0.055) + 0.14;
  const kstGesamt = 0.15 * (1 + 0.055);
  const gewerbesteuer = 0.14;

  const ende = {
    geschaeftsfuehrergehalt: 0, simulierterGewinn: 8400, stammkapitalErhoehungEtf: 0,
    gehaltBereich1: 0, teiltilgungBereich1: 0, gewinnausschuettung: 0, tilgungsrate: 0,
    laufzeitJahre: 5, zielnettoBereich1: 17000, zielnettoBereich2: 17000,
    darlehenEndfaellig: false, privatDarlehenBetrag: 0, privatDarlehenZinssatz: 3,
    benefitAktiv: { tankgutscheinAktiv: true, essenszuschussAktiv: true, strategieessenAktiv: true, bavAktiv: true, firmenhandyAktiv: true },
  };

  const endeErgebnisse = berechneEndeErgebnisse(
    ende, etfWertAnfang, 0, 3, 0, false, 5,
    betriebParams.kosten, { ...betriebParams.benefits, ...ende.benefitAktiv },
    { ...betriebParams.firmenhandy, aktiv: true },
    gmbhSteuerGesamt, kstGesamt, gewerbesteuer
  );

  const gmbhBetriebKonsumwert = letztes?.details.kumulierterKonsumwert ?? 0;
  console.log(`\nEnde (gmbhBetriebKonsumwert=${gmbhBetriebKonsumwert.toFixed(0)}):`);
  let prevE = (letztes?.details.nettovermoegen ?? 0) + gmbhBetriebKonsumwert;
  for (const e of endeErgebnisse) {
    const fdv = Math.max(0, e.details.firmenDarlehensverbindlichkeit ?? 0);
    const chart = (e.gesamtvermoegen - fdv) + gmbhBetriebKonsumwert;
    console.log(`  Jahr ${e.jahr}: firmEtf=${e.details.firmenEtfVermoegen?.toFixed(0)}, chart=${chart.toFixed(0)}, Δ=${(chart - prevE).toFixed(0)}`);
    prevE = chart;
  }

  expect(true).toBe(true);
});
