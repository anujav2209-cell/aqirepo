import { DISTRICTS_METADATA } from '../types/aqi';
import type {
  DistrictName,
  AQIRecord,
  PollutantLevels,
  WeatherData,
  AqiCategory,
} from '../types/aqi';
import { calculateOverallAqi, getAqiCategory } from '../utils/aqiCalculator';

// Fallback Keys loaded on server or client
const getOpenWeatherKey = () => typeof process !== 'undefined' ? process.env.VITE_OPENWEATHER_API_KEY || '' : '';
const getWaqiKey = () => typeof process !== 'undefined' ? process.env.VITE_WAQI_API_KEY || '' : '';

// Helper to determine weather summary from code (mainly for Open-Meteo)
function getWeatherSummaryFromCode(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rainy';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Overcast';
}

// Seeded random number generator for stable, deterministic simulation
function makeSeededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

/**
 * 4. SIMULATION DATA PROVIDER (Universal Fallback)
 * Geographically accurate simulation with weather-pollutant coupling.
 * Uses a seeded random generator based on the current date & hour to ensure stability on refresh.
 */
export function getSimulatedData(districtName: DistrictName): AQIRecord {
  const metadata = DISTRICTS_METADATA[districtName];
  const date = new Date();
  const hour = date.getHours();
  const month = date.getMonth(); // 0-11 (monsoon is June-September: 5-8)

  // Create a seed based on district, date, and hour to keep simulated values stable hourly
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
  const rand = makeSeededRandom(districtName + '_' + dateStr);

  // Generate realistic weather based on geography
  let baseTemp = 28; // Standard tropical temperature
  let baseHumidity = 75;
  let baseWindSpeed = 2.5;

  if (metadata.type === 'Highland') {
    baseTemp = 18 + Math.sin((hour - 6) * Math.PI / 12) * 5; // Cool highlands (13-23°C)
    baseHumidity = 85;
  } else if (metadata.type === 'Coastal') {
    baseTemp = 29 + Math.sin((hour - 6) * Math.PI / 12) * 3; // Sea breeze regulated
    baseWindSpeed = 4.5 + Math.sin((hour - 6) * Math.PI / 12) * 2; // Coastal wind peak in afternoon
  } else {
    baseTemp = 31 + Math.sin((hour - 6) * Math.PI / 12) * 4; // Inland hotter
  }

  // Rainfall seasonality (Kerala Monsoons)
  let rain = 0;
  let summary = 'Clear Sky';
  const isMonsoon = month >= 5 && month <= 8; // June to Sept
  const isSecondMonsoon = month >= 9 && month <= 10; // Oct to Nov

  if (isMonsoon) {
    const isRainingToday = (rand() < 0.65);
    rain = isRainingToday ? parseFloat((rand() * 8 + 1).toFixed(1)) : 0;
    baseHumidity = 92;
    summary = rain > 4 ? 'Heavy Monsoon Rain' : 'Monsoon Showers';
  } else if (isSecondMonsoon) {
    const isRainingToday = (rand() < 0.35);
    rain = isRainingToday ? parseFloat((rand() * 4).toFixed(1)) : 0;
    baseHumidity = 85;
    summary = rain > 0 ? 'Evening Thunderstorm' : 'Partly Cloudy';
  } else {
    // Summer or dry season
    summary = rand() < 0.15 ? 'Partly Cloudy' : 'Sunny';
    baseHumidity = 60 + rand() * 15;
  }

  const weather: WeatherData = {
    temp: parseFloat(baseTemp.toFixed(1)),
    humidity: Math.round(baseHumidity),
    windSpeed: parseFloat(baseWindSpeed.toFixed(1)),
    windDir: Math.floor(rand() * 360),
    rain,
    pressure: metadata.type === 'Highland' ? 910 : 1010 + Math.round(rand() * 6 - 3),
    summary,
  };

  // Generate pollutant levels coupled to district type and weather
  // 1. Industrial/Urban areas have higher pollutants (Ernakulam, Kollam, Thrissur)
  // 2. Forests/Highlands are extremely clean (Wayanad, Idukki, Pathanamthitta)
  // 3. Rain washes out particulates (PM2.5 and PM10 drop by 40-70%)
  // 4. High wind speeds disperse pollutants (reduces PM by 20-40%)
  // 5. High humidity increases secondary particulate formation (slightly elevates PM)
  
  let basePm2_5 = 15;
  let basePm10 = 30;
  let baseNo2 = 10;
  let baseSo2 = 4;
  let baseCo = 0.4;
  let baseO3 = 25;

  switch (metadata.type) {
    case 'Industrial':
      basePm2_5 = 26; basePm10 = 50; baseNo2 = 20; baseSo2 = 8; baseCo = 0.6; baseO3 = 35;
      break;
    case 'Urban':
      basePm2_5 = 21; basePm10 = 42; baseNo2 = 16; baseSo2 = 5; baseCo = 0.5; baseO3 = 30;
      break;
    case 'Coastal':
      basePm2_5 = 18; basePm10 = 36; baseNo2 = 12; baseSo2 = 4; baseCo = 0.4; baseO3 = 28;
      break;
    case 'Midland':
      basePm2_5 = 17; basePm10 = 34; baseNo2 = 11; baseSo2 = 3; baseCo = 0.35; baseO3 = 24;
      break;
    case 'Highland':
    case 'Forest':
    default:
      basePm2_5 = 8; basePm10 = 16; baseNo2 = 4; baseSo2 = 1.5; baseCo = 0.2; baseO3 = 18;
      break;
  }

  // Adjust for diurnal traffic peaks (8 AM - 10 AM, 5 PM - 8 PM)
  const isTrafficPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  if (isTrafficPeak) {
    basePm2_5 *= 1.3;
    basePm10 *= 1.25;
    baseNo2 *= 1.5;
    baseCo *= 1.4;
  }

  // Weather factors
  // Rain washout
  if (rain > 0) {
    const washFactor = Math.max(0.3, 1 - (rain * 0.1)); // Heavy rain removes up to 70%
    basePm2_5 *= washFactor;
    basePm10 *= washFactor;
    baseNo2 *= (washFactor + 0.1); // Gases wash out slightly less
    baseSo2 *= (washFactor + 0.05);
  }

  // Wind dispersion
  if (weather.windSpeed > 3.0) {
    const dispersion = Math.max(0.5, 1 - ((weather.windSpeed - 3) * 0.08));
    basePm2_5 *= dispersion;
    basePm10 *= dispersion;
    baseNo2 *= dispersion;
  }

  const pollutants: PollutantLevels = {
    pm2_5: parseFloat(Math.max(1, basePm2_5 + rand() * 6 - 3).toFixed(1)),
    pm10: parseFloat(Math.max(2, basePm10 + rand() * 12 - 6).toFixed(1)),
    no2: parseFloat(Math.max(0.5, baseNo2 + rand() * 4 - 2).toFixed(1)),
    so2: parseFloat(Math.max(0.1, baseSo2 + rand() * 2 - 1).toFixed(1)),
    co: parseFloat(Math.max(0.05, baseCo + rand() * 0.15 - 0.07).toFixed(2)),
    o3: parseFloat(Math.max(1, baseO3 + rand() * 8 - 4).toFixed(1)),
  };

  const { aqi, primaryPollutant } = calculateOverallAqi(pollutants);

  return {
    district: districtName,
    aqi,
    category: getAqiCategory(aqi),
    pollutants,
    weather,
    primaryPollutant,
    timestamp: Date.now(),
    provider: 'Simulation Engine',
  };
}

