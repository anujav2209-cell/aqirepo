# Air Quality Predictor 🌬️🧪
### Premium AI-Powered Air Quality prediction Platform for Kerala

Air Quality Predictor is a production-quality, premium SaaS dashboard that monitors and predicts Tomorrow's Air Quality Index (AQI) for all 14 districts of Kerala. Designed with a futuristic Apple + Stripe + Linear design aesthetic, it features glassmorphism panels, interactive Leaflet choropleth maps, responsive Recharts trends, and a decoupled prediction architecture that supports switching between physical meteorological heuristics and trained XGBoost models.

---

## 🚀 Key Features

- **Live Air Quality Indicators**: Real-time US AQI calculation on a 0-500 scale with animated speedometers, detailed WHO limit comparison sliders, and weather metric cards (temperature, humidity, wind, rainfall).
- **Tomorrow's AQI Predictor**: Custom next-day forecast showing target values, category indicators, model confidence meters, and tabular explainability reasons.
- **Dynamic Kerala Choropleth Map**: Custom leaflet mapping that swaps tile layers for Light/Dark mode and renders glowing, pulsing indicators colored by each district's AQI category.
- **Seeded Historical Trends**: Generates deterministic, stable 30-day timelines for actual AQI, predicted AQI, pollutant parameters (PM2.5, PM10, NO₂, SO₂, O₃), wind speed, and daily prediction error rates.
- **Multi-District Comparison matrix**: Allows side-by-side comparison of 2 to 4 districts, plotting comparative charts and pollutant radar overlaps.
- **Comprehensive Analytics Dashboard**: Aggregates state-wide data identifying clean zones, pollution spikes, overall forecasting accuracy, and monthly trend cycles.
- **Floating Health recommendations Card**: Tailored advice for specific personas (General Public, Children, Seniors, Asthma and Heart patients) and sports activities (Cycling, Running, general workouts).
- **CSV & Print-ready PDF reports**: Structured tables that export current metrics and 30-day logs, alongside custom printer CSS stylesheets for PDF downloads.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack SSR with Vite and Vinxi plugins)
- **Frontend Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Vite-native compilation)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts v2](https://recharts.org/)
- **Maps**: [Leaflet](https://leafletjs.com/) & [React Leaflet v5](https://react-leaflet.js.org/)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **Model Training**: Python (Pandas, Scikit-learn, XGBoost)

---

## 📂 Folder Structure

```text
├── app.config.ts            # TanStack Start configurations (Vite, Tailwind v4)
├── tsconfig.json            # Path mappings alias (~/* mapping to src/*)
├── package.json             # React 19 dependencies & scripts
├── model/                   # Offline Machine Learning Model
│   └── train.py             # Synthetic history generator & XGBoost trainer
├── src/
│   ├── routes/              # TanStack Router File-based Routes
│   │   ├── __root.tsx       # Root layout, theme context & search autocomplete
│   │   ├── index.tsx        # Hero Landing Page
│   │   ├── dashboard.tsx    # District Dashboard, dials & export actions
│   │   ├── comparison.tsx   # Multi-district comparison & Radar charts
│   │   └── analytics.tsx    # Statewide aggregates, monthly area charts & Map
│   ├── components/          # Reusable UI Components
│   │   ├── KeralaMap.tsx    # SSR-safe dynamic React Leaflet choropleth map
│   │   ├── DashboardCharts.tsx # Recharts trends, weather correlation & errors
│   │   ├── HealthRecommendations.tsx # Advisory tab cards mapped by category
│   │   └── ui/
│   │       ├── GlassCard.tsx # Base frosted card container
│   │       └── AnimatedCounter.tsx # Framer-motion layout dial counter
│   ├── services/
│   │   └── dataProvider.ts  # Modular auto-failover API client layer
│   ├── prediction/
│   │   └── engine.ts        # Heuristic and ML prediction interfaces
│   ├── types/
│   │   └── aqi.ts           # Shared TypeScript domain interfaces
│   ├── utils/
│   │   ├── cn.ts            # Class merging utility
│   │   └── aqiCalculator.ts # EPA breakpoints formulas & color metrics
│   └── styles.css           # Global stylesheet & animations
```

---

## ⚡ Data Failover Architecture

The API request layer is designed to run in a modular cascade. If a provider fails (network failure, API key limits, missing configuration), the application automatically cascades down:

```mermaid
graph TD
  Start[Query District AQI] --> OW[1. OpenWeather Air Pollution API]
  OW -- Success --/ Return Normalized Record
  OW -- Fails/No Key --> WAQI[2. WAQI API Feed]
  WAQI -- Success --/ Return Normalized Record
  WAQI -- Fails/No Key --> OM[3. Open-Meteo Air Quality API]
  OM -- Success --/ Return Normalized Record
  OM -- Fails/Offline --> SIM[4. Local Simulator Engine]
  SIM -- Generates Realistic Geographically Tuned Data --/ Return Normalized Record
```

*Note: Open-Meteo is a keyless free provider, which guarantees live API data functions completely out-of-the-box.*

---

## 🧠 Prediction Engine Logic

1. **Autoregressive Lags**: Calculates 3-day and 7-day rolling moving averages to determine current air momentum.
2. **Wind Speed Dispersion**: Wind speeds below 1.5 m/s generate stagnation indices (+8 points), while wind speeds above 4.5 m/s accelerate dispersion (up to -15 points).
3. **Precipitation washout**: Rainfall values are evaluated using wash coefficients, reducing PM2.5 and PM10 levels by up to 70%.
4. **Thermal activity**: Temperatures exceeding 33°C trigger photochemical ozone multipliers, while highland temperatures below 22°C (Wayanad/Idukki) trigger thermal inversion trap adjustments.

---

## 💻 Installation & Running

### Prerequisites
- Node.js v18 or later
- Python 3.8+ (for model training)

### Setup & Startup

1. **Clone and navigate to repository**:
   ```bash
   cd AQI-repo
   ```

2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```
   *Note: `--legacy-peer-deps` is used to allow React 19 compatibility validation across mapping and charting plugins.*

3. **Verify/Generate Router tree**:
   ```bash
   npm run generate-routes
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 🤖 Offline Model Training

A training pipeline is provided to generate data and evaluate prediction regressions.

1. **Install Python requirements**:
   ```bash
   pip install numpy pandas scikit-learn xgboost
   ```
   *(XGBoost is optional; the script automatically falls back to Scikit-learn Random Forest if not detected).*

2. **Execute Model Trainer**:
   ```bash
   python model/train.py
   ```
   This generates a 3-year synthetic history, splits training sets, trains the model, prints validation metrics (RMSE, MAE, R² score), lists feature importances, and saves weights to `model/export/`.
