# GmbH-Kalkulator

Ein interaktiver Rechner für den **Vermögensaufbau via GmbH**. Das Tool hilft dabei, die finanziellen Aspekte einer Vermögensverwaltungs-GmbH in Deutschland zu planen und zu simulieren – von der Gründung über den laufenden Betrieb bis hin zur Auszahlungsphase.

> **Hinweis:** Alle Angaben ohne Gewähr. Dieses Tool ersetzt keine professionelle Steuerberatung.

---

## Features

- 📱 **PWA mit Offline-Unterstützung** (installierbar und mit Offline-Fallback-Seite)

### 📋 Gründung
- Erfassung aller **einmaligen Gründungskosten** (z. B. Notar, Handelsregistereintrag, Stammkapital)
- Automatische Berechnung der **Gesamtgründungskosten**
- Hinweis: Das Stammkapital (mind. 25.000 €) verbleibt als investierbares GmbH-Vermögen

### 📈 Betrieb
- Simulation des **ETF-Investments** über eine frei wählbare Laufzeit
- Konfiguration eines **Gesellschafter-Darlehens** (Betrag, Zinssatz, monatlicher Zuschuss, endfällig oder mit Tilgungsdatum)
- Verwaltung **laufender Betriebskosten** (monatlich oder jährlich) mit direkter Auswirkung auf den steuerpflichtigen Gewinn
- Simulierbarer **jährlicher Betriebsgewinn**: wird zuerst mit Betriebskosten verrechnet; Überschüsse werden nach Steuern als zusätzlicher ETF-Zufluss investiert
- **Zielnetto-Abgleich im Betrieb** für den Gesellschafter (Netto-Darlehenszinsen + Netto-GF-Gehalt)
- Konfigurierbares **GF-Gehalt im Betrieb** als zusätzliche Betriebskostenposition
- Steuerliche **Benefits**: Tankgutschein (max. 50 €/Monat, steuerfrei gem. § 8 Abs. 2 EStG), Essenszuschuss (bis zu 7,67 € pro Tag) und Strategieessen
- Automatische Berücksichtigung von **Firmenhandy-Kosten** als Betriebsausgabe
- Transparente Darstellung aller **Steuerparameter** (KSt 15 %, Solidaritätszuschlag, GewSt ca. 14 %, Abgeltungsteuer, Vorabpauschale, Teilfreistellung)
- **Jahresergebnisse**: Übersicht über Gesamtvermögen, Gewinn, Steuern und Nettogewinn pro Jahr

### 🏁 Ende (Auszahlungsphase)
- Planung der **Auszahlungsphase** in zwei Bereichen:
  - **Bereich 1**: Abwicklungsjahr mit gestundeten Darlehenszinsen, optimiert auf ein Zielnettoeinkommen
  - **Bereich 2**: Reguläre Auszahljahre mit Geschäftsführergehalt und Gewinnausschüttung
- Konfiguration von **Geschäftsführergehalt**, **Gewinnausschüttung** und **Tilgungsrate**
- **Bereich 1** mit Schiebereglern für GF-Gehalt im Midijob-Korridor und **Teil-Tilgung**, damit Zielnetto gemeinsam mit den Darlehenszinsen getroffen werden kann
- Berechnung der persönlichen Steuerbelastung (Einkommensteuer, Solidaritätszuschlag, Abgeltungsteuer)
- **Jahresergebnisse** der Entnahmephase

---

## Steuerparameter (Stand 2024)

Die vollständige, im Rechner verwendete Dokumentation ist direkt über **Steuerannahmen** im Header abrufbar. Dort sind auch die jahresabhängigen Werte für 2025 und 2026 sowie Modellregeln und die Änderungspflege aufgeführt.

| Parameter | Wert |
|---|---|
| Körperschaftsteuer (KSt) | 15,00 % |
| KSt + Solidaritätszuschlag | 15,825 % |
| Gewerbesteuer (GewSt) | ca. 14,00 % |
| Gesamtbelastung GmbH | ca. 29,825 % |
| Abgeltungsteuer | 25,00 % |
| Abgeltungsteuer + SolZ | 26,375 % |
| Basiszins 2024 | 2,29 % |
| Teilfreistellung ETF-Verkauf (GmbH) | 80 % |
| Teilfreistellung ETF (Privatperson) | 30 % |

Die Simulation setzt für die Gewerbesteuer einen kommunalen Durchschnitt von 14 % an und berücksichtigt keine Kirchensteuer. Die Vorabpauschale wird mit 70 % des Basiszinses berechnet. Freibeträge (insbesondere Grundfreibetrag und Sparer-Pauschbetrag) sowie Basiszins und Soli-Freigrenze werden je Steuerjahr in `src/lib/parameters.ts` gepflegt; die übrigen Steuersätze und Modellkonstanten stehen in `src/lib/calculations/steuer.ts`.
