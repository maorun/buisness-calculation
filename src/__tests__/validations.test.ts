import { ermittleEingabeWarnungen } from "@/lib/validations";
import { BetriebState, EndeState } from "@/lib/types";

const betrieb = {
  startkapital: 12500,
  laufzeitJahre: 10,
  etfRendite: 7,
  geschaeftsfuehrergehalt: 17000,
  darlehen: { betrag: 47500, zinssatz: 3, monatlicherZuschuss: 0, endfaellig: true },
} as BetriebState;

const ende = {
  tilgungsrate: 0,
  gewinnausschuettung: 0,
  zielnettoBereich1: 17000,
  zielnettoBereich2: 17000,
} as EndeState;

describe("Eingabevalidierung", () => {
  it("warnt bei fehlendem Startkapital und unplausibler Darlehenshöhe", () => {
    const warnungen = ermittleEingabeWarnungen(
      { ...betrieb, startkapital: 0, darlehen: { ...betrieb.darlehen, betrag: 100000 } },
      ende,
    );

    expect(warnungen).toEqual(expect.arrayContaining([
      expect.stringContaining("Startkapital fehlt"),
      expect.stringContaining("Geschäftslogik"),
    ]));
  });

  it("warnt bei unrealistischen Tarifen, Laufzeit, Gehalt und Tilgung", () => {
    const warnungen = ermittleEingabeWarnungen(
      {
        ...betrieb,
        etfRendite: 25,
        darlehen: { ...betrieb.darlehen, zinssatz: 20 },
        laufzeitJahre: 2,
        geschaeftsfuehrergehalt: 500000,
      },
      { ...ende, tilgungsrate: 60000 },
    );

    expect(warnungen.length).toBeGreaterThanOrEqual(5);
  });

  it("liefert für plausible Standardwerte keine Warnung", () => {
    expect(ermittleEingabeWarnungen(betrieb, ende)).toEqual([]);
  });
});
