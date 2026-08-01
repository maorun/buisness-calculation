/** @jest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  VergleichsDiagramm,
  berechneWertebereich,
  VergleichsDiagrammPunkt,
} from "@/components/VergleichsDiagramm";

const punkte: VergleichsDiagrammPunkt[] = [
  { jahr: 1, gmbh: 10000, privat: 12000 },
  { jahr: 2, gmbh: 22000, privat: 21000 },
  { jahr: 3, gmbh: 35000, privat: 30000 },
];

describe("berechneWertebereich", () => {
  it("always includes zero in the value range", () => {
    const { min, max } = berechneWertebereich([{ jahr: 1, gmbh: 5000, privat: 8000 }]);
    expect(min).toBe(0);
    expect(max).toBe(8000);
  });

  it("captures negative values", () => {
    const { min, max } = berechneWertebereich([{ jahr: 1, gmbh: -3000, privat: 2000 }]);
    expect(min).toBe(-3000);
    expect(max).toBe(2000);
  });

  it("expands a flat range so the line is not degenerate", () => {
    const { min, max } = berechneWertebereich([{ jahr: 1, gmbh: 0, privat: 0 }]);
    expect(min).toBeLessThan(max);
  });
});

describe("VergleichsDiagramm", () => {
  it("renders both series and the legend", () => {
    render(<VergleichsDiagramm punkte={punkte} />);
    expect(screen.getByText("GmbH (+ Darlehensgeber)")).toBeTruthy();
    expect(screen.getByText("Alles privat")).toBeTruthy();
    expect(screen.getByTestId("linie-gmbh")).toBeTruthy();
    expect(screen.getByTestId("linie-privat")).toBeTruthy();
  });

  it("plots one point per year on each series", () => {
    render(<VergleichsDiagramm punkte={punkte} />);
    const gmbh = screen.getByTestId("linie-gmbh");
    expect(gmbh.getAttribute("points")?.trim().split(/\s+/).length).toBe(punkte.length);
  });

  it("shows a placeholder when there is no data", () => {
    render(<VergleichsDiagramm punkte={[]} />);
    expect(screen.getByText("Keine Daten für das Diagramm verfügbar.")).toBeTruthy();
  });
});
