import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useTheme from "../context/useTheme";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

const Home = ({ searchedLocation, user }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const { theme } = useTheme();

  const [radiusValue, setRadiusValue] = useState("2.5");
  const [predictionResults, setPredictionResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationWarning, setLocationWarning] = useState("");
  const [mapStyle, setMapStyle] = useState("streets-v2"); // NEW state for style

  const defaultLocation = {
    lat: 20.2961,
    lng: 85.8245,
    name: "Bhubaneswar (Default)",
  };

  const center = searchedLocation || defaultLocation;

  // Validate location region
  useEffect(() => {
    if (searchedLocation) {
      const { lat, lng } = searchedLocation;
      const isSouthIndia = lat > 8.0 && lat < 19.0 && lng > 74.0 && lng < 85.0;
      const isEastIndia = lat >= 19.0 && lat < 27.0 && lng > 80.0 && lng < 89.5;
      const isValidRegion = isSouthIndia || isEastIndia;

      setLocationWarning(
        isValidRegion
          ? ""
          : "The analysis is currently optimized for South and East India. Results for other regions may be limited."
      );
    }
  }, [searchedLocation]);

  // Create circle GeoJSON
  const createCircleGeoJSON = (center, radiusKm) => {
    const points = 64;
    const coords = [];
    const distanceX =
      radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
    const distanceY = radiusKm / 110.54;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center.lng + x, center.lat + y]);
    }
    coords.push(coords[0]);

    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  };

  // Add radius circle
  const addRadiusCircle = (radiusKm) => {
    if (!map.current) return;
    const circleData = createCircleGeoJSON(center, radiusKm);
    const circlePaint = {
      "fill-color": theme === "dark" ? "#1461b8ff" : "#0d2c94ff",
      "fill-opacity": 0.2,
    };
    const borderPaint = {
      "line-color": theme === "dark" ? "#0f0797ff" : "#020f59ff",
      "line-width": 2,
      "line-opacity": 0.8,
    };

    if (map.current.getSource("radius-circle")) {
      map.current.getSource("radius-circle").setData(circleData);
    } else {
      map.current.addSource("radius-circle", {
        type: "geojson",
        data: circleData,
      });
      map.current.addLayer({
        id: "radius-circle",
        type: "fill",
        source: "radius-circle",
        paint: circlePaint,
      });
      map.current.addLayer({
        id: "radius-circle-border",
        type: "line",
        source: "radius-circle",
        paint: borderPaint,
      });
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyleUrl = `https://api.maptiler.com/maps/${mapStyle}/style.json?key=${MAPTILER_KEY}`;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyleUrl,
      center: [center.lng, center.lat],
      zoom: 12,
    });

    marker.current = new maplibregl.Marker({ color: "#052abcff" })
      .setLngLat([center.lng, center.lat])
      .addTo(map.current);

    return () => map.current?.remove();
  }, [mapStyle, theme]);

  // Move map on location change
  useEffect(() => {
    if (!map.current) return;
    const { lat, lng, name } = center;
    map.current.flyTo({ center: [lng, lat], zoom: 13 });
    marker.current.setLngLat([lng, lat]);
    new maplibregl.Popup({ offset: 25 })
      .setLngLat([lng, lat])
      .setHTML(
        `<div style="padding: 4px 8px; color: ${
          theme === "dark" ? "#fff" : "#000"
        }; background: ${
          theme === "dark" ? "#1e293b" : "#fff"
        }; border-radius: 4px;">${name}</div>`
      )
      .addTo(map.current);
  }, [center]);

  // Handle analysis
  const handleApplyClick = async () => {
    const radius = parseFloat(radiusValue);
    if (isNaN(radius) || radius <= 0 || !map.current) return;

    addRadiusCircle(radius);
    setPredictionResults(null);
    document.querySelectorAll(".prediction-marker").forEach((el) => el.remove());
    setIsLoading(true);

    try {
      const apiUrl =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/predict-circle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: center.lat,
          longitude: center.lng,
          radius_km: radius,
        }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const results = await response.json();
      setPredictionResults(results);
      results.forEach((result) => {
        const placeName = result.place_name || "Analyzed Point";
        const displayText =
          placeName === "Open Area" || placeName === "Unnamed Place"
            ? `Place type: ${placeName}`
            : placeName;
        new maplibregl.Marker({
          color: result.is_suitable ? "#00742bff" : "#a40d0dff",
          className: "prediction-marker",
        })
          .setLngLat([result.longitude, result.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div style="font-size: 13px; padding: 8px; color: ${
                theme === "dark" ? "#fff" : "#0f172a"
              }; background: ${
                theme === "dark" ? "#1e293b" : "#fff"
              }; border-radius: 5px;">
                <strong style="font-size: 14px; color: ${
                  result.is_suitable ? "#22c55e" : "#ef4444"
                };">
                  ${result.is_suitable ? "✅ Suitable" : "❌ Not Suitable"}
                </strong>
                <hr style="margin: 6px 0; border-color: ${
                  theme === "dark" ? "#334155" : "#e2e8f0"
                };" />
                <div style="font-weight: 500;">${displayText}</div>
                <div style="font-size: 12px; color: #64748b;">Score: ${(
                  result.suitability_score * 100
                ).toFixed(0)}%</div>
              </div>`
            )
          )
          .addTo(map.current);
      });
      const suitableCount = results.filter((r) => r.is_suitable).length;
      new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true,
      })
        .setLngLat([center.lng, center.lat])
        .setHTML(
          `<div style="text-align: center; font-size: 14px; padding: 8px; color: ${
            theme === "dark" ? "#fff" : "#0f172a"
          }; background: ${
            theme === "dark" ? "#1e293b" : "#fff"
          }; border-radius: 5px;">
            <strong>Analysis Complete!</strong><br>
            <span style="color: #22c55e; font-weight: bold;">${suitableCount} suitable</span> found<br>
            out of ${results.length} points.
          </div>`
        )
        .addTo(map.current);
    } catch (error) {
      console.error("Prediction error:", error);
      alert(`An error occurred during prediction.`);
    } finally {
      setIsLoading(false);
    }
  };

  const userEmail = typeof user === "string" ? user : user?.email || "Guest";

  return (
    <div
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(to bottom, #4a5568, #1a202c)"
            : "#f1f5f9",
        color: theme === "dark" ? "#e2e8f0" : "#1e293b",
        minHeight: "100vh",
        padding: "2rem 0",
      }}
    >
      <h3 style={{ textAlign: "center", fontWeight: "500", fontSize: "2.1rem" }}>
        Welcome, {userEmail} 
      </h3>
      <p style={{ textAlign: "center", fontSize: "1.1rem", margin: "10px 0" }}>
        Start searching for a location or use the map below to analyze an area.
      </p>

      {locationWarning && (
        <div
          style={{
            width: "90%",
            maxWidth: "600px",
            margin: "20px auto",
            padding: "15px",
            borderRadius: "12px",
            backgroundColor: theme === "dark" ? "#4a3a1a" : "#fffbeb",
            color: theme === "dark" ? "#fde68a" : "#92400e",
            border: `1px solid ${
              theme === "dark" ? "#ca8a04" : "#fde68a"
            }`,
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          {locationWarning}
        </div>
      )}

      <h2
        style={{
          textAlign: "center",
          color: theme === "dark" ? "#276ff5ff" : "#065d9fff",
          fontWeight: "bold",
          fontSize: "3rem",
          paddingBottom: "2rem",
          paddingTop: "1rem",
        }}
      >
        Your Map
      </h2>

      {/* Dropdown for map style */}
      <div style={{ textAlign: "center", marginBottom: "10px", display: "flex", justifyContent: "center",       alignItems: "center" }}>
        <label htmlFor="mapStyle" style={{ marginRight: "8px", fontSize: "20px" }}>
          Map Style:
        </label>
        <select
          id="mapStyle"
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: theme === "dark" ? "#1e293b" : "#fff",
            color: theme === "dark" ? "#e2e8f0" : "#000",
            cursor: "pointer",
          }}
        >
          <div className="choose" style={{cursor: "pointer"}}>
            <option value="streets-v2">Streets</option>
            <option value="outdoor-v2">Outdoor</option>
            <option value="satellite">Satellite View</option>
            <option value="darkmatter">Dark Matter</option>
            <option value="bright-v2">Bright</option>
            <option value="basic-v2">Basic</option>
          </div>
        </select>
      </div>

      <div
        style={{
          position: "relative",
          height: "650px",
          width: "90%",
          maxWidth: "800px",
          margin: "40px auto",
          borderRadius: "30px",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />
        <div
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => map.current?.zoomIn()}
            style={{
              padding: "8px 12px",
              fontSize: "18px",
              background:
                theme === "dark"
                  ? "rgba(45, 55, 72, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
              color: theme === "dark" ? "#fff" : "#000",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "100px",
              cursor: "pointer",
            }}
          >
            max
          </button>
          <button
            onClick={() => map.current?.zoomOut()}
            style={{
              padding: "8px 12px",
              fontSize: "18px",
              background:
                theme === "dark"
                  ? "rgba(45, 55, 72, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
              color: theme === "dark" ? "#fff" : "#000",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "100px",
              cursor: "pointer",
            }}
          >
            min
          </button>
        </div>
      </div>

      {/* Analysis box */}
      <div
        style={{
          width: "90%",
          maxWidth: "600px",
          margin: "40px auto",
          backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
          border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h4
            style={{
              color: theme === "dark" ? "#5eead4" : "#0d9488",
              fontSize: "1.4rem",
              fontWeight: "600",
            }}
          >
            Analyze an Area
          </h4>
        </div>
        <div style={{ textAlign: "center" }}>
          <h5 style={{ fontWeight: "500" }}>Enter analysis radius (km):</h5>
          <input
            type="number"
            placeholder="e.g., 2.5"
            value={radiusValue}
            onChange={(e) => setRadiusValue(e.target.value)}
            style={{
              width: "250px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: `2px solid ${
                theme === "dark" ? "#475569" : "#cbd5e1"
              }`,
              backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
              color: theme === "dark" ? "#e2e8f0" : "#1a202c",
              fontSize: "1rem",
              marginBottom: "20px",
            }}
          />
          <br />
          <button
            onClick={handleApplyClick}
            disabled={isLoading}
            style={{
              padding: "12px 28px",
              borderRadius: "12px",
              border: "none",
              background: isLoading
                ? "#0f766e"
                : "linear-gradient(135deg, #d4cc2dff, #066dbcff)",
              color: "white",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
