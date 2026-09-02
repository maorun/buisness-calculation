"use client";

import { useState } from "react";
import {
  ABGELTUNGSSTEUER_GESAMT,
  ABGELTUNGSSTEUER,
  GEWERBESTEUER,
  GEWERBESTEUER_FREIBETRAG,
  GMBH_STEUER_GESAMT,
  KST,
  KST_GESAMT,
  SOLI,
  TEILFREISTELLUNG_AKTIEN_GMBH,
  TEILFREISTELLUNG_AKTIEN_PRIVAT,
  DEFAULT_SPARERPAUSCHBETRAG,
} from "@/lib/calculations/steuer";
import { STEUERJAHR_PARAMETER } from "@/lib/parameters";
import { useCalculatorStore } from "@/store/calculatorStore";

const percent = (value: number) => `${(value * 100).toLocaleString("de-DE", { maximumFractionDigits: 3 })} %`;
const euro = (value: number) => `${value.toLocaleString("de-DE")} €`;

export function Steuerannahmen() {
  const [open, setOpen] = useState(false);
  const betrieb = useCalculatorStore((state) => state.betrieb);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
      >
        Steuerannahmen
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="steuerannahmen-title"
        >
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="steuerannahmen-title" className="text-base font-semibold text-gray-900">
                  Steuerannahmen und Modellregeln
                </h2>
                <p className="mt-1 text-xs text-slate-600">Stand: 2025/2026 · Änderungen werden je Steuerjahr in den Parametern gepflegt.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-800" aria-label="Schließen">
                ×
              </button>
            </div>

            <section className="mt-5">
              <h3 className="text-sm font-semibold text-slate-800">Steuersätze und Freibeträge</h3>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="inline">Körperschaftsteuer (KSt): </dt><dd className="inline">{percent(KST)}</dd></div>
                <div><dt className="inline">Solidaritätszuschlag (SolZ): </dt><dd className="inline">{percent(SOLI)} auf KSt/ESt</dd></div>
                <div><dt className="inline">KSt inkl. SolZ: </dt><dd className="inline">{percent(KST_GESAMT)}</dd></div>
                <div><dt className="inline">Gewerbesteuer (Hebesatz-Annahme): </dt><dd className="inline">{percent(GEWERBESTEUER)}</dd></div>
                <div><dt className="inline">GmbH-Gesamtbelastung: </dt><dd className="inline">{percent(GMBH_STEUER_GESAMT)}</dd></div>
                <div><dt className="inline">Abgeltungsteuer: </dt><dd className="inline">{percent(ABGELTUNGSSTEUER)}</dd></div>
                <div><dt className="inline">Abgeltungsteuer inkl. SolZ: </dt><dd className="inline">{percent(ABGELTUNGSSTEUER_GESAMT)}</dd></div>
                <div><dt className="inline">Teilfreistellung Aktien-ETF (GmbH): </dt><dd className="inline">{percent(TEILFREISTELLUNG_AKTIEN_GMBH)}</dd></div>
                <div><dt className="inline">Teilfreistellung Aktien-ETF (privat): </dt><dd className="inline">{percent(TEILFREISTELLUNG_AKTIEN_PRIVAT)}</dd></div>
                <div><dt className="inline">Sparer-Pauschbetrag (Standard): </dt><dd className="inline">{euro(DEFAULT_SPARERPAUSCHBETRAG)}</dd></div>
                <div><dt className="inline">GewSt-Freibetrag: </dt><dd className="inline">{euro(GEWERBESTEUER_FREIBETRAG)} (nicht für Kapitalgesellschaften)</dd></div>
              </dl>
            </section>

            <section className="mt-5 rounded-lg bg-slate-50 p-3 text-sm">
              <h3 className="font-semibold text-slate-800">Aktuell konfigurierte Sätze</h3>
              <p className="mt-1 text-slate-600">Diese Werte können im Bereich „Betrieb“ angepasst werden und überschreiben die Standardwerte.</p>
              <p className="mt-2">KSt: {betrieb.koerperschaftsteuerSatz ?? 15} % · SolZ: {betrieb.solidaritaetszuschlagSatz ?? 5.5} % · GewSt: {betrieb.gewerbesteuerSatz ?? 14} % · Kapitalertragsteuer: {betrieb.kapitalertragsteuerSatz ?? 26.375} %</p>
            </section>

            <section className="mt-5">
              <h3 className="text-sm font-semibold text-slate-800">Jahresabhängige Annahmen</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-4">Steuerjahr</th><th className="py-2 pr-4">Basiszins</th><th className="py-2 pr-4">Grundfreibetrag</th><th className="py-2">Soli-Freigrenze (ESt)</th></tr></thead>
                  <tbody>
                    {[2024, 2025, 2026].map((jahr) => {
                      const parameter = STEUERJAHR_PARAMETER[jahr as 2024 | 2025 | 2026];
                      return <tr key={jahr} className="border-b border-slate-100"><td className="py-2 pr-4">{jahr}</td><td className="py-2 pr-4">{percent(parameter.basiszins)}</td><td className="py-2 pr-4">{euro(parameter.grundfreibetrag)}</td><td className="py-2">{euro(parameter.soliFreigrenzeEinkommensteuer)}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-5 text-sm text-slate-700">
              <h3 className="font-semibold text-slate-800">Modellregeln</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Die Gewerbesteuer wird mit einem pauschalen kommunalen Durchschnitt von 14 % modelliert.</li>
                <li>Die Vorabpauschale verwendet 70 % des jeweiligen Basiszinses; negative Werte werden nicht angesetzt.</li>
                <li>ETF-Erträge werden nach Teilfreistellung besteuert; in der GmbH gilt die Körperschafts-Teilfreistellung von 80 %.</li>
                <li>Die Simulation berücksichtigt keine Kirchensteuer, Solidaritätszuschlag-Freigrenzen bei Kapitalerträgen oder individuelle Steuerberatung.</li>
                <li>Steuerjahr 2025 ist voreingestellt; 2025/2026-Werte sind Annahmen und können sich durch Gesetzesänderungen ändern.</li>
              </ul>
            </section>

            <p className="mt-5 text-xs text-slate-500">Quelle/Änderungshistorie: Die im Rechner verwendeten Werte stehen zentral in <code>src/lib/parameters.ts</code> und <code>src/lib/calculations/steuer.ts</code>; neue Steuerjahre werden dort mit eigenen Werten ergänzt.</p>
          </div>
        </div>
      )}
    </>
  );
}