/**
 * 3. OPEN-METEO AIR QUALITY & WEATHER PROVIDERS (Free / Keyless)
 */
async function fetchOpenMeteoData(districtName: DistrictName): Promise<AQIRecord> {
  const metadata = DISTRICTS_METADATA[districtName];
  const { lat, lon } = metadata;

  // Fetch AQI and weather concurrently
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code,pressure_msl`;

  const [aqResponse, weatherResponse] = await Promise.all([
    fetch(aqUrl),
    fetch(weatherUrl),
  ]);

  if (!aqResponse.ok || !weatherResponse.ok) {
    throw new Error('Open-Meteo API request failed');
  }

  const aqJson = await aqResponse.json();
  const weatherJson = await weatherResponse.json();

  const currentAq = aqJson.current;
  const currentWeather = weatherJson.current;

  // Open-Meteo gives Carbon Monoxide in ug/m3. Breakpoints for CO in US EPA are in ppm.
  // 1 ppm CO ≈ 1150 µg/m³. Let's convert CO from ug/m3 to mg/m3 (or ppm equivalence)
  // Our CO breakpoint handles values up to 50. If raw is e.g. 400 ug/m3, that is 0.4 mg/m3.
  const coRaw = currentAq.carbon_monoxide || 0;
  const coVal = parseFloat((coRaw / 1000).toFixed(2)); // convert to mg/m³ which maps roughly to standard breakpoints

  const pollutants: PollutantLevels = {
    pm2_5: currentAq.pm2_5 || 10,
    pm10: currentAq.pm10 || 20,
    no2: currentAq.nitrogen_dioxide || 5,
    so2: currentAq.sulphur_dioxide || currentAq.sulfur_dioxide || 1,
    co: coVal,
    o3: currentAq.ozone || 15,
  };

  const weather: WeatherData = {
    temp: currentWeather.temperature_2m || 27,
    humidity: currentWeather.relative_humidity_2m || 80,
    windSpeed: parseFloat(((currentWeather.wind_speed_10m || 0) / 3.6).toFixed(1)), // convert km/h to m/s
    windDir: currentWeather.wind_direction_10m || 0,
    rain: currentWeather.precipitation || 0,
    pressure: Math.round(currentWeather.pressure_msl || 1010),
    summary: getWeatherSummaryFromCode(currentWeather.weather_code || 0),
  };

  const { aqi, primaryPollutant } = calculateOverallAqi(pollutants);

  return {
    district: districtName,
    aqi,
    category: getAqiCategory(aqi),
    pollutants,
    weather,
    primaryPollutant,
    timestamp: Date.now(),
    provider: 'Open-Meteo API',
  };
}

/**
 * 2. WORLD AIR QUALITY INDEX (WAQI) PROVIDER
 */
async function fetchWaqiData(districtName: DistrictName, apiKey: string): Promise<AQIRecord> {
  const metadata = DISTRICTS_METADATA[districtName];
  const { lat, lon } = metadata;

  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('WAQI API request failed');
  }

  const json = await response.json();
  if (json.status !== 'ok') {
    throw new Error(json.data || 'WAQI API returned error status');
  }

  const data = json.data;
  const iaqi = data.iaqi || {};

  // WAQI return pollutant index or raw. We fallback to simulator defaults if missing.
  const pollutants: PollutantLevels = {
    pm2_5: iaqi.pm25?.v || 15,
    pm10: iaqi.pm10?.v || 30,
    no2: iaqi.no2?.v || 8,
    so2: iaqi.so2?.v || 2,
    co: parseFloat(((iaqi.co?.v || 400) / 1000).toFixed(2)), // WAQI CO is often reported in raw sub-indexes or index. Normalized to mg/m3
    o3: iaqi.o3?.v || 20,
  };

  // Weather fallback (if WAQI returns it)
  // WAQI provides temp (t), wind (w), humidity (h), pressure (p)
  let weather: WeatherData;
  try {
    // Fetch weather using free Open-Meteo to have complete high-fidelity weather metrics
    const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code,pressure_msl`;
    const wRes = await fetch(wUrl);
    if (wRes.ok) {
      const wJson = await wRes.json();
      const c = wJson.current;
      weather = {
        temp: c.temperature_2m || 27,
        humidity: c.relative_humidity_2m || 80,
        windSpeed: parseFloat(((c.wind_speed_10m || 0) / 3.6).toFixed(1)),
        windDir: c.wind_direction_10m || 0,
        rain: c.precipitation || 0,
        pressure: Math.round(c.pressure_msl || 1010),
        summary: getWeatherSummaryFromCode(c.weather_code || 0),
      };
    } else {
      throw new Error();
    }
  } catch {
    // Local fallback from WAQI iaqi fields if Open-Meteo fails
    weather = {
      temp: iaqi.t?.v || 27,
      humidity: iaqi.h?.v || 75,
      windSpeed: iaqi.w?.v || 2.0,
      windDir: 0,
      rain: 0,
      pressure: iaqi.p?.v || 1010,
      summary: 'Partly Cloudy',
    };
  }

  // Recalculate AQI to maintain standard consistency
  const { aqi, primaryPollutant } = calculateOverallAqi(pollutants);

  return {
    district: districtName,
    aqi,
    category: getAqiCategory(aqi),
    pollutants,
    weather,
    primaryPollutant,
    timestamp: Date.now(),
    provider: 'WAQI API',
  };
}

