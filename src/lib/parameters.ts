export type Steuerjahr = 2024 | 2025 | 2026;

export interface SteuerjahrParameter {
  jahr: Steuerjahr;
  bezeichnung: string;
  grundfreibetrag: number;
  zone1Max: number;
  zone2Max: number;
  spitzensteuerStart: number;
  zone1A: number;
  zone1B: number;
  zone2A: number;
  zone2B: number;
  zone2C: number;
  offset42: number;
  offset45: number;
  soliFreigrenzeEinkommensteuer: number;
  soliMilderungFaktor: number;
  gkvBemessungMonatMax: number;
  gkvBemessungJahrMax: number;
  gkvZusatzbeitrag: number;
  gkvBeitragssatz: number;
  midijobMonatMin: number;
  midijobJahrMin: number;
  midijobJahrMax: number;
  basiszins: number;
}

export const STEUERJAHR_PARAMETER: Record<Steuerjahr, SteuerjahrParameter> = {
  2024: {
    jahr: 2024,
    bezeichnung: "Steuer- & Sozialwerte 2024",
    grundfreibetrag: 11784,
    zone1Max: 17005,
    zone2Max: 66760,
    spitzensteuerStart: 277825,
    zone1A: 995.21,
    zone1B: 1400,
    zone2A: 208.85,
    zone2B: 2397,
    zone2C: 1025.38,
    offset42: 10602.13,
    offset45: 18936.88,
    soliFreigrenzeEinkommensteuer: 18130,
    soliMilderungFaktor: 0.119,
    gkvBemessungMonatMax: 5175.0,
    gkvBemessungJahrMax: 62100.0,
    gkvZusatzbeitrag: 0.017,
    gkvBeitragssatz: 0.146 + 0.017, // 16.3%
    midijobMonatMin: 538,
    midijobJahrMin: 538 * 12, // 6456
    midijobJahrMax: 24000,
    basiszins: 0.0229,
  },
  2025: {
    jahr: 2025,
    bezeichnung: "Steuer- & Sozialwerte 2025",
    grundfreibetrag: 12096,
    zone1Max: 17443,
    zone2Max: 68430,
    spitzensteuerStart: 277825,
    zone1A: 988.29,
    zone1B: 1400,
    zone2A: 206.43,
    zone2B: 2397,
    zone2C: 1076.66,
    offset42: 11102.16,
    offset45: 19436.91,
    soliFreigrenzeEinkommensteuer: 19228,
    soliMilderungFaktor: 0.119,
    gkvBemessungMonatMax: 5512.5,
    gkvBemessungJahrMax: 5512.5 * 12, // 66150
    gkvZusatzbeitrag: 0.025,
    gkvBeitragssatz: 0.146 + 0.025, // 17.1%
    midijobMonatMin: 556,
    midijobJahrMin: 556 * 12, // 6672
    midijobJahrMax: 24000,
    basiszins: 0.0253,
  },
  2026: {
    jahr: 2026,
    bezeichnung: "Steuer- & Sozialwerte 2026",
    grundfreibetrag: 12348,
    zone1Max: 17799,
    zone2Max: 69797,
    spitzensteuerStart: 277825,
    zone1A: 982.83,
    zone1B: 1400,
    zone2A: 204.3,
    zone2B: 2397,
    zone2C: 1127.35,
    offset42: 11599.89,
    offset45: 19934.64,
    soliFreigrenzeEinkommensteuer: 20316,
    soliMilderungFaktor: 0.119,
    gkvBemessungMonatMax: 5812.5,
    gkvBemessungJahrMax: 5812.5 * 12, // 69750
    gkvZusatzbeitrag: 0.029,
    gkvBeitragssatz: 0.146 + 0.029, // 17.5%
    midijobMonatMin: 603,
    midijobJahrMin: 603 * 12, // 7236
    midijobJahrMax: 24000,
    basiszins: 0.0253,
  },
};

export const DEFAULT_STEUERJAHR: Steuerjahr = 2025;

export function getSteuerjahrParameter(jahr?: Steuerjahr): SteuerjahrParameter {
  const selected = jahr && STEUERJAHR_PARAMETER[selectedYear(jahr)] ? STEUERJAHR_PARAMETER[selectedYear(jahr)] : STEUERJAHR_PARAMETER[DEFAULT_STEUERJAHR];
  return selected;
}

function selectedYear(jahr: Steuerjahr): Steuerjahr {
  if (jahr === 2024 || jahr === 2025 || jahr === 2026) return jahr;
  return DEFAULT_STEUERJAHR;
}
