"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import {
  TEILFREISTELLUNG_AKTIEN_GMBH,
  TEILFREISTELLUNG_AKTIEN_PRIVAT,
  ABGELTUNGSSTEUER_GESAMT,
  DEFAULT_FIRMENHANDY_CONFIG,
  DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB,
  DEFAULT_GF_GEHALT_BETRIEB,
  BAV_MAX_STEUERFREIER_BEITRAG,
  DEFAULT_STILLER_GESELLSCHAFTER_CONFIG,
  berechnePrivatVergleichErgebnis,
  berechnePrivatVergleichZeitreihe,
} from "@/lib/calculations/betrieb";
import { KostenListe } from "./KostenListe";
import { JahresUebersicht } from "./JahresUebersicht";

const BENEFIT_MAX_VALUES = {
  tankgutschein: 50,
} as const;
const DEFAULT_JAEHRLICHER_CASH_ZUSCHUSS = 2400;
const RECOMMENDED_MIN_LAUFZEIT_JAHRE = 12;
const HIGH_ZINSSATZ_THRESHOLD = 3;
const DEFAULT_GMBH_VORSCHLAG =
  "Laufzeit verlängern, Kostenstruktur straffen und Entnahmen reduzieren, um den ETF-Bestand länger wachsen zu lassen.";

