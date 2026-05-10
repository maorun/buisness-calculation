"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { JahresUebersicht } from "./JahresUebersicht";
import { berechneNettoGehalt, berechneGewinnausschuettungsteuer } from "@/lib/calculations/ende";
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
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function EndeSection() {
  const { ende, setEnde, betrieb, getEndeErgebnisse } = useCalculatorStore();
  const ergebnisse = getEndeErgebnisse();
  const handyAnschaffung = HANDY_ANSCHAFFUNGSKOSTEN.toLocaleString("de-DE");
  const handyZyklus = HANDY_ERSATZZYKLUS_JAHRE;
  const handyVerkaufsquote = (HANDY_VERKAUFSQUOTE * 100).toLocaleString("de-DE");

  const nettoGehalt = berechneNettoGehalt(ende.geschaeftsfuehrergehalt);
  const { steuer: ausschuettungsteuer, methode } = berechneGewinnausschuettungsteuer(ende.gewinnausschuettung);
  const darlehenZinsen = ende.darlehenZinsen ?? 0;
  const darlehenZinsenSteuer = darlehenZinsen * 0.25 * 1.055;
  const benefitsSteuerersparnis = berechneBenefitsSteuerersparnis(betrieb.benefits);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Ende / Auszahlungsphase</h2>
        <p className="text-sm text-gray-500">Gehalt, Zinsen, Ausschüttungen und Gesamtergebnis</p>
      </div>

      {/* GF Salary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Geschäftsführergehalt</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Brutto-Jahresgehalt (€)"
            value={ende.geschaeftsfuehrergehalt}
            onChange={(v) => setEnde({ geschaeftsfuehrergehalt: parseFloat(v) || 0 })}
            suffix="€/Jahr"
            hint="Angemessenes GF-Gehalt (Fremdvergleich)"
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

      {/* Darlehen Zinsen */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Darlehen-Zinserträge</h3>
        <p className="text-xs text-gray-400 mb-4">
          Zinsen, die die GmbH auf das Gesellschafter-Darlehen zahlt (Kapitalertrag, 26,375% Abgeltungssteuer)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Jährliche Zinserträge (€)"
            value={darlehenZinsen}
            onChange={(v) => setEnde({ darlehenZinsen: parseFloat(v) || 0 })}
            suffix="€/Jahr"
            hint={`Entspricht dem Betrag aus Betrieb: ${betrieb.darlehen.betrag.toLocaleString("de-DE")} € × ${betrieb.darlehen.zinssatz}%`}
          />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 font-medium">Netto-Zinsertrag</p>
            <p className="text-lg font-bold text-amber-900">
              {(darlehenZinsen - darlehenZinsenSteuer).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/Jahr
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Abgeltungssteuer: {darlehenZinsenSteuer.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </div>
        </div>
      </div>

      {/* Profit distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Gewinnausschüttung</h3>
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

      {/* Benefits overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-2">Benefits & Firmenhandy</h3>
        <p className="text-xs text-gray-400 mb-4">
          Konfiguriert im Betrieb-Bereich – reduzieren auch in der Auszahlungsphase die Steuerlast
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">📱 Firmenhandy</p>
            <p className="font-bold text-gray-800">{handyAnschaffung} € alle {handyZyklus} Jahre</p>
            <p className="text-xs text-gray-500 mt-1">{handyVerkaufsquote}% Verkaufserlös</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">⛽ Tankgutschein</p>
            <p className="font-bold text-gray-800">{betrieb.benefits.tankgutschein} €/Monat</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">🍽️ Strategieessen</p>
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

      {/* Duration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Zeitraum</h3>
        <div className="max-w-xs">
          <InputField
            label="Laufzeit Auszahlungsphase (Jahre)"
            value={ende.laufzeitJahre}
            onChange={(v) => setEnde({ laufzeitJahre: parseInt(v) || 1 })}
            suffix="Jahre"
          />
        </div>
      </div>

      {/* Tax info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">📊 Steuerinfo Auszahlungsphase</p>
        <div className="text-xs text-gray-600 space-y-1">
          <p><span className="font-medium">GF-Gehalt:</span> progressive Einkommensteuer (14%–45%) + ggf. SolZ</p>
          <p><span className="font-medium">Darlehenszinsen:</span> 26,375% Abgeltungssteuer (Kapitalertrag)</p>
          <p><span className="font-medium">Abgeltungsteuer:</span> 25% + 5,5% SolZ = 26,375% (flat)</p>
          <p><span className="font-medium">Teileinkünfteverfahren:</span> 60% des Betrags × persönlicher Steuersatz</p>
          <p className="text-gray-400 mt-1">Das günstigere Verfahren wird automatisch gewählt.</p>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <JahresUebersicht ergebnisse={ergebnisse} title="Jahresergebnisse Auszahlungsphase" />
      </div>
    </div>
  );
}
