import { BetriebState, EndeState } from "./types";

export function ermittleEingabeWarnungen(
  betrieb: BetriebState,
  ende: EndeState,
): string[] {
  const warnungen: string[] = [];
  const startkapital = Number(betrieb.startkapital);
  const darlehensbetrag = Number(betrieb.darlehen?.betrag);
  const laufzeit = Number(betrieb.laufzeitJahre);
  const darlehenszins = Number(betrieb.darlehen?.zinssatz);
  const etfRendite = Number(betrieb.etfRendite);
  const gehalt = Number(betrieb.geschaeftsfuehrergehalt ?? 0);
  const tilgung = Number(ende.tilgungsrate);

  if (!Number.isFinite(startkapital) || startkapital <= 0) {
    warnungen.push("Startkapital fehlt oder ist 0 €. Ohne Startkapital kann die GmbH kein Anfangsvermögen investieren.");
  }
  if (!Number.isFinite(laufzeit) || laufzeit < 1 || laufzeit > 50) {
    warnungen.push("Die Laufzeit sollte zwischen 1 und 50 Jahren liegen.");
  } else if (laufzeit < 5) {
    warnungen.push("Eine Laufzeit von weniger als 5 Jahren ist für einen langfristigen Vermögensaufbau ungewöhnlich.");
  }
  if (!Number.isFinite(etfRendite) || etfRendite < 0 || etfRendite > 20) {
    warnungen.push("Die ETF-Rendite liegt außerhalb einer plausiblen Bandbreite von 0 bis 20 % p.a.");
  }
  if (!Number.isFinite(darlehenszins) || darlehenszins < 0 || darlehenszins > 15) {
    warnungen.push("Der Darlehenszinssatz liegt außerhalb einer plausiblen Bandbreite von 0 bis 15 % p.a.");
  }
  if (Number.isFinite(darlehensbetrag) && darlehensbetrag > 0) {
    if (!Number.isFinite(startkapital) || startkapital <= 0) {
      warnungen.push("Ein Darlehen ohne eigenes Startkapital sollte wirtschaftlich besonders begründet werden.");
    } else if (darlehensbetrag > startkapital * 5) {
      warnungen.push("Der Darlehensbetrag ist mehr als fünfmal so hoch wie das Startkapital. Bitte prüfen Sie die Geschäftslogik und Finanzierung.");
    }
  }
  if (gehalt > 0 && gehalt < 12000) {
    warnungen.push("Das jährliche GF-Gehalt liegt unter 12.000 € und ist für eine reguläre Geschäftsführertätigkeit ungewöhnlich.");
  } else if (gehalt > 300000) {
    warnungen.push("Das jährliche GF-Gehalt über 300.000 € liegt außerhalb einer üblichen Bandbreite.");
  }
  if (tilgung > 0 && tilgung > Math.max(0, darlehensbetrag)) {
    warnungen.push("Die jährliche Tilgung ist höher als der Darlehensbetrag. Bitte prüfen Sie die Tilgungsrate.");
  }
  if (Number(ende.gewinnausschuettung) > 250000) {
    warnungen.push("Die jährliche Gewinnausschüttung über 250.000 € ist ungewöhnlich hoch und sollte geprüft werden.");
  }
  if (Number(ende.zielnettoBereich1) > 250000 || Number(ende.zielnettoBereich2) > 250000) {
    warnungen.push("Das Zielnetto über 250.000 € pro Jahr ist ungewöhnlich hoch. Bitte prüfen Sie den eingegebenen Wert.");
  }

  return warnungen;
}
