"use client";

import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { KostenListe } from "./KostenListe";
import { berechneGesamtkosten } from "@/lib/calculations/gruendung";

export function GruendungSection() {
  const { gruendung, addGruendungskosten, updateGruendungskosten, removeGruendungskosten } =
    useCalculatorStore();

  const gesamt = berechneGesamtkosten(gruendung.kosten);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Gründung</h2>
        <p className="text-sm text-slate-600">
          Alle einmaligen Kosten für die GmbH-Gründung
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Gründungskosten</h3>
        <KostenListe
          kosten={gruendung.kosten}
          onAdd={addGruendungskosten}
          onUpdate={updateGruendungskosten}
          onRemove={removeGruendungskosten}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Gesamte Gründungskosten</p>
            <p className="text-xs text-blue-500 mt-0.5">
              Inkl. Stammkapital (wird als GmbH-Vermögen gehalten)
            </p>
          </div>
          <p className="text-2xl font-bold text-blue-800">
            {gesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-medium text-amber-800 mb-1">Hinweis</p>
        <p className="text-xs text-amber-700">
          Das Stammkapital von mind. 25.000 € (davon 12.500 € bei Gründung einzuzahlen) verbleibt als
          Vermögen der GmbH und kann investiert werden. Die restlichen Kosten sind einmalige
          Aufwendungen.
        </p>
      </div>
    </div>
  );
}
