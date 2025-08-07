# 02_train_model.py (Final Clustering Version)
import os
import pandas as pd
from scipy.spatial import cKDTree
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans # <-- NEW IMPORT
from sklearn.metrics import accuracy_score, classification_report

def load_feather_safely(path, required_cols=['latitude', 'longitude']):
    if os.path.exists(path):
        print(f"  - Loading {os.path.basename(path)}...")
        return pd.read_feather(path)
    else:
        print(f"  - ⚠️ Warning: {os.path.basename(path)} not found. Skipping.")
        return pd.DataFrame({col: [] for col in required_cols})

def calculate_distance_to_nearest(lat, lon, tree):
    if tree is None: return 999.0
    dist, _ = tree.query([[lat, lon]], k=1)
    return dist[0] * 111.0

def main():
    print("🧠 Starting Model Training (Clustering Logic)...")

    data_path = 'data/processed'
    print("✅ Loading available processed data...")
    places_df = load_feather_safely(os.path.join(data_path, 'places.feather'))
    traffic_df = load_feather_safely(os.path.join(data_path, 'traffic.feather'))

    if places_df.empty:
        print("❌ CRITICAL ERROR: 'places.feather' is required. Stopping.")
        return

    points_df = places_df

    print("🔍 Building spatial indices...")
    places_tree = cKDTree(places_df[['latitude', 'longitude']]) if not places_df.empty else None
    traffic_tree = cKDTree(traffic_df[['latitude', 'longitude']]) if not traffic_df.empty else None
    
    print("🛠️  Engineering features...")
    feature_list = []
    for _, row in points_df.iterrows():
        lat, lon = row['latitude'], row['longitude']
        features = {
            'latitude': lat, 'longitude': lon,
            'dist_to_nearest_place': calculate_distance_to_nearest(lat, lon, places_tree),
            'dist_to_nearest_traffic': calculate_distance_to_nearest(lat, lon, traffic_tree),
        }
        feature_list.append(features)
    enhanced_df = pd.DataFrame(feature_list)

    # --- FINAL, GUARANTEED LABELING LOGIC ---
    print("🏷️  Generating labels using K-Means Clustering...")
    
    # We will cluster the data into two groups based on our engineered features.
    cluster_features = enhanced_df[['dist_to_nearest_place', 'dist_to_nearest_traffic']]
    
    # Ask KMeans to find 2 distinct groups (clusters) in the data.
    kmeans = KMeans(n_clusters=2, random_state=42, n_init='auto')
    # The cluster assignments (0 or 1) will become our new labels.
    labels = pd.Series(kmeans.fit_predict(cluster_features), index=enhanced_df.index)

    print("Final label distribution (from clusters):")
    print(labels.value_counts())
    # --- END OF NEW LOGIC ---
    
    if labels.nunique() < 2:
        print("❌ Something is still very wrong, clustering should always produce 2 labels.")
        return
        
    # We train the model to predict which cluster a new point belongs to.
    feature_cols_to_use = ['latitude', 'longitude', 'dist_to_nearest_place', 'dist_to_nearest_traffic']
    X = enhanced_df[feature_cols_to_use]
    y = labels
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42) # No need for class_weight with balanced clusters
    model.fit(X_train, y_train)
    
    print(f"\n📊 Model Accuracy: {accuracy_score(y_test, model.predict(X_test)):.2f}")
    print(classification_report(y_test, model.predict(X_test), zero_division=0))
    
    print("\n💾 Saving final clustered model into 'app/' directory...")
    output_dir = 'app'
    dump(model, os.path.join(output_dir, 'store_placement_model.joblib'))
    dump(feature_cols_to_use, os.path.join(output_dir, 'feature_columns.joblib'))

    print("\n🎉 Training complete!")

if __name__ == '__main__':
    main()