/**
 * 1. OPENWEATHER AIR POLLUTION & WEATHER PROVIDERS
 */
async function fetchOpenWeatherData(districtName: DistrictName, apiKey: string): Promise<AQIRecord> {
  const metadata = DISTRICTS_METADATA[districtName];
  const { lat, lon } = metadata;

  const aqUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

  const [aqResponse, weatherResponse] = await Promise.all([
    fetch(aqUrl),
    fetch(weatherUrl),
  ]);

  if (!aqResponse.ok || !weatherResponse.ok) {
    throw new Error('OpenWeather API request failed');
  }

  const aqJson = await aqResponse.json();
  const weatherJson = await weatherResponse.json();

  const aqList = aqJson.list?.[0];
  const aqComponents = aqList?.components || {};

  const pollutants: PollutantLevels = {
    pm2_5: aqComponents.pm2_5 || 10,
    pm10: aqComponents.pm10 || 20,
    no2: aqComponents.no_2 || 5, // OpenWeather key: no2 is stored in "no_2"
    so2: aqComponents.so_2 || 1, // OpenWeather key: so2 is stored in "so_2"
    co: parseFloat(((aqComponents.co || 400) / 1000).toFixed(2)), // Convert ug/m3 to mg/m3
    o3: aqComponents.o3 || 15,
  };

  const mainWeather = weatherJson.weather?.[0];
  const mainStats = weatherJson.main || {};
  const windStats = weatherJson.wind || {};
  const rainStats = weatherJson.rain || {};

  const weather: WeatherData = {
    temp: mainStats.temp || 27,
    humidity: mainStats.humidity || 75,
    windSpeed: windStats.speed || 2.0,
    windDir: windStats.deg || 0,
    rain: rainStats['1h'] || 0,
    pressure: mainStats.pressure || 1012,
    summary: mainWeather?.main || 'Clear',
  };

  const { aqi, primaryPollutant } = calculateOverallAqi(pollutants);

  return {
    district: districtName,
    aqi,
    category: getAqiCategory(aqi),
    pollutants,
    weather,
    primaryPollutant,
    timestamp: Date.now(),
    provider: 'OpenWeather API',
  };
}

