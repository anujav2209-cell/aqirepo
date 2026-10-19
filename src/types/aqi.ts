export type DistrictName =
  | 'Thiruvananthapuram'
  | 'Kollam'
  | 'Pathanamthitta'
  | 'Alappuzha'
  | 'Kottayam'
  | 'Idukki'
  | 'Ernakulam'
  | 'Thrissur'
  | 'Palakkad'
  | 'Malappuram'
  | 'Kozhikode'
  | 'Wayanad'
  | 'Kannur'
  | 'Kasaragod';

export type AqiCategory =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export interface PollutantLevels {
  pm2_5: number; // PM2.5 (µg/m³)
  pm10: number;  // PM10 (µg/m³)
  no2: number;   // Nitrogen Dioxide (µg/m³)
  so2: number;   // Sulfur Dioxide (µg/m³)
  co: number;    // Carbon Monoxide (µg/m³)
  o3: number;    // Ozone (µg/m³)
}

export interface WeatherData {
  temp: number;          // °C
  humidity: number;      // %
  windSpeed: number;     // m/s
  windDir: number;       // degrees
  rain: number;          // mm/h
  pressure: number;      // hPa
  summary: string;       // e.g., 'Sunny', 'Heavy Rain'
}

export interface DistrictMetadata {
  name: DistrictName;
  lat: number;
  lon: number;
  type: 'Urban' | 'Coastal' | 'Highland' | 'Industrial' | 'Forest' | 'Midland';
  population: number;
}

export interface AQIRecord {
  district: DistrictName;
  aqi: number;
  category: AqiCategory;
  pollutants: PollutantLevels;
  weather: WeatherData;
  primaryPollutant: keyof PollutantLevels;
  timestamp: number;
  provider: string; // OpenWeather, WAQI, Open-Meteo, or Simulator
}

export interface PredictionResult {
  predictedAqi: number;
  category: AqiCategory;
  confidence: number;       // percentage (0-100)
  reasons: string[];        // list of reasons explaining the prediction
  explanation: string;      // textual summary
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe' | 'Critical';
}

export interface HealthGuideline {
  group: string;
  advice: string;
  icon: string;
}

export interface ActivityGuideline {
  activity: string;
  status: 'Safe' | 'Caution' | 'Unsafe';
  advice: string;
}

export interface HealthRecommendations {
  category: AqiCategory;
  generalPublic: string;
  vulnerableGroups: HealthGuideline[];
  activities: ActivityGuideline[];
  maskRecommendation: string;
  indoorRecommendation: string;
}

export interface HistoryRecord {
  timestamp: number;
  actualAqi: number;
  predictedAqi?: number;
  error?: number;
}

export interface DistrictComparison {
  district: DistrictName;
  todayAqi: number;
  tomorrowAqi: number;
  difference: number;
  confidence: number;
  weather: WeatherData;
  pollutants: PollutantLevels;
  riskLevel: string;
  primaryPollutant: string;
}

export const DISTRICTS_METADATA: Record<DistrictName, DistrictMetadata> = {
  Thiruvananthapuram: { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366, type: 'Urban', population: 3301427 },
  Kollam: { name: 'Kollam', lat: 8.8932, lon: 76.6141, type: 'Industrial', population: 2635375 },
  Pathanamthitta: { name: 'Pathanamthitta', lat: 9.2648, lon: 76.7870, type: 'Forest', population: 1197412 },
  Alappuzha: { name: 'Alappuzha', lat: 9.4981, lon: 76.3388, type: 'Coastal', population: 2127789 },
  Kottayam: { name: 'Kottayam', lat: 9.5916, lon: 76.5222, type: 'Midland', population: 1974551 },
  Idukki: { name: 'Idukki', lat: 9.8500, lon: 77.1000, type: 'Highland', population: 1108974 },
  Ernakulam: { name: 'Ernakulam', lat: 9.9816, lon: 76.2999, type: 'Industrial', population: 3282388 },
  Thrissur: { name: 'Thrissur', lat: 10.5276, lon: 76.2144, type: 'Urban', population: 3121200 },
  Palakkad: { name: 'Palakkad', lat: 10.7867, lon: 76.6547, type: 'Midland', population: 2809934 },
  Malappuram: { name: 'Malappuram', lat: 11.0736, lon: 76.0740, type: 'Midland', population: 4112920 },
  Kozhikode: { name: 'Kozhikode', lat: 11.2588, lon: 75.7804, type: 'Coastal', population: 3086293 },
  Wayanad: { name: 'Wayanad', lat: 11.6050, lon: 76.0830, type: 'Highland', population: 817420 },
  Kannur: { name: 'Kannur', lat: 11.8745, lon: 75.3704, type: 'Coastal', population: 2523003 },
  Kasaragod: { name: 'Kasaragod', lat: 12.4996, lon: 74.9869, type: 'Coastal', population: 1307375 },
};

export const DISTRICT_LIST = Object.keys(DISTRICTS_METADATA) as DistrictName[];
