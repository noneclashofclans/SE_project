import os
import json
import pandas as pd
import gdown

DATA_FILES = {
    "buildings.geojson": "18KM1MUDTG2DBazKAMxn5TdNJj9xUtX8A",
    "landuse.geojson":   "1hdvK9RIb9nniYNHxYLB9ifmJAqcj5qlW",
    "places.geojson":    "1NW_ZWEDMeWQjj1ujYLOYoACIRkT8Bhc8",
    "natural.geojson":   "1FZuaaIso_14hFAOgHyZ1EDojzfa1x0PF",
    "pois.geojson":      "1HbAnhDFUR58XuVhKP9KyiW53xxN18DfS",
}

RAW_PATH = "data/raw"
PROCESSED_PATH = "data/processed"

def download_data_from_drive():
    os.makedirs(RAW_PATH, exist_ok=True)

    for filename, file_id in DATA_FILES.items():
        output_path = os.path.join(RAW_PATH, filename)

        if os.path.exists(output_path):
            print(f"'{filename}' already present")
            continue

        print(f"'{filename}' is being downloaded")

        try:
            url = f"https://drive.google.com/uc?id={file_id}"
            gdown.download(url, output_path, quiet=False)
            print(f"Successfully downloaded {filename}")
        except Exception as e:
            print(f"!!! Error: Failed to download {filename}. Check the File ID: {e}")
            if os.path.exists(output_path):
                 os.remove(output_path)


def load_and_process_geojson(file_path):
    data = []

    if not os.path.exists(file_path):
        print(f"'{file_path}' not found")
        return pd.DataFrame()

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        for feature in geojson_data.get("features", []):
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})

            if not geometry or "type" not in geometry or "coordinates" not in geometry:
                continue

            lat, lon = None, None
            geom_type = geometry["type"]
            coords = geometry["coordinates"]

            try:
                if geom_type == "Point":
                    lon, lat = coords[:2]

                elif geom_type in [
                    "Polygon",
                    "MultiPolygon",
                    "LineString",
                    "MultiLineString",
                ]:
                    if geom_type == "Polygon":
                        coords_list = coords[0]
                    elif geom_type == "MultiPolygon":
                        coords_list = coords[0][0]
                    elif geom_type == "LineString":
                        coords_list = coords
                    elif geom_type == "MultiLineString":
                        coords_list = coords[0]
                    else:
                        continue

                    if not coords_list:
                        continue

                    lons = [c[0] for c in coords_list if isinstance(c, list) and len(c) >= 2]
                    lats = [c[1] for c in coords_list if isinstance(c, list) and len(c) >= 2]

                    if lons and lats:
                        lon = sum(lons) / len(lons)
                        lat = sum(lats) / len(lats)

                if lat is not None and lon is not None:
                    row = {"latitude": lat, "longitude": lon}
                    row.update(properties)
                    data.append(row)

            except (IndexError, TypeError, ZeroDivisionError):
                continue

    except Exception as e:
        print(f"  - Error processing {os.path.basename(file_path)}: {e}")

    return pd.DataFrame(data)

def main():
    download_data_from_drive()

    print("\n--- Step 2: Processing Data ---")
    os.makedirs(PROCESSED_PATH, exist_ok=True)

    for filename in DATA_FILES.keys():
        output_name = filename.replace(".geojson", "")
        print(f"Processing {filename} -> {output_name}.feather...")

        input_file = os.path.join(RAW_PATH, filename)

        if not os.path.exists(input_file):
            print(f"  - Input file {filename} not found. Skipping.")
            continue

        df = load_and_process_geojson(input_file)

        if df.empty:
            print(f"  - No data extracted from {filename}, skipping save.")
            continue

        output_file = os.path.join(PROCESSED_PATH, f"{output_name}.feather")
        df.to_feather(output_file)
        print(f"  - Saved {len(df)} rows to {output_file}")

    print("\nPre-processing complete!")

if __name__ == "__main__":
    main()