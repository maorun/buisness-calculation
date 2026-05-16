"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import {
  TEILFREISTELLUNG_AKTIEN_GMBH,
  DEFAULT_FIRMENHANDY_CONFIG,
  DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB,
  DEFAULT_GF_GEHALT_BETRIEB,
  DEFAULT_JOBBER_GEHALT_BETRIEB,
  MAX_JOBBER_GEHALT,
  berechneJobberSozialabgaben,
} from "@/lib/calculations/betrieb";
import { KostenListe } from "./KostenListe";
import { JahresUebersicht } from "./JahresUebersicht";

const BENEFIT_MAX_VALUES = {
  tankgutschein: 50,
} as const;
const DEFAULT_JAEHRLICHER_CASH_ZUSCHUSS = 2400;

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
  const erstesJahrDetails = ergebnisse[0]?.details;
  const nettovermoegenStart = Math.max(0, betrieb.startkapital);
  const erstesJahrNettovermoegen = erstesJahrDetails?.nettovermoegen ?? nettovermoegenStart;
  const zielnettoInsgesamt = Math.max(
    0,
    betrieb.zielnettoGesellschafter ?? DEFAULT_ZIELNETTO_GESELLSCHAFTER_BETRIEB
  );
  const geschaeftsfuehrergehalt = erstesJahrDetails?.geschaeftsfuehrergehalt ?? 0;
  const jobberGehalt = erstesJahrDetails?.jobberGehalt ?? 0;
  const jobberAgSozialabgaben = erstesJahrDetails?.jobberAgSozialabgaben ?? 0;
  const jobberAgGesamtkosten = erstesJahrDetails?.jobberAgGesamtkosten ?? 0;
  const jobberSVDetails = berechneJobberSozialabgaben(Math.max(0, betrieb.jobberGehalt ?? DEFAULT_JOBBER_GEHALT_BETRIEB));
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

  const firmenhandy = betrieb.firmenhandy ?? DEFAULT_FIRMENHANDY_CONFIG;

  return (
    <div className="space-y-6">
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
          Für den Zielabgleich zählen Netto-Darlehenszinsen plus Netto-GF-Gehalt plus Netto-Jobber-Gehalt. Beide Gehälter wirken als Betriebskosten in der GmbH.
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
          <SliderField
            label="Jobber-Gehalt (brutto, €/Jahr)"
            value={Math.max(0, betrieb.jobberGehalt ?? DEFAULT_JOBBER_GEHALT_BETRIEB)}
            onChange={(v) => setBetrieb({ jobberGehalt: v })}
            max={MAX_JOBBER_GEHALT}
            hint={`Wird als Betriebskosten angesetzt und im Zielabgleich berücksichtigt (Default: ${DEFAULT_JOBBER_GEHALT_BETRIEB.toLocaleString("de-DE")} €, Max: ${MAX_JOBBER_GEHALT.toLocaleString("de-DE")} €)`}
          />
        </div>

        {/* Jobber Sozialabgaben Breakdown */}
        {(betrieb.jobberGehalt ?? DEFAULT_JOBBER_GEHALT_BETRIEB) > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 mt-4">
            <p className="text-xs font-semibold text-blue-800 mb-2">
              👷 Jobber Sozialabgaben 2024 – Beschäftigungsart:{" "}
              <span className="uppercase">
                {jobberSVDetails.typ === "mini" ? "Mini-Job (≤ 556 €/Monat)" : jobberSVDetails.typ === "midi" ? "Midi-Job / Übergangsbereich" : "Normalbeschäftigung"}
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* AG-Seite */}
              <div className="space-y-1 text-slate-700">
                <p className="font-semibold text-slate-800">AG-Kosten (GmbH)</p>
                <p>Brutto-Gehalt: <span className="font-semibold">{jobberSVDetails.bruttoJahresgehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">+ RV-Anteil AG ({jobberSVDetails.typ === "mini" ? "15,0 % Pausch." : "9,3 %"}): <span className="font-semibold text-red-700">{jobberSVDetails.agRV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">+ KV-Anteil AG ({jobberSVDetails.typ === "mini" ? "13,0 % Pausch." : "8,15 %"}): <span className="font-semibold text-red-700">{jobberSVDetails.agKV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                {jobberSVDetails.agPV > 0 && (
                  <p className="pl-2 text-slate-600">+ PV-Anteil AG (1,7 %): <span className="font-semibold text-red-700">{jobberSVDetails.agPV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                )}
                {jobberSVDetails.agAV > 0 && (
                  <p className="pl-2 text-slate-600">+ AV-Anteil AG (1,3 %): <span className="font-semibold text-red-700">{jobberSVDetails.agAV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                )}
                <p className="pl-2 text-slate-600">+ UV AG (~1,3 % Schätzw.): <span className="font-semibold text-red-700">{jobberSVDetails.agUV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">+ Umlagen AG (~2,1 % Schätzw.): <span className="font-semibold text-red-700">{jobberSVDetails.agUmlage.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="font-semibold text-slate-800 border-t border-blue-200 pt-1">
                  = AG-Gesamtkosten: <span className="text-red-800">{jobberSVDetails.agGesamtkostenBrutto.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                </p>
                <p className="text-slate-500">davon SV-Aufwand AG: <span className="font-semibold text-red-700">{jobberAgSozialabgaben.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              </div>
              {/* AN-Seite */}
              <div className="space-y-1 text-slate-700">
                <p className="font-semibold text-slate-800">AN-Seite (Jobber)</p>
                <p>Brutto-Gehalt: <span className="font-semibold">{jobberSVDetails.bruttoJahresgehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">− RV-Anteil AN (9,3 %): <span className="font-semibold text-red-700">{jobberSVDetails.anRV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">− KV-Anteil AN (8,15 %): <span className="font-semibold text-red-700">{jobberSVDetails.anKV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">− PV-Anteil AN (1,7 %): <span className="font-semibold text-red-700">{jobberSVDetails.anPV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="pl-2 text-slate-600">− AV-Anteil AN (1,3 %): <span className="font-semibold text-red-700">{jobberSVDetails.anAV.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
                <p className="font-semibold text-slate-800 border-t border-blue-200 pt-1">
                  = Netto vor ESt: <span className="text-green-700">{jobberSVDetails.anNettoVorSteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                </p>
                {jobberSVDetails.typ === "mini" && (
                  <p className="text-slate-500 italic">Mini-Job: AN zahlt keine Pflicht-SV-Beiträge. Freiwilliger RV-Beitrag möglich.</p>
                )}
                {jobberSVDetails.typ === "midi" && (
                  <p className="text-slate-500 italic">Midi-Job: AN-Beitrag steigt gleitend mit dem Gehalt (vereinfacht linear).</p>
                )}
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-2 font-medium">
              ℹ️ GmbH-Betriebsausgabe Jobber gesamt: <span className="font-bold">{jobberAgGesamtkosten.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr</span>
              {" "}(Brutto + AG-Sozialabgaben)
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Schätzwerte: UV und Umlagen variieren je nach Berufsgenossenschaft und Krankenkasse. KV-Zusatzbeitrag: Ø 1,7 % (2024). Beitragsbemessungsgrenzen West 2024: KV 62.100 €, RV 90.600 €.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">Zielabgleich (Jahr 1)</p>
            <div className="mt-2 space-y-1 text-xs text-slate-700">
              <p>GF-Gehalt brutto: <span className="font-semibold">{geschaeftsfuehrergehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Jobber-Gehalt brutto: <span className="font-semibold">{jobberGehalt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Gehälter gesamt brutto: <span className="font-semibold">{gehaelterGesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
              <p>Gesamteinkommen (GF + Jobber + Zinsen): <span className="font-semibold">{gesellschafterBruttoEinkommen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
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
          Zusätzlich fallen Abgeltungssteuer auf die Vorabpauschale und auf realisierte ETF-Verkaufsgewinne an.
        </p>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <JahresUebersicht ergebnisse={ergebnisse} title="Jahresergebnisse Betriebsphase" />
      </div>
    </div>
  );
}
