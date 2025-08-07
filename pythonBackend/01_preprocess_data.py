# 01_preprocess_data.py (Upgraded Version)
import os
import json
import pandas as pd

def load_and_process_geojson(file_path):
    """
    Loads a GeoJSON file and extracts point data.
    Handles Point, Polygon, and LineString geometries.
    """
    data = []
    if not os.path.exists(file_path):
        print(f"  - File not found: {file_path}")
        return pd.DataFrame()
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        for feature in geojson_data.get('features', []):
            props = feature.get('properties', {})
            geom = feature.get('geometry', {})
            
            if not geom or 'type' not in geom or 'coordinates' not in geom:
                continue

            lat, lon = None, None
            geom_type = geom['type']
            coords = geom['coordinates']

            try:
                # --- NEW LOGIC TO HANDLE DIFFERENT SHAPES ---
                if geom_type == 'Point':
                    lon, lat = coords[:2]
                
                elif geom_type in ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString']:
                    # Get the list of coordinates to calculate the center point
                    if geom_type == 'Polygon': coords_list = coords[0]
                    elif geom_type == 'MultiPolygon': coords_list = coords[0][0]
                    elif geom_type == 'LineString': coords_list = coords
                    elif geom_type == 'MultiLineString': coords_list = coords[0]
                    else: continue

                    if not coords_list: continue
                    
                    # Calculate the average lat/lon (centroid)
                    lons = [c[0] for c in coords_list if isinstance(c, list) and len(c) >= 2]
                    lats = [c[1] for c in coords_list if isinstance(c, list) and len(c) >= 2]
                    
                    if lons and lats:
                        lon, lat = sum(lons) / len(lons), sum(lats) / len(lats)
                # --- END OF NEW LOGIC ---

                if lat is not None and lon is not None:
                    row = {'latitude': lat, 'longitude': lon}
                    row.update(props)
                    data.append(row)
            
            except (IndexError, TypeError, ZeroDivisionError):
                # Skip any malformed geometry features
                continue
                
    except Exception as e:
        print(f"  - Error processing {os.path.basename(file_path)}: {e}")
        
    return pd.DataFrame(data)

def main():
    print("🚀 Starting Data Pre-processing...")
    
    raw_path = 'data/raw'
    processed_path = 'data/processed'
    os.makedirs(processed_path, exist_ok=True)

    files_to_process = [
        "natural.geojson",
        "places.geojson",
        "pois.geojson",
        "traffic.geojson"
    ]

    for filename in files_to_process:
        output_name = filename.replace(".geojson", "")
        print(f"Processing {filename} -> {output_name}.feather...")

        input_file = os.path.join(raw_path, filename)
        df = load_and_process_geojson(input_file)
        
        if df.empty:
            print(f"  - ⚠️ No data extracted, skipping save.")
            continue
        
        output_file = os.path.join(processed_path, f"{output_name}.feather")
        df.to_feather(output_file)
        print(f"✅ Saved {len(df)} rows to {output_file}")

    print("\n🎉 Pre-processing complete!")

if __name__ == "__main__":
    main()