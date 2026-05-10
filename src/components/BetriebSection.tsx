"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { HANDY_ANSCHAFFUNGSKOSTEN, HANDY_ERSATZZYKLUS_JAHRE, HANDY_VERKAUFSQUOTE } from "@/lib/calculations/betrieb";
import { KostenListe } from "./KostenListe";
import { JahresUebersicht } from "./JahresUebersicht";

const BENEFIT_MAX_VALUES = {
  tankgutschein: 50,
} as const;

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

export function BetriebSection() {
  const { betrieb, setBetrieb, addBetriebskosten, updateBetriebskosten, removeBetriebskosten, getBetriebsErgebnisse } =
    useCalculatorStore();
  const handyAnschaffung = HANDY_ANSCHAFFUNGSKOSTEN.toLocaleString("de-DE");
  const handyZyklus = HANDY_ERSATZZYKLUS_JAHRE;
  const handyVerkaufsquote = (HANDY_VERKAUFSQUOTE * 100).toLocaleString("de-DE");

  const ergebnisse = getBetriebsErgebnisse();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Betrieb</h2>
        <p className="text-sm text-slate-600">Operative Phase der GmbH mit ETF-Investment</p>
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
            hint="Startkapital der GmbH für ETF-Investment"
          />
          <InputField
            label="ETF-Rendite (% p.a.)"
            value={betrieb.etfRendite}
            onChange={(v) => setBetrieb({ etfRendite: parseFloat(v) || 0 })}
            suffix="% p.a."
            hint="Durchschnittliche jährliche ETF-Rendite"
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
            hint="Erhöht das offene Darlehen monatlich (Standard: 100 €)"
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

      {/* Operating costs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-1">Laufende Betriebskosten (jährlich)</h3>
        <p className="text-xs text-gray-400 mb-4">
          Alle Positionen reduzieren den steuerpflichtigen Gewinn direkt. Das Firmenhandy
          ({handyAnschaffung} € alle {handyZyklus} Jahre, abzüglich {handyVerkaufsquote}% Verkaufserlös)
          wird automatisch als Betriebsausgabe berücksichtigt.
        </p>
        <KostenListe
          kosten={betrieb.kosten}
          onAdd={addBetriebskosten}
          onUpdate={updateBetriebskosten}
          onRemove={removeBetriebskosten}
          showPeriode
        />
      </div>

      {/* Tax info box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-700 mb-2">📊 Steuerparameter (GmbH) – Steuern ans Finanzamt</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
          <div><span className="font-medium">KSt:</span> 15,00%</div>
          <div><span className="font-medium">KSt + SolZ:</span> 15,825%</div>
          <div><span className="font-medium">GewSt:</span> ~14,00%</div>
          <div><span className="font-medium">Gesamt GmbH:</span> ~29,825%</div>
          <div><span className="font-medium">Abgeltungsteuer:</span> 25%</div>
          <div><span className="font-medium">Abg. + SolZ:</span> 26,375%</div>
          <div><span className="font-medium">Basiszins 2024:</span> 2,29%</div>
          <div><span className="font-medium">Teilfreistellung:</span> 30%</div>
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
