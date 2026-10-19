import React from 'react';
import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router';
import { getAqiDetails, exportDistrictReport } from '../server/aqiFunctions';
import { DISTRICT_LIST } from '../types/aqi';
import type { DistrictName } from '../types/aqi';
import { getAqiColorClass, getAqiCategory } from '../utils/aqiCalculator';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { DashboardCharts } from '../components/DashboardCharts';
import { HealthRecommendationsCard } from '../components/HealthRecommendations';
import {
  Wind,
  CloudRain,
  Thermometer,
  Gauge,
  Sparkles,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Heart
} from 'lucide-react';
import { cn } from '../utils/cn';

// Define routing search parameters
export const Route = createFileRoute('/dashboard')({
  validateSearch: (search: Record<string, unknown>): { district?: DistrictName; engine?: 'heuristic' | 'ml' } => {
    return {
      district: (search.district as DistrictName) || 'Thiruvananthapuram',
      engine: (search.engine as 'heuristic' | 'ml') || 'heuristic'
    };
  },
  loaderDeps: ({ search: { district, engine } }) => ({ district, engine }),
  loader: async ({ deps: { district, engine } }) => {
    const activeDistrict = district || 'Thiruvananthapuram';
    const engineType = engine || 'heuristic';
    
    try {
      return await getAqiDetails({ data: { district: activeDistrict, engineType } });
    } catch (e) {
      console.error('Failed to load dashboard data server-side', e);
      // Generate simulated fallback data
      const mockDataProvider = await import('../services/dataProvider');
      const currentData = mockDataProvider.getSimulatedData(activeDistrict);
      const history = (await import('../server/aqiFunctions')).generateDistrictHistory(activeDistrict, 30);
      const predictionEngine = await import('../prediction/engine');
      const activeEngine = predictionEngine.PredictionManager.getEngine(engineType);
      const prediction = await activeEngine.predict(currentData, history);
      return {
        currentData,
        prediction,
        history,
        engineName: activeEngine.name
      };
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { currentData, prediction, history, engineName } = useLoaderData({ from: '/dashboard' });
  const { district, engine } = Route.useSearch();
  const navigate = useNavigate({ from: '/dashboard' });

  const colors = getAqiColorClass(currentData.category);
  const tomorrowColors = getAqiColorClass(prediction.category);

  // Today vs Tomorrow AQI calculations
  const aqiDiff = prediction.predictedAqi - currentData.aqi;
  const pctChange = parseFloat(((aqiDiff / currentData.aqi) * 100).toFixed(1));

  // CSV Report Export Handler
  const handleExportCSV = async () => {
    try {
      const result = await exportDistrictReport({ data: { district } });
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', result.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Failed to export CSV report.');
    }
  };

  // PDF print trigger
  const handlePrintPDF = () => {
    window.print();
  };

  // Pollutant threshold guidelines (e.g. WHO 24h limits)
  const pollutantMeta = {
    pm2_5: { label: 'PM2.5', limit: 15, unit: 'µg/m³', desc: 'Fine respirable particles' },
    pm10: { label: 'PM10', limit: 45, unit: 'µg/m³', desc: 'Coarse inhalable particles' },
    no2: { label: 'NO₂', limit: 25, unit: 'µg/m³', desc: 'Nitrogen Dioxide (traffic)' },
    so2: { label: 'SO₂', limit: 40, unit: 'µg/m³', desc: 'Sulfur Dioxide (industries)' },
    co: { label: 'CO', limit: 4, unit: 'mg/m³', desc: 'Carbon Monoxide' },
    o3: { label: 'O₃', limit: 100, unit: 'µg/m³', desc: 'Ground-level Ozone' },
  };

  // Circular gauge coordinates (radius = 60, circumference = 377)
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const aqiRatio = Math.min(1, currentData.aqi / 300); // normalized against 300
  const strokeDashoffset = circumference * (1 - aqiRatio);

  return (
    <div className="flex flex-col gap-8 print:p-0">
      
      {/* 1. PRINT HEADER (Visible only when generating PDF via window.print) */}
      <div className="hidden print:flex flex-col gap-2 border-b border-zinc-300 pb-4 mb-4 text-zinc-950">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold">{district} Air Quality Report</h1>
          <span className="text-sm font-semibold">{new Date().toLocaleString()}</span>
        </div>
        <p className="text-xs">Generated via Air Quality Predictor. Active engine: {engineName}</p>
      </div>

      {/* 2. MAIN HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{district}</h1>
            <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-semibold">
              Live Dashboard
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Last checked: {new Date(currentData.timestamp).toLocaleTimeString()} ({currentData.provider})
          </p>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-3">
          {/* Quick select selector */}
          <select
            value={district}
            onChange={(e) => navigate({ to: '/dashboard', search: (old) => ({ ...old, district: e.target.value as DistrictName }) })}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 outline-none cursor-pointer focus:ring-1 focus:ring-teal-500/30"
          >
            {DISTRICT_LIST.map(name => (
              <option key={name} value={name} className="bg-zinc-950 text-white">{name}</option>
            ))}
          </select>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Print PDF button */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-400 text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {/* 3. METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card A: Today's live AQI */}
        <GlassCard className="flex flex-col items-center text-center p-8 border-teal-500/10" hoverEffect={false}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">Today's Air Quality</p>
          
          {/* Speedometer Circle */}
          <div className="relative h-36 w-36 flex items-center justify-center mb-6">
            <svg className="h-full w-full transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke="#1c1917"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Colored active ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke={colors.hex}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none">
                <AnimatedCounter value={currentData.aqi} />
              </h2>
              <span className="text-[10px] text-zinc-400 font-bold uppercase mt-1 tracking-wider">Index</span>
            </div>
          </div>

          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase shadow-lg",
            colors.text, colors.bg, colors.border, colors.glow
          )}>
            {currentData.category}
          </span>
          <p className="text-[11px] text-zinc-500 mt-4 leading-relaxed max-w-[220px]">
            Primary pollutant is <span className="text-teal-400 font-bold uppercase">{currentData.primaryPollutant.replace('_', '.')}</span>. Air filters are generally not required for standard individuals.
          </p>
        </GlassCard>

        {/* Card B: Tomorrow's Prediction */}
        <GlassCard className="border-sky-500/10" hoverEffect={false}>
          <div className="flex justify-between items-center mb-6">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tomorrow's Prediction</p>
            <div className="flex items-center gap-1 text-sky-400 text-xs font-bold uppercase bg-sky-500/5 px-2 py-0.5 rounded border border-sky-500/15">
              <Sparkles className="h-3 w-3" />
              <span>AI Forecast</span>
            </div>
          </div>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-5xl font-extrabold text-white tracking-tight flex items-baseline">
                {prediction.predictedAqi}
                <span className="text-xs font-medium text-zinc-500 ml-2">AQI</span>
              </h3>
              <p className={cn("text-xs font-bold uppercase mt-1 tracking-wide", tomorrowColors.text)}>
                {prediction.category}
              </p>
            </div>

            {/* Today vs Tomorrow Trend badge */}
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border",
              aqiDiff > 0 ? "text-rose-400 bg-rose-500/5 border-rose-500/20" : aqiDiff < 0 ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20" : "text-zinc-400 bg-zinc-900 border-zinc-800"
            )}>
              {aqiDiff > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>+{aqiDiff} (+{pctChange}%)</span>
                </>
              ) : aqiDiff < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span>{aqiDiff} ({pctChange}%)</span>
                </>
              ) : (
                <span>Unchanged</span>
              )}
            </div>
          </div>

          {/* Explanation text */}
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-850 p-4 mb-4">
            <h4 className="text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-sky-400" />
              Explanation
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">{prediction.explanation}</p>
          </div>

          {/* Model Confidence Meter */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-zinc-400 uppercase tracking-wider">Model Confidence</span>
              <span className="text-sky-400">{prediction.confidence}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-1000 ease-out"
                style={{ width: `${prediction.confidence}%` }}
              />
            </div>
          </div>
        </GlassCard>

        {/* Card C: Weather Summary */}
        <GlassCard className="border-zinc-800" hoverEffect={false}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">Local Weather coupling</p>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-zinc-900 p-3 text-teal-400 border border-zinc-850">
                <CloudRain className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{currentData.weather.summary}</h3>
                <span className="text-xs text-zinc-400">Atmospheric Condition</span>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-extrabold text-white tracking-tight flex items-baseline">
                {currentData.weather.temp}
                <span className="text-sm font-semibold text-zinc-500 ml-0.5">°C</span>
              </h3>
            </div>
          </div>

          {/* Weather stats grid */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div className="bg-zinc-900/40 border border-zinc-850/80 p-3 rounded-xl flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Humidity</span>
              <span className="font-bold text-zinc-200">{currentData.weather.humidity}%</span>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-850/80 p-3 rounded-xl flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Wind Speed</span>
              <span className="font-bold text-zinc-200">{currentData.weather.windSpeed} m/s</span>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-850/80 p-3 rounded-xl flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Rainfall</span>
              <span className="font-bold text-zinc-200">{currentData.weather.rain} mm/h</span>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-850/80 p-3 rounded-xl flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Wind Dir</span>
              <span className="font-bold text-zinc-200">{currentData.weather.windDir}°</span>
            </div>
          </div>

          {/* Meteorological coupling advisory */}
          <div className="mt-4 flex gap-2 items-start border-t border-zinc-900 pt-4 text-[11px] text-zinc-500">
            <AlertTriangle className="h-4 w-4 text-amber-500/80 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Wind speeds below 1.5 m/s trap particulate concentration, increasing regional index values.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* 4. HEALTH RECOMMENDATIONS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HealthRecommendationsCard category={currentData.category} />
        </div>
        
        {/* Prediction Explainer card details */}
        <GlassCard className="flex flex-col border-sky-500/10 shadow-sky-950/5" hoverEffect={false}>
          <h3 className="text-base font-bold text-white mb-4 tracking-wide flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-sky-400" />
            Model Decision Triggers
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            Factors driving the forecast model pipeline for tomorrow's prediction. Evaluated using {engine === 'heuristic' ? 'meteorological chemical heuristics' : 'XGBoost regression coefficients'}.
          </p>

          <div className="flex flex-col gap-2.5 flex-1">
            {prediction.reasons.map((reason, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs p-3 rounded-xl bg-zinc-900/30 border border-zinc-850/80">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span className="text-zinc-300 font-medium leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-zinc-600 mt-4 font-semibold uppercase tracking-wider flex items-center justify-between border-t border-zinc-900 pt-3">
            <span>Pipeline: {engineName.split(' ')[0]}</span>
            <span>Target Error limit: &lt; 10 AQI</span>
          </div>
        </GlassCard>
      </div>

      {/* 5. POLLUTANT BREAKDOWN GAUGES */}
      <GlassCard className="border-zinc-850" hoverEffect={false}>
        <div className="border-b border-zinc-900 pb-4 mb-6">
          <h3 className="text-lg font-bold text-white tracking-wide">Detailed Pollutant Breakdown</h3>
          <p className="text-xs text-zinc-400 mt-1">Concentration levels compared against environmental safety limits</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(pollutantMeta).map(([key, meta]) => {
            const val = currentData.pollutants[key as keyof typeof currentData.pollutants];
            const ratio = Math.min(1, val / (meta.limit * 2.5)); // Normalized slider
            const percentage = Math.round(ratio * 100);

            // Color tag based on guideline threshold
            const isExceeded = val > meta.limit;

            return (
              <div key={key} className="p-4.5 rounded-2xl bg-zinc-900/30 border border-zinc-850 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm tracking-wide">{meta.label}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{meta.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-white">{val}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">{meta.unit}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isExceeded ? "bg-rose-500" : "bg-teal-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold mt-1 text-zinc-500">
                    <span>Limit: {meta.limit} {meta.unit}</span>
                    <span className={cn(
                      "uppercase tracking-wider",
                      isExceeded ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {isExceeded ? 'EXCEEDED' : 'SAFE'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 6. HISTORICAL CHARTS */}
      <DashboardCharts history={history} current={currentData} />

    </div>
  );
}
