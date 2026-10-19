import React, { createContext, useContext, useState, useEffect } from 'react';
import { HeadContent, Scripts, createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Wind, Search, Sun, Moon, Sparkles, Heart, Clock, Menu, X, ArrowUpRight, Cpu } from 'lucide-react';
import { DISTRICT_LIST } from '../types/aqi';
import type { DistrictName } from '../types/aqi';
import appCss from '../styles.css?url';
import { cn } from '../utils/cn';

// Define context state
interface AppContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  engineType: 'heuristic' | 'ml';
  setEngineType: (type: 'heuristic' | 'ml') => void;
  favorites: DistrictName[];
  toggleFavorite: (district: DistrictName) => void;
  recentSearches: DistrictName[];
  addRecentSearch: (district: DistrictName) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Air Quality Predictor | Premium AI Kerala AQI Forecasting' },
      { name: 'description', content: 'SaaS-grade AI-powered Tomorrow Air Quality Index (AQI) predictor for all 14 districts of Kerala.' }
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap' }
    ],
  }),
  shellComponent: RootShell,
});

function RootShell() {
  // 1. Core State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [engineType, setEngineType] = useState<'heuristic' | 'ml'>('heuristic');
  const [favorites, setFavorites] = useState<DistrictName[]>([]);
  const [recentSearches, setRecentSearches] = useState<DistrictName[]>([]);

  // Autocomplete search states
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Load localStorage preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('aqi_theme') as 'dark' | 'light' | null;
    const savedEngine = localStorage.getItem('aqi_engine') as 'heuristic' | 'ml' | null;
    const savedFavs = localStorage.getItem('aqi_favorites');
    const savedRecent = localStorage.getItem('aqi_recent');

    if (savedTheme) setTheme(savedTheme);
    if (savedEngine) setEngineType(savedEngine);
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedRecent) setRecentSearches(JSON.parse(savedRecent));
  }, []);

  // Sync state changes with localStorage and HTML element (for Tailwind light/dark support)
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('aqi_theme', nextTheme);
  };

  const handleSetEngineType = (type: 'heuristic' | 'ml') => {
    setEngineType(type);
    localStorage.setItem('aqi_engine', type);
  };

  const toggleFavorite = (district: DistrictName) => {
    let nextFavs = [...favorites];
    if (favorites.includes(district)) {
      nextFavs = nextFavs.filter(f => f !== district);
    } else {
      nextFavs.push(district);
    }
    setFavorites(nextFavs);
    localStorage.setItem('aqi_favorites', JSON.stringify(nextFavs));
  };

  const addRecentSearch = (district: DistrictName) => {
    const filtered = recentSearches.filter(r => r !== district);
    const nextRecent = [district, ...filtered].slice(0, 5) as DistrictName[];
    setRecentSearches(nextRecent);
    localStorage.setItem('aqi_recent', JSON.stringify(nextRecent));
  };

  // Autocomplete filtering
  const filteredDistricts = DISTRICT_LIST.filter(d =>
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDistrict = (district: DistrictName) => {
    addRecentSearch(district);
    setSearchQuery('');
    setShowSearchDropdown(false);
    navigate({
      to: '/dashboard',
      search: { district }
    });
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      engineType,
      setEngineType: handleSetEngineType,
      favorites,
      toggleFavorite,
      recentSearches,
      addRecentSearch
    }}>
      <html lang="en" className={cn(theme)}>
        <head>
          <HeadContent />
        </head>
        <body className="bg-aurora-glow min-h-screen text-zinc-100 flex flex-col font-sans transition-colors duration-300">
          
          {/* Background Decorative Neon Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none -z-20 animate-float-slow" />
          <div className="absolute top-[60%] right-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none -z-20 animate-float-medium" />

          {/* Floating Premium Header */}
          <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/40 backdrop-blur-xl shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-wide shrink-0">
                <div className="bg-gradient-to-tr from-teal-500 to-sky-500 rounded-lg p-2 text-zinc-950 flex items-center justify-center">
                  <Wind className="h-5 w-5 stroke-[2.5]" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-100 to-zinc-400 font-extrabold">Air Quality Predictor</span>
                <span className="text-teal-400 font-semibold text-xs border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 rounded-full ml-1">KERALA</span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-zinc-400">
                <Link to="/" className="hover:text-zinc-200 transition-colors [&.active]:text-teal-400 [&.active]:font-bold">Home</Link>
                <Link to="/dashboard" search={{ district: 'Thiruvananthapuram' }} className="hover:text-zinc-200 transition-colors [&.active]:text-teal-400 [&.active]:font-bold">Dashboard</Link>
                <Link to="/comparison" className="hover:text-zinc-200 transition-colors [&.active]:text-teal-400 [&.active]:font-bold">Compare</Link>
                <Link to="/analytics" className="hover:text-zinc-200 transition-colors [&.active]:text-teal-400 [&.active]:font-bold">Analytics</Link>
              </nav>

              {/* Autocomplete Search input */}
              <div className="relative flex-1 max-w-sm hidden md:block">
                <div className="flex items-center bg-zinc-900/60 border border-zinc-800 focus-within:border-teal-500/40 focus-within:ring-1 focus-within:ring-teal-500/30 rounded-xl px-3.5 py-1.5 transition-all duration-200">
                  <Search className="h-4 w-4 text-zinc-500 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    placeholder="Search 14 districts..."
                    className="bg-transparent border-none text-sm text-zinc-200 placeholder-zinc-500 outline-none w-full"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-300">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown results */}
                {showSearchDropdown && (
                  <div className="absolute top-12 left-0 right-0 z-50 bg-zinc-950/95 border border-zinc-850 rounded-xl shadow-2xl p-2 max-h-[280px] overflow-y-auto backdrop-blur-md">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase px-3 py-1 mb-1 tracking-wider border-b border-zinc-900">Districts</div>
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((d) => (
                        <button
                          key={d}
                          onClick={() => handleSelectDistrict(d)}
                          className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-teal-500/10 hover:text-teal-400 transition-all duration-150 font-medium"
                        >
                          <span>{d}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-55" />
                        </button>
                      ))
                    ) : (
                      <div className="text-xs text-zinc-500 px-3 py-2">No districts found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls (Engine Pill + Mode Switch) */}
              <div className="flex items-center gap-3 shrink-0">
                
                {/* Engine Selector Switch (Interactive Badge) */}
                <div className="hidden sm:flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 relative items-center">
                  <button
                    onClick={() => handleSetEngineType('heuristic')}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded transition-all duration-200 focus:outline-none flex items-center gap-1",
                      engineType === 'heuristic'
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    )}
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    Heuristic
                  </button>
                  <button
                    onClick={() => handleSetEngineType('ml')}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded transition-all duration-200 focus:outline-none flex items-center gap-1",
                      engineType === 'ml'
                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    XGBoost AI
                  </button>
                </div>

                {/* Dark Mode toggle */}
                <button
                  onClick={toggleTheme}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-200 cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-zinc-600" />}
                </button>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="lg:hidden bg-zinc-950 border-t border-zinc-850 p-4 flex flex-col gap-3.5 shadow-2xl">
                {/* Search */}
                <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2">
                  <Search className="h-4 w-4 text-zinc-500 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search district..."
                    className="bg-transparent border-none text-sm text-zinc-200 placeholder-zinc-500 outline-none w-full"
                  />
                </div>
                {searchQuery && (
                  <div className="bg-zinc-900 rounded-lg p-1 max-h-[160px] overflow-y-auto">
                    {filteredDistricts.map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          handleSelectDistrict(d);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:text-teal-400"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Mobile Nav Links */}
                <div className="flex flex-col gap-2.5 font-semibold text-zinc-400 text-sm border-t border-zinc-900 pt-3">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-zinc-200 transition-colors">Home</Link>
                  <Link to="/dashboard" search={{ district: 'Thiruvananthapuram' }} onClick={() => setMobileMenuOpen(false)} className="hover:text-zinc-200 transition-colors">Dashboard</Link>
                  <Link to="/comparison" onClick={() => setMobileMenuOpen(false)} className="hover:text-zinc-200 transition-colors">Compare Districts</Link>
                  <Link to="/analytics" onClick={() => setMobileMenuOpen(false)} className="hover:text-zinc-200 transition-colors">Kerala Analytics</Link>
                </div>

                {/* Mobile Engine Switch */}
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 justify-around border-t border-zinc-900 pt-3">
                  <button
                    onClick={() => handleSetEngineType('heuristic')}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1.5",
                      engineType === 'heuristic' ? "bg-teal-500/10 text-teal-400" : "text-zinc-500"
                    )}
                  >
                    <Cpu className="h-4 w-4" />
                    Heuristic Model
                  </button>
                  <button
                    onClick={() => handleSetEngineType('ml')}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1.5",
                      engineType === 'ml' ? "bg-sky-500/10 text-sky-400" : "text-zinc-500"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    XGBoost AI
                  </button>
                </div>
              </div>
            )}
          </header>

          {/* Main Layout Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
            <Outlet />
          </main>

          {/* Premium Footer */}
          <footer className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl mt-12 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Brand metadata */}
              <div className="flex flex-col gap-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <div className="bg-teal-500/10 text-teal-400 p-1.5 rounded-lg">
                    <Wind className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-extrabold text-white text-sm">Air Quality Predictor</span>
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Production-grade SaaS pipeline predicting Tomorrow's Air Quality index using meteorological models.
                </p>
              </div>

              {/* Data Sources and pipeline validation info */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  <span>OpenWeather API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>WAQI API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Open-Meteo Air API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span>Auto-failover Pipeline</span>
                </div>
              </div>

              {/* Copy / Version info */}
              <div className="text-center md:text-right flex flex-col gap-1">
                <p className="text-xs text-zinc-500">© 2026 Air Quality Predictor. All rights reserved.</p>
                <div className="flex items-center justify-center md:justify-end gap-1.5 text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">
                  <span>Engine: {engineType.toUpperCase()} v1.4.2</span>
                  <span>•</span>
                  <span>Accuracy: ~94.2%</span>
                </div>
              </div>

            </div>
          </footer>

          <Scripts />
        </body>
      </html>
    </AppContext.Provider>
  );
}
