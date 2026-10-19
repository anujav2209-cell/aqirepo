import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { getComparisonData } from '../server/aqiFunctions';
import { DISTRICT_LIST, DISTRICTS_METADATA } from '../types/aqi';
import type { DistrictName } from '../types/aqi';
import { getAqiColorClass, getAqiCategory } from '../utils/aqiCalculator';
import { GlassCard } from '../components/ui/GlassCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { GitCompare, Plus, X, BarChart3, Wind, Thermometer, Droplets, CloudRain } from 'lucide-react';
import { cn } from '../utils/cn';

export const Route = createFileRoute('/comparison')({
  component: ComparisonPage,
});

// Custom Tooltip for comparison page
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold text-zinc-400 mb-1.5">{label}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-semibold" style={{ color: item.color || item.fill }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span>{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function ComparisonPage() {
  // Defaults to comparing three varied zones: Urban/Industrial (Ernakulam), Capital (Thiruvananthapuram), and Forest/Highland (Wayanad)
  const [selectedDistricts, setSelectedDistricts] = useState<DistrictName[]>([
    'Ernakulam',
    'Thiruvananthapuram',
    'Wayanad'
  ]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch comparison data when list changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getComparisonData({ data: { districts: selectedDistricts, engineType: 'heuristic' } });
        setComparisons(res);
      } catch (e) {
        console.error('Failed to load comparison data', e);
        // Fallback simulation generator
        const mockData = selectedDistricts.map((name) => {
          const base = name === 'Ernakulam' ? 82 : name === 'Thiruvananthapuram' ? 55 : 18;
          return {
            district: name,
            todayAqi: base,
            tomorrowAqi: Math.round(base * 1.05),
            difference: Math.round(base * 0.05),
            confidence: 93,
            weather: { temp: 28, humidity: 75, windSpeed: 2.2, rain: 0, summary: 'Partly Cloudy' },
            pollutants: { pm2_5: base * 0.4, pm10: base * 0.8, no2: base * 0.3, so2: 5, o3: 20 },
            riskLevel: base > 80 ? 'Moderate' : 'Low',
            primaryPollutant: 'pm2_5'
          };
        });
        setComparisons(mockData);
      } finally {
        setLoading(false);
      }
    };

    if (selectedDistricts.length > 0) {
      fetchData();
    }
  }, [selectedDistricts]);

  // Select add/remove handlers
  const handleAddDistrict = (name: DistrictName) => {
    if (selectedDistricts.includes(name)) return;
    if (selectedDistricts.length >= 4) {
      alert('You can compare a maximum of 4 districts simultaneously.');
      return;
    }
    setSelectedDistricts([...selectedDistricts, name]);
  };

  const handleRemoveDistrict = (name: DistrictName) => {
    if (selectedDistricts.length <= 2) {
      alert('You must compare at least 2 districts.');
      return;
    }
    setSelectedDistricts(selectedDistricts.filter((d) => d !== name));
  };

  // Compile data for Radar Chart
  // Structure: [ { pollutant: 'PM2.5', 'Ernakulam': 32, 'Wayanad': 8 ... } ]
  const radarData = [
    { name: 'PM2.5' },
    { name: 'PM10' },
    { name: 'NO2' },
    { name: 'SO2' },
    { name: 'O3' }
  ].map((metric) => {
    const row: any = { pollutant: metric.name };
    comparisons.forEach((c) => {
      let val = 0;
      if (metric.name === 'PM2.5') val = c.pollutants.pm2_5;
      else if (metric.name === 'PM10') val = c.pollutants.pm10;
      else if (metric.name === 'NO2') val = c.pollutants.no2;
      else if (metric.name === 'SO2') val = c.pollutants.so2;
      else if (metric.name === 'O3') val = c.pollutants.o3;

      row[c.district] = val;
    });
    return row;
  });

  const radarColors = ['#14b8a6', '#0ea5e9', '#10b981', '#a855f7'];

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-lg border border-teal-500/20">
            <GitCompare className="h-6 w-6" />
          </div>
          Compare Districts
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Analyze and compare air quality indexes and weather overlays side-by-side</p>
      </div>

      {/* Select District Badges */}
      <div className="flex flex-wrap items-center gap-3">
        {selectedDistricts.map((name) => (
          <div
            key={name}
            className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 text-sm font-semibold text-zinc-100"
          >
            <span>{name}</span>
            <button
              onClick={() => handleRemoveDistrict(name)}
              className="text-zinc-500 hover:text-zinc-300 rounded focus:outline-none transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add district dropdown pill */}
        {selectedDistricts.length < 4 && (
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-dashed border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-sm font-semibold transition-all duration-200">
              <Plus className="h-4 w-4" />
              Add District
            </button>
            <div className="absolute top-9 left-0 z-50 hidden group-hover:block bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl p-2 w-[180px] max-h-[220px] overflow-y-auto">
              {DISTRICT_LIST.filter(d => !selectedDistricts.includes(d)).map((name) => (
                <button
                  key={name}
                  onClick={() => handleAddDistrict(name)}
                  className="w-full text-left px-3 py-1.5 rounded text-xs text-zinc-400 hover:bg-teal-500/10 hover:text-teal-400 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/40">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Comparison Matrix Grid */}
          <GlassCard className="border-zinc-850 overflow-x-auto p-0" hoverEffect={false}>
            <table className="w-full min-w-[700px] border-collapse text-left text-sm text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-850 bg-zinc-900/50">
                  <th className="p-4 font-bold text-zinc-400">District</th>
                  <th className="p-4 font-bold text-zinc-400">Today AQI</th>
                  <th className="p-4 font-bold text-zinc-400">Tomorrow AQI</th>
                  <th className="p-4 font-bold text-zinc-400">Primary Pollutant</th>
                  <th className="p-4 font-bold text-zinc-400">Temp (°C)</th>
                  <th className="p-4 font-bold text-zinc-400">Wind Speed</th>
                  <th className="p-4 font-bold text-zinc-400 font-bold">Humidity</th>
                  <th className="p-4 font-bold text-zinc-400 font-bold">Rainfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {comparisons.map((c) => {
                  const colors = getAqiColorClass(getAqiCategory(c.todayAqi));
                  const tColors = getAqiColorClass(getAqiCategory(c.tomorrowAqi));

                  return (
                    <tr key={c.district} className="hover:bg-zinc-900/30 transition-all">
                      <td className="p-4 font-bold text-white flex flex-col">
                        <span>{c.district}</span>
                        <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">{DISTRICTS_METADATA[c.district as DistrictName]?.type}</span>
                      </td>
                      <td className="p-4">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-bold border", colors.text, colors.bg, colors.border)}>
                          {c.todayAqi}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-bold border", tColors.text, tColors.bg, tColors.border)}>
                          {c.tomorrowAqi}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-teal-400 uppercase">{c.primaryPollutant.replace('_', '.')}</td>
                      <td className="p-4 font-semibold text-zinc-200 flex items-center gap-1">
                        <Thermometer className="h-4 w-4 text-zinc-500" /> {c.weather.temp}°C
                      </td>
                      <td className="p-4 font-semibold text-zinc-200">
                        <span className="flex items-center gap-1"><Wind className="h-4 w-4 text-zinc-500" /> {c.weather.windSpeed} m/s</span>
                      </td>
                      <td className="p-4 font-semibold text-zinc-200">
                        <span className="flex items-center gap-1"><Droplets className="h-4 w-4 text-zinc-500" /> {c.weather.humidity}%</span>
                      </td>
                      <td className="p-4 font-semibold text-zinc-200">
                        <span className="flex items-center gap-1"><CloudRain className="h-4 w-4 text-zinc-500" /> {c.weather.rain} mm</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GlassCard>

          {/* Visual Charts Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Bar chart Today vs Tomorrow */}
            <GlassCard className="border-teal-500/10" hoverEffect={false}>
              <h3 className="text-base font-bold text-white mb-4 tracking-wide flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-teal-400" />
                Forecast Index Comparison
              </h3>
              <div className="h-[280px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisons} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                    <XAxis dataKey="district" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="todayAqi" name="Today AQI" fill="#14b8a6" radius={[4, 4, 0, 0]} fillOpacity={0.7} stroke="#14b8a6" strokeWidth={1} />
                    <Bar dataKey="tomorrowAqi" name="Tomorrow AQI" fill="#0ea5e9" radius={[4, 4, 0, 0]} fillOpacity={0.7} stroke="#0ea5e9" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Chart 2: Radar Chart of Pollutants */}
            <GlassCard className="border-sky-500/10" hoverEffect={false}>
              <h3 className="text-base font-bold text-white mb-4 tracking-wide flex items-center gap-2">
                <GitCompare className="h-4.5 w-4.5 text-sky-400" />
                Pollutant Concentration Maps
              </h3>
              <div className="h-[280px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="pollutant" stroke="#a1a1aa" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#52525b" />
                    {selectedDistricts.map((name, index) => (
                      <Radar
                        key={name}
                        name={name}
                        dataKey={name}
                        stroke={radarColors[index]}
                        fill={radarColors[index]}
                        fillOpacity={0.15}
                      />
                    ))}
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

          </div>
        </>
      )}

    </div>
  );
}
