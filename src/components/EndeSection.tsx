"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { JahresUebersicht } from "./JahresUebersicht";
import {
  berechneNettoGehalt,
  berechneGewinnausschuettungsteuer,
  berechneDarlehensAuszahlung,
  berechneDarlehensZinsenSteuer,
  berechneGesetzlicheKrankenversicherungBeitrag,
  DEFAULT_ZIELNETTO_BEREICH1,
  DEFAULT_ZIELNETTO_BEREICH2,
  REINVESTIERTES_DARLEHEN_ZINSSATZ,
} from "@/lib/calculations/ende";
import {
  berechneBenefitsSteuerersparnis,
  berechneEssenszuschussJaehrlich,
  berechnePrivatVergleichErgebnis,
  DEFAULT_FIRMENHANDY_CONFIG,
} from "@/lib/calculations/betrieb";
import { getSteuerjahrParameter } from "@/lib/parameters";
import {
  berechneGesamtvergleichKpi,
  berechneGesamtvergleichZeitreihe,
  formatSignedEuro,
  formatSignedPercent,
} from "@/lib/calculations/gesamtvergleich";
import { VergleichsDiagramm } from "./VergleichsDiagramm";

function InputField({
  label,
  value,
  onChange,
  suffix,
  hint,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-sm text-slate-600 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function EndeSection() {
  const { ende, setEnde, betrieb, getEndeErgebnisse, getBetriebsErgebnisse, getHoldingSzenarioVergleich } = useCalculatorStore();
  const ergebnisse = getEndeErgebnisse();
  const betriebsErgebnisse = getBetriebsErgebnisse();
  const holdingVergleich = getHoldingSzenarioVergleich();
  const letzterBetriebsstand = betriebsErgebnisse.length > 0
    ? betriebsErgebnisse[betriebsErgebnisse.length - 1]
    : undefined;
  const offeneDarlehensschuld = letzterBetriebsstand?.details.offenesDarlehen
    ?? Math.max(0, betrieb.darlehen.betrag);
  const aufgelaufeneZinsen = letzterBetriebsstand?.details.aufgelaufeneZinsen ?? 0;
  const betriebDarlehenEndfaellig = betrieb.darlehen.endfaellig;
  const endeDarlehenEndfaellig = ende.darlehenEndfaellig ?? false;

  const zinssatz = Math.max(0, betrieb.darlehen.zinssatz);
  const { zinsertragBrutto: zinsertragProJahr, tilgungsanteil: tilgungProJahr } = berechneDarlehensAuszahlung(
    offeneDarlehensschuld,
    zinssatz,
    Math.max(1, ende.laufzeitJahre),
    ende.tilgungsrate
  );
  // Interest on shareholder loans is taxed at progressive Einkommensteuer, not flat Abgeltungssteuer
  const zinsensteuerProJahr = berechneDarlehensZinsenSteuer(zinsertragProJahr, ende.geschaeftsfuehrergehalt);
  const nettoDarlehensauszahlungProJahr = tilgungProJahr + (zinsertragProJahr - zinsensteuerProJahr);
  const handyConfig = betrieb.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;
  const handyAnschaffung = handyConfig.anschaffungskosten.toLocaleString("de-DE");
  const handyZyklus = handyConfig.ersatzzyklusJahre;
  const handyVerkaufsquote = (handyConfig.restwertQuote * 100).toLocaleString("de-DE");

  // Merge Ende-specific active flags on top of Betrieb benefit values for display
  const endeBenefits = { ...betrieb.benefits, ...ende.benefitAktiv };
  const essenszuschussJaehrlich = berechneEssenszuschussJaehrlich(endeBenefits);

  const nettoGehalt = berechneNettoGehalt(ende.geschaeftsfuehrergehalt);
  const persoenlicherSteuersatz = (ende.persoenlicherSteuersatz ?? 42) / 100;
  const { steuer: ausschuettungsteuer, methode } = berechneGewinnausschuettungsteuer(ende.gewinnausschuettung, persoenlicherSteuersatz);
  const benefitsSteuerersparnis = berechneBenefitsSteuerersparnis(endeBenefits);

  // Split ergebnisse for display
  const bereich1Ergebnisse = ergebnisse.filter((e) => e.details.bereich === 1);
  const bereich2Ergebnisse = ergebnisse.filter((e) => e.details.bereich === 2);
  const bereich1Details = bereich1Ergebnisse[0]?.details;
  const bereich2Details = bereich2Ergebnisse[0]?.details;
  const letzterBereich2Details = bereich2Ergebnisse[bereich2Ergebnisse.length - 1]?.details;

  const gehaltBereich1 = bereich1Details?.bruttoGehalt
    ?? Math.max(0, ende.gehaltBereich1);
  const nettoGehaltBereich1 = bereich1Details?.nettoGehalt ?? berechneNettoGehalt(gehaltBereich1);
  const zinsSteuerBereich1 = bereich1Details?.zinsSteuerBereich1
    ?? berechneDarlehensZinsenSteuer(aufgelaufeneZinsen, gehaltBereich1);
  const zinsenNettoBereich1 = bereich1Details?.zinsenNettoBereich1 ?? (aufgelaufeneZinsen - zinsSteuerBereich1);
  const zielnettoBereich1 = ende.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1;
  const gkvBereich1 = bereich1Details?.gesetzlicheKrankenversicherungBeitrag
    ?? berechneGesetzlicheKrankenversicherungBeitrag(gehaltBereich1 + aufgelaufeneZinsen);
  const teiltilgungBereich1 = bereich1Details?.teiltilgungBereich1
    ?? Math.min(
      offeneDarlehensschuld,
      Math.max(
        0,
        zielnettoBereich1 - (nettoGehaltBereich1 + zinsenNettoBereich1 - gkvBereich1)
      )
    );
  const einkommensteuerBereich1 = bereich1Details?.einkommensteuer ?? 0;
  const soliBereich1 = bereich1Details?.soli ?? 0;
  const konsumierbaresBereich1 = bereich1Details?.konsumierbaresNettoBereich1
    ?? (nettoGehaltBereich1 + zinsenNettoBereich1 + teiltilgungBereich1 - gkvBereich1);
  const gesamtSteuerBereich1 = bereich1Ergebnisse[0]?.steuer ?? (zinsSteuerBereich1 + einkommensteuerBereich1 + soliBereich1);
  const neuesDarlehenBereich1 = bereich1Details?.neuesDarlehenStart
    ?? Math.max(0, offeneDarlehensschuld - teiltilgungBereich1);
  const bereich1ZielDiff = konsumierbaresBereich1 - zielnettoBereich1;

  const bereich2DarlehenZinsen = bereich2Details?.darlehenZinsen ?? 0;
  const bereich2DarlehenZinsenSteuer = bereich2Details?.darlehenZinsenSteuer ?? 0;
  const bereich2DarlehenZinsenNetto = bereich2Details?.darlehenZinsenNetto ?? 0;
  const bereich2AutoGehalt = bereich2Details?.bruttoGehalt ?? 0;
  const bereich2NettoGehalt = bereich2Details?.nettoGehalt ?? 0;
  const bereich2Gkv = bereich2Details?.gesetzlicheKrankenversicherungBeitrag ?? 0;
  const bereich2FlexibleTilgung = bereich2Details?.darlehenTilgung ?? 0;
  const zielnettoBereich2 = ende.zielnettoBereich2 ?? DEFAULT_ZIELNETTO_BEREICH2;
  const bereich2KonsumVorTilgung = bereich2Details?.konsumVorTilgung ?? (bereich2NettoGehalt + bereich2DarlehenZinsenNetto);
  const bereich2GesamtNetto = bereich2Ergebnisse[0]?.nettogewinn ?? (bereich2KonsumVorTilgung + bereich2FlexibleTilgung);
  const bereich2ZielDiff = bereich2GesamtNetto - zielnettoBereich2;
  const gesamtvergleich = berechneGesamtvergleichKpi(betrieb, ende.laufzeitJahre, ergebnisse, betriebsErgebnisse);
  const overlayProzentText = formatSignedPercent(gesamtvergleich.vorteilProzent);
  const vergleichsZeitreihe = React.useMemo(
    () => berechneGesamtvergleichZeitreihe(betrieb, ende.laufzeitJahre, ergebnisse, betriebsErgebnisse),
    [betrieb, ende.laufzeitJahre, ergebnisse, betriebsErgebnisse]
  );
  const gesamtBreakEvenJahr = (() => {
    const index = vergleichsZeitreihe.findIndex((punkt) => punkt.gmbh >= punkt.privat);
    return index >= 0 ? vergleichsZeitreihe[index].jahr : null;
  })();
  const endeVergleichsZeitreihe = React.useMemo(
    () => vergleichsZeitreihe.slice(betriebsErgebnisse.length),
    [vergleichsZeitreihe, betriebsErgebnisse.length]
  );
  const [zeigeAufschluss, setZeigeAufschluss] = React.useState(false);

  const privatVergleich = React.useMemo(
    () => berechnePrivatVergleichErgebnis(betrieb),
    [betrieb]
  );
  const betriebLetztesJahrDetails = betriebsErgebnisse[betriebsErgebnisse.length - 1]?.details;
  const betriebNettovermoegenStart = Math.max(0, betrieb.startkapital);
  const betriebLetztesJahrNettovermoegen = betriebLetztesJahrDetails?.nettovermoegen ?? betriebNettovermoegenStart;
  const betriebKumulierterKonsumwert = betriebLetztesJahrDetails?.kumulierterKonsumwert ?? 0;
  const betriebGesamtwertMitKonsum = betriebLetztesJahrNettovermoegen + betriebKumulierterKonsumwert;
  const differenzVergleich = betriebGesamtwertMitKonsum - privatVergleich.gesamtwertMitKonsum;
  const overlayGewinner = differenzVergleich >= 0 ? "GmbH" : "Privat";
  const kennzahlProzent = privatVergleich.gesamtwertMitKonsum !== 0
    ? (differenzVergleich / privatVergleich.gesamtwertMitKonsum) * 100
    : null;
  const overlayProzent = kennzahlProzent === null
    ? "nicht berechenbar"
    : `${kennzahlProzent >= 0 ? "+" : "-"}${Math.abs(kennzahlProzent).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  const overlayGesamtProzent = formatSignedPercent(gesamtvergleich.vorteilProzent);

  const toggleBenefitAktiv = (field: keyof NonNullable<typeof ende.benefitAktiv>, checked: boolean) => {
    setEnde({
      benefitAktiv: { ...ende.benefitAktiv, [field]: checked },
    });
  };

  return (
    <div className="space-y-6 pb-28 md:pb-32">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Ende / Auszahlungsphase</h2>
        <p className="text-sm text-slate-600">Freies GF-Gehalt, Darlehensauszahlung, Ausschüttungen, GKV- & PV-Beitrag und Gesamtergebnis</p>
      </div>

      <div className={`rounded-xl border p-4 md:p-6 ${gesamtvergleich.vorteil >= 0 ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
        <h3 className={`font-semibold mb-1 ${gesamtvergleich.vorteil >= 0 ? "text-green-900" : "text-orange-900"}`}>
          Top-KPI: GmbH-Vorteil gesamt (Betrieb + Ende)
          <span className="sr-only">Aktueller Status: {gesamtvergleich.gewinnerText}.</span>
        </h3>
        <p className={`text-sm font-bold ${gesamtvergleich.vorteil >= 0 ? "text-green-800" : "text-orange-800"}`}>{gesamtvergleich.gewinnerText}</p>
        <p className={`text-xs mt-1 ${gesamtvergleich.vorteil >= 0 ? "text-green-700" : "text-orange-700"}`}>
          Vorteilhaftigkeitskennzahl: {formatSignedEuro(gesamtvergleich.vorteil)} gegenüber Privat
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Relativ: {overlayProzentText}
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="font-semibold text-blue-800">Gesamtwert GmbH (Betrieb + Ende)</p>
            <p className="text-blue-700 mt-1">{gesamtvergleich.gmbhGesamtwert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-800">Gesamtwert Privat (gleicher Zeitraum)</p>
            <p className="text-emerald-700 mt-1">{gesamtvergleich.privatGesamtwert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 mt-3">
          Zeitraum: {gesamtvergleich.zeitraumJahre} Jahre. Vergleichswert Privat wird über den gleichen Gesamtzeitraum simuliert.
          GmbH-Gesamtwert kombiniert Endvermögen aus der Ende-Phase mit dem kumulierten Betriebskonsumwert.
        </p>
        {vergleichsZeitreihe.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3">
            <VergleichsDiagramm
              punkte={vergleichsZeitreihe}
              breakEvenJahr={gesamtBreakEvenJahr}
              title="Entwicklung über den Gesamtzeitraum: GmbH vs. Privat (Betrieb + Ende)"
            />
            {gesamtBreakEvenJahr != null && (
              <p className="mt-2 text-[11px] text-amber-700">
                Gestrichelte Linie: Break-even ab Jahr {gesamtBreakEvenJahr} – ab hier liegt die GmbH gleichauf oder vorne.
              </p>
            )}
          </div>
        )}
        {ergebnisse.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setZeigeAufschluss(!zeigeAufschluss)}
              className="text-xs font-medium text-slate-600 hover:text-slate-800 underline"
            >
              {zeigeAufschluss ? "▲ Jahresaufschlüsselung ausblenden" : "▼ Jahresaufschlüsselung Endphase anzeigen"}
            </button>
            {zeigeAufschluss && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left px-2 py-1 border border-slate-200 whitespace-nowrap">Jahr</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">Gehalt (brutto)</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">ESt + SolZ</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">Gehalt (netto)</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">Betriebskosten</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">GmbH Gesamt-Abfluss</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">GmbH Netto-Auszahlung</th>
                      <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">Privat-Entnahme</th>
                      {endeVergleichsZeitreihe.length === ergebnisse.length && (
                        <>
                          <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">GmbH Vermögen</th>
                          <th className="text-right px-2 py-1 border border-slate-200 whitespace-nowrap">Privat Vermögen</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {ergebnisse.map((e, idx) => {
                      const punkt = endeVergleichsZeitreihe[idx];
                      const bruttoGehalt = e.details.bruttoGehalt ?? 0;
                      const einkommensteuer = e.details.einkommensteuer ?? 0;
                      const soli = e.details.soli ?? 0;
                      const estSoli = einkommensteuer + soli;
                      const nettoGehalt = e.details.nettoGehalt ?? 0;
                      const betriebskosten = e.details.betriebsausgabenGesamt ?? 0;
                      const abfluss = e.details.firmenGesamtabfluss ?? 0;
                      const bereich = e.details.bereich;
                      const fmt = (n: number) =>
                        n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
                      return (
                        <tr key={e.jahr} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-2 py-1 border border-slate-200 whitespace-nowrap">
                            J{e.jahr}{bereich === 1 && <span className="ml-1 text-amber-600 font-semibold">(B1)</span>}
                          </td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono">{fmt(bruttoGehalt)}</td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono text-red-700">−{fmt(estSoli)}</td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono text-green-700">{fmt(nettoGehalt)}</td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono text-red-700">−{fmt(betriebskosten)}</td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono text-red-800 font-semibold">−{fmt(abfluss)}</td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono text-blue-700">{fmt(e.nettogewinn)}</td>
                          <td className="px-2 py-1 border border-slate-200 text-right font-mono text-emerald-700">{fmt(e.nettogewinn)}</td>
                          {punkt && (
                            <>
                              <td className="px-2 py-1 border border-slate-200 text-right font-mono text-blue-800">{fmt(punkt.gmbh)}</td>
                              <td className="px-2 py-1 border border-slate-200 text-right font-mono text-emerald-800">{fmt(punkt.privat)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[11px] text-slate-500 mt-1">
                  Gehalt (brutto) und Betriebskosten werden jährlich vom GmbH-ETF abgezogen. ESt + SolZ werden auf das Gehalt fällig.
                  Die GmbH Netto-Auszahlung entspricht der Privat-Entnahme: der Privatvergleich entnimmt denselben Nettobetrag aus dem privaten ETF.
                  Vermögenswerte enthalten kumulierten Konsumwert (Betrieb) und aufgelaufene Netto-Auszahlungen (Ende).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Einmalige ETF-Aufstockung zum Start</h3>
        <div className="max-w-sm space-y-4">
          <InputField
            label="Stammkapital-Erhöhung für ETF-Invest (einmalig)"
            value={ende.stammkapitalErhoehungEtf}
            onChange={(v) => setEnde({ stammkapitalErhoehungEtf: Math.max(0, parseFloat(v) || 0) })}
            suffix="€"
            hint="Wird einmalig zu Beginn der Ende-Phase in den ETF eingebracht. Default: 0 €."
            min={0}
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="endeDarlehenEndfaellig"
              checked={endeDarlehenEndfaellig}
              onChange={(e) => setEnde({ darlehenEndfaellig: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="endeDarlehenEndfaellig" className="text-sm text-gray-700">
              Darlehen in der Ende-Phase endfällig
            </label>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 md:p-6">
        <h3 className="font-semibold text-purple-900 mb-2">Holding-Szenariovergleich</h3>
        <p className="text-xs text-purple-700 mb-4">
          Vergleich der Ende-Phase mit und ohne Holding-Struktur auf Basis der aktuellen Einstellungen.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-purple-700">Kumulierte Steuer mit Holding</p>
            <p className="font-bold text-purple-900">{holdingVergleich.mitHolding.kumulierteSteuer.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €</p>
          </div>
          <div>
            <p className="text-xs text-purple-700">Kumulierte Steuer ohne Holding</p>
            <p className="font-bold text-purple-900">{holdingVergleich.ohneHolding.kumulierteSteuer.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €</p>
          </div>
          <div>
            <p className="text-xs text-purple-700">Steuervorteil</p>
            <p className={`font-bold ${holdingVergleich.steuervorteil >= 0 ? "text-green-700" : "text-orange-700"}`}>
              {holdingVergleich.steuervorteil.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
              <span className="font-normal"> ({holdingVergleich.steuervorteilProzent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %)</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Holding-Struktur</h3>
        <p className="text-xs text-gray-500 mb-4">
          Bei einer Holding-GmbH kann ein großer Teil von Dividenden und Veräußerungsgewinnen steuerfrei weiterlaufen.
          Das wirkt vor allem bei Exit- und Ausschüttungsszenarien.
        </p>
        <div className="max-w-sm space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="holdingAktiv"
              checked={ende.holding?.aktiv ?? false}
              onChange={(e) => setEnde({ holding: { ...ende.holding, aktiv: e.target.checked } })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="holdingAktiv" className="text-sm text-gray-700">
              Holding-Struktur aktiv (95 %-Steuerfreiheit)
            </label>
          </div>
          <InputField
            label="Steuerfreibetrag Holding"
            value={ende.holding?.steuerfreibetragProzent ?? 95}
            onChange={(v) => setEnde({ holding: { ...ende.holding, steuerfreibetragProzent: Math.max(0, Math.min(100, parseFloat(v) || 0)) } })}
            suffix="%"
            hint="Steuerfreier Anteil für Ausschüttungen / Verkaufsgewinne. Default: 95 % entsprechend § 8b KStG."
            min={0}
            max={100}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Privatdarlehen von Privatseite</h3>
        <p className="text-xs text-gray-500 mb-4">
          Sie können der GmbH ein zusätzliches Darlehen aus Ihrem Privatvermögen gewähren.
          Die GmbH zahlt Ihnen jährlich Zinsen, die Sie als Privatperson versteuern.
        </p>
        <div className="max-w-sm space-y-4">
          <InputField
            label="Privatdarlehen Betrag"
            value={ende.privatDarlehenBetrag ?? 0}
            onChange={(v) => setEnde({ privatDarlehenBetrag: Math.max(0, parseFloat(v) || 0) })}
            suffix="€"
            hint="Einmaliger Darlehensbetrag, den Sie der GmbH zu Beginn der Ende-Phase geben. Default: 0 €."
            min={0}
          />
          <InputField
            label="Zinssatz Privatdarlehen"
            value={ende.privatDarlehenZinssatz ?? 3}
            onChange={(v) => setEnde({ privatDarlehenZinssatz: Math.max(0, parseFloat(v) || 0) })}
            suffix="%"
            hint="Jährlicher Zinssatz für das Privatdarlehen. Default: 3 %."
            min={0}
          />
        </div>
      </div>

      {/* Endfällig notice */}
      {betriebDarlehenEndfaellig && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Endfälliges Darlehen aktiv</p>
          <p className="text-xs text-amber-700">
            Da das Darlehen in der Betriebsphase endfällig gestellt ist, werden die aufgelaufenen Zinsen
            ({aufgelaufeneZinsen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €) im ersten
            Schritt versteuert. Anschließend wird die Rückzahlung als neues Gesellschafterdarlehen
            mit {REINVESTIERTES_DARLEHEN_ZINSSATZ.toLocaleString("de-DE")} % in der GmbH weitergeführt.
          </p>
        </div>
      )}

      {betriebDarlehenEndfaellig && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">1</span>
              <p className="text-sm font-semibold text-amber-900">Ebene 1 / Bereich 1</p>
            </div>
            <p className="text-xs text-amber-800">
              Rückzahlung des alten Gesellschafterdarlehens, Versteuerung der aufgelaufenen Zinsen
              und Aufbau des neuen 3%-Darlehens in der GmbH.
            </p>
          </div>
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
              <p className="text-sm font-semibold text-blue-900">Ebene 2 / Bereich 2</p>
            </div>
            <p className="text-xs text-blue-800">
              Laufende Zinsphase des neuen Gesellschafterdarlehens mit frei wählbarem GF-Gehalt und
              flexibler Tilgung nur bei Zielnetto-Lücke.
            </p>
          </div>
        </div>
      )}

      {/* Bereich 1 – only shown when endfaellig */}
      {betriebDarlehenEndfaellig && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-amber-300 p-4 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600 mb-2">Ebene 1</p>
          <h3 className="font-semibold text-amber-800 mb-1">Bereich 1 – Rückzahlung & Neustart Gesellschafterdarlehen</h3>
          <p className="text-xs text-slate-500 mb-4">
            Die GmbH zahlt das bisherige Gesellschafterdarlehen steuerfrei zurück. Die aufgelaufenen Zinsen
            werden mit Einkommensteuer belastet. Das GF-Gehalt ist frei wählbar; die Teil-Tilgung wird
            automatisch auf die benötigte Rate gesetzt. Zusammen mit den netto verbleibenden Darlehenszinsen
            soll so das Zielnetto erreicht werden. Die restliche Darlehenssumme wird anschließend als neues Gesellschafterdarlehen für
            Bereich 2 weitergeführt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-4">
              <InputField
                label="Zielnetto Bereich 1 (€/Jahr)"
                value={zielnettoBereich1}
                onChange={(v) => setEnde({ zielnettoBereich1: Math.max(0, parseFloat(v) || 0) })}
                suffix="€/Jahr"
                hint={`Angestrebtes Netto des Gesellschafters zur freien Verfügung für das Abrechnungsjahr - ohne das in Bereich 2 reinvestierte Darlehen (default ${DEFAULT_ZIELNETTO_BEREICH1.toLocaleString("de-DE")} €)`}
                min={0}
              />
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-4">
                <InputField
                  label="GF-Gehalt Bereich 1"
                  value={gehaltBereich1}
                  onChange={(value) => {
                    const parsed = parseFloat(value);
                    setEnde({ gehaltBereich1: Math.max(0, Number.isFinite(parsed) ? parsed : 0) });
                  }}
                  suffix="€/Jahr"
                  hint="Frei wählbar ohne Unter- und Obergrenze."
                  min={0}
                />
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-600">Automatische Teil-Tilgung Bereich 1</p>
                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {teiltilgungBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Wird automatisch auf die benötigte Rate gesetzt, um das Zielnetto möglichst zu erreichen (max. bis zur offenen Darlehenssumme).
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                  <p className="text-xs font-medium text-slate-600">Gesamteinkommen & Steuern (Bereich 1)</p>
                  <p className="text-xs text-slate-700">
                    Gesamteinkommen (brutto):{" "}
                    <span className="font-semibold">
                      {(gehaltBereich1 + aufgelaufeneZinsen).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-slate-400 ml-1">(Gehalt + Zinsen)</span>
                  </p>
                  <p className="text-xs text-slate-700">
                    Gesamtsteuern:{" "}
                    <span className={`font-semibold ${gesamtSteuerBereich1 > 0 ? "text-red-700" : "text-green-700"}`}>
                      {gesamtSteuerBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-slate-400 ml-1">(Zinsen-ESt + Gehalt-ESt/SolZ)</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-600">Bereich-1 Zielabgleich</p>
                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {konsumierbaresBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € netto
                  </p>
                  <p className={`text-xs mt-1 ${bereich1ZielDiff >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {bereich1ZielDiff >= 0 ? "Überschuss" : "Fehlbetrag"}: {Math.abs(bereich1ZielDiff).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-xs text-amber-700 font-medium">Gesellschafter Bereich-1 Übersicht</p>
              <p className="text-xs text-amber-700 border-b border-amber-200 pb-1 mb-1 font-medium">Einnahmen</p>
              <p className="text-xs text-amber-700">Gesamte Darlehensrückzahlung alt: <span className="font-semibold text-blue-700">+ {offeneDarlehensschuld.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Davon Teil-Tilgung privat verfügbar: <span className="font-semibold text-blue-700">+ {teiltilgungBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Zinsen brutto Darlehen: <span className="font-semibold">+ {aufgelaufeneZinsen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">GF-Gehalt brutto: <span className="font-semibold">+ {gehaltBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700 border-b border-amber-200 pb-1 mb-1 font-medium mt-2">Steuern (Gesamtlast)</p>
              <p className="text-xs text-amber-700">Einkommensteuer auf Zinsen (progressiv): <span className="font-semibold text-red-700">− {zinsSteuerBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Einkommensteuer + SolZ Gehalt: <span className="font-semibold text-red-700">− {(einkommensteuerBereich1 + soliBereich1).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Gesetzliche Kranken- & Pflegeversicherung (aus Netto): <span className="font-semibold text-red-700">− {gkvBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs font-semibold text-amber-800">Steuern gesamt: <span className="text-red-700">− {gesamtSteuerBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Netto-Zinsen für Zielnetto: <span className="font-semibold text-green-700">+ {zinsenNettoBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Neues Gesellschafterdarlehen für Bereich 2: <span className="font-semibold text-blue-700">+ {neuesDarlehenBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-sm font-bold text-amber-900 border-t border-amber-300 pt-1 mt-1">
                Frei verfügbares Netto Gesellschafter: {konsumierbaresBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                {" "}
                <span className={konsumierbaresBereich1 >= zielnettoBereich1 ? "text-green-700" : "text-red-700"}>
                  ({konsumierbaresBereich1 >= zielnettoBereich1 ? "≥" : "<"} Zielnetto {zielnettoBereich1.toLocaleString("de-DE")} €)
                </span>
              </p>
              <p className="text-xs text-amber-600">
                Für das Zielnetto zählen das Netto-GF-Gehalt, die Netto-Darlehenszinsen und die steuerfreie Teil-Tilgung.
                Der Rest des Darlehens bleibt als Vermögenswert in der GmbH gebunden.
              </p>
            </div>
          </div>
          {bereich1Ergebnisse.length > 0 && (
            <JahresUebersicht ergebnisse={bereich1Ergebnisse} title="Bereich 1 – Gesellschafterzufluss, GmbH-GuV und GmbH-Bilanz" variant="betrieb" />
          )}
        </div>
      )}

      {/* Bereich 2 – regular payout */}
      <div className={`bg-white rounded-xl shadow-sm p-4 md:p-6 ${betriebDarlehenEndfaellig ? "border-2 border-blue-300" : "border border-gray-200"}`}>
        {betriebDarlehenEndfaellig && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 mb-2">Ebene 2</p>
        )}
        <h3 className="font-semibold text-gray-700 mb-1">{betriebDarlehenEndfaellig ? "Bereich 2 – Laufende Auszahlungsphase" : "Auszahlungsphase"}</h3>
        {betriebDarlehenEndfaellig && (
          <p className="text-xs text-slate-500 mb-4">
            Das neue Gesellschafterdarlehen aus Bereich 1 bleibt in der GmbH, verzinst sich mit {REINVESTIERTES_DARLEHEN_ZINSSATZ.toLocaleString("de-DE")} %
            und wird nur soweit getilgt, wie das Zielnetto sonst nicht erreicht würde.
          </p>
        )}

        {/* Zielnetto Bereich 2 */}
        {!endeDarlehenEndfaellig && (
          <div className="mb-4 max-w-xs">
            <InputField
              label="Zielnetto Bereich 2 (€/Jahr)"
              value={zielnettoBereich2}
              onChange={(v) => setEnde({ zielnettoBereich2: Math.max(0, parseFloat(v) || 0) })}
              suffix="€/Jahr"
              hint={`Angestrebtes Netto-Jahreseinkommen für die laufende Auszahlungsphase (Default ${DEFAULT_ZIELNETTO_BEREICH2.toLocaleString("de-DE")} €)`}
              min={0}
            />
          </div>
        )}
        {endeDarlehenEndfaellig && (
          <p className="mb-4 text-xs text-slate-500">
            Zielnetto Bereich 2 ist bei endfälligem Ende-Darlehen deaktiviert, da Tilgung und Zinsen erst im letzten Jahr ausgezahlt werden.
          </p>
        )}

        {/* GF Salary */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-600 mb-3">
            Geschäftsführergehalt {betriebDarlehenEndfaellig ? "Bereich 2" : ""}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Brutto-Jahresgehalt (€)"
              value={ende.geschaeftsfuehrergehalt}
              onChange={(v) => {
                const parsed = parseFloat(v);
                const normalized = Number.isFinite(parsed) ? parsed : 0;
                setEnde({ geschaeftsfuehrergehalt: Math.max(0, normalized) });
              }}
              suffix="€/Jahr"
              hint="Frei wählbar ohne Unter- und Obergrenze."
              min={0}
            />
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Netto-Gehalt (geschätzt)</p>
              <p className="text-lg font-bold text-green-800">
                {nettoGehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr
              </p>
              <p className="text-xs text-green-600 mt-1">
                {(nettoGehalt / 12).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Monat
              </p>
            </div>
          </div>
        </div>

        {/* Simulated profit */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-600 mb-3">Simulierter Gewinn</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Simulierter Gewinn (€/Jahr)"
              value={ende.simulierterGewinn ?? 0}
              onChange={(v) => setEnde({ simulierterGewinn: Math.max(0, parseFloat(v) || 0) })}
              suffix="€/Jahr"
              hint="Betriebsgewinn vor Betriebsausgaben und Benefits"
              min={0}
            />
          </div>
        </div>

        {betriebDarlehenEndfaellig && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-600 mb-3">Bereich 2 (erstes Jahr)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">GF-Gehalt Bereich 2</p>
                <p className="text-lg font-bold text-green-800">
                  {bereich2AutoGehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Netto-Gehalt: {bereich2NettoGehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">Zinsen neues Darlehen ({REINVESTIERTES_DARLEHEN_ZINSSATZ.toLocaleString("de-DE")} %)</p>
                <p className="text-lg font-bold text-amber-900">
                  {bereich2DarlehenZinsen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr brutto
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Steuer: {bereich2DarlehenZinsenSteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € · Netto: {bereich2DarlehenZinsenNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  GKV-Beitrag: {bereich2Gkv.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium">Flexible Tilgung</p>
                <p className="text-lg font-bold text-blue-900">
                  {bereich2FlexibleTilgung.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Vor Tilgung: {bereich2KonsumVorTilgung.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € netto
                </p>
              </div>
            </div>
          </div>
        )}
        {!endeDarlehenEndfaellig && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-600">
              {betriebDarlehenEndfaellig ? "Bereich-2 Zielabgleich" : "Zielabgleich Auszahlungsphase"}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {bereich2GesamtNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € netto
            </p>
            <p className={`text-xs mt-1 ${bereich2ZielDiff >= 0 ? "text-green-700" : "text-red-700"}`}>
              {bereich2ZielDiff >= 0 ? "Überschuss" : "Fehlbetrag"}: {Math.abs(bereich2ZielDiff).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </div>
        )}

        {/* Darlehensauszahlung – only relevant when not endfaellig */}
        {!endeDarlehenEndfaellig && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-600 mb-1">Darlehensauszahlung (aus GmbH an Gesellschafter)</h4>
            <p className="text-xs text-slate-500 mb-3">
              Die jährliche Auszahlung wird in Zinsertrag und Darlehensrückzahlung aufgeteilt.
              Der Zinsanteil wird mit progressiver Einkommensteuer besteuert (§ 32d Abs. 2 Nr. 1b EStG).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Tilgungsrate pro Jahr (€)"
                value={ende.tilgungsrate}
                onChange={(v) => setEnde({ tilgungsrate: Math.max(0, parseFloat(v) || 0) })}
                suffix="€/Jahr"
                hint="0 = lineare Tilgung über die verbleibenden Jahre"
                min={0}
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium">Ausgangswerte Jahr 1</p>
                <p className="text-lg font-bold text-amber-900">
                  {nettoDarlehensauszahlungProJahr.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr netto
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Restschuld: {offeneDarlehensschuld.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € · Zinssatz: {zinssatz.toLocaleString("de-DE", { minimumFractionDigits: 2 })}%
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Zinsanteil: {zinsertragProJahr.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € · Tilgung: {tilgungProJahr.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Einkommensteuer Zinsanteil: {zinsensteuerProJahr.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  GKV- & PV-Beitrag (aus Netto): {berechneGesetzlicheKrankenversicherungBeitrag(ende.geschaeftsfuehrergehalt + zinsertragProJahr + ende.gewinnausschuettung).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-700 font-medium">Logik</p>
                <p className="text-xs text-slate-600 mt-1">
                  Die Tilgungsrate kann frei angegeben werden. Bei 0 erfolgt lineare Tilgung über die verbleibenden Jahre.
                  Auf die jeweilige Restschuld fällt zusätzlich der Zinsanteil an.
                </p>
              </div>
            </div>
          </div>
        )}
        {endeDarlehenEndfaellig && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-600 mb-1">Darlehensauszahlung (endfällig am Laufzeitende)</h4>
            <p className="text-xs text-slate-500 mb-3">
              Während der Ende-Phase erfolgen keine laufenden Auszahlungen aus dem Darlehen. Zinsen werden bis zum letzten Jahr aufgestaut und dann zusammen mit der Darlehenstilgung ausgezahlt.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium">Ausgangswerte Endjahr</p>
              <p className="text-lg font-bold text-amber-900">
                {((letzterBereich2Details?.darlehenGesamtauszahlungNetto ?? 0)).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr netto
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Endfällige Tilgung: {(letzterBereich2Details?.darlehenTilgung ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Aufgelaufene Zinsen: {(letzterBereich2Details?.darlehenZinsen ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        )}

        {/* Profit distribution */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-600 mb-3">Gewinnausschüttung</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField
              label="Jährliche Ausschüttung (€)"
              value={ende.gewinnausschuettung}
              onChange={(v) => setEnde({ gewinnausschuettung: parseFloat(v) || 0 })}
              suffix="€/Jahr"
              hint="Gewinn nach GmbH-Steuern"
            />
            <InputField
              label="Persönlicher Steuersatz (%)"
              value={ende.persoenlicherSteuersatz ?? 42}
              onChange={(v) => setEnde({ persoenlicherSteuersatz: Math.max(0, Math.min(100, parseFloat(v) || 0)) })}
              suffix="%"
              hint="Relevant für das Teileinkünfteverfahren (Default 42 %)"
              min={0}
              max={100}
            />
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-600 font-medium">Ausschüttungsteuer ({methode})</p>
              <p className="text-lg font-bold text-purple-800">
                {ausschuettungsteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Netto: {(ende.gewinnausschuettung - ausschuettungsteuer).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-600 mb-3">Zeitraum {betriebDarlehenEndfaellig ? "Bereich 2" : ""}</h4>
          <div className="max-w-xs">
            <InputField
              label="Laufzeit Auszahlungsphase (Jahre)"
              value={ende.laufzeitJahre}
              onChange={(v) => setEnde({ laufzeitJahre: parseInt(v) || 1 })}
              suffix="Jahre"
            />
          </div>
        </div>

        {/* Results Bereich 2 */}
        {bereich2Ergebnisse.length > 0 && (
          <JahresUebersicht ergebnisse={bereich2Ergebnisse} title={betriebDarlehenEndfaellig ? "Bereich 2 – Laufende Zins- und Tilgungsphase" : "Jahresergebnisse Auszahlungsphase"} variant="betrieb" />
        )}
      </div>

      {/* Benefits overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Benefits & Firmenhandy</h3>
        <p className="text-xs text-slate-500 mb-4">
          Reduzieren auch in der Auszahlungsphase die Steuerlast – hier unabhängig vom Betrieb aktivieren/deaktivieren
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tankgutschein */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-1">
              <input
                type="checkbox"
                id="endeTankgutscheinAktiv"
                checked={ende.benefitAktiv?.tankgutscheinAktiv ?? true}
                onChange={(e) => toggleBenefitAktiv("tankgutscheinAktiv", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="endeTankgutscheinAktiv" className="text-sm font-medium text-gray-700">Tankgutschein aktiv</label>
            </div>
            <p className="text-xs text-slate-600 pl-7">{betrieb.benefits.tankgutschein} €/Monat</p>
          </div>

          {/* Essenszuschuss */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-1">
              <input
                type="checkbox"
                id="endeEssenszuschussAktiv"
                checked={ende.benefitAktiv?.essenszuschussAktiv ?? true}
                onChange={(e) => toggleBenefitAktiv("essenszuschussAktiv", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="endeEssenszuschussAktiv" className="text-sm font-medium text-gray-700">Essenszuschuss aktiv</label>
            </div>
            <p className="text-xs text-slate-600 pl-7">
              {betrieb.benefits.essenszuschussProTag.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/Tag · {betrieb.benefits.essenszuschussTageProJahr} Tage/Jahr · {essenszuschussJaehrlich.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/Jahr
            </p>
          </div>

          {/* Strategieessen */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-1">
              <input
                type="checkbox"
                id="endeStrategieessenAktiv"
                checked={ende.benefitAktiv?.strategieessenAktiv ?? true}
                onChange={(e) => toggleBenefitAktiv("strategieessenAktiv", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="endeStrategieessenAktiv" className="text-sm font-medium text-gray-700">Strategieessen aktiv</label>
            </div>
            <p className="text-xs text-slate-600 pl-7">{betrieb.benefits.strategieessen} €/Jahr</p>
          </div>

          {/* Firmenhandy */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-1">
              <input
                type="checkbox"
                id="endeHandyAktiv"
                checked={ende.benefitAktiv?.firmenhandyAktiv ?? true}
                onChange={(e) => toggleBenefitAktiv("firmenhandyAktiv", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="endeHandyAktiv" className="text-sm font-medium text-gray-700">Firmenhandy aktiv</label>
            </div>
            <p className="text-xs text-slate-600 pl-7">{handyAnschaffung} € alle {handyZyklus} Jahre · {handyVerkaufsquote}% Verkaufserlös</p>
          </div>

          {/* Dienstwagen */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-1">
              <input
                type="checkbox"
                id="endeDienstwagenAktiv"
                checked={ende.benefitAktiv?.dienstwagenAktiv ?? (betrieb.benefits.dienstwagen?.aktiv ?? false)}
                onChange={(e) => toggleBenefitAktiv("dienstwagenAktiv", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="endeDienstwagenAktiv" className="text-sm font-medium text-gray-700">Dienstwagen aktiv</label>
            </div>
            <p className="text-xs text-slate-600 pl-7">
              BLP {(betrieb.benefits.dienstwagen?.bruttolistenpreis ?? 50000).toLocaleString("de-DE")} € · {(betrieb.benefits.dienstwagen?.jaehrlicheGesamtkosten ?? 6000).toLocaleString("de-DE")} €/Jahr Kosten
            </p>
          </div>
        </div>
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium">Jährliche Steuerersparnis durch Benefits</p>
          <p className="text-base font-bold text-green-800">
            {benefitsSteuerersparnis.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
          </p>
        </div>
      </div>

      {/* Tax info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-700 mb-2">Steuerinfo Auszahlungsphase (Referenzjahr {getSteuerjahrParameter(betrieb.steuerjahr).jahr})</p>
        <div className="text-xs text-gray-600 space-y-1">
          {betriebDarlehenEndfaellig && <p><span className="font-medium">Bereich 1 – Zinsen:</span> Progressive Einkommensteuer auf Zinsen + Gehalt (kombiniert, § 32d Abs. 2 Nr. 1b EStG)</p>}
          {betriebDarlehenEndfaellig && <p><span className="font-medium">Bereich 1 – Gehalt:</span> Frei konfigurierbar; zusammen mit Netto-Zinsen und Teil-Tilgung wird das Zielnetto abgeglichen.</p>}
          {betriebDarlehenEndfaellig && <p><span className="font-medium">Bereich 2 – Darlehen:</span> Neues Gesellschafterdarlehen mit 3 % Zins; Tilgung wird flexibel nur bei Zielnetto-Lücke ausgezahlt.</p>}
          <p><span className="font-medium">GF-Gehalt Bereich 2:</span> progressive Einkommensteuer (14%–45%) + ggf. SolZ</p>
          <p><span className="font-medium">Gesetzliche Kranken- & Pflegeversicherung:</span> Beitrag aus Gehalt + sonstigen Einnahmen (z. B. Zinsen, Ausschüttung) inkl. Pflegeversicherung (~4,0%) und vollständig aus dem Netto zu zahlen</p>
          <p><span className="font-medium">Darlehen (Zinsen):</span> Progressive Einkommensteuer (Marginalsteuersatz), Tilgungsanteil steuerfrei (§ 32d Abs. 2 Nr. 1b EStG)</p>
          <p><span className="font-medium">Teileinkünfteverfahren:</span> 60% des Betrags × persönlicher Steuersatz</p>
          <p className="text-slate-500 mt-1">Das günstigere Verfahren wird automatisch gewählt. Abgeltungssteuer gilt nur für Gewinnausschüttungen.</p>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-6px_24px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs text-slate-600">Betriebsphase</p>
            <p className={`text-sm font-bold ${differenzVergleich >= 0 ? "text-green-800" : "text-orange-800"}`}>
              {Math.abs(differenzVergleich).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € mehr in {overlayGewinner}
            </p>
            <p className="text-xs text-slate-700">{overlayProzent}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Gesamtvergleich Betrieb + Ende</p>
            <p className={`text-sm font-bold ${gesamtvergleich.vorteil >= 0 ? "text-green-800" : "text-orange-800"}`}>
              {formatSignedEuro(gesamtvergleich.vorteil)} Vorteil vs. Privat
            </p>
            <p className="text-xs text-slate-700">{overlayGesamtProzent}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
