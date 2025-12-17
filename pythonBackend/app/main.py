import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.spatial import cKDTree
from joblib import load
import math
import random
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Store Placement Prediction API (Model-Driven)")

origins = ["http://localhost:5173", "http://127.0.0.1:5173", "https://se-project-rishi.vercel.app"]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

base_path = os.path.dirname(__file__)
data_path = os.path.join(base_path, '..', 'data', 'processed')
model_path = os.path.join(base_path)

feature_dfs = {}
feature_files = {
    'places': 'places.feather',
    'buildings': 'buildings.feather',
    'landuse': 'landuse.feather',
    'natural': 'natural.feather',
    'pois': 'pois.feather',
}

def load_feather_safely(name, filename):
    try:
        df = pd.read_feather(os.path.join(data_path, filename))
        return df
    except FileNotFoundError:
        return pd.DataFrame()

for name, filename in feature_files.items():
    feature_dfs[name] = load_feather_safely(name, filename)

if feature_dfs['places'].empty:
    raise RuntimeError("Base 'places.feather' data is missing. Cannot initialize API.")

feature_trees = {}
for name, df in feature_dfs.items():
    if not df.empty:
        feature_trees[name] = cKDTree(df[['latitude', 'longitude']])
    else:
        feature_trees[name] = None

try:
    model = load(os.path.join(model_path, 'store_placement_model.joblib'))
    feature_cols = load(os.path.join(model_path, 'feature_columns.joblib'))
    kmeans = load(os.path.join(model_path, 'kmeans_model.joblib'))
except FileNotFoundError:
    raise RuntimeError("Model files not found. Please run '02_train_model.py' first.")

def calculate_distance_to_nearest(lat, lon, tree):
    if tree is None: return 9999.0
    dist, _ = tree.query([[lat, lon]], k=1)
    return dist[0] * 111.0

def generate_features(lat, lon):
    features = {'latitude': lat, 'longitude': lon}
    
    for name, tree in feature_trees.items():
        dist = calculate_distance_to_nearest(lat, lon, tree)
        
        expected_col_name = None
        target_name_singular = 'dist_to_nearest_' + name.rstrip('s')
        target_name_plural = 'dist_to_nearest_' + name
        
        for col in feature_cols:
            if col == target_name_plural:
                expected_col_name = target_name_plural
                break
            if col == target_name_singular:
                expected_col_name = target_name_singular
                break
        
        if not expected_col_name:
             expected_col_name = f'dist_to_nearest_{name}'

        features[expected_col_name] = dist
        
    feature_vector = pd.DataFrame([features])[feature_cols]
    return feature_vector

def get_nearest_place_name(lat, lon):
    places_df = feature_dfs['places']
    if places_df.empty or feature_trees['places'] is None: return "Open Area"
    
    distance, index = feature_trees['places'].query([[lat, lon]], k=1)
    
    if distance[0] * 111.0 <= 2.5:
        place_name = places_df.iloc[index[0]]['name']
        if place_name and isinstance(place_name, str) and place_name.strip():
            return place_name
    return "Open Area"

class CircleRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: float

@app.post("/predict-circle")
def predict_circle_locations(request: CircleRequest):
    try:
        points_to_predict = []
        num_points = 50
        for _ in range(num_points):
            angle = random.uniform(0, 2 * math.pi)
            r = request.radius_km * math.sqrt(random.uniform(0, 1))
            lat_offset = r * math.cos(angle) / 110.574
            lng_offset = r * math.sin(angle) / (111.320 * math.cos(math.radians(request.latitude)))
            points_to_predict.append({'latitude': request.latitude + lat_offset, 'longitude': request.longitude + lng_offset})
        
        results = []
        
        good_cluster_id = kmeans.cluster_centers_.sum(axis=1).argmin()
        
        for point in points_to_predict:
            lat, lon = point['latitude'], point['longitude']
            
            feature_vector = generate_features(lat, lon)
            
            probabilities = model.predict_proba(feature_vector)[0]
            
            suitability_score = probabilities[good_cluster_id]
            is_suitable = suitability_score > 0.6
            
            results.append({
                "latitude": lat, "longitude": lon,
                "is_suitable": bool(is_suitable),
                "suitability_score": round(suitability_score, 3),
                "place_name": get_nearest_place_name(lat, lon)
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal prediction error: {str(e)}")

@app.get("/")
def root():
    return {"message": "Store Placement API is running in Model-Driven mode (5-Feature Random Forest)."}