"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { JahresUebersicht } from "./JahresUebersicht";
import {
  berechneNettoGehalt,
  berechneGewinnausschuettungsteuer,
  berechneDarlehensAuszahlung,
  berechneDarlehensZinsenSteuer,
  DEFAULT_ZIELNETTO_BEREICH1,
  MIDIJOB_JAHR_MAX,
  REINVESTIERTES_DARLEHEN_ZINSSATZ,
} from "@/lib/calculations/ende";
import {
  berechneBenefitsSteuerersparnis,
  HANDY_ANSCHAFFUNGSKOSTEN,
  HANDY_ERSATZZYKLUS_JAHRE,
  HANDY_VERKAUFSQUOTE,
} from "@/lib/calculations/betrieb";

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

const MIDIJOB_MONAT_MIN = 556;
const MIDIJOB_JAHR_MIN = MIDIJOB_MONAT_MIN * 12;
const MIDIJOB_HINT = `Midijob-Bereich: ${MIDIJOB_JAHR_MIN.toLocaleString("de-DE")} € bis ${MIDIJOB_JAHR_MAX.toLocaleString("de-DE")} € pro Jahr`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function EndeSection() {
  const { ende, setEnde, betrieb, getEndeErgebnisse, getBetriebsErgebnisse } = useCalculatorStore();
  const ergebnisse = getEndeErgebnisse();
  const betriebsErgebnisse = getBetriebsErgebnisse();
  const letzterBetriebsstand = betriebsErgebnisse.length > 0
    ? betriebsErgebnisse[betriebsErgebnisse.length - 1]
    : undefined;
  const offeneDarlehensschuld = letzterBetriebsstand?.details.offenesDarlehen
    ?? Math.max(0, betrieb.darlehen.betrag);
  const aufgelaufeneZinsen = letzterBetriebsstand?.details.aufgelaufeneZinsen ?? 0;
  const endfaellig = betrieb.darlehen.endfaellig;

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
  const handyAnschaffung = HANDY_ANSCHAFFUNGSKOSTEN.toLocaleString("de-DE");
  const handyZyklus = HANDY_ERSATZZYKLUS_JAHRE;
  const handyVerkaufsquote = (HANDY_VERKAUFSQUOTE * 100).toLocaleString("de-DE");

  const nettoGehalt = berechneNettoGehalt(ende.geschaeftsfuehrergehalt);
  const { steuer: ausschuettungsteuer, methode } = berechneGewinnausschuettungsteuer(ende.gewinnausschuettung);
  const benefitsSteuerersparnis = berechneBenefitsSteuerersparnis(betrieb.benefits);

  // Split ergebnisse for display
  const bereich1Ergebnisse = ergebnisse.filter((e) => e.details.bereich === 1);
  const bereich2Ergebnisse = ergebnisse.filter((e) => e.details.bereich === 2);
  const bereich1Details = bereich1Ergebnisse[0]?.details;
  const bereich2Details = bereich2Ergebnisse[0]?.details;

  const gehaltBereich1Auto = bereich1Details?.bruttoGehalt ?? Math.max(0, MIDIJOB_JAHR_MAX - aufgelaufeneZinsen);
  const nettoGehaltBereich1 = bereich1Details?.nettoGehalt ?? berechneNettoGehalt(gehaltBereich1Auto);
  const zinsSteuerBereich1 = bereich1Details?.zinsSteuerBereich1
    ?? berechneDarlehensZinsenSteuer(aufgelaufeneZinsen, gehaltBereich1Auto);
  const zinsenNettoBereich1 = bereich1Details?.zinsenNettoBereich1 ?? (aufgelaufeneZinsen - zinsSteuerBereich1);
  const darlehenNettoAuszahlungBereich1 = bereich1Details?.darlehenNettoAuszahlung
    ?? (offeneDarlehensschuld + zinsenNettoBereich1);
  const einkommensteuerBereich1 = bereich1Details?.einkommensteuer ?? 0;
  const soliBereich1 = bereich1Details?.soli ?? 0;
  const konsumierbaresBereich1 = bereich1Details?.konsumierbaresNettoBereich1 ?? nettoGehaltBereich1;
  const gesamtSteuerBereich1 = bereich1Ergebnisse[0]?.steuer ?? (zinsSteuerBereich1 + einkommensteuerBereich1 + soliBereich1);
  const neuesDarlehenBereich1 = bereich1Details?.neuesDarlehenStart ?? darlehenNettoAuszahlungBereich1;

  const bereich2DarlehenZinsen = bereich2Details?.darlehenZinsen ?? 0;
  const bereich2DarlehenZinsenSteuer = bereich2Details?.darlehenZinsenSteuer ?? 0;
  const bereich2DarlehenZinsenNetto = bereich2Details?.darlehenZinsenNetto ?? 0;
  const bereich2AutoGehalt = bereich2Details?.bruttoGehalt ?? 0;
  const bereich2NettoGehalt = bereich2Details?.nettoGehalt ?? 0;
  const bereich2FlexibleTilgung = bereich2Details?.darlehenTilgung ?? 0;
  const bereich2KonsumVorTilgung = bereich2Details?.konsumVorTilgung ?? (bereich2NettoGehalt + bereich2DarlehenZinsenNetto);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Ende / Auszahlungsphase</h2>
        <p className="text-sm text-slate-600">Gehalt im Midijob-Bereich, Darlehensauszahlung, Ausschüttungen und Gesamtergebnis</p>
      </div>

      {/* Endfällig notice */}
      {endfaellig && (
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

      {endfaellig && (
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
              Laufende Zinsphase des neuen Gesellschafterdarlehens mit Midijob-Auffüllung und
              flexibler Tilgung nur bei Zielnetto-Lücke.
            </p>
          </div>
        </div>
      )}

      {/* Bereich 1 – only shown when endfaellig */}
      {endfaellig && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-amber-300 p-4 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-600 mb-2">Ebene 1</p>
          <h3 className="font-semibold text-amber-800 mb-1">Bereich 1 – Rückzahlung & Neustart Gesellschafterdarlehen</h3>
          <p className="text-xs text-slate-500 mb-4">
            Die GmbH zahlt das bisherige Gesellschafterdarlehen steuerfrei zurück. Die aufgelaufenen Zinsen
            werden mit Einkommensteuer belastet und das Gehalt wird automatisch nur so weit ergänzt,
            dass aufgelaufene Zinsen plus Gehalt zusammen die Midijob-Grenze nicht überschreiten. Aus
            Darlehensrückzahlung plus Zinsen nach Steuern entsteht anschließend das neue
            Gesellschafterdarlehen für Bereich 2.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-4">
              <InputField
                label="Zielnetto Bereich 1 (€/Jahr)"
                value={ende.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1}
                onChange={(v) => setEnde({ zielnettoBereich1: Math.max(0, parseFloat(v) || 0) })}
                suffix="€/Jahr"
                hint={`Angestrebtes Netto des Gesellschafters zur freien Verfügung für das Abrechnungsjahr - ohne das in Bereich 2 reinvestierte Darlehen (default ${DEFAULT_ZIELNETTO_BEREICH1.toLocaleString("de-DE")} €)`}
                min={0}
              />
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-600 font-medium">Automatisches GF-Gehalt Bereich 1</p>
                <p className="text-lg font-bold text-slate-800">
                  {gehaltBereich1Auto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Aufgelaufene Zinsen + Gehalt werden auf maximal {MIDIJOB_JAHR_MAX.toLocaleString("de-DE")} € begrenzt.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-xs text-amber-700 font-medium">Gesellschafter Bereich-1 Übersicht</p>
              <p className="text-xs text-amber-700 border-b border-amber-200 pb-1 mb-1 font-medium">Einnahmen</p>
              <p className="text-xs text-amber-700">Darlehensrückzahlung (wird reinvestiert): <span className="font-semibold text-blue-700">+ {offeneDarlehensschuld.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Zinsen brutto (später reinvestiert): <span className="font-semibold">+ {aufgelaufeneZinsen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Auto-GF-Gehalt brutto: <span className="font-semibold">+ {gehaltBereich1Auto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700 border-b border-amber-200 pb-1 mb-1 font-medium mt-2">Steuern (Gesamtlast)</p>
              <p className="text-xs text-amber-700">Einkommensteuer auf Zinsen (progressiv): <span className="font-semibold text-red-700">− {zinsSteuerBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Einkommensteuer + SolZ Gehalt: <span className="font-semibold text-red-700">− {(einkommensteuerBereich1 + soliBereich1).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs font-semibold text-amber-800">Steuern gesamt: <span className="text-red-700">− {gesamtSteuerBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-xs text-amber-700">Neues Gesellschafterdarlehen für Bereich 2 (bleibt in der GmbH): <span className="font-semibold text-blue-700">+ {neuesDarlehenBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p className="text-sm font-bold text-amber-900 border-t border-amber-300 pt-1 mt-1">
                Frei verfügbares Netto Gesellschafter: {konsumierbaresBereich1.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                {" "}
                <span className={konsumierbaresBereich1 >= (ende.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1) ? "text-green-700" : "text-red-700"}>
                  ({konsumierbaresBereich1 >= (ende.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1) ? "≥" : "<"} Zielnetto {(ende.zielnettoBereich1 ?? DEFAULT_ZIELNETTO_BEREICH1).toLocaleString("de-DE")} €)
                </span>
              </p>
              <p className="text-xs text-amber-600">
                Für das Zielnetto zählt nur das frei verfügbare Netto. Das neue Gesellschafterdarlehen bleibt als Vermögenswert in der GmbH gebunden.
              </p>
            </div>
          </div>
          {bereich1Ergebnisse.length > 0 && (
            <JahresUebersicht ergebnisse={bereich1Ergebnisse} title="Bereich 1 – Gesellschafterzufluss, GmbH-GuV und GmbH-Bilanz" />
          )}
        </div>
      )}

      {/* Bereich 2 – regular payout */}
      <div className={`bg-white rounded-xl shadow-sm p-4 md:p-6 ${endfaellig ? "border-2 border-blue-300" : "border border-gray-200"}`}>
        {endfaellig && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 mb-2">Ebene 2</p>
        )}
        <h3 className="font-semibold text-gray-700 mb-1">{endfaellig ? "Bereich 2 – Laufende Auszahlungsphase" : "Auszahlungsphase"}</h3>
        {endfaellig && (
          <p className="text-xs text-slate-500 mb-4">
            Das neue Gesellschafterdarlehen aus Bereich 1 bleibt in der GmbH, verzinst sich mit {REINVESTIERTES_DARLEHEN_ZINSSATZ.toLocaleString("de-DE")} %
            und wird nur soweit getilgt, wie das Zielnetto sonst nicht erreicht würde.
          </p>
        )}

        {/* Zielnetto Bereich 2 */}
        {endfaellig && (
          <div className="mb-4 max-w-xs">
            <InputField
              label="Zielnetto Bereich 2 (€/Jahr)"
              value={ende.zielnettoBereich2 ?? 0}
              onChange={(v) => setEnde({ zielnettoBereich2: Math.max(0, parseFloat(v) || 0) })}
              suffix="€/Jahr"
              hint="Angestrebtes Netto-Jahreseinkommen für die laufende Auszahlungsphase"
              min={0}
            />
          </div>
        )}

        {/* GF Salary */}
        {!endfaellig && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-600 mb-3">Geschäftsführergehalt</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Brutto-Jahresgehalt (€)"
                value={ende.geschaeftsfuehrergehalt}
                onChange={(v) => {
                  const parsed = parseFloat(v);
                  const normalized = Number.isFinite(parsed) ? parsed : ende.geschaeftsfuehrergehalt;
                  setEnde({ geschaeftsfuehrergehalt: clamp(normalized, MIDIJOB_JAHR_MIN, MIDIJOB_JAHR_MAX) });
                }}
                suffix="€/Jahr"
                hint={MIDIJOB_HINT}
                min={MIDIJOB_JAHR_MIN}
                max={MIDIJOB_JAHR_MAX}
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
        )}

        {endfaellig && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-600 mb-3">Automatik Bereich 2 (erstes Jahr)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Auto-GF-Gehalt bis Midijob-Grenze</p>
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

        {/* Darlehensauszahlung – only relevant when not endfaellig */}
        {!endfaellig && (
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

        {/* Profit distribution */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-600 mb-3">Gewinnausschüttung</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Jährliche Ausschüttung (€)"
              value={ende.gewinnausschuettung}
              onChange={(v) => setEnde({ gewinnausschuettung: parseFloat(v) || 0 })}
              suffix="€/Jahr"
              hint="Gewinn nach GmbH-Steuern"
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
          <h4 className="font-semibold text-gray-600 mb-3">Zeitraum {endfaellig ? "Bereich 2" : ""}</h4>
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
          <JahresUebersicht ergebnisse={bereich2Ergebnisse} title={endfaellig ? "Bereich 2 – Laufende Zins- und Tilgungsphase" : "Jahresergebnisse Auszahlungsphase"} />
        )}
      </div>

      {/* Benefits overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Benefits & Firmenhandy</h3>
        <p className="text-xs text-slate-500 mb-4">
          Konfiguriert im Betrieb-Bereich – reduzieren auch in der Auszahlungsphase die Steuerlast
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-600 mb-1">Firmenhandy</p>
            <p className="font-bold text-gray-800">{handyAnschaffung} € alle {handyZyklus} Jahre</p>
            <p className="text-xs text-slate-600 mt-1">{handyVerkaufsquote}% Verkaufserlös</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-600 mb-1">Tankgutschein</p>
            <p className="font-bold text-gray-800">{betrieb.benefits.tankgutschein} €/Monat</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-600 mb-1">Strategieessen</p>
            <p className="font-bold text-gray-800">{betrieb.benefits.strategieessen} €/Jahr</p>
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
        <p className="text-xs font-semibold text-slate-700 mb-2">Steuerinfo Auszahlungsphase</p>
        <div className="text-xs text-gray-600 space-y-1">
          {endfaellig && <p><span className="font-medium">Bereich 1 – Zinsen:</span> Progressive Einkommensteuer auf Zinsen + Gehalt (kombiniert, § 32d Abs. 2 Nr. 1b EStG)</p>}
          {endfaellig && <p><span className="font-medium">Bereich 1 – Gehalt:</span> Automatisch nur bis zur Midijob-Grenze aufgefüllt, damit die Zinsen die Steuerprogression nicht unnötig erhöhen.</p>}
          {endfaellig && <p><span className="font-medium">Bereich 2 – Darlehen:</span> Neues Gesellschafterdarlehen mit 3 % Zins; Tilgung wird flexibel nur bei Zielnetto-Lücke ausgezahlt.</p>}
          <p><span className="font-medium">GF-Gehalt Bereich 2:</span> progressive Einkommensteuer (14%–45%) + ggf. SolZ{endfaellig ? ", automatisch bis zur Midijob-Grenze ergänzt" : ""}</p>
          <p><span className="font-medium">Darlehen (Zinsen):</span> Progressive Einkommensteuer (Marginalsteuersatz), Tilgungsanteil steuerfrei (§ 32d Abs. 2 Nr. 1b EStG)</p>
          <p><span className="font-medium">Teileinkünfteverfahren:</span> 60% des Betrags × persönlicher Steuersatz</p>
          <p className="text-slate-500 mt-1">Das günstigere Verfahren wird automatisch gewählt. Abgeltungssteuer gilt nur für Gewinnausschüttungen.</p>
        </div>
      </div>
    </div>
  );
}