// In-memory cache to prevent hitting Open-Meteo rate limits (5-minute TTL)
const aqiCache = new Map<DistrictName, { record: AQIRecord; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * EXPORTED DATA FETCH FUNCTION - Agnostic to the underlying source,
 * implements automatic fallback and in-memory caching.
 */
export async function getAqiData(districtName: DistrictName): Promise<AQIRecord> {
  const cached = aqiCache.get(districtName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.record;
  }

  const owKey = getOpenWeatherKey();
  const waqiKey = getWaqiKey();

  let record: AQIRecord | null = null;

  // 1. Try OpenWeather API
  if (owKey) {
    try {
      record = await fetchOpenWeatherData(districtName, owKey);
    } catch {
      // Fall through to next provider
    }
  }

  // 2. Try WAQI API
  if (!record && waqiKey) {
    try {
      record = await fetchWaqiData(districtName, waqiKey);
    } catch {
      // Fall through to next provider
    }
  }

  // 3. Try Open-Meteo (Keyless & Free)
  if (!record) {
    try {
      record = await fetchOpenMeteoData(districtName);
    } catch {
      // Fall through to simulator
    }
  }

  // 4. Return Simulated Data (Ensures system is always operational)
  if (!record) {
    record = getSimulatedData(districtName);
  }

  aqiCache.set(districtName, { record, expiresAt: Date.now() + CACHE_TTL_MS });
  return record;
}

/**
 * Helper to fetch data for all 14 districts with polite batching
 */
export async function getAllDistrictsData(): Promise<Record<DistrictName, AQIRecord>> {
  const districts: DistrictName[] = [
    'Thiruvananthapuram',
    'Kollam',
    'Pathanamthitta',
    'Alappuzha',
    'Kottayam',
    'Idukki',
    'Ernakulam',
    'Thrissur',
    'Palakkad',
    'Malappuram',
    'Kozhikode',
    'Wayanad',
    'Kannur',
    'Kasaragod',
  ];

  const dataMap = {} as Record<DistrictName, AQIRecord>;
  const BATCH_SIZE = 4;
  for (let i = 0; i < districts.length; i += BATCH_SIZE) {
    const batch = districts.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (name) => {
        const data = await getAqiData(name);
        return { name, data };
      })
    );
    results.forEach((item) => {
      dataMap[item.name] = item.data;
    });
  }

  return dataMap;
}
