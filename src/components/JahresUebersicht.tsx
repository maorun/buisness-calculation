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

/** A single row inside the Bilanz detail block */
function BilanzRow({
  label,
  value,
  bold = false,
  colorClass = "text-gray-700",
  indent = false,
  prefix,
}: {
  label: string;
  value: number;
  bold?: boolean;
  colorClass?: string;
  indent?: boolean;
  prefix?: string;
}) {
  const formatted = prefix !== undefined
    ? prefix + " " + Math.abs(value).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
    : formatEuro(value);
  return (
    <div className={`flex justify-between ${indent ? "pl-3" : ""}`}>
      <span className={bold ? "font-semibold " + colorClass : colorClass}>{label}</span>
      <span className={bold ? "font-semibold " + colorClass : colorClass}>{formatted}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-300 my-1" />;
}

function SectionHeader({ label }: { label: string }) {
  return <p className="font-semibold text-slate-600 uppercase tracking-wide text-[10px] mt-3 mb-1">{label}</p>;
}

/** Structured annual balance sheet (Jahresbilanz) for Betrieb years */
function BetriebBilanz({ e }: { e: JahresErgebnis }) {
  const d = e.details as Record<string, number>;
  return (
    <div className="space-y-0.5 text-xs">
      {/* ── GuV ──────────────────────────────────────── */}
      <SectionHeader label="Gewinn- und Verlustrechnung" />
      <BilanzRow label="ETF-Verkaufserlös (Liquidität)" value={d.etfVerkauf} prefix="+" colorClass="text-gray-700" indent />
      <BilanzRow label="− ETF-Einstandswert (verkaufter Anteil)" value={d.etfEinstandswertVerkauft} prefix="−" colorClass="text-gray-600" indent />
      <Divider />
      <BilanzRow label="= ETF-Ertrag (realisiert, steuerrelevant)" value={d.etfGewinn} prefix="+" colorClass="text-gray-700" indent />
      <BilanzRow label="− Betriebskosten" value={d.jaehrlicheKosten} prefix="−" colorClass="text-gray-600" indent />
      {d.handyNettoKosten > 0 && (
        <BilanzRow label="− Firmenhandy (Betriebsausgabe)" value={d.handyNettoKosten} prefix="−" colorClass="text-gray-600" indent />
      )}
      {d.jaehrlicheZinsen > 0 && (
        <BilanzRow label="− Darlehenszinsen (laufend)" value={d.jaehrlicheZinsen} prefix="−" colorClass="text-gray-600" indent />
      )}
      <Divider />
      <BilanzRow
        label="= Gewinn (Steuerbemessungsgrundlage)"
        value={d.gewinnNachBetriebsausgaben}
        prefix={d.gewinnNachBetriebsausgaben >= 0 ? "+" : "−"}
        bold
        colorClass="text-gray-800"
      />

      <SectionHeader label="Steuern (Finanzamt)" />
      <BilanzRow label="− GmbH-Steuern (KSt + GewSt)" value={d.gmbhSteuer} prefix="−" colorClass="text-red-600" indent />
      <BilanzRow label="− Vorabpauschalesteuer" value={d.vorabpauschalesteuer} prefix="−" colorClass="text-red-600" indent />
      <BilanzRow label="− Steuer auf ETF-Verkauf" value={d.etfVerkaufssteuer} prefix="−" colorClass="text-red-600" indent />
      <Divider />
      <BilanzRow
        label="= Nettogewinn (Buchgewinn)"
        value={e.nettogewinn}
        prefix={e.nettogewinn >= 0 ? "+" : "−"}
        bold
        colorClass="text-green-700"
      />

      {/* ── Cashflow ─────────────────────────────────── */}
      <SectionHeader label="Cashflow (ETF-Verkauf zur Kostendeckung)" />
      <BilanzRow label="Betriebskosten + Steuern (aus dem ETF finanziert)" value={d.etfVerkauf} prefix="−" colorClass="text-orange-600" bold indent />

      {/* ── Bilanz ───────────────────────────────────── */}
      <SectionHeader label="Bilanz (Jahresende)" />
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide pl-0 mb-0.5">Aktiva</p>
      <BilanzRow label="ETF-Wert" value={d.etfWert} prefix="+" colorClass="text-blue-700" bold indent />
      {d.cashReserve > 0 && (
        <BilanzRow label="Cash-Reserve" value={d.cashReserve} prefix="+" colorClass="text-blue-700" bold indent />
      )}

      {d.offenesDarlehen > 0 && (
        <>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-2 mb-0.5">Passiva</p>
          <BilanzRow label="Offenes Darlehen (Verbindlichkeit)" value={d.offenesDarlehen} prefix="−" colorClass="text-gray-600" indent />
        </>
      )}
      <Divider />
      <BilanzRow
        label="= Nettovermögen (Eigenkapital)"
        value={d.nettovermoegen}
        prefix={d.nettovermoegen >= 0 ? "+" : "−"}
        bold
        colorClass="text-blue-800"
      />

      {/* ── Weitere Infos ─────────────────────────────── */}
      {(d.vorabpauschale > 0 || d.benefitSteuerersparnis > 0 || d.aufgelaufeneZinsen > 0 || d.theoretischerEtfErtrag > 0) && (
        <>
          <SectionHeader label="Weitere Infos" />
          {d.theoretischerEtfErtrag > 0 && (
            <BilanzRow label="ETF-Ertrag (theoretisch, Vorabpauschale-Basis)" value={d.theoretischerEtfErtrag} colorClass="text-gray-500" indent />
          )}
          {d.vorabpauschale > 0 && (
            <BilanzRow label="Vorabpauschale (Bemessungsgrundlage)" value={d.vorabpauschale} colorClass="text-gray-500" indent />
          )}
          {d.benefitSteuerersparnis > 0 && (
            <BilanzRow label="Steuerersparnis Benefits" value={d.benefitSteuerersparnis} prefix="+" colorClass="text-gray-500" indent />
          )}
          {d.aufgelaufeneZinsen > 0 && (
            <BilanzRow label="Aufgelaufene Zinsen (endfällig, kumuliert)" value={d.aufgelaufeneZinsen} colorClass="text-amber-600" indent />
          )}
        </>
      )}
    </div>
  );
}

/** Structured annual summary for Ende years */
function EndeBilanz({ e }: { e: JahresErgebnis }) {
  const d = e.details as Record<string, number>;
  return (
    <div className="space-y-0.5 text-xs">
      <SectionHeader label="Einnahmen (brutto)" />
      {d.bruttoGehalt !== undefined && (
        <BilanzRow label="Brutto-Gehalt" value={d.bruttoGehalt} prefix="+" colorClass="text-gray-700" indent />
      )}
      {d.darlehenZinsen !== undefined && d.darlehenZinsen > 0 && (
        <BilanzRow label="Zinserträge aus Darlehen (brutto)" value={d.darlehenZinsen} prefix="+" colorClass="text-gray-700" indent />
      )}
      {d.gewinnausschuettung !== undefined && d.gewinnausschuettung > 0 && (
        <BilanzRow label="Gewinnausschüttung (brutto)" value={d.gewinnausschuettung} prefix="+" colorClass="text-gray-700" indent />
      )}

      <SectionHeader label="Steuern (Finanzamt)" />
      {d.einkommensteuer !== undefined && (
        <BilanzRow label="− Einkommensteuer" value={d.einkommensteuer} prefix="−" colorClass="text-red-600" indent />
      )}
      {d.soli !== undefined && d.soli > 0 && (
        <BilanzRow label="− Solidaritätszuschlag" value={d.soli} prefix="−" colorClass="text-red-600" indent />
      )}
      {d.darlehenZinsenSteuer !== undefined && d.darlehenZinsenSteuer > 0 && (
        <BilanzRow label="− Abgeltungssteuer auf Zinsen" value={d.darlehenZinsenSteuer} prefix="−" colorClass="text-red-600" indent />
      )}
      {d.kstSteuer !== undefined && d.kstSteuer > 0 && (
        <BilanzRow label="− Körperschaftsteuer (Finanzamt)" value={d.kstSteuer} prefix="−" colorClass="text-red-600" indent />
      )}
      {d.ausschuettungsteuer !== undefined && d.ausschuettungsteuer > 0 && (
        <BilanzRow label="− Steuer auf Ausschüttung" value={d.ausschuettungsteuer} prefix="−" colorClass="text-red-600" indent />
      )}

      <SectionHeader label="Netto" />
      {d.nettoGehalt !== undefined && (
        <BilanzRow label="Netto-Gehalt" value={d.nettoGehalt} prefix="+" colorClass="text-green-700" indent />
      )}
      {d.darlehenZinsenNetto !== undefined && d.darlehenZinsenNetto > 0 && (
        <BilanzRow label="Zinserträge (netto)" value={d.darlehenZinsenNetto} prefix="+" colorClass="text-green-700" indent />
      )}
      {d.nettoAusschuettung !== undefined && d.nettoAusschuettung > 0 && (
        <BilanzRow label="Netto-Ausschüttung" value={d.nettoAusschuettung} prefix="+" colorClass="text-green-700" indent />
      )}
      <Divider />
      <BilanzRow
        label="= Gesamt Netto"
        value={e.nettogewinn}
        prefix={e.nettogewinn >= 0 ? "+" : "−"}
        bold
        colorClass="text-green-700"
      />
    </div>
  );
}

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
              <th className="pb-2 font-medium text-right">Gewinn nach Kosten (vor St.)</th>
              <th className="pb-2 font-medium text-right">Steuern (Finanzamt)</th>
              <th className="pb-2 font-medium text-right">Netto-Gewinn</th>
                <th className="pb-2 font-medium text-right">Gesamtvermögen</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ergebnisse.map((e) => (
              <React.Fragment key={e.jahr}>
                <tr>
                  <td className="py-2 font-medium text-gray-700">Jahr {e.jahr}</td>
                  <td className="py-2 text-right text-gray-800">{formatEuro(e.gewinn)}</td>
                  <td className="py-2 text-right text-red-600">{formatEuro(e.steuer)}</td>
                  <td className="py-2 text-right text-green-700 font-medium">{formatEuro(e.nettogewinn)}</td>
                  <td className="py-2 text-right font-bold text-blue-700">{formatEuro(e.gesamtvermoegen)}</td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 hover:text-slate-800"
                      aria-expanded={expandedJahr === e.jahr}
                      aria-controls={`jahr-details-${e.jahr}`}
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
                      <div id={`jahr-details-${e.jahr}`} className="bg-gray-50 rounded-lg p-4 text-xs">
                        <p className="font-semibold text-gray-700 mb-3 text-sm">Jahresbilanz – Jahr {e.jahr}</p>
                        {"etfGewinn" in e.details
                          ? <BetriebBilanz e={e} />
                          : <EndeBilanz e={e} />
                        }
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
