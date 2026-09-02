"use client";

import React from "react";
import { BetriebState, EndeState } from "@/lib/types";
import { ermittleEingabeWarnungen } from "@/lib/validations";

export function EingabeWarnungen({ betrieb, ende }: { betrieb: BetriebState; ende: EndeState }) {
  const warnungen = ermittleEingabeWarnungen(betrieb, ende);

  if (warnungen.length === 0) return null;

  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="mb-1 text-sm font-semibold">⚠ Bitte Eingaben prüfen</p>
      <ul className="list-disc space-y-1 pl-5 text-xs">
        {warnungen.map((warnung) => <li key={warnung}>{warnung}</li>)}
      </ul>
      <p className="mt-2 text-xs text-amber-800">Die Berechnung läuft trotzdem weiter; die Hinweise dienen nur zur Plausibilitätsprüfung.</p>
    </div>
  );
}
