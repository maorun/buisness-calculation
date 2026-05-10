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
  const gesamtSteuer = d.gmbhSteuer + d.vorabpauschalesteuer + d.etfVerkaufssteuer;
  return (
    <div className="space-y-0.5 text-xs">
      {/* ── GuV ──────────────────────────────────────── */}
      <SectionHeader label="Gewinn- und Verlustrechnung" />
      <BilanzRow label="ETF-Verkauf (realisiert)" value={d.etfVerkauf} prefix="+" colorClass="text-gray-700" indent />
      <BilanzRow label="− Betriebsausgaben" value={d.betriebsausgabenGesamt} prefix="−" colorClass="text-gray-600" indent />
      {d.jaehrlicheZinsen > 0 && (
        <BilanzRow label="− Darlehenszinsen (laufend)" value={d.jaehrlicheZinsen} prefix="−" colorClass="text-gray-600" indent />
      )}
      <BilanzRow
        label={`− Steuer auf Vorabpauschale (Basis: ${formatEuro(d.vorabpauschale)})`}
        value={d.vorabpauschalesteuer}
        prefix="−"
        colorClass="text-red-600"
        indent
      />
      {d.gmbhSteuer > 0 && (
        <BilanzRow label="− Gewinnsteuer (KSt + GewSt)" value={d.gmbhSteuer} prefix="−" colorClass="text-red-600" indent />
      )}
      <BilanzRow label="− Steuer auf ETF-Verkauf" value={d.etfVerkaufssteuer} prefix="−" colorClass="text-red-600" indent />
      <Divider />
      <BilanzRow
        label="= Saldo nach Ausgaben & Steuern"
        value={d.deckungssaldoNachAusgabenUndSteuern}
        prefix={d.deckungssaldoNachAusgabenUndSteuern >= 0 ? "+" : "−"}
        bold
        colorClass="text-gray-800"
      />
      {d.cashReserveZugang > 0 && (
        <BilanzRow label="→ als Cash-Reserve in Aktiva" value={d.cashReserveZugang} prefix="+" colorClass="text-blue-700" indent />
      )}

      <SectionHeader label="Steuern (Finanzamt)" />
      <BilanzRow label="− Gesamtsteuer (KSt + GewSt + Vorabpauschale + ETF-Verkauf)" value={gesamtSteuer} prefix="−" colorClass="text-red-600" indent />
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
      {(d.vorabpauschale > 0 || d.aufgelaufeneZinsen > 0 || d.theoretischerEtfErtrag > 0 || d.benefitsKosten > 0) && (
        <>
          <SectionHeader label="Weitere Infos" />
          {d.theoretischerEtfErtrag > 0 && (
            <BilanzRow label="ETF-Ertrag (theoretisch, Vorabpauschale-Basis)" value={d.theoretischerEtfErtrag} colorClass="text-gray-500" indent />
          )}
          {d.vorabpauschale > 0 && (
            <BilanzRow label="Vorabpauschale (Bemessungsgrundlage)" value={d.vorabpauschale} colorClass="text-gray-500" indent />
          )}
          {d.benefitsKosten > 0 && (
            <BilanzRow label="Benefits (in Betriebsausgaben enthalten)" value={d.benefitsKosten} colorClass="text-gray-500" indent />
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
        <BilanzRow label="Zinsanteil Darlehen (brutto)" value={d.darlehenZinsen} prefix="+" colorClass="text-gray-700" indent />
      )}
      {d.darlehenTilgung !== undefined && d.darlehenTilgung > 0 && (
        <BilanzRow label="Darlehensrückzahlung (Tilgung)" value={d.darlehenTilgung} prefix="+" colorClass="text-gray-700" indent />
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
        <BilanzRow label="− Abgeltungssteuer auf Zinsanteil" value={d.darlehenZinsenSteuer} prefix="−" colorClass="text-red-600" indent />
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
        <BilanzRow label="Zinsanteil (netto)" value={d.darlehenZinsenNetto} prefix="+" colorClass="text-green-700" indent />
      )}
      {d.darlehenTilgung !== undefined && d.darlehenTilgung > 0 && (
        <BilanzRow label="Tilgung (steuerfrei)" value={d.darlehenTilgung} prefix="+" colorClass="text-green-700" indent />
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
      <BilanzRow
        label="= Gesamt Netto pro Monat"
        value={e.nettogewinn / 12}
        prefix={e.nettogewinn >= 0 ? "+" : "−"}
        bold
        colorClass="text-green-700"
      />

      {(d.firmenEtfVermoegen !== undefined && d.firmenDarlehensverbindlichkeit !== undefined) && (
        <>
          <SectionHeader label="Bilanz der Firma (Jahresende)" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide pl-0 mb-0.5">Aktiva</p>
          {d.firmenEtfVermoegen !== undefined && (
            <BilanzRow label="ETF-/Liquiditätsbestand Firma" value={d.firmenEtfVermoegen} prefix="+" colorClass="text-blue-700" bold indent />
          )}
          {d.firmenDarlehensverbindlichkeit !== undefined && d.firmenDarlehensverbindlichkeit > 0 && (
            <>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-2 mb-0.5">Passiva</p>
              <BilanzRow label="Restdarlehen gegenüber Gesellschafter" value={d.firmenDarlehensverbindlichkeit} prefix="−" colorClass="text-gray-600" indent />
            </>
          )}
          <Divider />
          {d.firmenNettovermoegen !== undefined && (
            <BilanzRow
              label="= Firmen-Nettovermögen"
              value={d.firmenNettovermoegen}
              prefix={d.firmenNettovermoegen >= 0 ? "+" : "−"}
              bold
              colorClass="text-blue-800"
            />
          )}
        </>
      )}
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
                  <td className="py-2 text-right text-green-700 font-medium">
                    {formatEuro(e.nettogewinn)}
                    {"firmenNettovermoegen" in e.details && (
                      <div className="text-[11px] font-normal text-green-600">
                        ({formatEuro(e.nettogewinn / 12)} / Monat)
                      </div>
                    )}
                  </td>
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
