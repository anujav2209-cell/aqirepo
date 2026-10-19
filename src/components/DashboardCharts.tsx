import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import type { HistoryRecord, AQIRecord } from '../types/aqi';
import { GlassCard } from './ui/GlassCard';
import { Calendar, BarChart3, CloudRain, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/cn';

interface DashboardChartsProps {
  history: HistoryRecord[];
  current: AQIRecord;
}

// Custom Premium Glassmorphic Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dateStr = typeof label === 'number'
      ? new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : label;

    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold text-zinc-400 mb-1.5">{dateStr}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm font-semibold" style={{ color: item.color || item.fill }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-zinc-300">{item.name}:</span>
              <span className="text-white font-bold ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ history, current }: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'pollutants' | 'weather' | 'errors'>('trends');

  // 1. Prepare Trends Data (Actual vs Predicted)
  const trendsData = history.map((h) => ({
    date: h.timestamp,
    'Actual AQI': h.actualAqi,
    'Predicted AQI': h.predictedAqi,
  }));

  // 2. Prepare Pollutant Trends Data (Simulate historical pollutants based on AQI variation)
  const pollutantData = history.map((h, i) => {
    // Correlate pollutants roughly with AQI fluctuations
    const ratio = h.actualAqi / current.aqi;
    return {
      date: h.timestamp,
      'PM2.5': parseFloat((current.pollutants.pm2_5 * ratio).toFixed(1)),
      'PM10': parseFloat((current.pollutants.pm10 * ratio).toFixed(1)),
      'NO2': parseFloat((current.pollutants.no2 * ratio).toFixed(1)),
      'SO2': parseFloat((current.pollutants.so2 * ratio).toFixed(1)),
      'O3': parseFloat((current.pollutants.o3 * ratio).toFixed(1)),
    };
  });

  // 3. Prepare Weather correlation data
  const weatherData = history.map((h, i) => {
    // Generate simulated past weather elements matching the trend
    const ratio = h.actualAqi / current.aqi;
    // Lower wind = higher AQI
    const windSpeed = parseFloat(Math.max(0.5, current.weather.windSpeed * (2 - ratio) + (i % 3) * 0.2).toFixed(1));
    // Rain washes out AQI
    const rain = h.actualAqi < 30 ? parseFloat((Math.random() * 5 + 1).toFixed(1)) : 0;

    return {
      date: h.timestamp,
      AQI: h.actualAqi,
      'Wind Speed (m/s)': windSpeed,
      'Rainfall (mm)': rain,
    };
  });

  // 4. Prepare Error Data
  const errorData = history.map((h) => ({
    date: h.timestamp,
    'Model Error': h.error || 0,
  }));

  const formatDate = (tickItem: number) => {
    return new Date(tickItem).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <GlassCard className="border-teal-500/10 shadow-teal-950/5" hoverEffect={false}>
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Historical Analysis & Projections</h3>
            <p className="text-xs text-zinc-400">Past 30 days tracking and AI prediction margins</p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 w-fit">
            {[
              { id: 'trends', label: 'AQI Forecast', icon: Calendar },
              { id: 'pollutants', label: 'Pollutants', icon: BarChart3 },
              { id: 'weather', label: 'Weather vs AQI', icon: CloudRain },
              { id: 'errors', label: 'Model Error', icon: ShieldAlert }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 focus:outline-none",
                    activeTab === tab.id
                      ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-md"
                      : "border border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Charts Container */}
        <div className="h-[320px] w-full text-xs">
          
          {/* 1. TRENDS CHART */}
          {activeTab === 'trends' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                {/* Visual guidelines for AQI standards */}
                <ReferenceLine y={50} stroke="#10b981" strokeDasharray="3 3" opacity={0.4} />
                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.4} />
                <ReferenceLine y={150} stroke="#f97316" strokeDasharray="3 3" opacity={0.4} />

                <Area
                  type="monotone"
                  dataKey="Actual AQI"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#actualGrad)"
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="Predicted AQI"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#predGrad)"
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* 2. POLLUTANT CHART */}
          {activeTab === 'pollutants' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pollutantData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="pm10Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                <Area type="monotone" dataKey="PM2.5" stroke="#3b82f6" strokeWidth={2} fill="url(#pm25Grad)" />
                <Area type="monotone" dataKey="PM10" stroke="#10b981" strokeWidth={2} fill="url(#pm10Grad)" />
                <Area type="monotone" dataKey="NO2" stroke="#f59e0b" strokeWidth={1.5} fill="none" />
                <Area type="monotone" dataKey="SO2" stroke="#ef4444" strokeWidth={1.5} fill="none" />
                <Area type="monotone" dataKey="O3" stroke="#8b5cf6" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* 3. WEATHER CORRELATION CHART */}
          {activeTab === 'weather' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weatherData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#71717a" />
                <YAxis yAxisId="left" stroke="#71717a" label={{ value: 'AQI', angle: -90, position: 'insideLeft', offset: 10, fill: '#71717a' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#71717a" label={{ value: 'Wind (m/s) & Rain (mm)', angle: 90, position: 'insideRight', offset: 0, fill: '#71717a' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                <Line yAxisId="left" type="monotone" dataKey="AQI" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Wind Speed (m/s)" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Rainfall (mm)" stroke="#818cf8" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* 4. MODEL ERROR CHART */}
          {activeTab === 'errors' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                {/* Horizontal reference for maximum target warning error of 10 AQI points */}
                <ReferenceLine y={10} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Error Limit Target', fill: '#f43f5e', position: 'top' }} opacity={0.6} />

                <Bar
                  dataKey="Model Error"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.65}
                  stroke="#f43f5e"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

        </div>

      </div>
    </GlassCard>
  );
}
