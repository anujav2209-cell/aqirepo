import type { AqiCategory, PollutantLevels } from '../types/aqi';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const BREAKPOINTS: Record<keyof PollutantLevels, Breakpoint[]> = {
  pm2_5: [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
    { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
  ],
  no2: [
    { cLow: 0.0, cHigh: 100.0, iLow: 0, iHigh: 50 },
    { cLow: 100.1, cHigh: 188.0, iLow: 51, iHigh: 100 },
    { cLow: 188.1, cHigh: 677.0, iLow: 101, iHigh: 150 },
    { cLow: 677.1, cHigh: 1221.0, iLow: 151, iHigh: 200 },
    { cLow: 1221.1, cHigh: 2350.0, iLow: 201, iHigh: 300 },
    { cLow: 2350.1, cHigh: 3100.0, iLow: 301, iHigh: 400 },
    { cLow: 3100.1, cHigh: 3850.0, iLow: 401, iHigh: 500 },
  ],
  so2: [
    { cLow: 0.0, cHigh: 92.0, iLow: 0, iHigh: 50 },
    { cLow: 92.1, cHigh: 196.0, iLow: 51, iHigh: 100 },
    { cLow: 196.1, cHigh: 484.0, iLow: 101, iHigh: 150 },
    { cLow: 484.1, cHigh: 796.0, iLow: 151, iHigh: 200 },
    { cLow: 796.1, cHigh: 1581.0, iLow: 201, iHigh: 300 },
    { cLow: 1581.1, cHigh: 2100.0, iLow: 301, iHigh: 400 },
    { cLow: 2100.1, cHigh: 2620.0, iLow: 401, iHigh: 500 },
  ],
  co: [
    { cLow: 0.0, cHigh: 4.4, iLow: 0, iHigh: 50 },
    { cLow: 4.5, cHigh: 9.4, iLow: 51, iHigh: 100 },
    { cLow: 9.5, cHigh: 12.4, iLow: 101, iHigh: 150 },
    { cLow: 12.5, cHigh: 15.4, iLow: 151, iHigh: 200 },
    { cLow: 15.5, cHigh: 30.4, iLow: 201, iHigh: 300 },
    { cLow: 30.5, cHigh: 40.4, iLow: 301, iHigh: 400 },
    { cLow: 40.5, cHigh: 50.4, iLow: 401, iHigh: 500 },
  ],
  o3: [
    { cLow: 0.0, cHigh: 106.0, iLow: 0, iHigh: 50 },
    { cLow: 106.1, cHigh: 137.0, iLow: 51, iHigh: 100 },
    { cLow: 137.1, cHigh: 167.0, iLow: 101, iHigh: 150 },
    { cLow: 167.1, cHigh: 206.0, iLow: 151, iHigh: 200 },
    { cLow: 206.1, cHigh: 393.0, iLow: 201, iHigh: 300 },
    { cLow: 393.1, cHigh: 785.0, iLow: 301, iHigh: 400 },
    { cLow: 785.1, cHigh: 981.0, iLow: 401, iHigh: 500 },
  ],
};

function calculatePollutantAqi(value: number, breakpoints: Breakpoint[]): number {
  const bp = breakpoints.find((b) => value >= b.cLow && value <= b.cHigh);
  if (!bp) {
    // If exceeded maximum value, return the maximum AQI limit
    if (value > breakpoints[breakpoints.length - 1].cHigh) {
      return 500;
    }
    return 0;
  }
  const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (value - bp.cLow) + bp.iLow;
  return Math.round(aqi);
}

export function calculateOverallAqi(pollutants: PollutantLevels): {
  aqi: number;
  primaryPollutant: keyof PollutantLevels;
} {
  let maxAqi = 0;
  let primaryPollutant: keyof PollutantLevels = 'pm2_5';

  Object.entries(pollutants).forEach(([key, val]) => {
    const pKey = key as keyof PollutantLevels;
    const aqi = calculatePollutantAqi(val, BREAKPOINTS[pKey]);
    if (aqi > maxAqi) {
      maxAqi = aqi;
      primaryPollutant = pKey;
    }
  });

  return { aqi: maxAqi, primaryPollutant };
}

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function getAqiColorClass(category: AqiCategory): {
  bg: string;
  text: string;
  border: string;
  glow: string;
  hex: string;
} {
  switch (category) {
    case 'Good':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
        hex: '#10b981',
      };
    case 'Moderate':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        glow: 'shadow-yellow-500/20',
        hex: '#f59e0b',
      };
    case 'Unhealthy for Sensitive Groups':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        glow: 'shadow-orange-500/20',
        hex: '#f97316',
      };
    case 'Unhealthy':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
        glow: 'shadow-red-500/20',
        hex: '#ef4444',
      };
    case 'Very Unhealthy':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        glow: 'shadow-purple-500/20',
        hex: '#a855f7',
      };
    case 'Hazardous':
    default:
      return {
        bg: 'bg-rose-950/20',
        text: 'text-rose-600',
        border: 'border-rose-900/40',
        glow: 'shadow-rose-950/30',
        hex: '#881337',
      };
  }
}
