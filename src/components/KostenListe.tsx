"use client";

import React, { useState } from "react";
import { KostenPosition } from "@/lib/types";

interface KostenListeProps {
  kosten: KostenPosition[];
  onAdd: (position: Omit<KostenPosition, "id">) => void;
  onUpdate: (id: string, position: Partial<KostenPosition>) => void;
  onRemove: (id: string) => void;
  /** Show monthly/yearly period selector (for recurring operating costs). Default: false */
  showPeriode?: boolean;
}

/** Compute annual equivalent for a cost position */
function jahresBetrag(k: KostenPosition): number {
  return k.periode === 'monatlich' ? k.betrag * 12 : k.betrag;
}

export function KostenListe({ kosten, onAdd, onUpdate, onRemove, showPeriode = false }: KostenListeProps) {
  const [neu, setNeu] = useState<{ bezeichnung: string; betrag: number; kategorie: string; periode: 'monatlich' | 'jaehrlich' }>({
    bezeichnung: "",
    betrag: 0,
    kategorie: "",
    periode: 'jaehrlich',
  });
  const [editId, setEditId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!neu.bezeichnung.trim()) return;
    onAdd({
      bezeichnung: neu.bezeichnung,
      betrag: neu.betrag,
      kategorie: neu.kategorie || undefined,
      periode: showPeriode ? neu.periode : undefined,
    });
    setNeu({ bezeichnung: "", betrag: 0, kategorie: "", periode: 'jaehrlich' });
  };

  const total = showPeriode
    ? kosten.reduce((s, k) => s + jahresBetrag(k), 0)
    : kosten.reduce((s, k) => s + k.betrag, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-slate-600">
              <th className="pb-2 font-medium">Bezeichnung</th>
              <th className="pb-2 font-medium">Kategorie</th>
              {showPeriode && <th className="pb-2 font-medium">Periode</th>}
              <th className="pb-2 font-medium text-right">Betrag (€)</th>
              {showPeriode && <th className="pb-2 font-medium text-right">Jährlich (€)</th>}
              <th className="pb-2 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {kosten.map((k) => (
              <tr key={k.id} className="group">
                {editId === k.id ? (
                  <>
                    <td className="py-1 pr-2">
                      <input
                        className="w-full border border-blue-400 rounded px-2 py-1 text-sm"
                        value={k.bezeichnung}
                        onChange={(e) => onUpdate(k.id, { bezeichnung: e.target.value })}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className="w-full border border-blue-400 rounded px-2 py-1 text-sm"
                        value={k.kategorie ?? ""}
                        onChange={(e) => onUpdate(k.id, { kategorie: e.target.value })}
                      />
                    </td>
                    {showPeriode && (
                      <td className="py-1 pr-2">
                        <select
                          className="border border-blue-400 rounded px-2 py-1 text-sm"
                          value={k.periode ?? 'jaehrlich'}
                          onChange={(e) => onUpdate(k.id, { periode: e.target.value as 'monatlich' | 'jaehrlich' })}
                        >
                          <option value="jaehrlich">jährlich</option>
                          <option value="monatlich">monatlich</option>
                        </select>
                      </td>
                    )}
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        className="w-full border border-blue-400 rounded px-2 py-1 text-sm text-right"
                        value={k.betrag}
                        onChange={(e) => onUpdate(k.id, { betrag: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    {showPeriode && (
                      <td className="py-1 text-right text-slate-600 text-xs">
                        {jahresBetrag(k).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Speichern
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-2 text-gray-800">{k.bezeichnung}</td>
                    <td className="py-2 pr-2 text-slate-600 text-xs">{k.kategorie ?? "—"}</td>
                    {showPeriode && (
                      <td className="py-2 pr-2 text-slate-600 text-xs">
                        {k.periode === 'monatlich' ? 'mtl.' : 'jährl.'}
                      </td>
                    )}
                    <td className="py-2 text-right font-medium text-gray-800">
                      {k.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </td>
                    {showPeriode && (
                      <td className="py-2 text-right text-slate-600 text-xs">
                        {jahresBetrag(k).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="py-2 pl-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditId(k.id)}
                          className="text-slate-600 hover:text-blue-600 text-xs font-medium"
                          aria-label={`Kostenpunkt ${k.bezeichnung} bearbeiten`}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(k.id)}
                          className="text-slate-600 hover:text-red-600 text-xs font-medium"
                          aria-label={`Kostenpunkt ${k.bezeichnung} löschen`}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={showPeriode ? 4 : 2} className="pt-2 font-semibold text-gray-700">
                {showPeriode ? "Gesamt (jährlich)" : "Gesamt"}
              </td>
              <td className="pt-2 text-right font-bold text-gray-900">
                {total.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add new row */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-dashed border-gray-200">
        <input
          placeholder="Bezeichnung"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={neu.bezeichnung}
          onChange={(e) => setNeu({ ...neu, bezeichnung: e.target.value })}
        />
        <input
          placeholder="Kategorie"
          className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={neu.kategorie}
          onChange={(e) => setNeu({ ...neu, kategorie: e.target.value })}
        />
        {showPeriode && (
          <select
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={neu.periode}
            onChange={(e) => setNeu({ ...neu, periode: e.target.value as 'monatlich' | 'jaehrlich' })}
          >
            <option value="jaehrlich">jährlich</option>
            <option value="monatlich">monatlich</option>
          </select>
        )}
        <input
          type="number"
          placeholder="Betrag €"
          className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={neu.betrag || ""}
          onChange={(e) => setNeu({ ...neu, betrag: parseFloat(e.target.value) || 0 })}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Hinzufügen
        </button>
      </div>
    </div>
  );
}
