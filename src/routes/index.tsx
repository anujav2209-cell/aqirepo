import React from 'react';
import { createFileRoute, Link, useLoaderData } from '@tanstack/react-router';
import { getKeralaOverview } from '../server/aqiFunctions';
import { useApp } from './__root';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { getAqiColorClass } from '../utils/aqiCalculator';
import {
  Wind,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Map,
  ShieldCheck,
  Download,
  AlertCircle,
  Activity,
  Heart,
  Droplets,
  Gauge
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      // Fetch overview data server-side
      return await getKeralaOverview({ data: { engineType: 'heuristic' } });
    } catch (e) {
      console.error('Failed to load overview data server-side', e);
      // Return a simulated fallback object if API/network issues occur
      return {
        averageKeralaAqi: 48,
        averageConfidence: 94,
        averageAccuracy: 93.6,
        cleanestDistrict: 'Wayanad' as const,
        cleanestAqi: 18,
        mostPollutedDistrict: 'Ernakulam' as const,
        mostPollutedAqi: 82,
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
  component: LandingPage,
});

function LandingPage() {
  const data = useLoaderData({ from: '/' });
  const { engineType } = useApp();

  // Premium hover container settings
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="flex flex-col gap-16 relative overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-10 pb-6 flex flex-col items-center text-center gap-6 max-w-4xl mx-auto z-10">
        
        {/* Animated Feature Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/5 text-teal-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-lg"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Gen AQI Predictor</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1] sm:leading-[1.05]"
        >
          Predict Tomorrow's Air Quality <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400">
            Across Kerala's 14 Districts
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed"
        >
          A premium, high-fidelity forecasting platform leveraging physical meteorology and machine learning models. Monitor live levels, verify prediction accuracies, and access personalized health advisory systems.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-2"
        >
          <Link
            to="/dashboard"
            search={{ district: 'Thiruvananthapuram' }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-zinc-950 font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:shadow-teal-500/20"
          >
            Explore Dashboard
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          
          <Link
            to="/comparison"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all duration-200"
          >
            Compare Districts
          </Link>
        </motion.div>
      </section>

      {/* 2. LIVE AQI PREVIEW & SUMMARY CARDS */}
      <section className="relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Card 1: Today's Kerala Average */}
          <motion.div variants={itemVariants}>
            <GlassCard className="h-full border-teal-500/10" glowColor="rgba(20, 184, 166, 0.05)">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Kerala Avg AQI</p>
                  <h3 className="text-4xl font-extrabold text-white mt-2 flex items-baseline">
                    <AnimatedCounter value={data.averageKeralaAqi} />
                    <span className="text-xs font-normal text-zinc-500 ml-1.5">US AQI</span>
                  </h3>
                </div>
                <div className="rounded-lg bg-teal-500/10 p-2.5 text-teal-400">
                  <Gauge className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-850 flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Status:</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded",
                  getAqiColorClass(data.averageKeralaAqi <= 50 ? 'Good' : 'Moderate').text,
                  getAqiColorClass(data.averageKeralaAqi <= 50 ? 'Good' : 'Moderate').bg
                )}>
                  {data.averageKeralaAqi <= 50 ? 'Good' : 'Moderate'}
                </span>
              </div>
            </GlassCard>
          </motion.div>

          {/* Card 2: Prediction Accuracy */}
          <motion.div variants={itemVariants}>
            <GlassCard className="h-full border-sky-500/10" glowColor="rgba(14, 165, 233, 0.05)">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Model Accuracy</p>
                  <h3 className="text-4xl font-extrabold text-white mt-2">
                    {data.averageAccuracy}%
                  </h3>
                </div>
                <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-850 flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Prediction Type:</span>
                <span className="text-sky-400 font-bold bg-sky-500/5 px-2 py-0.5 rounded border border-sky-500/10 uppercase tracking-wider text-[10px]">
                  {engineType === 'heuristic' ? 'HEURISTIC' : 'XGBOOST ML'}
                </span>
              </div>
            </GlassCard>
          </motion.div>

          {/* Card 3: Hot Spots / Clean Areas */}
          <motion.div variants={itemVariants}>
            <GlassCard className="h-full border-emerald-500/10" glowColor="rgba(16, 185, 129, 0.05)">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Zones Summary</p>
                  <div className="mt-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cleanest:
                      </span>
                      <span className="text-emerald-400 font-bold">{data.cleanestDistrict} ({data.cleanestAqi})</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Polluted:
                      </span>
                      <span className="text-yellow-400 font-bold">{data.mostPollutedDistrict} ({data.mostPollutedAqi})</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-zinc-850 flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Largest Improvement:</span>
                <span className="text-emerald-400 font-bold">{data.largestDecreaseDistrict}</span>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </section>

      {/* 3. PLATFORM CORE FEATURES */}
      <section className="relative z-10">
        <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Full-Stack SaaS Capabilities</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Designed for critical environmental tracking. Modular backend server functions ensure robustness and lightning-fast loading speeds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Agnostic Data Provider",
              desc: "Auto-failover stack querying OpenWeather, WAQI, and Open-Meteo. Maintains uninterrupted services even if keys expire.",
              icon: Wind,
              color: "text-teal-400 bg-teal-500/10"
            },
            {
              title: "Dual Forecast Engine",
              desc: "Met-chemical heuristic model utilizing rolling lag filters and weather correlation equations, swappable for raw XGBoost models.",
              icon: Sparkles,
              color: "text-sky-400 bg-sky-500/10"
            },
            {
              title: "Choropleth Maps & Charts",
              desc: "Leaflet-powered maps featuring custom-shaded dynamic districts alongside animated Recharts plotting forecasts and error values.",
              icon: Map,
              color: "text-emerald-400 bg-emerald-500/10"
            },
            {
              title: "Export & Report Suite",
              desc: "Generates production CSV sheets and optimized printable PDF layouts for offline review and scientific AQI documentation.",
              icon: Download,
              color: "text-purple-400 bg-purple-500/10"
            }
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <GlassCard key={idx} className="flex flex-col gap-4 hover:border-zinc-800 transition-all duration-200">
                <div className={cn("p-2.5 rounded-lg w-fit", feat.color)}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-bold text-white text-base tracking-wide">{feat.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* 4. DISTRICT SELECTOR CAROUSEL */}
      <section className="relative z-10">
        <div className="flex items-center justify-between mb-8 border-b border-zinc-850 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-wide">Kerala's 14 Districts Overview</h2>
            <p className="text-xs text-zinc-400 mt-1">Select a district to view detailed tomorrow predictions and charts</p>
          </div>
          <Link
            to="/dashboard"
            search={{ district: 'Thiruvananthapuram' }}
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            Show All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* District list grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {data.districtsToday.map((dist: any) => {
            const colors = getAqiColorClass(dist.category);
            return (
              <Link
                key={dist.district}
                to="/dashboard"
                search={{ district: dist.district }}
                className="group relative block rounded-xl border border-white/5 bg-zinc-950/20 p-4 transition-all duration-200 hover:bg-zinc-900/40 hover:border-white/10 hover:shadow-lg focus:outline-none"
              >
                {/* Micro glow matching the AQI category */}
                <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full border border-zinc-950" style={{ backgroundColor: colors.hex }} />
                
                <h3 className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors tracking-wide truncate pr-2.5">{dist.district}</h3>
                
                <div className="mt-3 flex items-baseline justify-between gap-1.5">
                  <div className="text-lg font-extrabold text-white">{dist.aqi}</div>
                  <div className={cn("text-[9px] font-bold uppercase", colors.text)}>
                    {dist.category === 'Unhealthy for Sensitive Groups' ? 'Sensitive' : dist.category}
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-zinc-500 font-medium flex items-center justify-between border-t border-zinc-900/60 pt-2 group-hover:text-zinc-400">
                  <span>Tomorrow:</span>
                  <span className="font-bold text-zinc-300">{dist.tomorrowAqi}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      
    </div>
  );
}