function InputField({
  label,
  value,
  onChange,
  type = "number",
  suffix,
  hint,
  max,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: string;
  suffix?: string;
  hint?: string;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          max={max}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-sm text-slate-600 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 500,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}: <span className="font-semibold">{value.toLocaleString("de-DE")} €</span>
      </label>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function BetriebSection() {
  const { betrieb, setBetrieb, addBetriebskosten, updateBetriebskosten, removeBetriebskosten, getBetriebsErgebnisse } =
    useCalculatorStore();
  const teilfreistellungGmbh = (TEILFREISTELLUNG_AKTIEN_GMBH * 100).toLocaleString("de-DE");

  const ergebnisse = getBetriebsErgebnisse();
  const privatVergleich = React.useMemo(
    () => berechnePrivatVergleichErgebnis(betrieb),
    [betrieb]
  );
  const privatZeitreihe = React.useMemo(
    () => berechnePrivatVergleichZeitreihe(betrieb),
    [betrieb]
  );
  const erstesJahrDetails = ergebnisse[0]?.details;
  const letztesJahrDetails = ergebnisse[ergebnisse.length - 1]?.details;
  const nettovermoegenStart = Math.max(0, betrieb.startkapital);
  const erstesJahrNettovermoegen = erstesJahrDetails?.nettovermoegen ?? nettovermoegenStart;
  const zielnettoInsgesamt = Math.max(
    0,
    betrieb.zielnettoGesellschafter ?? DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB
  );
  const geschaeftsfuehrergehalt = erstesJahrDetails?.geschaeftsfuehrergehalt ?? 0;
  const gehaelterGesamt = erstesJahrDetails?.gehaelterGesamt ?? 0;
  const gesellschafterBruttoEinkommen = erstesJahrDetails?.gesellschafterBruttoEinkommen ?? 0;
  const gesellschafterSteuerGesamt = erstesJahrDetails?.gesellschafterSteuerGesamt ?? 0;
  const gehaelterSteuerGesamt = (erstesJahrDetails?.gehaelterEinkommensteuer ?? 0) + (erstesJahrDetails?.gehaelterSoli ?? 0);
  const gehaelterNetto = erstesJahrDetails?.gehaelterNetto ?? 0;
  const darlehenszinsenBrutto = (erstesJahrDetails?.darlehenszinsenNetto ?? 0) + (erstesJahrDetails?.darlehenszinsenSteuer ?? 0);
  const darlehenszinsenSteuer = erstesJahrDetails?.darlehenszinsenSteuer ?? 0;
  const darlehenszinsenNetto = erstesJahrDetails?.darlehenszinsenNetto ?? 0;
  const gesellschafterNetto = erstesJahrDetails?.gesellschafterNetto ?? 0;
  const zielnettoDifferenz = erstesJahrDetails?.zielnettoDifferenz ?? (gesellschafterNetto - zielnettoInsgesamt);
  const gmbhNettoveraenderung = erstesJahrDetails
    ? (erstesJahrNettovermoegen - nettovermoegenStart)
    : 0;
  const gmbhAnfangskapital = Math.max(0, betrieb.startkapital) + Math.max(0, betrieb.darlehen.betrag);
  const gmbhKumulierterEtfVerkauf = ergebnisse.reduce((sum, ergebnis) => sum + (ergebnis.details.etfVerkauf ?? 0), 0);
  const gmbhVerbleibenderEtfWert = letztesJahrDetails?.etfWert
    ?? gmbhAnfangskapital;
  const gmbhEndwert = gmbhKumulierterEtfVerkauf + gmbhVerbleibenderEtfWert;
  const gmbhKumulierterKonsumwert = letztesJahrDetails?.kumulierterKonsumwert
    ?? 0;
  const gmbhGesamtwertMitKonsum = gmbhEndwert + gmbhKumulierterKonsumwert;
  const differenzVergleich = gmbhGesamtwertMitKonsum - privatVergleich.gesamtwertMitKonsum;
  const endwertDifferenzOhneKonsum = gmbhEndwert - privatVergleich.endwert;
  const gmbhSteuernKumuliert = ergebnisse.reduce((sum, ergebnis) => sum + ergebnis.steuer, 0);
  const steuerDifferenz = gmbhSteuernKumuliert - privatVergleich.kumulierteSteuern;
  const verkaufsDifferenz = gmbhKumulierterEtfVerkauf - privatVergleich.kumulierterEtfVerkauf;
  const konsumDifferenz = gmbhKumulierterKonsumwert - privatVergleich.kumulierterKonsumwert;
  const restEtfDifferenz = gmbhVerbleibenderEtfWert - privatVergleich.verbleibenderEtfWert;
  const gmbhZeitreihe = ergebnisse.reduce<{
    jahr: number;
    kumulierterEtfVerkauf: number;
    gesamtwertMitKonsum: number;
  }[]>((acc, ergebnis) => {
    const kumulierterEtfVerkauf =
      (acc[acc.length - 1]?.kumulierterEtfVerkauf ?? 0) + (ergebnis.details.etfVerkauf ?? 0);
    const verbleibenderEtfWert = ergebnis.details.etfWert ?? 0;
    const endwert = kumulierterEtfVerkauf + verbleibenderEtfWert;
    const kumulierterKonsumwert = ergebnis.details.kumulierterKonsumwert ?? 0;
    return [
      ...acc,
      {
        jahr: ergebnis.jahr,
        kumulierterEtfVerkauf,
        gesamtwertMitKonsum: endwert + kumulierterKonsumwert,
      },
    ];
  }, []);
  const breakEvenBerechenbar =
    gmbhZeitreihe.length > 0 && gmbhZeitreihe.length === privatZeitreihe.length;
  const breakEvenJahr = (() => {
    if (!breakEvenBerechenbar) {
      return null;
    }
    const index = gmbhZeitreihe.findIndex((gmbhJahr, i) => {
      return gmbhJahr.gesamtwertMitKonsum >= privatZeitreihe[i].gesamtwertMitKonsum;
    });
    return index >= 0 ? gmbhZeitreihe[index].jahr : null;
  })();
  const lohntSichGmbH = differenzVergleich > 0;
  const kennzahlProzent = privatVergleich.gesamtwertMitKonsum !== 0
    ? (differenzVergleich / privatVergleich.gesamtwertMitKonsum) * 100
    : null;
  const topTreiber = [
    {
      id: "steuer",
      label: "Steuerlast",
      impact: -steuerDifferenz,
      description: steuerDifferenz <= 0 ? "GmbH zahlt weniger Gesamtsteuer" : "GmbH zahlt mehr Gesamtsteuer",
    },
    {
      id: "verkauf",
      label: "ETF-Verkäufe",
      impact: -verkaufsDifferenz,
      description: verkaufsDifferenz <= 0 ? "GmbH muss weniger ETF verkaufen" : "GmbH muss mehr ETF verkaufen",
    },
    {
      id: "rest",
      label: "Verbleibender ETF-Bestand",
      impact: restEtfDifferenz,
      description: restEtfDifferenz >= 0 ? "GmbH hält mehr Restvermögen im ETF" : "Privat hält mehr Restvermögen im ETF",
    },
    {
      id: "konsum",
      label: "Konsum-/Benefit-Wert",
      impact: konsumDifferenz,
      description: konsumDifferenz >= 0 ? "GmbH liefert höheren Konsumwert" : "Privat liefert höheren Konsumwert",
    },
  ]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 4);
  const gmbhVorschlaege = [
    ...(betrieb.laufzeitJahre < RECOMMENDED_MIN_LAUFZEIT_JAHRE
      ? ["Längere Laufzeit prüfen: Mit mehr Jahren kann der Steuer- und Zinseszinseffekt der GmbH stärker wirken."]
      : []),
    ...((betrieb.simulierterGewinn ?? 0) < (erstesJahrDetails?.betriebsausgabenGesamt ?? 0)
      ? ["Operativen Gewinn steigern oder fixe Kosten senken, damit weniger ETF-Verkäufe zur Kostendeckung nötig sind."]
      : []),
    ...((betrieb.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB) > 0
      ? ["GF-Gehalt und Entnahmen prüfen: Mehr Kapital in der GmbH belassen verbessert oft den Endwert."]
      : []),
    ...(betrieb.darlehen.zinssatz > HIGH_ZINSSATZ_THRESHOLD
      ? ["Darlehenskonditionen optimieren (insb. Zinssatz), um laufende Liquiditäts- und Steuerbelastung zu reduzieren."]
      : []),
    ...(gmbhKumulierterEtfVerkauf > privatVergleich.kumulierterEtfVerkauf
      ? ["Liquiditätsplanung schärfen (Cash-Zuschuss, Kostenstruktur), damit die GmbH seltener ETF-Anteile verkaufen muss."]
      : []),
  ].slice(0, 4);
  let gewinnerText = "Unentschieden";
  if (differenzVergleich > 0) {
    gewinnerText = "GmbH gewinnt";
  } else if (differenzVergleich < 0) {
    gewinnerText = "Privat gewinnt";
  }

  const updateDarlehen = (field: string, value: string | boolean) => {
    setBetrieb({
      darlehen: {
        ...betrieb.darlehen,
        [field]: typeof value === "boolean" ? value : parseFloat(value as string) || value,
      },
    });
  };

  const updateBenefits = (field: keyof typeof betrieb.benefits, value: string) => {
    const parsed = parseFloat(value) || 0;
    const normalized = Math.max(0, parsed);
    const maxValue = field in BENEFIT_MAX_VALUES
      ? BENEFIT_MAX_VALUES[field as keyof typeof BENEFIT_MAX_VALUES]
      : undefined;
    const normalizedValue = typeof maxValue === "number" ? Math.min(normalized, maxValue) : normalized;

    setBetrieb({
      benefits: { ...betrieb.benefits, [field]: normalizedValue },
    });
  };

  const updateFirmenhandy = (field: keyof NonNullable<typeof betrieb.firmenhandy>, value: string | boolean | number) => {
    const currentHandy = betrieb.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;
    setBetrieb({
      firmenhandy: {
        ...currentHandy,
        [field]: typeof value === "boolean" ? value : typeof value === "number" ? value : parseFloat(value) || 0,
      },
    });
  };

  const updateStillerGesellschafter = (
    field: keyof NonNullable<typeof betrieb.stillerGesellschafter>,
    value: string | boolean | number
  ) => {
    const current = betrieb.stillerGesellschafter ?? DEFAULT_STILLER_GESELLSCHAFTER_CONFIG;
    let coerced: string | boolean | number;
    if (typeof value === "boolean" || typeof value === "number") {
      coerced = value;
    } else if (field === "typ") {
      coerced = value; // keep as string literal ('typisch' | 'atypisch')
    } else {
      coerced = parseFloat(value) || 0;
    }
    setBetrieb({
      stillerGesellschafter: {
        ...current,
        [field]: coerced,
      },
    });
  };

  const firmenhandy = betrieb.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;

  const overlayGewinner = differenzVergleich >= 0 ? "GmbH" : "Privat";
  const overlayProzent = kennzahlProzent === null
    ? "nicht berechenbar"
    : `${kennzahlProzent >= 0 ? "+" : "-"}${Math.abs(kennzahlProzent).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Betrieb</h2>
        <p className="text-sm text-slate-600">Operative Phase der GmbH mit ETF-Investment aus Einlage, Gesellschafterdarlehen und freien Überschüssen sowie separatem Cash-Puffer</p>
      </div>

      {/* Startkapital & ETF */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Kapital & ETF-Investment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Startkapital (€)"
            value={betrieb.startkapital}
            onChange={(v) => setBetrieb({ startkapital: parseFloat(v) || 0 })}
            suffix="€"
            hint="Bei Gründung eingezahlte Einlage; wird als erste ETF-Position in den Aktiva geführt (Default: 12.500 €)"
          />
          <InputField
            label="ETF-Rendite (% p.a.)"
            value={betrieb.etfRendite}
            onChange={(v) => setBetrieb({ etfRendite: parseFloat(v) || 0 })}
            suffix="% p.a."
            hint="Durchschnittliche jährliche ETF-Rendite (Default: 5 %)"
          />
          <InputField
            label="Jährlicher Cash-Zuschuss (€)"
            value={betrieb.jaehrlicherCashZuschuss}
            onChange={(v) => setBetrieb({ jaehrlicherCashZuschuss: parseFloat(v) || 0 })}
            suffix="€/Jahr"
            hint={`Bleibt als Cash in der GmbH, gleicht zuerst Ausgaben aus und wird nicht in ETFs investiert (Default: ${DEFAULT_JAEHRLICHER_CASH_ZUSCHUSS.toLocaleString("de-DE")} €). Als zusätzliche Einlage sollte i. d. R. ein Gesellschafterbeschluss dokumentiert werden.`}
          />
          <InputField
            label="Simulierter Gewinn (€/Jahr)"
            value={betrieb.simulierterGewinn ?? 0}
            onChange={(v) => setBetrieb({ simulierterGewinn: parseFloat(v) || 0 })}
            suffix="€/Jahr"
            hint="Wird zuerst mit Betriebsausgaben verrechnet; ein verbleibender Überschuss wird nach Steuern als zusätzlicher ETF-Zufluss angelegt."
          />
          <InputField
            label="Laufzeit (Jahre)"
            value={betrieb.laufzeitJahre}
            onChange={(v) => setBetrieb({ laufzeitJahre: parseInt(v) || 1 })}
            suffix="Jahre"
          />
        </div>
      </div>

      {/* Darlehen */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Darlehen (Gesellschafter-Darlehen)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Darlehensbetrag (€)"
            value={betrieb.darlehen.betrag}
            onChange={(v) => updateDarlehen("betrag", v)}
            suffix="€"
            hint="Wird als zweite ETF-Position in den Aktiva angelegt"
          />
          <InputField
            label="Zinssatz (% p.a.)"
            value={betrieb.darlehen.zinssatz}
            onChange={(v) => updateDarlehen("zinssatz", v)}
            suffix="% p.a."
            hint="Fremdvergleichszins (arm's length)"
          />
          <InputField
            label="Monatlicher Darlehenszuschuss (€)"
            value={betrieb.darlehen.monatlicherZuschuss}
            onChange={(v) => updateDarlehen("monatlicherZuschuss", v)}
            suffix="€/Monat"
            hint="Deckt zuerst Ausgaben; ein Überschuss wird als zusätzliche ETF-Position investiert (Default: 0 €)"
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="endfaellig"
              checked={betrieb.darlehen.endfaellig}
              onChange={(e) => updateDarlehen("endfaellig", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="endfaellig" className="text-sm text-gray-700">
              Endfällig (Zinsen am Ende fällig)
            </label>
          </div>
          {!betrieb.darlehen.endfaellig && (
            <InputField
              label="Frühes Rückzahlungsdatum"
              value={betrieb.darlehen.tilgungsdatum ?? ""}
              onChange={(v) => setBetrieb({ darlehen: { ...betrieb.darlehen, tilgungsdatum: v } })}
              type="date"
            />
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Steuervorteile (Benefits)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Benefits werden als Betriebsausgaben behandelt und reduzieren damit den steuerpflichtigen Gewinn.
          Sachbezüge sind auf 50 €/Monat begrenzt (§ 8 Abs. 2 EStG). Das Firmenhandy wird separat als Betriebsausgabe berücksichtigt.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Tankgutschein (€/Monat)"
            value={betrieb.benefits.tankgutschein}
            onChange={(v) => updateBenefits("tankgutschein", v)}
            suffix="€/Monat"
            hint="Max. 50 €/Monat steuerfrei"
            max={50}
          />
          <InputField
            label="Strategieessen (€/Jahr)"
            value={betrieb.benefits.strategieessen}
            onChange={(v) => updateBenefits("strategieessen", v)}
            suffix="€/Jahr"
            hint="Voll abzugsfähige Betriebsausgabe"
          />
          <InputField
            label="bAV-Beitrag (€/Jahr)"
            value={betrieb.benefits.bav}
            onChange={(v) => updateBenefits("bav", v)}
            suffix="€/Jahr"
            hint={`Arbeitgeberbeitrag zur betrieblichen Altersvorsorge (§ 3 Nr. 63 EStG). Voll abzugsfähige Betriebsausgabe; bis zu ${BAV_MAX_STEUERFREIER_BEITRAG.toLocaleString("de-DE")} €/Jahr steuer- und sozialabgabenfrei für den GF.`}
          />
        </div>
      </div>

      {/* Firmenhandy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Firmenhandy</h3>
        <p className="text-xs text-slate-500 mb-4">
          Smartphones gelten seit dem BMF-Schreiben vom 26.02.2021 als sofort abschreibungsfähige
          Digitalgüter (Sofortabschreibung im Anschaffungsjahr). Der Kaufpreis wird im Ersatzjahr
          vollständig als Betriebsausgabe abgezogen; der Verkaufserlös des Altgeräts mindert ab
          dem zweiten Zyklus den Nettoaufwand.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="handyAktiv"
            checked={firmenhandy.aktiv}
            onChange={(e) => updateFirmenhandy("aktiv", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="handyAktiv" className="text-sm text-gray-700">
            Firmenhandy-Programm aktiv
          </label>
        </div>
        {firmenhandy.aktiv && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Kaufpreis (€)"
              value={firmenhandy.anschaffungskosten}
              onChange={(v) => updateFirmenhandy("anschaffungskosten", v)}
              suffix="€"
              hint="Netto-Anschaffungskosten des neuen Geräts"
            />
            <InputField
              label="Restwert bei Verkauf (%)"
              value={Math.round(firmenhandy.restwertQuote * 100)}
              onChange={(v) => updateFirmenhandy("restwertQuote", String((parseFloat(v) || 0) / 100))}
              suffix="%"
              hint="Anteil des Kaufpreises, der beim Verkauf des Altgeräts erzielt wird"
            />
            <InputField
              label="Ersatzzyklus (Jahre)"
              value={firmenhandy.ersatzzyklusJahre}
              onChange={(v) => updateFirmenhandy("ersatzzyklusJahre", v)}
              suffix="Jahre"
              hint="Alle wie viele Jahre wird das Gerät ersetzt?"
            />
            <InputField
              label="Erstanschaffung ab Jahr"
              value={firmenhandy.erstanschaffungJahr ?? 1}
              onChange={(v) => updateFirmenhandy("erstanschaffungJahr", Math.max(1, parseInt(v) || 1))}
              suffix="Jahr"
              hint="In welchem Betriebsjahr wird das erste Handy angeschafft?"
            />
          </div>
        )}
      </div>

      {/* Stiller Gesellschafter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Stiller Gesellschafter</h3>
        <p className="text-xs text-slate-500 mb-3">
          Ein stiller Gesellschafter beteiligt sich mit einer Kapitaleinlage an der GmbH, ohne nach außen in Erscheinung zu treten.
          Die Einlage wird in den ETF-Pool investiert. Gewinnbeteiligung und Zinsen sind vollständig als Betriebsausgaben absetzbar.
        </p>

        {/* Benefits explanation */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Vorteile eines stillen Gesellschafters für die GmbH</p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-blue-700">
            <li><span className="font-medium">Kapitalzufluss ohne Bankdarlehen</span> – Die Einlage stärkt die Liquidität und das investierbare Kapital der GmbH, ohne klassische Kreditkonditionen.</li>
            <li><span className="font-medium">Steuerliche Absetzbarkeit</span> – Gewinnbeteiligung und Mindestverzinsung reduzieren den steuerpflichtigen Gewinn der GmbH (Körperschaft- und Gewerbesteuer).</li>
            <li><span className="font-medium">Keine Handelsregistereintragung</span> – Der stille Gesellschafter taucht nicht im Handelsregister auf; die Außenwirkung der GmbH bleibt unverändert.</li>
            <li><span className="font-medium">Kein Mitspracherecht</span> – Anders als ein Gesellschafter hat ein stiller Gesellschafter in der Regel keine Geschäftsführungsbefugnisse.</li>
            <li><span className="font-medium">Flexibles Beteiligungsmodell</span> – Gewinnbeteiligung und Verzinsung können individuell im stillen Gesellschaftsvertrag geregelt werden.</li>
            <li><span className="font-medium">Verbesserte Eigenkapitalbasis</span> – Die Einlage erhöht die Investitionsbasis der GmbH und kann zu höheren ETF-Renditen führen.</li>
          </ul>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="stillerGesellschafterAktiv"
            checked={betrieb.stillerGesellschafter?.aktiv ?? false}
            onChange={(e) => updateStillerGesellschafter("aktiv", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="stillerGesellschafterAktiv" className="text-sm text-gray-700">
            Stiller Gesellschafter aktiv
          </label>
        </div>

        {(betrieb.stillerGesellschafter?.aktiv) && (
          <div className="space-y-4">
            {/* Typ-Auswahl */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Beteiligungsform</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stillerGesellschafterTyp"
                    value="typisch"
                    checked={(betrieb.stillerGesellschafter?.typ ?? 'typisch') === 'typisch'}
                    onChange={() => updateStillerGesellschafter("typ", "typisch")}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Typisch</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stillerGesellschafterTyp"
                    value="atypisch"
                    checked={(betrieb.stillerGesellschafter?.typ ?? 'typisch') === 'atypisch'}
                    onChange={() => updateStillerGesellschafter("typ", "atypisch")}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Atypisch</span>
                </label>
              </div>
            </div>

            {/* Typisch/Atypisch Erklärung */}
            {(betrieb.stillerGesellschafter?.typ ?? 'typisch') === 'typisch' ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-800">Typisch stiller Gesellschafter</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Beteiligt sich <span className="font-medium">nur am Gewinn und Verlust</span>, nicht an den stillen Reserven oder dem Firmenwert der GmbH.</li>
                  <li>Gewinnbeteiligung und Mindestverzinsung sind für die GmbH <span className="font-medium">Betriebsausgaben</span> (reduzieren KSt + GewSt).</li>
                  <li>Beim stillen Gesellschafter werden die Zahlungen als <span className="font-medium">Einkünfte aus Kapitalvermögen</span> (Abgeltungssteuer 25 % + SolZ) versteuert.</li>
                  <li>Kein Mitunternehmerverhältnis – die GmbH bleibt steuerlich eigenständig.</li>
                  <li>Geeignet für einfache Kapitalbeteiligungen ohne unternehmerisches Mitspracherecht.</li>
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold text-amber-900">Atypisch stiller Gesellschafter</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Beteiligt sich am Gewinn und Verlust <span className="font-medium">sowie an den stillen Reserven und dem Firmenwert</span> der GmbH.</li>
                  <li>Entsteht eine <span className="font-medium">Mitunternehmerschaft</span> (GmbH & Still) – steuerlich wie eine Personengesellschaft behandelt.</li>
                  <li>Der auf den stillen Gesellschafter entfallende Gewinnanteil unterliegt <span className="font-medium">nicht der GmbH-Körperschaftsteuer</span>, sondern wird beim Partner als <span className="font-medium">Einkünfte aus Gewerbebetrieb</span> versteuert.</li>
                  <li>Ermöglicht dem stillen Gesellschafter, <span className="font-medium">Verluste der GmbH</span> mit seinen anderen Einkünften zu verrechnen (bis zur Höhe der Einlage).</li>
                  <li>Höhere Komplexität: gesonderte Gewinnfeststellung, separates Steuerbilanzkapitalkonto erforderlich.</li>
                  <li>Empfehlung: Abstimmung mit einem Steuerberater empfohlen.</li>
                </ul>
              </div>
            )}

            {/* Eingabefelder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Kapitaleinlage (€)"
                value={betrieb.stillerGesellschafter?.einlage ?? DEFAULT_STILLER_GESELLSCHAFTER_CONFIG.einlage}
                onChange={(v) => updateStillerGesellschafter("einlage", v)}
                suffix="€"
                hint="Einmalige Kapitaleinlage des stillen Gesellschafters; wird in den ETF-Pool der GmbH investiert."
              />
              <InputField
                label="Gewinnbeteiligung (% des Gewinns)"
                value={betrieb.stillerGesellschafter?.gewinnbeteiligungProzent ?? DEFAULT_STILLER_GESELLSCHAFTER_CONFIG.gewinnbeteiligungProzent}
                onChange={(v) => updateStillerGesellschafter("gewinnbeteiligungProzent", v)}
                suffix="%"
                hint="Prozentualer Anteil am simulierten Jahresgewinn (Betriebsausgabe der GmbH)."
              />
              <InputField
                label="Mindestverzinsung (% p.a.)"
                value={betrieb.stillerGesellschafter?.zinssatz ?? DEFAULT_STILLER_GESELLSCHAFTER_CONFIG.zinssatz}
                onChange={(v) => updateStillerGesellschafter("zinssatz", v)}
                suffix="% p.a."
                hint="Jährliche Mindestverzinsung der Einlage, unabhängig vom Gewinn (Betriebsausgabe der GmbH)."
              />
            </div>
          </div>
        )}
      </div>

      {/* Operating costs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-1">Laufende Betriebskosten (jährlich)</h3>
        <p className="text-xs text-gray-400 mb-4">
          Alle Positionen reduzieren den steuerpflichtigen Gewinn direkt. Das Firmenhandy
          wird – sofern aktiv – nur im jeweiligen Ersatzjahr als Betriebsausgabe berücksichtigt
          (Sofortabschreibung).
        </p>
        <KostenListe
          kosten={betrieb.kosten}
          onAdd={addBetriebskosten}
          onUpdate={updateBetriebskosten}
          onRemove={removeBetriebskosten}
          showPeriode
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Zielnetto insgesamt</h3>
        <p className="text-xs text-slate-500 mb-4">
          Für den Zielabgleich zählen Netto-Darlehenszinsen plus Netto-GF-Gehalt. Das Gehalt wirkt als Betriebskosten in der GmbH.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InputField
            label="Zielnetto insgesamt (€/Jahr)"
            value={zielnettoInsgesamt}
            onChange={(v) => setBetrieb({ zielnettoGesellschafter: Math.max(0, parseFloat(v) || 0) })}
            suffix="€/Jahr"
            hint={`Default: ${DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB.toLocaleString("de-DE")} €`}
          />
          <SliderField
            label="GF-Gehalt (brutto, €/Jahr)"
            value={Math.max(0, betrieb.geschaeftsfuehrergehalt ?? DEFAULT_GF_GEHALT_BETRIEB)}
            onChange={(v) => setBetrieb({ geschaeftsfuehrergehalt: v })}
            hint={`Wird als Betriebskosten der GmbH angesetzt (Default: ${DEFAULT_GF_GEHALT_BETRIEB.toLocaleString("de-DE")} €)`}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">Zielabgleich (Jahr 1)</p>
            <div className="mt-2 space-y-1 text-xs text-slate-700">
              <p>GF-Gehalt brutto: <span className="font-semibold">{geschaeftsfuehrergehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Gehälter gesamt brutto: <span className="font-semibold">{gehaelterGesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Gesamteinkommen (GF + Zinsen): <span className="font-semibold">{gesellschafterBruttoEinkommen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>ESt + Soli gesamt (progressiv): <span className="font-semibold text-red-700">− {gesellschafterSteuerGesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>ESt + Soli auf Gehälter: <span className="font-semibold text-red-700">− {gehaelterSteuerGesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Gehälter netto: <span className="font-semibold text-green-700">+ {gehaelterNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Darlehenszinsen brutto: <span className="font-semibold">{darlehenszinsenBrutto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Zusätzliche Steuer durch Darlehenszinsen: <span className="font-semibold text-red-700">− {darlehenszinsenSteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Darlehenszinsen netto: <span className="font-semibold text-green-700">+ {darlehenszinsenNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-800">
              Summe Netto: {gesellschafterNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-xs text-slate-700">
              Zielnetto insgesamt: {zielnettoInsgesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
            <p
              className={`text-xs mt-1 font-semibold ${zielnettoDifferenz >= 0 ? "text-green-700" : "text-red-700"}`}
              aria-label={zielnettoDifferenz >= 0 ? "Zielnetto überschritten" : "Zielnetto unterschritten"}
            >
              {zielnettoDifferenz >= 0 ? "▲ Überschuss" : "▼ Fehlbetrag"}: {Math.abs(zielnettoDifferenz).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className={`rounded-lg border p-3 ${gmbhNettoveraenderung >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <p className={`text-xs font-medium ${gmbhNettoveraenderung >= 0 ? "text-green-700" : "text-red-700"}`}>
              GmbH-Geldentwicklung (Jahr 1)
            </p>
            <p
              className={`mt-1 text-lg font-bold ${gmbhNettoveraenderung >= 0 ? "text-green-800" : "text-red-800"}`}
              aria-label={gmbhNettoveraenderung >= 0 ? "Geld der GmbH wird mehr" : "Geld der GmbH wird weniger"}
            >
              {gmbhNettoveraenderung >= 0 ? "▲ Mehr" : "▼ Weniger"}
            </p>
            <p className={`text-xs mt-1 ${gmbhNettoveraenderung >= 0 ? "text-green-700" : "text-red-700"}`}>
              {Math.abs(gmbhNettoveraenderung).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Vergleich: Nettovermögen Start {nettovermoegenStart.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € → Jahr 1 {erstesJahrNettovermoegen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </div>
        </div>
      </div>

      {/* Tax info box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-3">
          Verkäufe erfolgen steueroptimiert: Betriebsausgaben werden zuerst aus dem jährlichen Cash-Zuschuss,
          dann aus vorhandenen Cash-Reserven und erst danach aus laufenden Darlehenszuzahlungen gedeckt.
          Reicht das nicht aus, werden zuerst die ETF-Positionen mit der geringsten steuerpflichtigen stillen Reserve verkauft.
        </p>
        <p className="text-xs font-semibold text-slate-700 mb-2">📊 Steuerparameter (GmbH) – Steuern ans Finanzamt</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
          <div><span className="font-medium">KSt:</span> 15,00%</div>
          <div><span className="font-medium">KSt + SolZ:</span> 15,825%</div>
          <div><span className="font-medium">GewSt:</span> ~14,00%</div>
          <div><span className="font-medium">Gesamt GmbH:</span> ~29,825%</div>
          <div><span className="font-medium">Abgeltungsteuer:</span> 25%</div>
          <div><span className="font-medium">Abg. + SolZ:</span> 26,375%</div>
          <div><span className="font-medium">Basiszins 2024:</span> 2,29%</div>
          <div><span className="font-medium">Teilfreistellung ETF-Verkauf:</span> {teilfreistellungGmbh}%</div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Der GmbH-Gewinn ergibt sich aus realisiertem ETF-Ertrag (durch Verkäufe) abzüglich Betriebskosten und Darlehenszinsen.
          Auf diesen Gewinn werden KSt + GewSt ans Finanzamt abgeführt.
          Vorabpauschale und realisierte ETF-Verkaufsgewinne werden auf konsistenter GmbH-Steuerbasis gerechnet;
          realisierte ETF-Gewinne werden dabei auf die Vorabpauschale angerechnet.
        </p>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <JahresUebersicht ergebnisse={ergebnisse} title="Jahresergebnisse Betriebsphase" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Entscheidungsfläche: Lohnt sich die GmbH?</h3>
        <div className={`rounded-lg border p-3 ${lohntSichGmbH ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
          <p className={`text-sm font-bold ${lohntSichGmbH ? "text-green-800" : "text-orange-800"}`}>
            {lohntSichGmbH ? "Ja – die GmbH liegt vorne" : "Noch nicht – aktuell liegt Privat vorne"}
          </p>
          <p className={`text-xs mt-1 ${lohntSichGmbH ? "text-green-700" : "text-orange-700"}`}>
            Kennzahl „Lohnt sich die GmbH?“: {kennzahlProzent === null
              ? "Nicht berechenbar (Privat-Gesamtwert = 0 €)"
              : `${kennzahlProzent >= 0 ? "+" : ""}${kennzahlProzent.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% gegenüber Privat`}
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Break-even: {!breakEvenBerechenbar
              ? "nicht berechenbar (Zeitreihen nicht vergleichbar)"
              : breakEvenJahr
                ? `ab Jahr ${breakEvenJahr}`
                : "innerhalb der gewählten Laufzeit nicht erreicht"}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Wichtigste Treiber</p>
          <div className="space-y-2">
            {topTreiber.map((treiber) => (
              <div key={treiber.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-xs font-semibold text-slate-800">{treiber.label}</p>
                <p className={`text-xs mt-0.5 ${treiber.impact >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {treiber.impact >= 0 ? "+" : "-"} {Math.abs(treiber.impact).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">{treiber.description}</p>
              </div>
            ))}
          </div>
        </div>

        {!lohntSichGmbH && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800 mb-2">Wie die GmbH gewinnen kann</p>
            <ul className="list-disc pl-4 space-y-1">
              {(gmbhVorschlaege.length > 0
                ? gmbhVorschlaege
                : [DEFAULT_GMBH_VORSCHLAG])
                .map((vorschlag) => (
                  <li key={vorschlag} className="text-xs text-amber-800">{vorschlag}</li>
                ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Endvergleich Betriebsphase: GmbH vs. Privat-ETF</h3>
        <div className="text-xs text-slate-500 mb-4 space-y-1">
          <p>Vergleichslogik:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Anfangskapital = Startkapital + Darlehensbetrag</li>
            <li>Tankgutschein und Firmenhandy werden separat als verkonsumierter Wert ausgewiesen</li>
            <li>Sparplan privat = jährlicher Cash-Zuschuss + monatlicher Darlehenszuschuss + simulierter Gewinn nach ESt/Soli minus Tankgutschein minus Firmenhandy</li>
            <li>In der GmbH wird der Konsumwert steuerbereinigt gezeigt (inkl. Vorsteuerabzug beim Firmenhandy)</li>
            <li>Nicht-endfällige Zinsen und GF-Gehalt werden privat über ETF-Verkäufe entnommen</li>
            <li>Privat-Steuern: Abgeltungsteuer ({(ABGELTUNGSSTEUER_GESAMT * 100).toLocaleString("de-DE")}%) und Teilfreistellung ({(TEILFREISTELLUNG_AKTIEN_PRIVAT * 100).toLocaleString("de-DE")}%)</li>
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1 text-xs">
            <p className="font-semibold text-blue-800">GmbH</p>
            <p className="text-blue-700">ETF-Verkäufe kumuliert: <span className="font-semibold">{gmbhKumulierterEtfVerkauf.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-blue-700">Verbleibender ETF-Wert: <span className="font-semibold">{gmbhVerbleibenderEtfWert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-blue-700">Steuern kumuliert: <span className="font-semibold">{gmbhSteuernKumuliert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-blue-700">Verkonsumierter Wert (steuerbereinigt): <span className="font-semibold">{gmbhKumulierterKonsumwert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-sm font-bold text-blue-900 border-t border-blue-300 pt-1 mt-1">
              Endwert (Verkäufe + Rest-ETF): {gmbhEndwert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-sm font-bold text-blue-900">
              Gesamtwert inkl. Konsum: {gmbhGesamtwertMitKonsum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1 text-xs">
            <p className="font-semibold text-emerald-800">Privat-ETF</p>
            <p className="text-emerald-700">ETF-Verkäufe kumuliert: <span className="font-semibold">{privatVergleich.kumulierterEtfVerkauf.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-emerald-700">Verbleibender ETF-Wert: <span className="font-semibold">{privatVergleich.verbleibenderEtfWert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-emerald-700">Steuern kumuliert: <span className="font-semibold">{privatVergleich.kumulierteSteuern.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-emerald-700">Verkonsumierter Wert: <span className="font-semibold">{privatVergleich.kumulierterKonsumwert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
            <p className="text-sm font-bold text-emerald-900 border-t border-emerald-300 pt-1 mt-1">
              Endwert (Verkäufe + Rest-ETF): {privatVergleich.endwert.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-sm font-bold text-emerald-900">
              Gesamtwert inkl. Konsum: {privatVergleich.gesamtwertMitKonsum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3">
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Private Rechnung pro Jahr (Vergleichsprüfung)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left text-slate-800">
              <thead>
                <tr className="border-b border-slate-300 text-slate-700">
                  <th className="py-2 pr-3">Jahr</th>
                  <th className="py-2 pr-3">Sparplan netto (Privat)</th>
                  <th className="py-2 pr-3">Entnahmen vor Steuer (Privat)</th>
                  <th className="py-2 pr-3">ETF-Verkauf (Privat)</th>
                  <th className="py-2 pr-3">Steuern (Privat)</th>
                  <th className="py-2 pr-3">Gesamtwert Privat inkl. Konsum</th>
                  <th className="py-2 pr-3">Gesamtwert GmbH inkl. Konsum</th>
                  <th className="py-2 pr-3">Differenz (GmbH - Privat)</th>
                  <th className="py-2">Differenz in %</th>
                </tr>
              </thead>
              <tbody>
                {privatZeitreihe.map((privatJahr, index) => {
                  const gmbhJahr = gmbhZeitreihe[index];
                  const jahrDifferenz = gmbhJahr
                    ? gmbhJahr.gesamtwertMitKonsum - privatJahr.gesamtwertMitKonsum
                    : null;
                  const jahrDifferenzProzent = jahrDifferenz !== null && privatJahr.gesamtwertMitKonsum !== 0
                    ? (jahrDifferenz / privatJahr.gesamtwertMitKonsum) * 100
                    : null;
                  return (
                    <tr key={privatJahr.jahr} className="border-b border-slate-200 last:border-b-0">
                      <td className="py-2 pr-3 font-medium text-slate-700">Jahr {privatJahr.jahr}</td>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">
                          {privatJahr.sparplanNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                          <div>Cash-Zuschuss: + {privatJahr.sparplanAusCashZuschuss.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div>Gewinn netto: + {privatJahr.sparplanAusGewinnNetto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          {(privatJahr.sparplanAusGewinnBrutto > 0 || privatJahr.sparplanAusGewinnSteuer > 0 || privatJahr.sparplanAusGewinnSoli > 0) && (
                            <div className="text-slate-500">
                              (aus Gewinn brutto {privatJahr.sparplanAusGewinnBrutto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € − ESt {privatJahr.sparplanAusGewinnSteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € − Soli {privatJahr.sparplanAusGewinnSoli.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €)
                            </div>
                          )}
                          <div>Darlehenszuschuss: + {privatJahr.sparplanAusDarlehensZuzahlung.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div>Konsumabzug (Tank/Handy): − {privatJahr.sparplanAbzugKonsum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                        </div>
                      </td>
                      <td className="py-2 pr-3">{privatJahr.entnahmenVorSteuern.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">{privatJahr.etfVerkauf.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                        <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                          <div>für GF-Gehalt: {privatJahr.etfVerkaufFuerGehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div>für Zinsen: {privatJahr.etfVerkaufFuerZinsen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div>für Sparplan-Defizit: {privatJahr.etfVerkaufFuerSparplanDefizit.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          {privatJahr.etfVerkaufFuerStillenGesellschafter > 0 && (
                            <div>für stillen Gesellschafter: {privatJahr.etfVerkaufFuerStillenGesellschafter.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          )}
                          <div>für Vorabpauschale-Steuer: {privatJahr.etfVerkaufFuerVorabpauschalesteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div>für ETF-Verkaufssteuer: {privatJahr.etfVerkaufFuerEtfVerkaufssteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div className="text-slate-500">Verwendungszweck gesamt: {privatJahr.etfVerkaufVerwendungszweckGesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">{privatJahr.gesamtSteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                        <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                          <div>Vorabpauschale-Steuer: {privatJahr.vorabpauschalesteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                          <div>ETF-Verkaufssteuer: {privatJahr.etfVerkaufssteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</div>
                        </div>
                      </td>
                      <td className="py-2 pr-3">{privatJahr.gesamtwertMitKonsum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 pr-3">
                        {gmbhJahr
                          ? `${gmbhJahr.gesamtwertMitKonsum.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`
                          : "—"}
                      </td>
                      <td className={`py-2 pr-3 ${jahrDifferenz !== null && jahrDifferenz >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {jahrDifferenz === null
                          ? "—"
                          : `${jahrDifferenz >= 0 ? "+" : "-"} ${Math.abs(jahrDifferenz).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`}
                      </td>
                      <td className={`py-2 ${jahrDifferenzProzent !== null && jahrDifferenzProzent >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {jahrDifferenzProzent === null
                          ? "—"
                          : `${jahrDifferenzProzent >= 0 ? "+" : "-"} ${Math.abs(jahrDifferenzProzent).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className={`mt-4 rounded-lg border p-3 ${differenzVergleich >= 0 ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
          <p className={`text-sm font-bold ${differenzVergleich >= 0 ? "text-green-800" : "text-orange-800"}`}>{gewinnerText}</p>
          <p className={`text-xs mt-1 ${differenzVergleich >= 0 ? "text-green-700" : "text-orange-700"}`}>
            Differenz Gesamtwert inkl. Konsum: {Math.abs(differenzVergleich).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Endwert-Differenz vor Konsum: {Math.abs(endwertDifferenzOhneKonsum).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €.
            Begründung: {Math.abs(steuerDifferenz).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € {steuerDifferenz >= 0 ? "mehr" : "weniger"} Steuerlast in der GmbH gegenüber privat
            sowie {Math.abs(verkaufsDifferenz).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € {verkaufsDifferenz >= 0 ? "mehr" : "weniger"} kumulierte ETF-Verkäufe.
          </p>
        </div>
      </div>
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <p className="text-xs text-slate-600">Vergleich Privat vs. GmbH</p>
          <p className={`text-sm font-bold ${differenzVergleich >= 0 ? "text-green-800" : "text-orange-800"}`}>
            {Math.abs(differenzVergleich).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € mehr in {overlayGewinner}
          </p>
          <p className="text-xs text-slate-700">{overlayProzent}</p>
        </div>
      </div>
    </div>
  );
}
