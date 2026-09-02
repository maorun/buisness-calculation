# AGENTS.md

## Überblick

Dieses Repository enthält eine Next.js-Anwendung für einen deutschen GmbH-Kalkulator zum Vermögensaufbau. Die App modelliert Gründung, Betrieb und Auszahlungsphase einer GmbH und berechnet dabei steuerlich relevante Größen wie Gewinn, Gewerbesteuer, Einkommensteuer, Abgeltungssteuer und ETF-Auszahlungen.

Wichtige Grundsätze:
- Die Logik für Finanz-/Steuerberechnungen liegt primär in `src/lib/calculations/`.
- Die UI-Komponenten leben in `src/components/`.
- Der zentrale Zustand der App liegt in `src/store/calculatorStore.ts`.
- Tests befinden sich in `src/__tests__/`.
- Die App ist ein Next.js-Projekt mit React 19; die Routen liegen in `src/app/`.

## Wichtige Dateien

- `README.md` – Produkt- und Steuerkontext
- `src/app/page.tsx` – Hauptseite und Tab-UI
- `src/components/*` – Formularfelder, Diagramme und Sektionen
- `src/lib/calculations/*.ts` – Berechnungsfunktionen
- `src/lib/parameters.ts` – Steuerparameter pro Jahr
- `src/lib/types.ts` – zentrale Typdefinitionen
- `src/store/calculatorStore.ts` – globale State-Logik
- `src/__tests__/*` – Jest-Tests zu Berechnung und UI

## Projektbefehle

Vor dem Start:
- `npm install`

Entwicklungsserver:
- `npm run dev`

Build:
- `npm run build`

Lint:
- `npm run lint`

Tests:
- `npm test -- --runInBand`

## Richtlinien für Änderungen

### 1) Berechnungslogik
- Behalte die Berechnungen pur und gut testbar; Funktionen sollen möglichst ohne Seiteneffekte arbeiten.
- Behandle Währungen und Prozentsätze konsistent: Euro als Basis, Werte in % als Dezimal-/Prozentangaben gemäß bestehender Funktionen.
- Änderungen an Steuerannahmen, Freibeträgen, Teilfreistellungen oder Steuersätzen sollten mit den vorhandenen Tests abgeglichen werden.
- Wenn sich das veränderte Verhalten auf die App auswirkt, ergänze oder aktualisiere die zugehörigen Tests in `src/__tests__/`.

### 2) UI und Komponenten
- Halte Komponenten klein und fokussiert; die App ist in klar getrennte Bereiche (Gründung, Betrieb, Ende) gegliedert.
- Behalte die bestehende deutsche Benennung und UX-Sprache bei, da das Produkt auf deutsche Steuer- und Finanzbegriffe ausgerichtet ist.
- Wenn neue Parameter oder Zustände eingeführt werden, prüfe, ob sie in `calculatorStore` und in der JSON-Import-/Export-Logik korrekt persistiert werden.

### 3) Qualitätssicherung
- Vor Abschluss einer Änderung möglichst die relevanten Checks ausführen:
  - `npm run lint`
  - `npm test -- --runInBand`
- Wenn intensive Änderungen an Berechnungen vorgenommen werden, prüfe zusätzlich den Build mit `npm run build`.

## Hinweise für KI-Agenten

- Keine ungenutzten Abhängigkeiten oder „Quick fixes“ einbauen, wenn sie die bestehenden Steuerlogiken verwässern.
- Bevor neue Regeln eingeführt werden, prüfe die vorhandenen Funktionen in `src/lib/calculations/` und die zugehörigen Tests.
- Die App hat ein deutsches Finanz-/Steuerkontext. Falsche Annahmen zu Steuerrecht oder Berechnungslogik sind kritisch.
- Halte Änderungen minimal und fachlich sauber; vermeide unproduktive Refactors.

## Next.js-spezifische Warnung

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
