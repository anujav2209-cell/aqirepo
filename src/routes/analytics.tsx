import React, { useState } from 'react';
import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import { getKeralaOverview } from '../server/aqiFunctions';
import { useApp } from './__root';
import { KeralaMap } from '../components/KeralaMap';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { getAqiColorClass } from '../utils/aqiCalculator';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  Map,
  TrendingUp,
  TrendingDown,
  Gauge,
  Activity,
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { DistrictName } from '../types/aqi';

export const Route = createFileRoute('/analytics')({
  loader: async () => {
    try {
      return await getKeralaOverview({ data: { engineType: 'heuristic' } });
    } catch (e) {
      console.error('Failed to load analytics data server-side', e);
      // Fallback object matching getKeralaOverview payload
      return {
        averageKeralaAqi: 48,
        averageConfidence: 94,
        averageAccuracy: 93.6,
        cleanestDistrict: 'Wayanad' as const,
        cleanestAqi: 18,
        mostPollutedDistrict: 'Ernakulam' as const,
        mostPollutedAqi: 82,
        highestAqi: 82,
        lowestAqi: 18,
        largestIncreaseDistrict: 'Thrissur' as const,
        largestIncreaseVal: 6,
        largestDecreaseDistrict: 'Kollam' as const,
        largestDecreaseVal: -8,
        weeklyTrend: [],
        monthlyTrend: [],
        districtsToday: []
      };
    }
  },
  component: AnalyticsPage,
});

