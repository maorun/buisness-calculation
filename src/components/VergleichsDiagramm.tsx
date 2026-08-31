"use client";

import React from "react";

export interface VergleichsDiagrammPunkt {
  /** Year label (1-based) shown on the x-axis. */
  jahr: number;
  /** Total GmbH wealth incl. consumption value for the year. */
  gmbh: number;
  /** Total private wealth incl. consumption value for the year. */
  privat: number;
}

interface VergleichsDiagrammProps {
  punkte: VergleichsDiagrammPunkt[];
  /** Optional year in which the GmbH catches up with the private scenario. */
  breakEvenJahr?: number | null;
  title?: string;
  /** Optional note regarding real/nominal valuation or inflation rate. */
  inflationNote?: string;
}

const WIDTH = 640;
const HEIGHT = 320;
const PADDING = { top: 16, right: 16, bottom: 36, left: 64 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const Y_TICKS = 4;

const GMBH_COLOR = "#2563eb"; // blue-600
const PRIVAT_COLOR = "#059669"; // emerald-600

function formatKurz(value: number): string {
  const abs = Math.abs(value);
  const format = (v: number, suffix: string) =>
    `${value < 0 ? "-" : ""}${v.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${suffix}`;
  if (abs >= 1_000_000) {
    return format(abs / 1_000_000, " Mio €");
  }
  if (abs >= 1_000) {
    return format(abs / 1_000, " Tsd €");
  }
  return value.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
}

/**
 * Computes the y value domain across both series, always including 0 so the
 * baseline is meaningful. Falls back to a small range when the data is flat.
 */
export function berechneWertebereich(punkte: VergleichsDiagrammPunkt[]): { min: number; max: number } {
  const werte = punkte.flatMap((p) => [p.gmbh, p.privat]);
  werte.push(0);
  let min = Math.min(...werte);
  let max = Math.max(...werte);
  if (min === max) {
    // Flat data: create a symmetric range so the line is centred.
    const spanne = Math.abs(max) || 1;
    min -= spanne;
    max += spanne;
  }
  return { min, max };
}

export function VergleichsDiagramm({
  punkte,
  breakEvenJahr,
  title = "Entwicklung im Vergleich: GmbH vs. Privat",
  inflationNote,
}: VergleichsDiagrammProps) {
  if (punkte.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-2">{title}</h4>
        <p className="text-xs text-slate-500">Keine Daten für das Diagramm verfügbar.</p>
      </div>
    );
  }

  const { min, max } = berechneWertebereich(punkte);
  const jahrMin = punkte[0].jahr;
  const jahrMax = punkte[punkte.length - 1].jahr;
  const jahrSpanne = jahrMax - jahrMin || 1;

  const xFor = (jahr: number) => PADDING.left + ((jahr - jahrMin) / jahrSpanne) * PLOT_WIDTH;
  const yFor = (wert: number) =>
    PADDING.top + PLOT_HEIGHT - ((wert - min) / (max - min)) * PLOT_HEIGHT;

  const linie = (key: "gmbh" | "privat") =>
    punkte.map((p) => `${xFor(p.jahr).toFixed(2)},${yFor(p[key]).toFixed(2)}`).join(" ");

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => min + ((max - min) * i) / Y_TICKS);
  const breakEvenX =
    breakEvenJahr != null && breakEvenJahr >= jahrMin && breakEvenJahr <= jahrMax
      ? xFor(breakEvenJahr)
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {inflationNote && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
            {inflationNote}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-4 mb-2 text-xs" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm" style={{ backgroundColor: GMBH_COLOR }} />
          <span className="text-slate-700">GmbH (+ Darlehensgeber)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 rounded-sm" style={{ backgroundColor: PRIVAT_COLOR }} />
          <span className="text-slate-700">Alles privat</span>
        </span>
      </div>
      <svg
        role="img"
        aria-label={`Liniendiagramm des Gesamtwert-Verlaufs von Jahr ${jahrMin} bis Jahr ${jahrMax}: GmbH gegenüber Privat`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines and y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = yFor(tick);
          return (
            <g key={`y-${i}`}>
              <line x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#64748b">
                {formatKurz(tick)}
              </text>
            </g>
          );
        })}

        {/* Zero baseline emphasised when within range */}
        {min < 0 && max > 0 && (
          <line
            x1={PADDING.left}
            y1={yFor(0)}
            x2={WIDTH - PADDING.right}
            y2={yFor(0)}
            stroke="#94a3b8"
            strokeWidth={1}
          />
        )}

        {/* X-axis labels (year numbers) */}
        {punkte.map((p) => (
          <text
            key={`x-${p.jahr}`}
            x={xFor(p.jahr)}
            y={HEIGHT - PADDING.bottom + 18}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
          >
            {p.jahr}
          </text>
        ))}
        <text
          x={PADDING.left + PLOT_WIDTH / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          fontSize={11}
          fill="#475569"
        >
          Jahr
        </text>

        {/* Break-even marker */}
        {breakEvenX !== null && (
          <line
            x1={breakEvenX}
            y1={PADDING.top}
            x2={breakEvenX}
            y2={PADDING.top + PLOT_HEIGHT}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Series */}
        <polyline
          data-testid="linie-privat"
          fill="none"
          stroke={PRIVAT_COLOR}
          strokeWidth={2}
          points={linie("privat")}
        />
        <polyline
          data-testid="linie-gmbh"
          fill="none"
          stroke={GMBH_COLOR}
          strokeWidth={2}
          points={linie("gmbh")}
        />

        {/* Data point markers */}
        {punkte.map((p) => (
          <circle key={`pp-${p.jahr}`} cx={xFor(p.jahr)} cy={yFor(p.privat)} r={2.5} fill={PRIVAT_COLOR} />
        ))}
        {punkte.map((p) => (
          <circle key={`pg-${p.jahr}`} cx={xFor(p.jahr)} cy={yFor(p.gmbh)} r={2.5} fill={GMBH_COLOR} />
        ))}
      </svg>
    </div>
  );
}
