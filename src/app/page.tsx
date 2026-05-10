"use client";

import React, { useState } from "react";
import { GruendungSection } from "@/components/GruendungSection";
import { BetriebSection } from "@/components/BetriebSection";
import { EndeSection } from "@/components/EndeSection";

type Tab = "gruendung" | "betrieb" | "ende";

const tabs: { id: Tab; label: string }[] = [
  { id: "gruendung", label: "Gründung" },
  { id: "betrieb", label: "Betrieb" },
  { id: "ende", label: "Ende" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("gruendung");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
            BC
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">GmbH-Kalkulator</h1>
            <p className="text-xs text-slate-600">Vermögensaufbau via GmbH</p>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[57px] z-10">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1" aria-label="Abschnitte">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-800 hover:border-gray-300"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "gruendung" && <GruendungSection />}
        {activeTab === "betrieb" && <BetriebSection />}
        {activeTab === "ende" && <EndeSection />}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-600 border-t border-gray-200 mt-8">
        <p>GmbH-Kalkulator · Alle Angaben ohne Gewähr · Keine Steuerberatung</p>
        <p className="mt-1">Steuerparameter basieren auf deutschen Steuergesetzen Stand 2024</p>
      </footer>
    </div>
  );
}
