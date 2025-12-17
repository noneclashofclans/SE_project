import os
import gc
import pandas as pd
import gdown
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from scipy.spatial import cKDTree
from joblib import load
import math
import random
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Store Placement Prediction API (Model-Driven)")

origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173", 
    "https://se-project-rishitm.vercel.app",
    "https://se-project-nc7b.onrender.com"
]

app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

base_path = os.path.dirname(__file__)
data_path = os.path.normpath(os.path.join(base_path, '..', 'data', 'processed'))
model_path = base_path

os.makedirs(data_path, exist_ok=True)

FILE_IDS = {
    'places.feather': '1XzusjIzGXDplOXgOD3omOBQj93ti6i3Y',
    'buildings.feather': '1cb9c41YqK9AbJsPCXOeViTOqGnN59gbS',
    'landuse.feather': '1-8P1U1gkeKXU7jz6gVotY0qGWhf-z6gm',
    'natural.feather': '1Zj0OQKNyioPAfDCQ1a4S-3JhCAu31WsN',
    'pois.feather': '1k-BQGLrEApOhX0kir6PyKpq-D7zTcqKg',
    'store_placement_model.joblib': '1RPGOxJSYzZgvm-VAizavYSfsvNLL7vHH',
    'feature_columns.joblib': '1jVUwW-RPZeRyjVwxUor0mqNROC7RPIm7',
    'kmeans_model.joblib': '1RdlFtGV8ql_-2ji3l3NAox248Uf3g-37'
}

def download_file(file_name, file_id, target_dir):
    dest = os.path.join(target_dir, file_name)
    if not os.path.exists(dest):
        url = f'https://drive.google.com/uc?id={file_id}'
        gdown.download(url, dest, quiet=False)

for name, f_id in FILE_IDS.items():
    if name.endswith('.feather'):
        download_file(name, f_id, data_path)
    else:
        download_file(name, f_id, model_path)

# --- MEMORY OPTIMIZED LOADING ---
feature_files = {
    'places': 'places.feather',
    'buildings': 'buildings.feather',
    'landuse': 'landuse.feather',
    'natural': 'natural.feather',
    'pois': 'pois.feather',
}

feature_trees = {}
places_names_df = None # Global to store only names for 'places'

def load_and_build_tree(name, filename):
    global places_names_df
    try:
        path = os.path.join(data_path, filename)
        # 1. Only load essential columns
        cols = ['latitude', 'longitude']
        if name == 'places':
            cols.append('name')
            
        df = pd.read_feather(path, columns=cols)
        
        # 2. Downcast to float32 to save 50% memory per number
        df['latitude'] = df['latitude'].astype('float32')
        df['longitude'] = df['longitude'].astype('float32')
        
        # 3. Build tree
        tree = cKDTree(df[['latitude', 'longitude']])
        
        if name == 'places':
            places_names_df = df[['name']].copy()
            
        return tree
    except Exception as e:
        print(f"Error loading {name}: {e}")
        return None
    finally:
        # 5. Clear intermediate data immediately
        if 'df' in locals():
            del df
        gc.collect()

# Build trees one by one to keep peak RAM low
for name, filename in feature_files.items():
    feature_trees[name] = load_and_build_tree(name, filename)

if feature_trees['places'] is None:
    raise RuntimeError("Critical data files missing or load failed.")

try:
    model = load(os.path.join(model_path, 'store_placement_model.joblib'))
    feature_cols = load(os.path.join(model_path, 'feature_columns.joblib'))
    kmeans = load(os.path.join(model_path, 'kmeans_model.joblib'))
except Exception as e:
    raise RuntimeError(f"Model loading failed: {e}")

def calculate_distance_to_nearest(lat, lon, tree):
    if tree is None: return 999.0
    dist, _ = tree.query([[lat, lon]], k=1)
    return float(dist[0] * 111.0)

def generate_features(lat, lon):
    features = {'latitude': lat, 'longitude': lon}
    for name, tree in feature_trees.items():
        dist = calculate_distance_to_nearest(lat, lon, tree)
        target_plural = 'dist_to_nearest_' + name
        target_singular = 'dist_to_nearest_' + name.rstrip('s')
        
        found_col = f'dist_to_nearest_{name}'
        for col in feature_cols:
            if col in [target_plural, target_singular]:
                found_col = col
                break
        features[found_col] = dist
        
    return pd.DataFrame([features])[feature_cols]

def get_nearest_place_name(lat, lon):
    tree = feature_trees['places']
    if tree is None or places_names_df is None: return "Open Area"
    dist, idx = tree.query([[lat, lon]], k=1)
    if dist[0] * 111.0 <= 2.5:
        name = places_names_df.iloc[idx[0]]['name']
        return name if (isinstance(name, str) and name.strip()) else "Open Area"
    return "Open Area"

class CircleRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: float

@app.post("/predict-circle")
def predict_circle_locations(request: CircleRequest):
    try:
        results = []
        center_sum = kmeans.cluster_centers_.sum(axis=1)
        good_cluster_id = center_sum.argmin()
        
        for _ in range(50):
            angle = random.uniform(0, 2 * math.pi)
            r = request.radius_km * math.sqrt(random.uniform(0, 1))
            lat_off = r * math.cos(angle) / 110.574
            lng_off = r * math.sin(angle) / (111.320 * math.cos(math.radians(request.latitude)))
            
            p_lat, p_lng = request.latitude + lat_off, request.longitude + lng_off
            fv = generate_features(p_lat, p_lng)
            probs = model.predict_proba(fv)[0]
            score = float(probs[good_cluster_id])
            
            results.append({
                "latitude": float(p_lat), "longitude": float(p_lng),
                "is_suitable": score > 0.6,
                "suitability_score": round(score, 3),
                "place_name": get_nearest_place_name(p_lat, p_lng)
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"status": "running"}