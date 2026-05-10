"use client";

import React, { useState } from "react";
import { KostenPosition } from "@/lib/types";

interface KostenListeProps {
  kosten: KostenPosition[];
  onAdd: (position: Omit<KostenPosition, "id">) => void;
  onUpdate: (id: string, position: Partial<KostenPosition>) => void;
  onRemove: (id: string) => void;
}

export function KostenListe({ kosten, onAdd, onUpdate, onRemove }: KostenListeProps) {
  const [neu, setNeu] = useState({ bezeichnung: "", betrag: 0, kategorie: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!neu.bezeichnung.trim()) return;
    onAdd({ bezeichnung: neu.bezeichnung, betrag: neu.betrag, kategorie: neu.kategorie || undefined });
    setNeu({ bezeichnung: "", betrag: 0, kategorie: "" });
  };

  const total = kosten.reduce((s, k) => s + k.betrag, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Bezeichnung</th>
              <th className="pb-2 font-medium">Kategorie</th>
              <th className="pb-2 font-medium text-right">Betrag (€)</th>
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
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        className="w-full border border-blue-400 rounded px-2 py-1 text-sm text-right"
                        value={k.betrag}
                        onChange={(e) => onUpdate(k.id, { betrag: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1">
                      <button
                        onClick={() => setEditId(null)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        ✓
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-2 text-gray-800">{k.bezeichnung}</td>
                    <td className="py-2 pr-2 text-gray-500 text-xs">{k.kategorie ?? "—"}</td>
                    <td className="py-2 text-right font-medium text-gray-800">
                      {k.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 pl-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditId(k.id)}
                          className="text-gray-400 hover:text-blue-600 text-xs"
                          title="Bearbeiten"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onRemove(k.id)}
                          className="text-gray-400 hover:text-red-600 text-xs"
                          title="Löschen"
                        >
                          🗑️
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
              <td colSpan={2} className="pt-2 font-semibold text-gray-700">Gesamt</td>
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
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={neu.kategorie}
          onChange={(e) => setNeu({ ...neu, kategorie: e.target.value })}
        />
        <input
          type="number"
          placeholder="Betrag €"
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={neu.betrag || ""}
          onChange={(e) => setNeu({ ...neu, betrag: parseFloat(e.target.value) || 0 })}
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Hinzufügen
        </button>
      </div>
    </div>
  );
}
