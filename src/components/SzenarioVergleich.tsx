"use client";

import React, { useMemo, useState } from "react";
import { formatSignedEuro } from "@/lib/calculations/gesamtvergleich";
import { berechneSzenarioKennzahlen } from "@/lib/calculations/szenarien";
import { useCalculatorStore } from "@/store/calculatorStore";

export function SzenarioVergleich() {
  const [name, setName] = useState("");
  const scenarios = useCalculatorStore((state) => state.scenarios ?? []);
  const saveScenario = useCalculatorStore((state) => state.saveScenario);
  const loadScenario = useCalculatorStore((state) => state.loadScenario);
  const deleteScenario = useCalculatorStore((state) => state.deleteScenario);
  const vergleich = useMemo(
    () => scenarios.map((scenario) => ({ ...scenario, kennzahlen: berechneSzenarioKennzahlen(scenario.state) })),
    [scenarios]
  );
  const maximum = Math.max(1, ...vergleich.map((scenario) => scenario.kennzahlen.endvermoegen));

  const handleSave = () => {
    saveScenario(name);
    setName("");
  };

  return (
    <section aria-label="Szenariovergleich" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Szenariovergleich</p>
        <h2 className="text-lg font-bold text-slate-900">Baseline, konservativ, optimistisch</h2>
        <p className="mt-1 text-sm text-slate-600">Speichere Varianten und vergleiche Endvermögen, Steuerlast und Cashflow nachvollziehbar.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          aria-label="Name des Szenarios"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Holding mit Reinvestition"
          className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Aktuelles Szenario speichern
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {vergleich.map((scenario) => (
          <article key={scenario.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{scenario.name}</h3>
                <p className="text-xs text-slate-500">{scenario.beschreibung ?? "Gespeicherte Parameter"}</p>
              </div>
              <button type="button" onClick={() => deleteScenario(scenario.id)} aria-label={`${scenario.name} löschen`} className="text-xs text-red-700">
                Löschen
              </button>
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Endvermögen</dt><dd className="font-semibold">{formatSignedEuro(scenario.kennzahlen.endvermoegen)}</dd></div>
              <div className="flex justify-between"><dt>Steuerlast</dt><dd>{formatSignedEuro(scenario.kennzahlen.steuerlast)}</dd></div>
              <div className="flex justify-between"><dt>Ø Cashflow/Jahr</dt><dd>{formatSignedEuro(scenario.kennzahlen.jaehrlicherCashflow)}</dd></div>
            </dl>
            <div className="mt-3 h-2 rounded bg-slate-100" aria-label={`Endvermögen ${scenario.name}`}>
              <div className="h-2 rounded bg-blue-500" style={{ width: `${Math.max(0, (scenario.kennzahlen.endvermoegen / maximum) * 100)}%` }} />
            </div>
            <button type="button" onClick={() => loadScenario(scenario.id)} className="mt-3 text-sm font-semibold text-blue-700">
              Szenario laden
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
