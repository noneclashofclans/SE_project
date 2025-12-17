import os
import pandas as pd
from scipy.spatial import cKDTree
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, classification_report

def load_feather_safely(path):
    required_cols = ['latitude', 'longitude']
    if os.path.exists(path):
        df = pd.read_feather(path)
        return df if not df.empty else pd.DataFrame({col: [] for col in required_cols})
    else:
        return pd.DataFrame({col: [] for col in required_cols})

def calculate_distance_to_nearest(lat, lon, tree):
    if tree is None: return 9999.0
    dist, _ = tree.query([[lat, lon]], k=1)
    return dist[0] * 111.0

def main():
    data_path = 'data/processed'

    places_df = load_feather_safely(os.path.join(data_path, 'places.feather'))
    buildings_df = load_feather_safely(os.path.join(data_path, 'buildings.feather'))
    landuse_df = load_feather_safely(os.path.join(data_path, 'landuse.feather'))
    natural_df = load_feather_safely(os.path.join(data_path, 'natural.feather'))
    pois_df = load_feather_safely(os.path.join(data_path, 'pois.feather'))

    if places_df.empty:
        return

    points_df = places_df.copy()

    trees = {
        'place': cKDTree(places_df[['latitude', 'longitude']]) if not places_df.empty else None,
        'building': cKDTree(buildings_df[['latitude', 'longitude']]) if not buildings_df.empty else None,
        'landuse': cKDTree(landuse_df[['latitude', 'longitude']]) if not landuse_df.empty else None,
        'natural': cKDTree(natural_df[['latitude', 'longitude']]) if not natural_df.empty else None,
        'pois': cKDTree(pois_df[['latitude', 'longitude']]) if not pois_df.empty else None,
    }

    feature_cols = []
    
    for feature_name, tree in trees.items():
        if tree:
            col_name = f'dist_to_nearest_{feature_name}'
            points_df[col_name] = [
                calculate_distance_to_nearest(lat, lon, tree) 
                for lat, lon in points_df[['latitude', 'longitude']].values
            ]
            feature_cols.append(col_name)
            
    cluster_features = points_df[feature_cols]
    
    kmeans = KMeans(n_clusters=2, random_state=42, n_init='auto', max_iter=500)
    
    points_df['cluster_label'] = kmeans.fit_predict(cluster_features)
    labels = points_df['cluster_label']
   
    
    if labels.nunique() < 2:
        return
        
    feature_cols_to_use = ['latitude', 'longitude'] + feature_cols
    X = points_df[feature_cols_to_use]
    y = labels
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = RandomForestClassifier(n_estimators=150, random_state=42, class_weight='balanced')
    model.fit(X_train, y_train)
    
    output_dir = 'app'
    os.makedirs(output_dir, exist_ok=True)
    
    dump(model, os.path.join(output_dir, 'store_placement_model.joblib'))
    dump(feature_cols_to_use, os.path.join(output_dir, 'feature_columns.joblib'))
    dump(kmeans, os.path.join(output_dir, 'kmeans_model.joblib'))

if __name__ == '__main__':
    main()