import os
import time
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Try to import XGBoost, fallback to scikit-learn RandomForest if not installed
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import pickle

DISTRICTS = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
    'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
    'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
]

DISTRICT_PROFILES = {
    'Thiruvananthapuram': {'base_aqi': 55, 'type': 'Urban'},
    'Kollam': {'base_aqi': 75, 'type': 'Industrial'},
    'Pathanamthitta': {'base_aqi': 24, 'type': 'Forest'},
    'Alappuzha': {'base_aqi': 35, 'type': 'Coastal'},
    'Kottayam': {'base_aqi': 42, 'type': 'Midland'},
    'Idukki': {'base_aqi': 20, 'type': 'Highland'},
    'Ernakulam': {'base_aqi': 82, 'type': 'Industrial'},
    'Thrissur': {'base_aqi': 52, 'type': 'Urban'},
    'Palakkad': {'base_aqi': 48, 'type': 'Midland'},
    'Malappuram': {'base_aqi': 38, 'type': 'Midland'},
    'Kozhikode': {'base_aqi': 46, 'type': 'Coastal'},
    'Wayanad': {'base_aqi': 18, 'type': 'Highland'},
    'Kannur': {'base_aqi': 40, 'type': 'Coastal'},
    'Kasaragod': {'base_aqi': 36, 'type': 'Coastal'}
}

def generate_synthetic_historical_data(years=3):
    print(f"Generating {years} years of synthetic AQI/Weather historical records for Kerala...")
    
    np.random.seed(42)
    start_date = datetime.now() - timedelta(days=years * 365)
    records = []
    
    for district in DISTRICTS:
        profile = DISTRICT_PROFILES[district]
        base_aqi = profile['base_aqi']
        dist_type = profile['type']
        
        for day in range(years * 365):
            curr_date = start_date + timedelta(days=day)
            month = curr_date.month
            day_of_week = curr_date.weekday()
            
            # 1. Weather factors based on profile
            # Temperature
            if dist_type == 'Highland':
                temp = 16 + np.random.normal(0, 3) + np.sin((month / 12) * 2 * np.pi) * 3
            else:
                temp = 29 + np.random.normal(0, 2) + np.sin((month / 12) * 2 * np.pi) * 2
                
            # Humidity
            humidity = 70 + np.random.normal(0, 10)
            if month in [6, 7, 8, 9]: # Monsoon Peak
                humidity = min(100, humidity + 15)
                
            # Wind speed (m/s)
            if dist_type == 'Coastal':
                wind_speed = 3.5 + np.random.exponential(1.5)
            else:
                wind_speed = 1.8 + np.random.exponential(1.0)
                
            # Rainfall (mm)
            if month in [6, 7, 8, 9]: # Southwest Monsoon
                rain = np.random.choice([0, np.random.exponential(15)], p=[0.3, 0.7])
            elif month in [10, 11]: # Northeast Monsoon
                rain = np.random.choice([0, np.random.exponential(8)], p=[0.6, 0.4])
            else:
                rain = np.random.choice([0, np.random.exponential(2)], p=[0.9, 0.1])
                
            # 2. Seasonality and Day of Week filters
            seasonal_mult = 1.0
            if month in [6, 7, 8, 9]: # Monsoon wash out
                seasonal_mult = 0.55
            elif month in [12, 1]: # Winter inversions
                seasonal_mult = 1.15
                
            weekday_mult = 1.15 if day_of_week < 5 else 0.85 # Traffic drops on weekends
            
            # 3. Compute AQI pollutants with weather coupling
            # Rain washes out PM2.5 & PM10
            pm_washout = max(0.3, 1.0 - (rain * 0.08)) if rain > 0 else 1.0
            # Wind disperses pollutants
            pm_dispersion = max(0.4, 1.0 - ((wind_speed - 2.0) * 0.12)) if wind_speed > 2.0 else 1.0
            
            pm25 = max(2, (base_aqi * 0.45 * seasonal_mult * weekday_mult * pm_washout * pm_dispersion) + np.random.normal(0, 4))
            pm10 = max(5, (base_aqi * 0.85 * seasonal_mult * weekday_mult * pm_washout * pm_dispersion) + np.random.normal(0, 8))
            no2 = max(1, (base_aqi * 0.3 * weekday_mult * pm_dispersion) + np.random.normal(0, 3))
            so2 = max(0.5, (base_aqi * 0.1 * pm_dispersion) + np.random.normal(0, 1))
            co = max(0.1, (base_aqi * 0.008 * weekday_mult * pm_dispersion) + np.random.normal(0, 0.1))
            o3 = max(5, (base_aqi * 0.5 * (temp/28) * pm_dispersion) + np.random.normal(0, 5))
            
            # Simple US AQI calculation equivalent
            aqi = int(max(pm25 * 2.2, pm10 * 1.1, no2 * 1.5, o3 * 1.2))
            aqi = max(5, min(500, aqi))
            
            records.append({
                'district': district,
                'timestamp': curr_date,
                'month': month,
                'day_of_week': day_of_week,
                'temp': round(temp, 1),
                'humidity': int(min(100, max(10, humidity))),
                'wind_speed': round(wind_speed, 1),
                'rain': round(rain, 1),
                'pm25': round(pm25, 1),
                'pm10': round(pm10, 1),
                'no2': round(no2, 1),
                'so2': round(so2, 1),
                'co': round(co, 2),
                'o3': round(o3, 1),
                'aqi': aqi
            })
            
    return pd.DataFrame(records)

