import { berechneSzenarioKennzahlen } from "@/lib/calculations/szenarien";
import { useCalculatorStore } from "@/store/calculatorStore";

describe("Szenarien", () => {
  it("berechnet vergleichbare Kennzahlen aus einem Szenario", () => {
    const state = useCalculatorStore.getState();
    const kennzahlen = berechneSzenarioKennzahlen({
      gruendung: state.gruendung,
      betrieb: { ...state.betrieb, laufzeitJahre: 1, etfRendite: 4 },
      ende: state.ende,
    });

    expect(kennzahlen.jahreswerte).toHaveLength(1);
    expect(Number.isFinite(kennzahlen.endvermoegen)).toBe(true);
  });

  it("stellt drei voreingestellte Szenarien bereit und kann ein Szenario laden", () => {
    const initial = useCalculatorStore.getState();
    expect(initial.scenarios).toHaveLength(3);

    initial.loadScenario("konservativ");
    expect(useCalculatorStore.getState().betrieb.etfRendite).toBe(4);
  });
});
