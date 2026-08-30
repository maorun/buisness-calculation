"use client";

import React, { useEffect, useRef, useState } from "react";
import { GruendungSection } from "@/components/GruendungSection";
import { BetriebSection } from "@/components/BetriebSection";
import { EndeSection } from "@/components/EndeSection";
import { useCalculatorStore } from "@/store/calculatorStore";

type Tab = "gruendung" | "betrieb" | "ende";
const COPY_STATUS_RESET_DELAY_MS = 2500;
const LOAD_STATUS_RESET_DELAY_MS = 2500;

const tabs: { id: Tab; label: string }[] = [
  { id: "gruendung", label: "Gründung" },
  { id: "betrieb", label: "Betrieb" },
  { id: "ende", label: "Ende" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("gruendung");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [loadStatus, setLoadStatus] = useState<"idle" | "success" | "error">("idle");
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadJsonText, setLoadJsonText] = useState("");
  const resetCopyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetLoadStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gruendung = useCalculatorStore((state) => state.gruendung);
  const betrieb = useCalculatorStore((state) => state.betrieb);
  const ende = useCalculatorStore((state) => state.ende);
  const loadState = useCalculatorStore((state) => state.loadState);

  useEffect(() => {
    return () => {
      if (resetCopyStatusTimerRef.current) {
        clearTimeout(resetCopyStatusTimerRef.current);
      }
      if (resetLoadStatusTimerRef.current) {
        clearTimeout(resetLoadStatusTimerRef.current);
      }
    };
  }, []);

  const handleCopyParameters = async () => {
    const payload = {
      gruendung,
      betrieb,
      ende,
    };
    const text = JSON.stringify(payload, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }

    if (resetCopyStatusTimerRef.current) {
      clearTimeout(resetCopyStatusTimerRef.current);
    }
    resetCopyStatusTimerRef.current = setTimeout(
      () => setCopyStatus("idle"),
      COPY_STATUS_RESET_DELAY_MS
    );
  };

  const handleOpenLoadDialog = () => {
    setLoadJsonText("");
    setLoadStatus("idle");
    setShowLoadDialog(true);
  };

  const handleConfirmLoad = () => {
    try {
      const parsed = JSON.parse(loadJsonText);
      loadState(parsed);
      setLoadStatus("success");
      setShowLoadDialog(false);
      setLoadJsonText("");
    } catch {
      setLoadStatus("error");
    }

    if (resetLoadStatusTimerRef.current) {
      clearTimeout(resetLoadStatusTimerRef.current);
    }
    resetLoadStatusTimerRef.current = setTimeout(
      () => setLoadStatus("idle"),
      LOAD_STATUS_RESET_DELAY_MS
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
            >
              BC
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">GmbH-Kalkulator</h1>
              <p className="text-xs text-slate-600">Vermögensaufbau via GmbH</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyParameters}
                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
              >
                Parameter kopieren
              </button>
              <button
                type="button"
                onClick={handleOpenLoadDialog}
                className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
              >
                Parameter laden
              </button>
            </div>
            <div className="text-right text-[11px]" role="status" aria-live="polite">
              {copyStatus === "success" && (
                <p className="text-green-700">In Zwischenablage kopiert.</p>
              )}
              {copyStatus === "error" && (
                <p className="text-red-700">Kopieren fehlgeschlagen.</p>
              )}
              {loadStatus === "success" && (
                <p className="text-green-700">Parameter geladen.</p>
              )}
              {loadStatus === "error" && (
                <p className="text-red-700">Ungültiges JSON.</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Load dialog */}
      {showLoadDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="load-dialog-title"
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl p-6 flex flex-col gap-4">
            <h2 id="load-dialog-title" className="text-base font-semibold text-gray-900">
              Parameter laden
            </h2>
            <p className="text-sm text-slate-600">
              JSON hier einfügen oder eingeben:
            </p>
            <textarea
              className="w-full h-48 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
              value={loadJsonText}
              onChange={(e) => setLoadJsonText(e.target.value)}
              placeholder='{ "gruendung": { ... }, "betrieb": { ... }, "ende": { ... } }'
              autoFocus
            />
            {loadStatus === "error" && (
              <p className="text-xs text-red-700" role="alert">Ungültiges JSON. Bitte prüfen.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowLoadDialog(false); setLoadStatus("idle"); }}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmLoad}
                disabled={loadJsonText.trim() === ""}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Laden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[57px] z-10">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1" aria-label="Abschnitte" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tab-panel-${tab.id}`}
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
        {activeTab === "gruendung" && (
          <div id="tab-panel-gruendung" role="tabpanel" aria-labelledby="tab-gruendung">
            <GruendungSection />
          </div>
        )}
        {activeTab === "betrieb" && (
          <div id="tab-panel-betrieb" role="tabpanel" aria-labelledby="tab-betrieb">
            <BetriebSection />
          </div>
        )}
        {activeTab === "ende" && (
          <div id="tab-panel-ende" role="tabpanel" aria-labelledby="tab-ende">
            <EndeSection />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-600 border-t border-gray-200 mt-8">
        <p>GmbH-Kalkulator · Alle Angaben ohne Gewähr · Keine Steuerberatung</p>
        <p className="mt-1">Steuerparameter basieren auf deutschen Steuer- und Sozialgesetzen (wählbar 2024, 2025, 2026)</p>
      </footer>
    </div>
  );
}