def train_prediction_model():
    df = generate_synthetic_historical_data()
    
    # Feature Engineering
    print("Performing feature engineering...")
    
    # Group by district and sort by timestamp to calculate lags
    df = df.sort_values(['district', 'timestamp'])
    
    # Create lag features (yesterday's AQI and pollutants)
    df['prev_aqi'] = df.groupby('district')['aqi'].shift(1)
    df['prev_pm25'] = df.groupby('district')['pm25'].shift(1)
    df['prev_pm10'] = df.groupby('district')['pm10'].shift(1)
    
    # 3-day and 7-day rolling averages
    df['rolling_3d_aqi'] = df.groupby('district')['aqi'].shift(1).rolling(3, min_periods=1).mean()
    df['rolling_7d_aqi'] = df.groupby('district')['aqi'].shift(1).rolling(7, min_periods=1).mean()
    
    # Target variable: tomorrow's AQI
    df['tomorrow_aqi'] = df.groupby('district')['aqi'].shift(-1)
    
    # Drop rows with NaN (due to shifts)
    df = df.dropna()
    
    # One-hot encode district
    df_encoded = pd.get_dummies(df, columns=['district'], drop_first=True)
    
    # Define features and target
    feature_cols = [
        'month', 'day_of_week', 'temp', 'humidity', 'wind_speed', 'rain',
        'pm25', 'pm10', 'no2', 'so2', 'co', 'o3',
        'prev_aqi', 'prev_pm25', 'prev_pm10', 'rolling_3d_aqi', 'rolling_7d_aqi'
    ] + [col for col in df_encoded.columns if col.startswith('district_')]
    
    X = df_encoded[feature_cols]
    y = df_encoded['tomorrow_aqi']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training shape: {X_train.shape}, Testing shape: {X_test.shape}")
    
    if HAS_XGBOOST:
        print("Training XGBoost Regressor model...")
        model = xgb.XGBRegressor(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.08,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
    else:
        print("XGBoost not detected. Falling back to Random Forest Regressor...")
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            random_state=42,
            n_jobs=-1
        )
        
    start_time = time.time()
    model.fit(X_train, y_train)
    elapsed = time.time() - start_time
    print(f"Model training completed in {elapsed:.2f} seconds.")
    
    # Predictions and Metrics
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n==================================================")
    print("MODEL PERFORMANCE METRICS")
    print("==================================================")
    print(f"Model Type: {'XGBoost Regressor' if HAS_XGBOOST else 'Random Forest Regressor'}")
    print(f"Root Mean Squared Error (RMSE): {rmse:.3f} AQI points")
    print(f"Mean Absolute Error (MAE):       {mae:.3f} AQI points")
    print(f"R-squared (R2) score:            {r2:.4f}")
    print("==================================================\n")
    
    # Feature Importances
    importances = model.feature_importances_
    feat_importances = pd.Series(importances, index=feature_cols).sort_values(ascending=False)
    
    print("TOP 10 FEATURE IMPORTANCE RANKING:")
    for idx, (feat, imp) in enumerate(feat_importances.head(10).items()):
        print(f"{idx+1}. {feat:<20} : {imp:.4f}")
    
    # Export Model Files
    os.makedirs('model/export', exist_ok=True)
    
    # 1. Save standard binary model
    model_filepath = 'model/export/aqi_xgboost_model.pkl' if HAS_XGBOOST else 'model/export/aqi_rf_model.pkl'
    with open(model_filepath, 'wb') as f:
        pickle.dump(model, f)
    print(f"\nSaved model weights binary to: {model_filepath}")
        
    # 2. Save coefficients metadata as JSON for JS compatibility reference
    coef_meta = {
        "model_type": "XGBoost" if HAS_XGBOOST else "RandomForest",
        "r2_score": round(r2, 4),
        "rmse": round(rmse, 3),
        "mae": round(mae, 3),
        "top_features": feat_importances.head(5).to_dict()
    }
    
    with open('model/export/model_meta.json', 'w') as f:
        json.dump(coef_meta, f, indent=2)
    print("Saved model coefficients metadata to: model/export/model_meta.json")

if __name__ == '__main__':
    train_prediction_model()
