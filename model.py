import requests
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import datetime, timedelta
import difflib

# Kerala states, districts, and major cities for spelling correction
KERALA_LOCATIONS = [
    "Kerala", "Thiruvananthapuram", "Trivandrum", "Kollam", "Alappuzha", "Pathanamthitta",
    "Kottayam", "Idukki", "Ernakulam", "Kochi", "Thrissur", "Palakkad", "Malappuram",
    "Kozhikode", "Calicut", "Wayanad", "Kannur", "Kasaragod",
    "Vatakara", "Thalassery", "Manjeri", "Ponnani", "Kayamkulam", "Neyyattinkara",
    "Nedumangad", "Kanhangad", "Payyanur", "Koyilandy", "Attingal", "Changanassery",
    "Thrippunithura", "Pala", "Thodupuzha", "Chittur-Thathamangalam", "Shoranur", "Varkala"
]

# Allowed other Indian states
OTHER_INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

# Combined list for spelling correction
ALLOWED_LOCATIONS = KERALA_LOCATIONS + OTHER_INDIAN_STATES

def correct_spelling(query):
    query_lower = query.strip().lower()
    matches = difflib.get_close_matches(query_lower, [t.lower() for t in ALLOWED_LOCATIONS], n=1, cutoff=0.75)
    if matches:
        matched_lower = matches[0]
        for loc in ALLOWED_LOCATIONS:
            if loc.lower() == matched_lower:
                return loc
    return query

