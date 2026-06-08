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
  berechneAlleInvestitionsErgebnisse,
} from "@/lib/calculations/betrieb";
import { InvestitionsPosition } from "@/lib/types";
import {
  berechneGesamtvergleichKpi,
  formatSignedEuro,
  formatSignedPercent,
} from "@/lib/calculations/gesamtvergleich";
import { KostenListe } from "./KostenListe";
import { JahresUebersicht } from "./JahresUebersicht";

const BENEFIT_MAX_VALUES = {
  tankgutschein: 50,
} as const;
const DEFAULT_JAEHRLICHER_CASH_ZUSCHUSS = 2400;
const RECOMMENDED_MIN_LAUFZEIT_JAHRE = 12;
const HIGH_ZINSSATZ_THRESHOLD = 3;
const STEUER_EQUALITY_THRESHOLD = 0.01;
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
  min,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: string;
  suffix?: string;
  hint?: string;
  max?: number;
  min?: number;
}) {
  const [localStr, setLocalStr] = React.useState<string>(String(value));
  const [focused, setFocused] = React.useState(false);
  const [prevValue, setPrevValue] = React.useState(value);

  if (!focused && prevValue !== value) {
    setPrevValue(value);
    setLocalStr(String(value));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={localStr}
          max={max}
          min={min}
          onChange={(e) => {
            setLocalStr(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setLocalStr(String(value));
          }}
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
  const { betrieb, ende, setBetrieb, addBetriebskosten, updateBetriebskosten, removeBetriebskosten, addInvestition, updateInvestition, removeInvestition, getBetriebsErgebnisse, getEndeErgebnisse } =
    useCalculatorStore();
  const teilfreistellungGmbh = (TEILFREISTELLUNG_AKTIEN_GMBH * 100).toLocaleString("de-DE");

  const ergebnisse = getBetriebsErgebnisse();
  const endeErgebnisse = getEndeErgebnisse();
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
  // GmbH net asset development over the full Betrieb phase (start → last year).
  const letztesJahrNettovermoegen = letztesJahrDetails?.nettovermoegen ?? nettovermoegenStart;
  const gmbhGesamteNettoveraenderung = letztesJahrDetails
    ? (letztesJahrNettovermoegen - nettovermoegenStart)
    : 0;
  const gmbhAnfangskapital = Math.max(0, betrieb.startkapital) + Math.max(0, betrieb.darlehen.betrag);
  const gmbhKumulierterEtfVerkauf = ergebnisse.reduce((sum, ergebnis) => sum + (ergebnis.details.etfVerkauf ?? 0), 0);
  const gmbhVerbleibenderEtfWert = letztesJahrDetails?.etfWert
    ?? gmbhAnfangskapital;
  const gmbhEndwert = gmbhKumulierterEtfVerkauf + gmbhVerbleibenderEtfWert;
  const gmbhKumulierterKonsumwert = letztesJahrDetails?.kumulierterKonsumwert
    ?? 0;
  const gmbhGesamtwertMitKonsum = letztesJahrNettovermoegen + gmbhKumulierterKonsumwert;
  const differenzVergleich = gmbhGesamtwertMitKonsum - privatVergleich.gesamtwertMitKonsum;
  const endwertDifferenzOhneKonsum =
    letztesJahrNettovermoegen - (privatVergleich.endwert + privatVergleich.investitionsNettovermoegen);
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
    const kumulierterKonsumwert = ergebnis.details.kumulierterKonsumwert ?? 0;
    return [
      ...acc,
      {
        jahr: ergebnis.jahr,
        kumulierterEtfVerkauf,
        gesamtwertMitKonsum: (ergebnis.details.nettovermoegen ?? 0) + kumulierterKonsumwert,
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
  const gesamtvergleich = berechneGesamtvergleichKpi(betrieb, ende.laufzeitJahre, endeErgebnisse, ergebnisse);

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

  const investitionsErgebnisse = React.useMemo(
    () => berechneAlleInvestitionsErgebnisse(betrieb.investitionen, betrieb.laufzeitJahre),
    [betrieb.investitionen, betrieb.laufzeitJahre]
  );

  const overlayGewinner = differenzVergleich >= 0 ? "GmbH" : "Privat";

  const [newInvestition, setNewInvestition] = React.useState<Omit<InvestitionsPosition, "id">>({
    bezeichnung: "",
    kapital: 0,
    gewinnVerlustProJahr: 0,
    wertsteigerung: 0,
    kredit: 0,
    zinssatz: 0,
    tilgungsrateJaehrlich: 0,
  });
  const overlayProzent = kennzahlProzent === null
    ? "nicht berechenbar"
    : `${kennzahlProzent >= 0 ? "+" : "-"}${Math.abs(kennzahlProzent).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  const overlayGesamtProzent = formatSignedPercent(gesamtvergleich.vorteilProzent);
  const formatEuro = (value: number) => `${value.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
  const formatEuroDelta = (value: number) => `${value >= 0 ? "+" : "-"} ${Math.abs(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
  const formatPercentSigned = (value: number) =>
    `${value >= 0 ? "+" : "-"} ${Math.abs(value).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Betrieb</h2>
        <p className="text-sm text-slate-600">Operative Phase der GmbH mit ETF-Investment aus Einlage, Gesellschafterdarlehen und freien Überschüssen sowie separatem Cash-Puffer</p>
      </div>

      {/* Laufzeit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Laufzeit</h3>
        <InputField
          label="Laufzeit (Jahre)"
          value={betrieb.laufzeitJahre}
          onChange={(v) => setBetrieb({ laufzeitJahre: parseInt(v) || 1 })}
          suffix="Jahre"
        />
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
            label="Persönlicher Grenzsteuersatz des Gesellschafters (%)"
            value={betrieb.persoenlicherGrenzsteuersatz ?? ""}
            onChange={(v) =>
              setBetrieb({
                persoenlicherGrenzsteuersatz:
                  v.trim() === ""
                    ? undefined
                    : Math.max(0, Math.min(100, parseFloat(v) || 0)),
              })
            }
            suffix="%"
            hint="Optional für den Privatvergleich: Versteuert den simulierten Gewinn mit dem persönlichen Grenzsteuersatz zzgl. Soli (z. B. 42 % bei Anstellung)."
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

      {/* Investitionsbereich */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Investitionsbereich (GmbH)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Zusätzliche Investitionen der GmbH mit jährlichem Gewinn/Verlust und Kapitalwertsteigerung.
          Die Ergebnisse werden auf Basis der oben konfigurierten Laufzeit berechnet ({betrieb.laufzeitJahre} Jahre).
        </p>

        {/* Existing investments */}
        {(betrieb.investitionen ?? []).length > 0 && (
          <div className="space-y-4 mb-6">
            {(betrieb.investitionen ?? []).map((inv) => {
              const ergebnis = investitionsErgebnisse.find((e) => e.id === inv.id);
              return (
                <div key={inv.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">{inv.bezeichnung || "Investition"}</span>
                    <button
                      type="button"
                      onClick={() => removeInvestition(inv.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Entfernen
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <InputField
                      label="Bezeichnung"
                      value={inv.bezeichnung}
                      onChange={(v) => updateInvestition(inv.id, { bezeichnung: v })}
                      type="text"
                    />
                    <InputField
                      label="Kapital (€)"
                      value={inv.kapital}
                      onChange={(v) => updateInvestition(inv.id, { kapital: parseFloat(v) || 0 })}
                      suffix="€"
                    />
                    <InputField
                      label="Gewinn/Verlust (€/Jahr)"
                      value={inv.gewinnVerlustProJahr}
                      onChange={(v) => { const n = parseFloat(v); if (!isNaN(n)) updateInvestition(inv.id, { gewinnVerlustProJahr: n }); }}
                      suffix="€/Jahr"
                      type="text"
                    />
                    <InputField
                      label="Wertsteigerung (% p.a.)"
                      value={inv.wertsteigerung}
                      onChange={(v) => updateInvestition(inv.id, { wertsteigerung: parseFloat(v) || 0 })}
                      suffix="% p.a."
                    />
                    <InputField
                      label="Kredit (€)"
                      value={inv.kredit ?? 0}
                      onChange={(v) => updateInvestition(inv.id, { kredit: parseFloat(v) || 0 })}
                      suffix="€"
                      hint="Fremdfinanzierter Anteil der Investition"
                    />
                    <InputField
                      label="Zinssatz (% p.a.)"
                      value={inv.zinssatz ?? 0}
                      onChange={(v) => updateInvestition(inv.id, { zinssatz: parseFloat(v) || 0 })}
                      suffix="% p.a."
                      hint="Zinssatz auf den Investitionskredit"
                    />
                    <InputField
                      label="Tilgung (€/Jahr)"
                      value={inv.tilgungsrateJaehrlich ?? 0}
                      onChange={(v) => updateInvestition(inv.id, { tilgungsrateJaehrlich: parseFloat(v) || 0 })}
                      suffix="€/Jahr"
                      hint="Jährliche Kredittilgung"
                    />
                  </div>
                  {ergebnis && (
                    <div className={`rounded-md border p-2 text-xs ${ergebnis.gesamtGewinnVerlust >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <p className={`font-semibold mb-1 ${ergebnis.gesamtGewinnVerlust >= 0 ? "text-green-800" : "text-red-800"}`}>
                        Ergebnis nach {betrieb.laufzeitJahre} Jahren
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        <p className="text-slate-700">Endkapital: <span className="font-semibold">{ergebnis.endkapital.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                        <p className="text-slate-700">Kum. Gewinn/Verlust: <span className={`font-semibold ${ergebnis.gesamtGewinnVerlust >= 0 ? "text-green-700" : "text-red-700"}`}>{ergebnis.gesamtGewinnVerlust >= 0 ? "+" : ""}{ergebnis.gesamtGewinnVerlust.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                        <p className="text-slate-700">Gesamtrendite: <span className={`font-semibold ${ergebnis.gesamtRendite >= 0 ? "text-green-700" : "text-red-700"}`}>{ergebnis.gesamtRendite >= 0 ? "+" : ""}{ergebnis.gesamtRendite.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</span></p>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-slate-600">Jahreswerte anzeigen</summary>
                        <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                          {ergebnis.jahreswerte.map((jw) => (
                            <div key={jw.jahr} className="flex flex-wrap gap-4 text-[11px] text-slate-700">
                              <span className="w-12">Jahr {jw.jahr}</span>
                              <span>Kapital: {jw.kapital.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                              <span>Kum. G/V: {jw.kumulierterGewinnVerlust >= 0 ? "+" : ""}{jw.kumulierterGewinnVerlust.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                              {jw.zinsaufwand > 0 && <span>Zinsen: {jw.zinsaufwand.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>}
                              {jw.tilgung > 0 && <span>Tilgung: {jw.tilgung.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>}
                              {(jw.zinsaufwand > 0 || jw.tilgung > 0) && <span className={jw.nettoCashflow >= 0 ? "text-teal-700" : "text-red-600"}>Netto-CF: {jw.nettoCashflow >= 0 ? "+" : ""}{jw.nettoCashflow.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>}
                              {jw.restschuld > 0 && <span>Restschuld: {jw.restschuld.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add new investment form */}
        <div className="rounded-lg border border-blue-200 bg-white p-3">
          <p className="text-xs font-semibold text-blue-800 mb-3">Neue Investition hinzufügen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <InputField
              label="Bezeichnung"
              value={newInvestition.bezeichnung}
              onChange={(v) => setNewInvestition((prev) => ({ ...prev, bezeichnung: v }))}
              type="text"
            />
            <InputField
              label="Kapital (€)"
              value={newInvestition.kapital}
              onChange={(v) => setNewInvestition((prev) => ({ ...prev, kapital: parseFloat(v) || 0 }))}
              suffix="€"
              hint="Eingesetztes Kapital der Investition"
            />
            <InputField
              label="Gewinn/Verlust (€/Jahr)"
              value={newInvestition.gewinnVerlustProJahr}
              onChange={(v) => { const n = parseFloat(v); setNewInvestition((prev) => ({ ...prev, gewinnVerlustProJahr: isNaN(n) ? prev.gewinnVerlustProJahr : n })); }}
              suffix="€/Jahr"
              hint="Positiv = Gewinn, negativ = Verlust"
              type="text"
            />
            <InputField
              label="Wertsteigerung (% p.a.)"
              value={newInvestition.wertsteigerung}
              onChange={(v) => setNewInvestition((prev) => ({ ...prev, wertsteigerung: parseFloat(v) || 0 }))}
              suffix="% p.a."
              hint="Jährliche Wertsteigerung des eingesetzten Kapitals"
            />
            <InputField
              label="Kredit (€)"
              value={newInvestition.kredit ?? 0}
              onChange={(v) => setNewInvestition((prev) => ({ ...prev, kredit: parseFloat(v) || 0 }))}
              suffix="€"
              hint="Fremdfinanzierter Anteil (optional)"
            />
            <InputField
              label="Zinssatz (% p.a.)"
              value={newInvestition.zinssatz ?? 0}
              onChange={(v) => setNewInvestition((prev) => ({ ...prev, zinssatz: parseFloat(v) || 0 }))}
              suffix="% p.a."
              hint="Zinssatz auf den Investitionskredit"
            />
            <InputField
              label="Tilgung (€/Jahr)"
              value={newInvestition.tilgungsrateJaehrlich ?? 0}
              onChange={(v) => setNewInvestition((prev) => ({ ...prev, tilgungsrateJaehrlich: parseFloat(v) || 0 }))}
              suffix="€/Jahr"
              hint="Jährliche Kredittilgung"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (newInvestition.bezeichnung.trim() && newInvestition.kapital > 0) {
                addInvestition(newInvestition);
                setNewInvestition({ bezeichnung: "", kapital: 0, gewinnVerlustProJahr: 0, wertsteigerung: 0, kredit: 0, zinssatz: 0, tilgungsrateJaehrlich: 0 });
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={!newInvestition.bezeichnung.trim() || newInvestition.kapital === 0}
          >
            Investition hinzufügen
          </button>
        </div>
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
          <div className={`rounded-lg border p-3 ${gmbhGesamteNettoveraenderung >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <p className={`text-xs font-medium ${gmbhGesamteNettoveraenderung >= 0 ? "text-green-700" : "text-red-700"}`}>
              Geldentwicklung im Betrieb (Gesamt)
            </p>
            <p
              className={`mt-1 text-lg font-bold ${gmbhGesamteNettoveraenderung >= 0 ? "text-green-800" : "text-red-800"}`}
              aria-label={gmbhGesamteNettoveraenderung >= 0 ? "GmbH-Nettovermögen ist gewachsen" : "GmbH-Nettovermögen ist geschrumpft"}
            >
              {gmbhGesamteNettoveraenderung >= 0 ? "▲ Mehr" : "▼ Weniger"}
            </p>
            <p className={`text-xs mt-1 ${gmbhGesamteNettoveraenderung >= 0 ? "text-green-700" : "text-red-700"}`}>
              {Math.abs(gmbhGesamteNettoveraenderung).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Nettovermögen Start {nettovermoegenStart.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € → Jahr {betrieb.laufzeitJahre} {letztesJahrNettovermoegen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
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
          <div className="mt-3 border-t border-current/10 pt-3">
            <p className="text-xs font-semibold text-slate-700">Gesamt-KPI inkl. Ende</p>
            <p className={`text-xs mt-1 ${gesamtvergleich.vorteil >= 0 ? "text-green-700" : "text-orange-700"}`}>
              Vorteilhaftigkeitskennzahl gesamt (Betrieb + Ende): {formatSignedEuro(gesamtvergleich.vorteil)} gegenüber Privat
            </p>
            <p className="text-xs text-slate-700 mt-1">
              {gesamtvergleich.gewinnerText} · {overlayGesamtProzent} · Zeitraum {gesamtvergleich.zeitraumJahre} Jahre
            </p>
          </div>
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
          <div className="mb-2 text-[11px] text-slate-600 space-y-0.5">
            <p>Sparplan netto = Cash-Zuschuss + Darlehens-Zuschuss + simulierter Gewinn netto − Konsumwert.</p>
            <p>ETF-Verkauf deckt Entnahmen vor Steuer sowie anfallende Vorabpauschale- und ETF-Verkaufssteuer.</p>
            <p>Steuer gesamt privat (kumuliert): {formatEuro(privatVergleich.kumulierteSteuern)}</p>
            <p>
              Davon Vorabpauschale: {formatEuro(privatVergleich.kumulierteVorabpauschalesteuer)}, ETF-Verkauf: {formatEuro(privatVergleich.kumulierteEtfVerkaufssteuer)}
            </p>
          </div>
          <div className="space-y-2">
            {privatZeitreihe.map((privatJahr, index) => {
              const gmbhJahr = gmbhZeitreihe[index];
              const jahrDifferenz = gmbhJahr
                ? gmbhJahr.gesamtwertMitKonsum - privatJahr.gesamtwertMitKonsum
                : null;
              const jahrDifferenzProzent = jahrDifferenz !== null && privatJahr.gesamtwertMitKonsum !== 0
                ? (jahrDifferenz / privatJahr.gesamtwertMitKonsum) * 100
                : null;
              const sparplanVorAbzug = privatJahr.jaehrlicherCashZuschuss + privatJahr.darlehensZuschussJaehrlich + privatJahr.simulierterGewinnNetto;
              const konsumAbzugQuote = sparplanVorAbzug > 0
                ? (privatJahr.konsumNutzenwert / sparplanVorAbzug) * 100
                : null;
              const vorabSteuerAnteil = privatJahr.gesamtSteuer > 0
                ? (privatJahr.vorabpauschalesteuer / privatJahr.gesamtSteuer) * 100
                : null;
              const verkaufsSteuerAnteil = privatJahr.gesamtSteuer > 0
                ? (privatJahr.etfVerkaufssteuer / privatJahr.gesamtSteuer) * 100
                : null;
              const steuerQuoteAufEtfVerkauf = privatJahr.etfVerkauf > 0
                ? (privatJahr.gesamtSteuer / privatJahr.etfVerkauf) * 100
                : null;
              const steuerDiff = Math.abs(privatJahr.vorabpauschalesteuer - privatJahr.etfVerkaufssteuer);
              const steuerTreiber = privatJahr.gesamtSteuer <= 0
                ? "keine Steuer"
                : steuerDiff < STEUER_EQUALITY_THRESHOLD
                  ? "beide gleich hoch"
                  : privatJahr.vorabpauschalesteuer > privatJahr.etfVerkaufssteuer
                    ? "Vorabpauschale"
                    : "ETF-Verkaufssteuer";
              return (
                <details key={privatJahr.jahr} className="rounded-md border border-slate-200 bg-slate-50 p-2" open={index === 0}>
                  <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">Jahr {privatJahr.jahr}</span>
                    <span className={`text-xs font-semibold ${jahrDifferenz !== null && jahrDifferenz >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {jahrDifferenz === null ? "Differenz: —" : `Differenz: ${formatEuroDelta(jahrDifferenz)}`}
                    </span>
                  </summary>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      <li><span className="font-medium">Cash-Zuschuss:</span> {formatEuro(privatJahr.jaehrlicherCashZuschuss)}</li>
                      <li><span className="font-medium">Darlehens-Zuschuss:</span> {formatEuro(privatJahr.darlehensZuschussJaehrlich)}</li>
                      <li><span className="font-medium">Gewinn netto (ESt/Soli):</span> {formatEuro(privatJahr.simulierterGewinnNetto)}</li>
                      <li><span className="font-medium">Konsumwert (Abzug):</span> - {formatEuro(privatJahr.konsumNutzenwert)}</li>
                      <li><span className="font-medium">Sparplan vor Konsumabzug:</span> {formatEuro(sparplanVorAbzug)}</li>
                      <li><span className="font-medium">Konsumabzug in %:</span> {konsumAbzugQuote === null ? "—" : formatPercentSigned(konsumAbzugQuote)}</li>
                      <li><span className="font-medium">Sparplan netto:</span> {formatEuro(privatJahr.sparplanNetto)}</li>
                    </ul>
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      <li><span className="font-medium">Entnahme GF-Gehalt:</span> {formatEuro(privatJahr.gehaltsEntnahme)}</li>
                      <li><span className="font-medium">Entnahme Zinsen:</span> {formatEuro(privatJahr.zinsEntnahme)}</li>
                      <li><span className="font-medium">Entnahme Sparplan-Defizit:</span> {formatEuro(privatJahr.entnahmeAusSparplanDefizit)}</li>
                      <li><span className="font-medium">Entnahme stiller Gesellschafter:</span> {formatEuro(privatJahr.stillerGesellschafterEntnahme)}</li>
                      <li><span className="font-medium">Entnahmen vor Steuer:</span> {formatEuro(privatJahr.entnahmenVorSteuern)}</li>
                      <li><span className="font-medium">ETF-Verkauf:</span> {formatEuro(privatJahr.etfVerkauf)}</li>
                    </ul>
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      <li><span className="font-medium">Vorabpauschale-Steuer:</span> {formatEuro(privatJahr.vorabpauschalesteuer)}</li>
                      <li><span className="font-medium">ETF-Verkaufssteuer:</span> {formatEuro(privatJahr.etfVerkaufssteuer)}</li>
                      <li><span className="font-medium">Steuern gesamt:</span> {formatEuro(privatJahr.gesamtSteuer)}</li>
                      <li><span className="font-medium">Anteil Vorabpauschale:</span> {vorabSteuerAnteil === null ? "—" : formatPercentSigned(vorabSteuerAnteil)}</li>
                      <li><span className="font-medium">Anteil ETF-Verkaufssteuer:</span> {verkaufsSteuerAnteil === null ? "—" : formatPercentSigned(verkaufsSteuerAnteil)}</li>
                      <li><span className="font-medium">Steuerquote auf ETF-Verkauf:</span> {steuerQuoteAufEtfVerkauf === null ? "—" : formatPercentSigned(steuerQuoteAufEtfVerkauf)}</li>
                      <li><span className="font-medium">Haupttreiber Steuer:</span> {steuerTreiber}</li>
                    </ul>
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      <li><span className="font-medium">Gesamtwert Privat inkl. Konsum:</span> {formatEuro(privatJahr.gesamtwertMitKonsum)}</li>
                      <li><span className="font-medium">Gesamtwert GmbH inkl. Konsum:</span> {gmbhJahr ? formatEuro(gmbhJahr.gesamtwertMitKonsum) : "—"}</li>
                      <li className={jahrDifferenz !== null && jahrDifferenz >= 0 ? "text-green-700" : "text-red-700"}>
                        <span className="font-medium">Differenz (GmbH - Privat):</span> {jahrDifferenz === null ? "—" : formatEuroDelta(jahrDifferenz)}
                      </li>
                      <li className={jahrDifferenzProzent !== null && jahrDifferenzProzent >= 0 ? "text-green-700" : "text-red-700"}>
                        <span className="font-medium">Differenz in %:</span> {jahrDifferenzProzent === null ? "—" : formatPercentSigned(jahrDifferenzProzent)}
                      </li>
                    </ul>
                  </div>
                </details>
              );
            })}
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
        <div className="mx-auto max-w-4xl px-4 py-3 space-y-2">
          <div>
            <p className="text-xs text-slate-600">Betriebsphase</p>
            <p className={`text-sm font-bold ${differenzVergleich >= 0 ? "text-green-800" : "text-orange-800"}`}>
              {Math.abs(differenzVergleich).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € mehr in {overlayGewinner}
            </p>
            <p className="text-xs text-slate-700">{overlayProzent}</p>
          </div>
          <div className="border-t border-slate-200 pt-2">
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