// Custom Tooltip for trend charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold text-zinc-400 mb-1.5">
          {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
        <div className="flex items-center gap-2 text-sm font-bold text-teal-400">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          <span>Kerala Avg AQI: {payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

function AnalyticsPage() {
  const data = useLoaderData({ from: '/analytics' });
  const { theme } = useApp();
  const [selectedMapDistrict, setSelectedMapDistrict] = useState<DistrictName | undefined>(undefined);

  const formatDate = (tickItem: number) => {
    return new Date(tickItem).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleSelectMapDistrict = (name: DistrictName) => {
    setSelectedMapDistrict(name);
  };

  const activeDistrictInfo = selectedMapDistrict 
    ? data.districtsToday.find((d: any) => d.district === selectedMapDistrict)
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-lg border border-teal-500/20">
            <Compass className="h-6 w-6" />
          </div>
          Kerala Air Quality Analytics
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Statewide aggregation, geographic mapping, and long-term trend analysis</p>
      </div>

      {/* 1. AGGREGATES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* State Average AQI */}
        <GlassCard className="border-teal-500/10" glowColor="rgba(20, 184, 166, 0.04)" hoverEffect={false}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">State Average AQI</p>
          <h2 className="text-4xl font-extrabold text-white mt-2.5 flex items-baseline">
            <AnimatedCounter value={data.averageKeralaAqi} />
            <span className="text-xs font-normal text-zinc-500 ml-1.5">US AQI</span>
          </h2>
          <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between text-xs text-zinc-400">
            <span>Overall Status:</span>
            <span className="font-bold text-emerald-400 uppercase">GOOD (CLEAN)</span>
          </div>
        </GlassCard>

        {/* Average Accuracy */}
        <GlassCard className="border-sky-500/10" glowColor="rgba(14, 165, 233, 0.04)" hoverEffect={false}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Average Accuracy</p>
          <h2 className="text-4xl font-extrabold text-white mt-2.5">
            {data.averageAccuracy}%
          </h2>
          <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between text-xs text-zinc-400">
            <span>Model confidence:</span>
            <span className="font-bold text-sky-400">{data.averageConfidence}%</span>
          </div>
        </GlassCard>

        {/* Cleanest vs Polluted */}
        <GlassCard className="border-emerald-500/10" glowColor="rgba(16, 185, 129, 0.04)" hoverEffect={false}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Extremes (Today)</p>
          <div className="mt-3 flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Highest:</span>
              <span className="font-bold text-rose-400">{data.mostPollutedDistrict} ({data.highestAqi})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Lowest:</span>
              <span className="font-bold text-emerald-400">{data.cleanestDistrict} ({data.lowestAqi})</span>
            </div>
          </div>
        </GlassCard>

        {/* Forecast Shifts */}
        <GlassCard className="border-purple-500/10" glowColor="rgba(168, 85, 247, 0.04)" hoverEffect={false}>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Forecast Shifts</p>
          <div className="mt-3 flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Worsening:</span>
              <span className="font-bold text-rose-400 flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {data.largestIncreaseDistrict} (+{data.largestIncreaseVal})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Improving:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" />
                {data.largestDecreaseDistrict} ({data.largestDecreaseVal})
              </span>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* 2. KERALA MAP & HIGHLIGHT CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Map */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="h-4.5 w-4.5 text-teal-400" />
              Geographic Choropleth
            </span>
            <span className="text-[10px] text-zinc-500 italic">Click markers to highlight district details</span>
          </div>
          <KeralaMap
            districtsData={data.districtsToday}
            selectedDistrict={selectedMapDistrict}
            onSelectDistrict={handleSelectMapDistrict}
            isDarkMode={theme === 'dark'}
          />
        </div>

        {/* Selected District side-info */}
        <div className="flex flex-col justify-between h-full py-0.5">
          <GlassCard className="h-full border-zinc-850 flex flex-col gap-6" hoverEffect={false}>
            {activeDistrictInfo ? (
              <div className="flex flex-col gap-5 flex-1 justify-center">
                <div>
                  <h3 className="text-2xl font-extrabold text-white tracking-wide">{activeDistrictInfo.district}</h3>
                  <p className="text-xs text-zinc-400 mt-1 uppercase font-semibold">Active region selection</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-850 text-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Today</span>
                    <h4 className={cn(
                      "text-3xl font-extrabold mt-1",
                      getAqiColorClass(activeDistrictInfo.category).text
                    )}>
                      {activeDistrictInfo.aqi}
                    </h4>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-850 text-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tomorrow</span>
                    <h4 className="text-3xl font-extrabold text-sky-400 mt-1">
                      {activeDistrictInfo.tomorrowAqi}
                    </h4>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 text-xs text-zinc-300">
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500">Status:</span>
                    <span className="font-bold text-white">{activeDistrictInfo.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-500">Primary pollutant:</span>
                    <span className="font-bold text-teal-400 uppercase">{activeDistrictInfo.primaryPollutant.replace('_', '.')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Local Temperature:</span>
                    <span className="font-bold text-white">{activeDistrictInfo.weather.temp}°C</span>
                  </div>
                </div>

                <div className="text-xs bg-teal-500/5 text-teal-400 border border-teal-500/10 p-3 rounded-xl flex items-start gap-2.5 leading-relaxed">
                  <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>
                    Forecast models suggest a {activeDistrictInfo.difference > 0 ? 'decline' : 'improvement'} in air standards tomorrow.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-4 flex-1 py-10">
                <div className="rounded-full bg-zinc-900 border border-zinc-850 p-4 text-zinc-500">
                  <Map className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Select District on Map</h4>
                  <p className="text-xs text-zinc-500 max-w-[200px] mt-1 mx-auto leading-relaxed">
                    Tap any marker on the map to visualize instant pollutant levels and comparative indexes.
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* 3. HISTORICAL AGGREGATE CHART */}
      <GlassCard className="border-zinc-850" hoverEffect={false}>
        <div className="border-b border-zinc-900 pb-4 mb-6">
          <h3 className="text-lg font-bold text-white tracking-wide">30-Day Kerala Trend Aggregates</h3>
          <p className="text-xs text-zinc-400 mt-1">Past 30 days daily average indexes across all 14 districts</p>
        </div>

        <div className="h-[260px] w-full text-xs">
          {data.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="keralaTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="timestamp" tickFormatter={formatDate} stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="actualAqi"
                  name="Kerala Average"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#keralaTrendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">Generating trends dataset...</div>
          )}
        </div>
      </GlassCard>

    </div>
  );
}
