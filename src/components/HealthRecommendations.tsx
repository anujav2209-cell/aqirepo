import React, { useState } from 'react';
import type { AqiCategory, HealthRecommendations, HealthGuideline, ActivityGuideline } from '../types/aqi';
import { GlassCard } from './ui/GlassCard';
import { 
  Heart, 
  Baby, 
  User, 
  Activity, 
  Wind, 
  Home, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

// Static health database mapping AQI Category to details
export const HEALTH_RECOMMENDATIONS_DB: Record<AqiCategory, HealthRecommendations> = {
  'Good': {
    category: 'Good',
    generalPublic: 'Air quality is satisfactory and poses little or no risk. It is a perfect day for outdoor activities, picnics, and general ventilation.',
    vulnerableGroups: [
      { group: 'Children', advice: 'Completely safe to play outdoors. Encourage outdoor physical games.', icon: 'baby' },
      { group: 'Senior Citizens', advice: 'Outdoor walks and activities are highly encouraged. Enjoy the clean air.', icon: 'user' },
      { group: 'Asthma Patients', advice: 'Air is clean. Excellent conditions for lung health. No special precautions.', icon: 'activity' },
      { group: 'Heart Patients', advice: 'Cardiovascular stress from pollution is zero. Standard routines apply.', icon: 'heart' }
    ],
    activities: [
      { activity: 'Outdoor Exercise', status: 'Safe', advice: 'Excellent conditions for high-intensity training, yoga, or park workouts.' },
      { activity: 'Cycling', status: 'Safe', advice: 'Breathe freely. Great day for long-distance cycling routes across Kerala.' },
      { activity: 'Running / Jogging', status: 'Safe', advice: 'Zero air pollution resistance. Safe for long aerobic runs.' }
    ],
    maskRecommendation: 'No mask required. Enjoy the fresh, natural air.',
    indoorRecommendation: 'Keep windows open for natural cross-ventilation. Air purifiers are not needed.'
  },
  'Moderate': {
    category: 'Moderate',
    generalPublic: 'Air quality is acceptable. However, there may be a mild risk for individuals who are unusually sensitive to air pollution.',
    vulnerableGroups: [
      { group: 'Children', advice: 'Safe for outdoor play, but monitor for symptoms like unusual coughing.', icon: 'baby' },
      { group: 'Senior Citizens', advice: 'Safe to go outdoors. Take rest breaks during extended physical activities.', icon: 'user' },
      { group: 'Asthma Patients', advice: 'Monitor symptoms. Keep rescue inhalers handy just in case.', icon: 'activity' },
      { group: 'Heart Patients', advice: 'Safe, but avoid walking near high-traffic intersections with visible exhaust.', icon: 'heart' }
    ],
    activities: [
      { activity: 'Outdoor Exercise', status: 'Safe', advice: 'Safe for standard workouts. Sensitive individuals should monitor throat irritation.' },
      { activity: 'Cycling', status: 'Safe', advice: 'Completely fine. Avoid heavy traffic areas where local fumes collect.' },
      { activity: 'Running / Jogging', status: 'Safe', advice: 'Safe. If you experience shortness of breath, reduce the intensity slightly.' }
    ],
    maskRecommendation: 'Generally not required, except for highly sensitive individuals in congested areas.',
    indoorRecommendation: 'Ventilation is safe. Unusually sensitive individuals may run air purifiers on low speed.'
  },
  'Unhealthy for Sensitive Groups': {
    category: 'Unhealthy for Sensitive Groups',
    generalPublic: 'Members of sensitive groups may experience health effects. The general public is unlikely to be affected immediately, but should monitor symptoms.',
    vulnerableGroups: [
      { group: 'Children', advice: 'Limit prolonged or heavy outdoor activities. Shift active games indoors.', icon: 'baby' },
      { group: 'Senior Citizens', advice: 'Reduce strenuous outdoor exertion. Keep walks light and short.', icon: 'user' },
      { group: 'Asthma Patients', advice: 'Reduce outdoor activities. Carry your inhaler. Inhalation of particulate matter may trigger mild wheezing.', icon: 'activity' },
      { group: 'Heart Patients', advice: 'Limit outdoor exposure. Monitor for fatigue, chest pressure, or palpitations.', icon: 'heart' }
    ],
    activities: [
      { activity: 'Outdoor Exercise', status: 'Caution', advice: 'Reduce duration. Consider indoor gym exercises instead of heavy outdoor cardio.' },
      { activity: 'Cycling', status: 'Caution', advice: 'Reduce speed. Wear a protective mask if cycling through busy city routes.' },
      { activity: 'Running / Jogging', status: 'Caution', advice: 'Shorten runs. Run in early morning when ozone and vehicle levels are lower.' }
    ],
    maskRecommendation: 'Recommended for children, elderly, and respiratory patients when outdoors. Simple cloth or surgical masks are insufficient; PM2.5 requires N95.',
    indoorRecommendation: 'Close windows during peak traffic hours. Consider using air purifiers in bedrooms of sensitive individuals.'
  },
  'Unhealthy': {
    category: 'Unhealthy',
    generalPublic: 'Everyone may begin to experience adverse health effects (throat irritation, coughing, chest tightness). Sensitive groups will experience more serious health effects.',
    vulnerableGroups: [
      { group: 'Children', advice: 'Avoid outdoor play. Organize indoor games, crafts, or reading sessions.', icon: 'baby' },
      { group: 'Senior Citizens', advice: 'Stay indoors as much as possible. Avoid outdoor chores and exercise.', icon: 'user' },
      { group: 'Asthma Patients', advice: 'Strictly avoid outdoor exposure. Keep rescue inhalers nearby. Seek medical help if breathing worsens.', icon: 'activity' },
      { group: 'Heart Patients', advice: 'Stay indoors. Avoid cardiovascular stress. Keep emergency contact information handy.', icon: 'heart' }
    ],
    activities: [
      { activity: 'Outdoor Exercise', status: 'Unsafe', advice: 'Avoid completely. High pollution turns heavy breathing into a hazard.' },
      { activity: 'Cycling', status: 'Unsafe', advice: 'Avoid. Riding increases breathing rate, trapping particulate matter deep in the lungs.' },
      { activity: 'Running / Jogging', status: 'Unsafe', advice: 'Do not run outdoors. Move all training sessions to indoor treadmills.' }
    ],
    maskRecommendation: 'Highly recommended for everyone going outdoors. N95 or N99 masks are mandatory to filter fine particulate matter (PM2.5).',
    indoorRecommendation: 'Keep windows and doors closed to block outdoor pollutants. Run air purifiers on medium/high speed. Avoid smoking or burning incense indoors.'
  },
  'Very Unhealthy': {
    category: 'Very Unhealthy',
    generalPublic: 'Health alert: everyone may experience serious health effects. Significant risk of respiratory and cardiovascular issues across the population.',
    vulnerableGroups: [
      { group: 'Children', advice: 'Do not go outside. Keep indoor air clean and doors closed.', icon: 'baby' },
      { group: 'Senior Citizens', advice: 'Strictly stay indoors. Rest and avoid physical fatigue.', icon: 'user' },
      { group: 'Asthma Patients', advice: 'Stay indoors. Use air filtration. Ensure medication supply is fully stocked.', icon: 'activity' },
      { group: 'Heart Patients', advice: 'Remain indoors in a climate-controlled room. Monitor blood pressure and heart rate closely.', icon: 'heart' }
    ],
    activities: [
      { activity: 'Outdoor Exercise', status: 'Unsafe', advice: 'Strictly prohibited. Strenuous activity under these conditions is highly dangerous.' },
      { activity: 'Cycling', status: 'Unsafe', advice: 'Do not cycle outdoors. Commuting should be done in closed vehicles.' },
      { activity: 'Running / Jogging', status: 'Unsafe', advice: 'Strictly avoid. Exercise under very unhealthy air leads to systemic inflammation.' }
    ],
    maskRecommendation: 'Mandatory N95/N99 respirator mask for any essential outdoor exposure. Ensure a tight seal around the face.',
    indoorRecommendation: 'Seal gaps under doors and windows. Run air purifiers on maximum. Run air conditioners in "recirculation" mode to avoid pulling outdoor air.'
  },
  'Hazardous': {
    category: 'Hazardous',
    generalPublic: 'Health warning of emergency conditions. The entire population is highly likely to be seriously affected. Everyone should avoid all outdoor physical activity.',
    vulnerableGroups: [
      { group: 'Children', advice: 'Absolute indoor lockdown. Keep rooms sealed.', icon: 'baby' },
      { group: 'Senior Citizens', advice: 'Strictly stay indoors. Keep medical assistance contacts on speed-dial.', icon: 'user' },
      { group: 'Asthma Patients', advice: 'Severe risk of asthma attack. Remain in a sealed room with high-efficiency air filters.', icon: 'activity' },
      { group: 'Heart Patients', advice: 'Critical cardiovascular strain. Avoid all exertion. Stay in a clean-air environment.', icon: 'heart' }
    ],
    activities: [
      { activity: 'Outdoor Exercise', status: 'Unsafe', advice: 'Extremely dangerous. Do not exercise outdoors under any circumstances.' },
      { activity: 'Cycling', status: 'Unsafe', advice: 'Do not ride. Travel only if absolutely critical, using closed air-filtered vehicles.' },
      { activity: 'Running / Jogging', status: 'Unsafe', advice: 'Strictly avoid. Heavy respiration in hazardous air causes acute lung injury.' }
    ],
    maskRecommendation: 'Mandatory N95/N99 or elastomeric respirator for any outdoor exposure. Limit outdoor exposure to seconds if possible.',
    indoorRecommendation: 'Turn on all air purifiers to maximum. Seal all windows, exhaust fans, and vents. If air quality indoors drops, consider evacuating to a clean-air shelter.'
  }
};

interface HealthRecommendationsProps {
  category: AqiCategory;
}

export function HealthRecommendationsCard({ category }: HealthRecommendationsProps) {
  const data = HEALTH_RECOMMENDATIONS_DB[category] || HEALTH_RECOMMENDATIONS_DB['Good'];
  const [activeTab, setActiveTab] = useState<'general' | 'vulnerable' | 'sports' | 'protective'>('general');

  const getStatusIcon = (status: ActivityGuideline['status']) => {
    switch (status) {
      case 'Safe':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'Caution':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'Unsafe':
      default:
        return <XCircle className="h-5 w-5 text-rose-500" />;
    }
  };

  const getStatusColor = (status: ActivityGuideline['status']) => {
    switch (status) {
      case 'Safe':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'Caution':
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
      case 'Unsafe':
      default:
        return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    }
  };

  const getVulnerableIcon = (iconName: string) => {
    switch (iconName) {
      case 'baby':
        return <Baby className="h-5 w-5 text-teal-400" />;
      case 'user':
        return <User className="h-5 w-5 text-sky-400" />;
      case 'activity':
        return <Activity className="h-5 w-5 text-amber-400" />;
      case 'heart':
      default:
        return <Heart className="h-5 w-5 text-rose-400" />;
    }
  };

  return (
    <GlassCard className="h-full border-teal-500/20 shadow-teal-950/10" hoverEffect={false}>
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-500/10 p-2.5 text-teal-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Health & Action Guidelines</h3>
              <p className="text-xs text-zinc-400">Custom advice tailored for "{category}" air quality</p>
            </div>
          </div>
          <div className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold border flex items-center gap-1.5",
            category === 'Good' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            category === 'Moderate' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            category === 'Unhealthy for Sensitive Groups' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            category === 'Unhealthy' && 'bg-red-500/10 text-red-400 border-red-500/20',
            category === 'Very Unhealthy' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            category === 'Hazardous' && 'bg-rose-950/20 text-rose-400 border-rose-900/30'
          )}>
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                category === 'Good' && 'bg-emerald-400',
                category === 'Moderate' && 'bg-yellow-400',
                category === 'Unhealthy for Sensitive Groups' && 'bg-orange-400',
                category === 'Unhealthy' && 'bg-red-400',
                category === 'Very Unhealthy' && 'bg-purple-400',
                category === 'Hazardous' && 'bg-rose-500'
              )}></span>
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                category === 'Good' && 'bg-emerald-500',
                category === 'Moderate' && 'bg-yellow-500',
                category === 'Unhealthy for Sensitive Groups' && 'bg-orange-500',
                category === 'Unhealthy' && 'bg-red-500',
                category === 'Very Unhealthy' && 'bg-purple-500',
                category === 'Hazardous' && 'bg-rose-600'
              )}></span>
            </span>
            {category}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-zinc-800 p-0.5 scrollbar-none overflow-x-auto gap-2">
          {[
            { id: 'general', label: 'General Advice' },
            { id: 'vulnerable', label: 'Vulnerable Groups' },
            { id: 'sports', label: 'Sports & Outdoors' },
            { id: 'protective', label: 'Home & Masks' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none whitespace-nowrap",
                activeTab === tab.id ? "text-teal-400" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeRecommendationsTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'general' && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl bg-zinc-900/50 p-5 border border-zinc-800/80">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-teal-400" />
                      Status Summary
                    </h4>
                    <p className="text-zinc-200 text-sm leading-relaxed">{data.generalPublic}</p>
                  </div>
                  <div className="text-xs text-zinc-500 italic">
                    *Guidelines are based on standard environmental protection safety indexes adjusted for Kerala's air dynamic factors.
                  </div>
                </div>
              )}

              {activeTab === 'vulnerable' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.vulnerableGroups.map((group, idx) => (
                    <div key={idx} className="flex gap-3.5 items-start p-4 rounded-xl bg-zinc-900/40 border border-zinc-850 hover:border-zinc-800 transition-colors duration-200">
                      <div className="rounded-lg bg-zinc-800/60 p-2.5 mt-0.5">
                        {getVulnerableIcon(group.icon)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-200 text-sm">{group.group}</h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{group.advice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'sports' && (
                <div className="flex flex-col gap-3">
                  {data.activities.map((act, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-850 gap-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(act.status)}
                        <span className="font-semibold text-zinc-200 text-sm">{act.activity}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 md:justify-end">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          getStatusColor(act.status)
                        )}>
                          {act.status}
                        </span>
                        <span className="text-xs text-zinc-400 md:text-right max-w-md">{act.advice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'protective' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4 p-4.5 rounded-xl bg-zinc-900/40 border border-zinc-850">
                    <div className="rounded-lg bg-teal-500/10 p-2.5 text-teal-400 mt-0.5">
                      <Wind className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">Mask Recommendations</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{data.maskRecommendation}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4.5 rounded-xl bg-zinc-900/40 border border-zinc-850">
                    <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400 mt-0.5">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-200 text-sm mb-1">Indoor Air Management</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{data.indoorRecommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </GlassCard>
  );
}
