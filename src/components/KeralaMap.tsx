import React, { useEffect, useState, useRef } from 'react';
import { DISTRICTS_METADATA } from '../types/aqi';
import type { DistrictName } from '../types/aqi';
import { getAqiColorClass } from '../utils/aqiCalculator';
import { useRouter } from '@tanstack/react-router';
import { MapPin, ArrowRight, Eye } from 'lucide-react';
import { cn } from '../utils/cn';

// Types for dynamic React Leaflet components
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;
let L: any = null;

interface KeralaMapProps {
  districtsData: Array<{
    district: DistrictName;
    aqi: number;
    category: string;
    tomorrowAqi: number;
    difference: number;
    primaryPollutant: string;
    weather: {
      temp: number;
      humidity: number;
      summary: string;
    };
  }>;
  selectedDistrict?: DistrictName;
  onSelectDistrict?: (name: DistrictName) => void;
  isDarkMode?: boolean;
}

export function KeralaMap({
  districtsData,
  selectedDistrict,
  onSelectDistrict,
  isDarkMode = true
}: KeralaMapProps) {
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Dynamic import to prevent SSR crashes on Leaflet 'window is not defined'
    const loadLeaflet = async () => {
      L = await import('leaflet');
      const rLeaflet = await import('react-leaflet');
      MapContainer = rLeaflet.MapContainer;
      TileLayer = rLeaflet.TileLayer;
      Marker = rLeaflet.Marker;
      Popup = rLeaflet.Popup;

      // Fix icon issues in standard Vite builds
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      setLoaded(true);
    };
    loadLeaflet();
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <div className="text-sm font-medium text-zinc-400">Mounting Interactive Map...</div>
        </div>
      </div>
    );
  }

  // Map settings
  const center: [number, number] = [10.35, 76.45]; // Geocenter of Kerala
  const zoom = 7.5;

  // Custom styled marker based on AQI category color
  const createCustomMarkerIcon = (aqi: number, category: string) => {
    const colors = getAqiColorClass(category as any);
    const hexColor = colors.hex;
    
    // DivIcon with custom glowing dot styling
    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute h-6 w-6 rounded-full opacity-40 animate-ping" style="background-color: ${hexColor}"></div>
          <div class="relative h-4 w-4 rounded-full border-2 border-zinc-900 shadow-lg flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-125 duration-200" style="background-color: ${hexColor}">
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const handleNavigateToDashboard = (district: DistrictName) => {
    router.navigate({
      to: '/dashboard',
      search: { district }
    });
  };

  return (
    <div className="relative h-[480px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full z-10"
        zoomControl={true}
      >
        {/* 100% free, no-watermark OpenStreetMap tiles with custom dark theme filter */}
        <TileLayer
          className={isDarkMode && !(import.meta as any).env?.VITE_CARTO_API_KEY ? 'dark-map-tiles' : ''}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            (import.meta as any).env?.VITE_CARTO_API_KEY
              ? isDarkMode
                ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${(import.meta as any).env.VITE_CARTO_API_KEY}`
                : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${(import.meta as any).env.VITE_CARTO_API_KEY}`
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {districtsData.map((d) => {
          const meta = DISTRICTS_METADATA[d.district];
          if (!meta) return null;

          const isSelected = selectedDistrict === d.district;
          const aqiColors = getAqiColorClass(d.category as any);

          return (
            <Marker
              key={d.district}
              position={[meta.lat, meta.lon]}
              icon={createCustomMarkerIcon(d.aqi, d.category)}
              eventHandlers={{
                click: () => {
                  if (onSelectDistrict) onSelectDistrict(d.district);
                }
              }}
            >
              <Popup className="aqi-map-popup">
                <div className="min-w-[180px] p-2 bg-zinc-950 text-white rounded-lg border border-zinc-800 flex flex-col gap-2.5">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
                    <span className="font-bold text-sm text-zinc-100">{d.district}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{meta.type}</span>
                  </div>

                  {/* AQI Values */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Today</div>
                      <div className={cn("text-base font-bold", aqiColors.text)}>{d.aqi}</div>
                    </div>
                    <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Tomorrow</div>
                      <div className="text-base font-bold text-sky-400">{d.tomorrowAqi}</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1 text-[11px] text-zinc-300">
                    <div className="flex justify-between">
                      <span>Primary Pollutant:</span>
                      <span className="font-semibold text-teal-400 uppercase">{d.primaryPollutant.replace('_', '.')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weather:</span>
                      <span>{d.weather.temp}°C, {d.weather.summary}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Forecast shift:</span>
                      <span className={cn(
                        "font-semibold rounded px-1",
                        d.difference > 0 ? "text-rose-400 bg-rose-500/10" : d.difference < 0 ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400"
                      )}>
                        {d.difference > 0 ? `+${d.difference}` : d.difference === 0 ? '0' : d.difference}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleNavigateToDashboard(d.district)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-1 rounded bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/20 text-teal-400 text-xs font-semibold cursor-pointer transition-all duration-200"
                  >
                    <Eye className="h-3 w-3" />
                    Full Analysis
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-[999] bg-zinc-950/80 border border-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl flex flex-col gap-2 max-w-[280px]">
        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-teal-400" />
          Air Quality Scale
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">0-50 Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-zinc-300">51-100 Mod</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-zinc-300">101-150 Sensitive Groups</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-zinc-300">151-200 Unhealthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-zinc-300">201-300 Very Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
