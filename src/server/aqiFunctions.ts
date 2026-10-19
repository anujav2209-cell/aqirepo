import { createServerFn } from '@tanstack/react-start';
import { DISTRICT_LIST } from '../types/aqi';
import type { DistrictName, AQIRecord, PredictionResult, HistoryRecord, DistrictComparison } from '../types/aqi';
import { getAqiData, getSimulatedData, getAllDistrictsData } from '../services/dataProvider';
import { HeuristicPredictionEngine, MLModelEngine, PredictionManager } from '../prediction/engine';
import { getAqiCategory } from '../utils/aqiCalculator';

// Seeded random number generator for stable, deterministic history
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
 * Generate 30 days of deterministic history for charts.
 * actualAqi matches the general profile of the district.
 * predictedAqi represents the model's prediction for that day, made on the previous day.
 */
export function generateDistrictHistory(district: DistrictName, days = 30): HistoryRecord[] {
  const rand = makeSeededRandom(district + '_history_v2');
  const history: HistoryRecord[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // District base profiles
  let baseVal = 25;
  if (district === 'Ernakulam' || district === 'Kollam') baseVal = 75;
  else if (district === 'Thiruvananthapuram' || district === 'Thrissur') baseVal = 55;
  else if (district === 'Wayanad' || district === 'Idukki') baseVal = 20;
  else if (district === 'Palakkad') baseVal = 48; // Has Palakkad Gap wind dust

  // Generate history from oldest to newest
  for (let i = days; i >= 1; i--) {
    const timestamp = now - i * dayMs;
    const date = new Date(timestamp);
    const m = date.getMonth();

    // Seasonality cycle (low in monsoon June-Sept)
    let seasonalMultiplier = 1.0;
    if (m >= 5 && m <= 8) {
      seasonalMultiplier = 0.55; // Monsoons clean the air
    } else if (m === 11 || m === 0) {
      seasonalMultiplier = 1.15; // Winters trap particles
    }

    // Weekly cyclical noise (higher on weekdays due to traffic/industry)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const trafficNoise = isWeekend ? 0.85 : 1.1;

    // Random walk with weather shifts
    const weatherNoise = 1.0 + (rand() * 0.4 - 0.2); // +/- 20%
    
    // Core actual AQI formula
    const actualAqi = Math.round(baseVal * seasonalMultiplier * trafficNoise * weatherNoise);
    const actualConstrained = Math.max(5, Math.min(500, actualAqi));

    // Simulated prediction made on previous day (day d-1) for day d
    // ML models typically have an error margin of 5-15%
    const errorMargin = (rand() * 0.16 - 0.08); // +/- 8% error
    const predictedAqi = Math.max(5, Math.min(500, Math.round(actualConstrained * (1 + errorMargin))));

    const error = Math.abs(actualConstrained - predictedAqi);

    history.push({
      timestamp,
      actualAqi: actualConstrained,
      predictedAqi,
      error,
    });
  }

  return history;
}

/**
 * 1. FETCH DETAILED DISTRICT METRICS (Current AQI + Predictions + History)
 */
export const getAqiDetails = createServerFn({ method: 'GET' })
  .validator((d: unknown): { district: DistrictName; engineType?: 'heuristic' | 'ml' } => {
    const data = d as { district: DistrictName; engineType?: 'heuristic' | 'ml' };
    if (!data || !data.district) {
      throw new Error('District name is required');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { district, engineType = 'heuristic' } = data;
    
    // Fetch live/simulated AQI
    const currentData = await getAqiData(district);
    
    // Generate 30 days of history
    const history = generateDistrictHistory(district, 30);
    
    // Run prediction engine
    const engine = PredictionManager.getEngine(engineType);
    const prediction = await engine.predict(currentData, history);

    return {
      currentData,
      prediction,
      history,
      engineName: engine.name,
    };
  });

/**
 * 2. KERALA OVERVIEW METRICS
 */
export const getKeralaOverview = createServerFn({ method: 'GET' })
  .validator((d: unknown): { engineType?: 'heuristic' | 'ml' } => {
    return (d as { engineType?: 'heuristic' | 'ml' }) || {};
  })
  .handler(async ({ data }) => {
    const { engineType = 'heuristic' } = data;
    const allData = await getAllDistrictsData();
    const engine = PredictionManager.getEngine(engineType);

    const summaries = await Promise.all(
      DISTRICT_LIST.map(async (name) => {
        const currentData = allData[name];
        const history = generateDistrictHistory(name, 7);
        const prediction = await engine.predict(currentData, history);
        return { name, currentData, prediction };
      })
    );

    // Calculate aggregations
    let totalTodayAqi = 0;
    let cleanest = summaries[0];
    let mostPolluted = summaries[0];
    let maxIncrease = -999;
    let largestIncreaseDistrict = summaries[0].name;
    let maxDecrease = 999;
    let largestDecreaseDistrict = summaries[0].name;
    let totalConfidence = 0;
    let totalAccuracySum = 0;

    summaries.forEach((s) => {
      const today = s.currentData.aqi;
      const tomorrow = s.prediction.predictedAqi;
      const change = tomorrow - today;

      totalTodayAqi += today;
      totalConfidence += s.prediction.confidence;

      if (today < cleanest.currentData.aqi) cleanest = s;
      if (today > mostPolluted.currentData.aqi) mostPolluted = s;

      if (change > maxIncrease) {
        maxIncrease = change;
        largestIncreaseDistrict = s.name;
      }
      if (change < maxDecrease) {
        maxDecrease = change;
        largestDecreaseDistrict = s.name;
      }

      // Calculate mock prediction accuracy (mean error rate is around 7%)
      const distHistory = generateDistrictHistory(s.name, 30);
      let errorSum = 0;
      distHistory.forEach((h) => {
        if (h.predictedAqi) {
          const errorPct = Math.abs(h.actualAqi - h.predictedAqi) / h.actualAqi;
          errorSum += errorPct;
        }
      });
      const avgError = errorSum / distHistory.length;
      const accuracy = (1 - avgError) * 100;
      totalAccuracySum += accuracy;
    });

    const averageKeralaAqi = Math.round(totalTodayAqi / summaries.length);
    const averageConfidence = Math.round(totalConfidence / summaries.length);
    const averageAccuracy = parseFloat((totalAccuracySum / summaries.length).toFixed(1));

    // Combine history for Kerala-wide charts
    const weeklyTrend: { timestamp: number; actualAqi: number }[] = [];
    const monthlyTrend: { timestamp: number; actualAqi: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (let i = 30; i >= 1; i--) {
      const timestamp = now - i * dayMs;
      let dailySum = 0;
      DISTRICT_LIST.forEach((name) => {
        const history = generateDistrictHistory(name, 30);
        dailySum += history[30 - i]?.actualAqi || averageKeralaAqi;
      });
      const avgAqi = Math.round(dailySum / DISTRICT_LIST.length);
      
      if (i <= 7) {
        weeklyTrend.push({ timestamp, actualAqi: avgAqi });
      }
      monthlyTrend.push({ timestamp, actualAqi: avgAqi });
    }

    return {
      averageKeralaAqi,
      averageConfidence,
      averageAccuracy,
      cleanestDistrict: cleanest.name,
      cleanestAqi: cleanest.currentData.aqi,
      mostPollutedDistrict: mostPolluted.name,
      mostPollutedAqi: mostPolluted.currentData.aqi,
      highestAqi: mostPolluted.currentData.aqi,
      lowestAqi: cleanest.currentData.aqi,
      largestIncreaseDistrict,
      largestIncreaseVal: maxIncrease,
      largestDecreaseDistrict,
      largestDecreaseVal: maxDecrease,
      weeklyTrend,
      monthlyTrend,
      districtsToday: summaries.map(s => ({
        district: s.name,
        aqi: s.currentData.aqi,
        category: s.currentData.category,
        tomorrowAqi: s.prediction.predictedAqi,
        difference: s.prediction.predictedAqi - s.currentData.aqi,
        primaryPollutant: s.currentData.primaryPollutant,
        weather: s.currentData.weather,
      })),
    };
  });

/**
 * 3. COMPARE DISTRICT METRICS SIDE-BY-SIDE
 */
export const getComparisonData = createServerFn({ method: 'POST' })
  .validator((d: unknown): { districts: DistrictName[]; engineType?: 'heuristic' | 'ml' } => {
    const data = d as { districts: DistrictName[]; engineType?: 'heuristic' | 'ml' };
    if (!data || !Array.isArray(data.districts) || data.districts.length === 0) {
      throw new Error('An array of district names is required');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { districts, engineType = 'heuristic' } = data;
    const engine = PredictionManager.getEngine(engineType);
    
    const comparisons = await Promise.all(
      districts.map(async (name) => {
        const currentData = await getAqiData(name);
        const history = generateDistrictHistory(name, 7);
        const prediction = await engine.predict(currentData, history);
        
        const diff = prediction.predictedAqi - currentData.aqi;

        return {
          district: name,
          todayAqi: currentData.aqi,
          tomorrowAqi: prediction.predictedAqi,
          difference: diff,
          confidence: prediction.confidence,
          weather: currentData.weather,
          pollutants: currentData.pollutants,
          riskLevel: prediction.riskLevel,
          primaryPollutant: currentData.primaryPollutant,
        } as DistrictComparison;
      })
    );

    return comparisons;
  });

/**
 * 4. EXPORT REPORT FORMATTER
 * Generates an optimized CSV payload representing district status.
 */
export const exportDistrictReport = createServerFn({ method: 'GET' })
  .validator((d: unknown): { district: DistrictName } => {
    const data = d as { district: DistrictName };
    if (!data || !data.district) {
      throw new Error('District name is required');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { district } = data;
    const current = await getAqiData(district);
    const history = generateDistrictHistory(district, 30);
    const engine = new HeuristicPredictionEngine();
    const prediction = await engine.predict(current, history);

    // Build CSV Content
    let csv = `Air Quality Report, ${district}, Kerala\n`;
    csv += `Generated on, ${new Date().toLocaleString()}\n`;
    csv += `Active Provider, ${current.provider}\n\n`;

    csv += `TODAY STATISTICS\n`;
    csv += `Metric, Value\n`;
    csv += `AQI, ${current.aqi}\n`;
    csv += `Category, ${current.category}\n`;
    csv += `Primary Pollutant, ${current.primaryPollutant}\n`;
    csv += `Temperature (°C), ${current.weather.temp}\n`;
    csv += `Humidity (%), ${current.weather.humidity}\n`;
    csv += `Wind Speed (m/s), ${current.weather.windSpeed}\n`;
    csv += `Rainfall (mm/h), ${current.weather.rain}\n\n`;

    csv += `TOMORROW FORECAST (PREDICTION)\n`;
    csv += `Metric, Value\n`;
    csv += `Predicted AQI, ${prediction.predictedAqi}\n`;
    csv += `Predicted Category, ${prediction.category}\n`;
    csv += `Model Confidence, ${prediction.confidence}%\n`;
    csv += `Risk Level, ${prediction.riskLevel}\n`;
    csv += `Explanation, "${prediction.explanation}"\n\n`;

    csv += `POLLUTANT BREAKDOWN\n`;
    csv += `Pollutant, Concentration (ug/m3)\n`;
    csv += `PM2.5, ${current.pollutants.pm2_5}\n`;
    csv += `PM10, ${current.pollutants.pm10}\n`;
    csv += `NO2, ${current.pollutants.no2}\n`;
    csv += `SO2, ${current.pollutants.so2}\n`;
    csv += `CO (mg/m3), ${current.pollutants.co}\n`;
    csv += `O3, ${current.pollutants.o3}\n\n`;

    csv += `30-DAY HISTORICAL LOG\n`;
    csv += `Date, Actual AQI, Predicted AQI, Error\n`;
    
    history.forEach((h) => {
      const dateStr = new Date(h.timestamp).toLocaleDateString();
      csv += `${dateStr}, ${h.actualAqi}, ${h.predictedAqi || 'N/A'}, ${h.error ?? 'N/A'}\n`;
    });

    return {
      csv,
      fileName: `${district.toLowerCase()}_aqi_report.csv`,
    };
  });
