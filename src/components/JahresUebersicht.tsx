"use client";

import React from "react";
import { JahresErgebnis } from "@/lib/types";

interface JahresUebersichtProps {
  ergebnisse: JahresErgebnis[];
  title?: string;
}

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const DETAIL_LABELS: Record<string, string> = {
  etfWert: "ETF-Wert",
  etfGewinn: "ETF-Gewinn",
  vorabpauschale: "Vorabpauschale",
  vorabpauschalesteuer: "Steuer auf Vorabpauschale",
  jaehrlicheKosten: "Betriebskosten",
  jaehrlicheZinsen: "Darlehenszinsen (GmbH-Ausgabe)",
  gmbhSteuer: "GmbH-Steuern (KSt+GewSt)",
  benefitSteuerersparnis: "Steuerersparnis Benefits",
  offenesDarlehen: "Offenes Darlehen",
  bruttoGehalt: "Brutto-Gehalt",
  nettoGehalt: "Netto-Gehalt",
  einkommensteuer: "Einkommensteuer",
  soli: "Solidaritätszuschlag",
  darlehenZinsen: "Zinserträge aus Darlehen (brutto)",
  darlehenZinsenSteuer: "Abgeltungssteuer auf Zinsen",
  darlehenZinsenNetto: "Zinserträge (netto)",
  gewinnausschuettung: "Gewinnausschüttung (brutto)",
  nettoAusschuettung: "Netto-Ausschüttung",
  kstSteuer: "Körperschaftsteuer",
  ausschuettungsteuer: "Steuer auf Ausschüttung",
};

export function JahresUebersicht({ ergebnisse, title }: JahresUebersichtProps) {
  const [expandedJahr, setExpandedJahr] = React.useState<number | null>(null);

  if (ergebnisse.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-8">
        Keine Daten vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-slate-600">
              <th className="pb-2 font-medium">Jahr</th>
              <th className="pb-2 font-medium text-right">Gewinn (vor St.)</th>
              <th className="pb-2 font-medium text-right">Steuern</th>
              <th className="pb-2 font-medium text-right">Netto-Gewinn</th>
              <th className="pb-2 font-medium text-right">Gesamtvermögen</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ergebnisse.map((e) => (
              <React.Fragment key={e.jahr}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedJahr(expandedJahr === e.jahr ? null : e.jahr)}
                >
                  <td className="py-2 font-medium text-gray-700">Jahr {e.jahr}</td>
                  <td className="py-2 text-right text-gray-800">{formatEuro(e.gewinn)}</td>
                  <td className="py-2 text-right text-red-600">{formatEuro(e.steuer)}</td>
                  <td className="py-2 text-right text-green-700 font-medium">{formatEuro(e.nettogewinn)}</td>
                  <td className="py-2 text-right font-bold text-blue-700">{formatEuro(e.gesamtvermoegen)}</td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 hover:text-slate-800"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedJahr(expandedJahr === e.jahr ? null : e.jahr);
                      }}
                    >
                      {expandedJahr === e.jahr ? "Schließen" : "Details"}
                    </button>
                  </td>
                </tr>
                {expandedJahr === e.jahr && (
                  <tr>
                    <td colSpan={6} className="pb-3 pt-1">
                      <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                        <p className="font-semibold text-gray-600 mb-2">Details Jahr {e.jahr}</p>
                        {Object.entries(e.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-gray-600">
                            <span>{DETAIL_LABELS[key] ?? key}</span>
                            <span className="font-medium">{formatEuro(value)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
