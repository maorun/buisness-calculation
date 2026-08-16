import { berechneBetriebsErgebnisse, berechneGmbhSteuerRaten } from "@/lib/calculations/betrieb";
import { berechneEndeErgebnisse } from "@/lib/calculations/ende";
import { berechneGesamtvergleichZeitreihe } from "@/lib/calculations/gesamtvergleich";

const betrieb: any = {
  startkapital: 12500,
  jaehrlicherCashZuschuss: 0,
  kapitalertragsteuerSatz: 25,
  koerperschaftsteuerSatz: 15,
  solidaritaetszuschlagSatz: 5.5,
  gewerbesteuerSatz: 14,
  simulierterGewinn: 8400,
  zielnettoGesellschafter: 36000,
  geschaeftsfuehrergehalt: 0,
  darlehen: { betrag: 0, zinssatz: 3, monatlicherZuschuss: 0, endfaellig: false },
  etfRendite: 5,
  laufzeitJahre: 10,
  kosten: [
    { id: "a", bezeichnung: "Buchhaltungssoftware", betrag: 50, kategorie: "Software", periode: "monatlich" },
    { id: "b", bezeichnung: "IHK-Beitrag", betrag: 250, kategorie: "Pflichtbeiträge", periode: "jaehrlich" },
  ],
  benefits: {
    tankgutschein: 50, tankgutscheinAktiv: true,
    strategieessen: 0, strategieessenAktiv: true,
    essenszuschussProTag: 7.67, essenszuschussTageProJahr: 200, essenszuschussAktiv: true,
    bav: 0, bavAktiv: false,
  },
  firmenhandy: { aktiv: true, anschaffungskosten: 1000, restwertQuote: 0.1, ersatzzyklusJahre: 3, erstanschaffungJahr: 2 },
  stillerGesellschafter: { aktiv: false, typ: "typisch", einlage: 1000, gewinnbeteiligungProzent: 2, zinssatz: 0 },
  persoenlicherGrenzsteuersatz: 40,
  investitionen: [],
};

const ende: any = {
  geschaeftsfuehrergehalt: 0,
  simulierterGewinn: 8400,
  stammkapitalErhoehungEtf: 0,
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
    tankgutscheinAktiv: true, essenszuschussAktiv: true, strategieessenAktiv: true,
    bavAktiv: true, firmenhandyAktiv: true,
  },
};

test('debug kink', () => {
  const betriebsErgebnisse = berechneBetriebsErgebnisse(betrieb);
  const last = betriebsErgebnisse[betriebsErgebnisse.length - 1];
  console.log("Last betrieb year:", last.jahr);
  console.log("Last betrieb etfWert:", last.details.etfWert);
  console.log("Last betrieb cashReserve:", last.details.cashReserve);
  console.log("Last betrieb nettovermoegen:", last.details.nettovermoegen);
  console.log("Last betrieb kumulierterKonsumwert:", last.details.kumulierterKonsumwert);
  console.log("Last betrieb chart value:", (last.details.nettovermoegen ?? 0) + (last.details.kumulierterKonsumwert ?? 0));

  const { gmbhSteuerGesamt, kstGesamt, gewerbesteuer } = berechneGmbhSteuerRaten(15, 5.5, 14);
  const letzterEtfWert = last.details.etfWert ?? 0;
  const offenesDarlehen = last.details.offenesDarlehen ?? 0;
  const aufgelaufeneZinsen = last.details.aufgelaufeneZinsen ?? 0;

  const endeErgebnisse = berechneEndeErgebnisse(
    ende, letzterEtfWert, offenesDarlehen, 3, aufgelaufeneZinsen, false,
    5, betrieb.kosten,
    { ...betrieb.benefits, ...ende.benefitAktiv },
    { ...betrieb.firmenhandy, aktiv: ende.benefitAktiv.firmenhandyAktiv },
    gmbhSteuerGesamt, kstGesamt, gewerbesteuer
  );

  console.log("\nFirst ende year:", endeErgebnisse[0].jahr);
  console.log("First ende gesamtvermoegen:", endeErgebnisse[0].gesamtvermoegen);
  console.log("First ende firmenDarlehensverbindlichkeit:", endeErgebnisse[0].details.firmenDarlehensverbindlichkeit);
  const gmbhBetriebKonsumwert = last.details.kumulierterKonsumwert;
  console.log("First ende chart value:", endeErgebnisse[0].gesamtvermoegen - (endeErgebnisse[0].details.firmenDarlehensverbindlichkeit ?? 0) + gmbhBetriebKonsumwert + 0);

  const zeitreihe = berechneGesamtvergleichZeitreihe(betrieb, 5, endeErgebnisse, betriebsErgebnisse);
  console.log("\nZeitreihe:");
  zeitreihe.forEach(p => console.log(`Jahr ${p.jahr}: GmbH=${p.gmbh.toFixed(2)}, Privat=${p.privat.toFixed(2)}`));
  expect(true).toBe(true);
});