def get_city_data(city):
    # 0. Perform spelling correction
    city = correct_spelling(city)
    
    # 1. Check if the query is a state outside Kerala
    is_other_state = city in OTHER_INDIAN_STATES
    
    geocode_url = "https://nominatim.openstreetmap.org/search"
    headers = {
        "User-Agent": "AQI-Predictor-App-v2"
    }
    
    # If it is a state outside Kerala, search for it directly.
    # Otherwise, search and force it to be inside Kerala, India.
    if is_other_state:
        geocode_params = {
            "q": f"{city}, India",
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
    else:
        geocode_params = {
            "q": f"{city}, Kerala, India",
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
    
    try:
        response = requests.get(geocode_url, headers=headers, params=geocode_params, timeout=10)
        if response.status_code != 200:
            return None
        geocode_data = response.json()
        if not geocode_data:
            return None
    except Exception:
        return None
        
    lat = geocode_data[0]["lat"]
    lon = geocode_data[0]["lon"]
    display_name = geocode_data[0]["display_name"]
    bbox = geocode_data[0].get("boundingbox")
    address = geocode_data[0].get("address", {})
    
    # Validate the location type and state constraints
    geo_class = geocode_data[0].get("class", "")
    if geo_class not in ["boundary", "place"]:
        return None
        
    if is_other_state:
        # Strictly enforce that it is indeed that specific state in India
        state = address.get("state", "")
        if state != city and city not in display_name:
            return None
    else:
        # Strictly enforce that it is inside Kerala
        state = address.get("state", "")
        if state != "Kerala" and "Kerala" not in display_name:
            return None
        
    # 2. Get monitoring locations near coordinates using OpenAQ v3
    headers_openaq = {
        "X-API-Key": "de03d242760a714aac0b99f41daf6ee782886738e623ad043733785d0f41abf0"
    }
    
    locations = []
    
    # Try coordinate radius search first (within 25km radius)
    locations_url = "https://api.openaq.org/v3/locations"
    loc_params = {
        "coordinates": f"{lat},{lon}",
        "radius": 25000,
        "limit": 10
    }
    
    try:
        response = requests.get(locations_url, headers=headers_openaq, params=loc_params, timeout=10)
        if response.status_code == 200:
            locations_data = response.json()
            locations = locations_data.get("results", [])
    except Exception:
        pass
        
    # Fallback 1: If no locations found near center point, and we have a regional bounding box, try bbox search
    if not locations and bbox and len(bbox) == 4:
        try:
            min_lat, max_lat, min_lon, max_lon = map(float, bbox)
            bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"
            bbox_params = {
                "bbox": bbox_str,
                "limit": 10
            }
            response = requests.get(locations_url, headers=headers_openaq, params=bbox_params, timeout=10)
            if response.status_code == 200:
                locations_data = response.json()
                locations = locations_data.get("results", [])
        except Exception:
            pass

    # Fallback 2: If still no locations found (e.g. city doesn't have an active sensor), 
    # find active sensors in the state of Kerala bounding box boundary!
    if not locations:
        try:
            # Geocode Kerala, India specifically to get the state bounding box
            fb_params = {
                "q": "Kerala, India",
                "format": "json",
                "limit": 1
            }
            fb_resp = requests.get(geocode_url, headers=headers, params=fb_params, timeout=10)
            if fb_resp.status_code == 200:
                fb_data = fb_resp.json()
                if fb_data and fb_data[0].get("boundingbox"):
                    fb_bbox = fb_data[0]["boundingbox"]
                    min_lat, max_lat, min_lon, max_lon = map(float, fb_bbox)
                    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"
                    bbox_params = {
                        "bbox": bbox_str,
                        "limit": 10
                    }
                    response = requests.get(locations_url, headers=headers_openaq, params=bbox_params, timeout=10)
                    if response.status_code == 200:
                        locations_data = response.json()
                        locations = locations_data.get("results", [])
        except Exception:
            pass
            
    # 3. Iterate through locations to find one with PM2.5 measurements
    for loc in locations:
        pm25_sensor = None
        for sensor in loc.get("sensors", []):
            parameter = sensor.get("parameter")
            if parameter and parameter.get("name") == "pm25":
                pm25_sensor = sensor
                break
                
        if not pm25_sensor:
            continue
            
        sensor_id = pm25_sensor["id"]
        
        # 4. Fetch the sensor metadata to get datetimeLast
        sensor_url = f"https://api.openaq.org/v3/sensors/{sensor_id}"
        try:
            s_resp = requests.get(sensor_url, headers=headers_openaq, timeout=10)
            if s_resp.status_code != 200:
                continue
            s_data = s_resp.json()
            results = s_data.get("results", [])
            if not results:
                continue
            datetime_last_info = results[0].get("datetimeLast")
            if not datetime_last_info:
                continue
            datetime_last_str = datetime_last_info.get("utc")
        except Exception:
            continue
            
        # 5. Fetch measurements dynamically starting with a sliding window
        # We start with 7 days and back off up to 365 days if we don't get at least 30 measurements.
        try:
            dt_last = datetime.fromisoformat(datetime_last_str.replace("Z", "+00:00"))
        except Exception:
            continue
            
        values = []
        meas_url = f"https://api.openaq.org/v3/sensors/{sensor_id}/measurements"
        
        for days in [7, 30, 90, 365]:
            dt_from = dt_last - timedelta(days=days)
            meas_params = {
                "datetime_from": dt_from.isoformat(),
                "limit": 100
            }
            try:
                m_resp = requests.get(meas_url, headers=headers_openaq, params=meas_params, timeout=10)
                if m_resp.status_code == 200:
                    m_data = m_resp.json()
                    m_results = m_data.get("results", [])
                    # Filter non-null measurements
                    valid_measurements = [x for x in m_results if x.get("value") is not None]
                    if len(valid_measurements) >= 30:
                        # Sort measurements chronologically (ascending)
                        valid_measurements.sort(key=lambda x: x["period"]["datetimeTo"]["utc"])
                        values = [float(x["value"]) for x in valid_measurements]
                        break
            except Exception:
                continue
                
        # If sliding window failed to get 30 measurements, fallback to fetching recent measurements without date_from
        if len(values) < 10:
            try:
                meas_params = {
                    "limit": 100
                }
                m_resp = requests.get(meas_url, headers=headers_openaq, params=meas_params, timeout=10)
                if m_resp.status_code == 200:
                    m_data = m_resp.json()
                    m_results = m_data.get("results", [])
                    valid_measurements = [x for x in m_results if x.get("value") is not None]
                    if len(valid_measurements) >= 10:
                        valid_measurements.sort(key=lambda x: x["period"]["datetimeTo"]["utc"])
                        values = [float(x["value"]) for x in valid_measurements]
            except Exception:
                continue
                
        if len(values) >= 10:
            return {
                "values": values,
                "location_name": loc["name"],
                "display_name": display_name,
                "coordinates": {
                    "lat": float(lat),
                    "lon": float(lon)
                }
            }
            
    return None

def train_and_predict(city):
    data = get_city_data(city)
    if data is None:
        return None
        
    values = data["values"]
    
    # Train autoregressive Linear Regression model (predict tomorrow's value using today's)
    df = pd.DataFrame({
        "today": values[:-1],
        "tomorrow": values[1:]
    })
    
    X = df[["today"]].values
    y = df["tomorrow"].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    latest_value = np.array([[values[-1]]])
    prediction = model.predict(latest_value)[0]
    
    return {
        "predicted_pm25": round(float(prediction), 2),
        "current_pm25": round(float(values[-1]), 2),
        "historical_values": [round(float(v), 2) for v in values],
        "location_name": data["location_name"],
        "display_name": data["display_name"],
        "coordinates": data["coordinates"]
    }