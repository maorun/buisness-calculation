import { berechneBetriebsErgebnisse, berechnePrivatVergleichZeitreihe } from "@/lib/calculations/betrieb";
import { berechneEndeErgebnisse } from "@/lib/calculations/ende";
import { berechneGesamtvergleichKpi } from "@/lib/calculations/gesamtvergleich";
import { BetriebState, EndeState } from "@/lib/types";

const betrieb: BetriebState = {
  startkapital: 12500,
  jaehrlicherCashZuschuss: 2400,
  simulierterGewinn: 0,
  zielnettoGesellschafter: 36000,
  geschaeftsfuehrergehalt: 17000,
  darlehen: { betrag: 47500, zinssatz: 3, monatlicherZuschuss: 0, endfaellig: true },
  etfRendite: 5,
  laufzeitJahre: 10,
  kosten: [],
  benefits: { tankgutschein: 50, strategieessen: 0, essenszuschussProTag: 6.5, essenszuschussTageProJahr: 220, bav: 0 },
} as unknown as BetriebState;

function run(endeGehalt: number, gehaltB1: number) {
  const ende: EndeState = {
    geschaeftsfuehrergehalt: endeGehalt,
    stammkapitalErhoehungEtf: 0,
    gehaltBereich1: gehaltB1,
    teiltilgungBereich1: 0,
    gewinnausschuettung: 0,
    tilgungsrate: 0,
    laufzeitJahre: 5,
    zielnettoBereich1: 17000,
    zielnettoBereich2: 17000,
    darlehenEndfaellig: false,
  };
  const bErg = berechneBetriebsErgebnisse(betrieb);
  const last = bErg[bErg.length - 1];
  const eErg = berechneEndeErgebnisse(
    ende,
    last.details.etfWert as number,
    last.details.offenesDarlehen as number,
    betrieb.darlehen.zinssatz,
    last.details.aufgelaufeneZinsen as number,
    betrieb.darlehen.endfaellig,
    betrieb.etfRendite,
    betrieb.kosten,
    betrieb.benefits
  );
  const kpi = berechneGesamtvergleichKpi(betrieb, ende.laufzeitJahre, eErg, bErg);
  return kpi;
}

test("probe", () => {
  console.log("ende salary 0/0:", run(0, 0));
  console.log("ende salary 20000/20000:", run(20000, 20000));
  console.log("ende salary 40000/40000:", run(40000, 40000));
  const z = berechnePrivatVergleichZeitreihe({ ...betrieb, laufzeitJahre: 16 } as BetriebState);
  console.log("privat gehaltsEntnahme year1:", z[0].gehaltsEntnahme, "year16:", z[15].gehaltsEntnahme);
});
