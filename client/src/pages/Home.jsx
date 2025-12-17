import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useTheme from "../context/useTheme";
import { Search, MapPin, X, Trash2, Globe, Sun, Moon, History, Navigation, AlertTriangle } from "lucide-react";
import '../styles/codeforces.css'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY; 
const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;

const EASTERN_ZONE_BOUNDS = {
  minLat: 17,
  maxLat: 29,
  minLng: 80,
  maxLng: 97
};

const themes = {
  light: {
    accent: "#0055aa",
    danger: "#c0392b",
    success: "#34C759",
    warning: "#FF9500",
    mapStyle: MAPTILER_KEY ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}` : undefined
  },
  dark: {
    accent: "#0055aa",
    danger: "#FF453A",
    success: "#30D158",
    warning: "#FF9F0A",
    mapStyle: MAPTILER_KEY ? `https://api.maptiler.com/maps/basic-v2-dark/style.json?key=${MAPTILER_KEY}` : undefined
  }
};

const fallbackStyle = {
  version: 8,
  sources: { 
    osm: { 
      type: "raster", 
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], 
      tileSize: 256, 
      attribution: "© OpenStreetMap" 
    } 
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }]
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

const isWithinEasternZone = (lat, lng) => {
    const { minLat, maxLat, minLng, maxLng } = EASTERN_ZONE_BOUNDS;
    return (
        lat >= minLat && lat <= maxLat &&
        lng >= minLng && lng <= maxLng
    );
};

const Home = ({ searchedLocation, user }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mainMarker = useRef(null);
  const predictionMarkers = useRef([]);
  const debounceTimeout = useRef(null); // Ref for debounce

  const { theme: themeMode, toggleTheme } = useTheme();
  const t = themes[themeMode];
  
  const [radiusValue, setRadiusValue] = useState("2.5");
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ 
    lat: 20.2961, 
    lng: 85.8245, 
    name: "Bhubaneswar, Odisha, India" 
  });
  const [showHistory, setShowHistory] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false); 
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [analysisResults, setAnalysisResults] = useState([]);
  const [zoneNotification, setZoneNotification] = useState(null); 
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // 3. State for Autocomplete Suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null); 
  
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const analysisSummary = useMemo(() => {
    if (!analysisResults.length) {
      return { suitableCount: 0, totalCount: 0, averageScore: 0 };
    }

    const totalCount = analysisResults.length;
    const suitablePoints = analysisResults.filter(r => r.is_suitable);
    const suitableCount = suitablePoints.length;
    const totalScore = analysisResults.reduce((sum, r) => sum + r.suitability_score, 0);
    const averageScore = Math.round((totalScore / totalCount) * 100);

    return { suitableCount, totalCount, averageScore };
  }, [analysisResults]);


  const fetchSuggestionsORS = useCallback(async (query) => {
    try {
        const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${VITE_ORS_API_KEY}&text=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        console.log("API Response Data:", data); // Check console for this!
        
        if (data.features && data.features.length > 0) {
            return data.features.map(f => ({
                id: f.properties.gid,
                lat: f.geometry.coordinates[1], 
                lng: f.geometry.coordinates[0],
                name: f.properties.name,
                address: f.properties.label
            }));
        } else {
            console.log("No features found in response");
            return [];
        }
    } catch (e) {
        console.error("Fetch failed:", e);
        return [];
    }
}, [VITE_ORS_API_KEY]);

  // 5. Handle input change with debounce for suggestions
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedLocation(null);
    setAnalysisResults([]);
    setZoneNotification(null);

    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }

    if (value.length < 3) {
        setSearchSuggestions([]);
        return;
    }

    debounceTimeout.current = setTimeout(async () => {
        setIsLoading(true);
        const suggestions = await fetchSuggestionsORS(value);
        setSearchSuggestions(suggestions);
        setIsLoading(false);
    }, 300);
  };
  
  // 6. Handle suggestion click and zone check
  const handleSuggestionClick = (feature) => {
    setSearchQuery(feature.address);
    setSearchSuggestions([]);
    
    if (!isWithinEasternZone(feature.lat, feature.lng)) {
        setZoneNotification({
            message: `Location is outside the Eastern Zone of India. Analysis is disabled.`,
            type: 'warning'
        });
        setSelectedLocation(null);
        map.current.flyTo({ center: [feature.lng, feature.lat], zoom: 6 });
        return;
    }
    
    setZoneNotification(null);
    setSelectedLocation(feature);
    map.current.flyTo({ center: [feature.lng, feature.lat], zoom: 14 });
  };
  
  // 7. Handle final search action (Replaces old handleSearch)
  const handleFinalSearch = () => {
    if (!selectedLocation) {
      if (searchSuggestions.length > 0) {
        // If results exist but none selected, select the first one
        handleSuggestionClick(searchSuggestions[0]); 
      } else {
        setZoneNotification({
            message: `Please search for and select a valid location from the list.`,
            type: 'warning'
        });
      }
      return;
    }

    // If a valid location is selected, set it as current location
    setCurrentLocation(selectedLocation);
    setIsSheetExpanded(true); 
    
    setSearchHistory(prev => {
        const exists = prev.some(item => Math.abs(item.lat - selectedLocation.lat) < 0.0001);
        return exists ? prev : [{ 
            lat: selectedLocation.lat, 
            lng: selectedLocation.lng, 
            name: selectedLocation.address,
            timestamp: new Date() 
        }, ...prev.slice(0, 9)];
    });
    
    setSearchQuery(selectedLocation.address);
    setSelectedLocation(null);
  };

  // --- Map and Marker Logic (Unchanged) ---
  const createMarkerElement = useCallback((color, size = 20) => {
    const el = document.createElement('div');
    const safeColor = color || "#000000"; 
    
    
    el.style.backgroundColor = safeColor;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "50%";
    el.style.border = "2px solid #ffffff";
    el.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
    el.style.cursor = "pointer";
    el.style.display = "block"; 
    
    return el;
  }, []);

  const redrawAnalysisMarkers = useCallback(() => {
    if (!map.current) return;

    predictionMarkers.current.forEach(m => m.remove());
    predictionMarkers.current = [];
    
    analysisResults.forEach(result => {
      const score = Math.round(result.suitability_score * 100);
      
      const distKm = haversineDistance(
          currentLocation.lat, currentLocation.lng,
          result.latitude, result.longitude
      );
      const formattedDist = distKm.toFixed(2); 
      
      let color, status, description;

      if (result.is_suitable) {
        color = t.success;
        status = "Suitable";
        description = "High potential based on ML model.";
      } else if (score >= 40) {
        color = t.warning;
        status = "Moderate";
        description = "Check competition & local demand.";
      } else {
        color = t.danger;
        status = "Unsuitable";
        description = "Low suitability score.";
      }

      const placeName = result.place_name || "Open Area";

      
      const popup = new maplibregl.Popup({ offset: 15, className: 'custom-popup' }).setHTML(`
        <div style="font-family: sans-serif; color: #333; padding: 5px;">
          <div style="font-weight: bold; color: ${color}; margin-bottom: 4px;">
            ${status} (${score}%)
          </div>
          <div style="font-size: 14px; margin-bottom: 2px;">
            Distance from Center: ${formattedDist} km
          </div>
          <div style="font-size: 14px; margin-bottom: 2px;">
            Nearest Location: ${placeName}
          </div>
          <div style="font-size: 13px; color: #dd4200ff;">
            Co-ordinates: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ 
        element: createMarkerElement(color, 24),
        anchor: 'center' 
      })
        .setLngLat([result.longitude, result.latitude])
        .setPopup(popup)
        .addTo(map.current);
      
      predictionMarkers.current.push(marker);
    });
  }, [analysisResults, t, createMarkerElement, currentLocation]); 


  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: t.mapStyle || fallbackStyle,
      // Default to a central point in the Eastern Zone
      center: [86.7, 23.5], 
      zoom: 6,
      pitch: 0, 
      antialias: true,
      attributionControl: false
    });

    // Initialize main marker at the default currentLocation
    mainMarker.current = new maplibregl.Marker({ 
      element: createMarkerElement(t.accent, 28),
      anchor: 'center'
    })
      .setLngLat([currentLocation.lng, currentLocation.lat])
      .addTo(map.current);

  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(t.mapStyle || fallbackStyle);

    map.current.once('style.load', () => {
       if (mainMarker.current) {
          const pos = mainMarker.current.getLngLat();
          mainMarker.current.remove();
          mainMarker.current = new maplibregl.Marker({ 
            element: createMarkerElement(t.accent, 28),
            anchor: 'center'
          })
          .setLngLat(pos)
          .addTo(map.current);
       }
       if(analysisResults.length > 0) redrawAnalysisMarkers();
    });
  }, [themeMode]);

  useEffect(() => {
    if(!map.current || !analysisResults.length) return;
    
    if (map.current.isStyleLoaded()) {
        redrawAnalysisMarkers();
    } else {
        map.current.once('style.load', redrawAnalysisMarkers);
    }
  }, [analysisResults, redrawAnalysisMarkers]);

  useEffect(() => {
    if (!map.current || !mainMarker.current) return;
    map.current.flyTo({ center: [currentLocation.lng, currentLocation.lat], zoom: 14 });
    mainMarker.current.setLngLat([currentLocation.lng, currentLocation.lat]);
    mainMarker.current.getElement().style.backgroundColor = t.accent; 
  }, [currentLocation, t.accent]);


  const handleAnalysis = async () => { 
    if (!map.current) return;
    
    // Check zone again before running analysis
    if (!isWithinEasternZone(currentLocation.lat, currentLocation.lng)) {
      setZoneNotification({
        message: `Current location is outside the Eastern Zone. Analysis skipped.`,
        type: 'error'
      });
      return; 
    }

    setIsLoading(true);
    setZoneNotification(null); // Clear notification before starting
    
    setAnalysisResults([]); 
    
    predictionMarkers.current.forEach(m => m.remove());
    predictionMarkers.current = [];
    
    const radius = parseFloat(radiusValue);
    
    if (map.current.getLayer("radius-fill")) map.current.removeLayer("radius-fill");
    if (map.current.getSource("radius-source")) map.current.removeSource("radius-source");

    const points = 64;
    const coords = [];
    const earthRadius = 6371;
    const radiusInDegrees = radius / earthRadius * (180 / Math.PI);
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * (2 * Math.PI);
      const latOffset = radiusInDegrees * Math.sin(angle);
      const lngOffset = radiusInDegrees * Math.cos(angle) / Math.cos(currentLocation.lat * Math.PI / 180);
      coords.push([currentLocation.lng + lngOffset, currentLocation.lat + latOffset]);
    }
    coords.push(coords[0]);

    map.current.addSource("radius-source", { 
        type: "geojson", 
        data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } } 
    });
    map.current.addLayer({ 
        id: "radius-fill", type: "fill", source: "radius-source", 
        paint: { "fill-color": t.accent, "fill-opacity": 0.15 } 
    });

    try {
        const response = await fetch(`${API_BASE_URL}/predict-circle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                radius_km: radius
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        setAnalysisResults(data); 

    } catch (error) {
        console.error("Failed to run analysis:", error);
        setZoneNotification({
            message: `API connection failed. Check console for details.`,
            type: 'error'
        });
        clearAnalysis();
    } finally {
        setIsLoading(false);
        setIsSheetExpanded(false); 
    }
  };

  const clearAnalysis = () => {
    predictionMarkers.current.forEach(m => m.remove());
    predictionMarkers.current = [];
    setAnalysisResults([]);
    if (map.current?.getLayer("radius-fill")) map.current.removeLayer("radius-fill");
    if (map.current?.getSource("radius-source")) map.current.removeSource("radius-source");
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
  };

  return (
    <div className={`cf-map-wrapper ${themeMode}`}>
      <div ref={mapContainer} className="cf-map-canvas" />

      {/* 4. Floating Notification */}
      {zoneNotification && (
          <div 
              className="cf-floating-notification"
              style={{
                  position: 'absolute',
                  top: '15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: zoneNotification.type === 'error' ? t.danger : t.warning,
                  color: 'white',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  zIndex: 1000,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between', 
                  gap: '10px',
                  maxWidth: '90%',
              }}
          >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} />
                <span>{zoneNotification.message}</span>
              </div>
              <button 
                  onClick={() => setZoneNotification(null)}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
              >
                  <X size={16} />
              </button>
          </div>
      )}

      <div className="cf-floating-search-container">
        
        <div className="cf-floating-search">
            <button className="cf-menu-btn" onClick={() => setShowHistory(true)}>
            <History size={20} />
            </button>
            <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange} // Use new handler
            placeholder="Where to place your store?"
            className="cf-search-input-field"
            onKeyPress={(e) => e.key === 'Enter' && handleFinalSearch()} // Use new handler
            />
            <button className="cf-search-action-btn" onClick={handleFinalSearch}>
            <Search size={20} />
            </button>
        </div>
        
        {searchSuggestions.length > 0 && (
    <div className={`cf-suggestions-list ${themeMode}`}>
        {searchSuggestions.map((feature, index) => (
            <div 
                key={feature.id} 
                className={`cf-suggestion-row ${selectedIndex === index ? 'active' : ''}`}
                onClick={() => handleSuggestionClick(feature)}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseLeave={() => setSelectedIndex(null)}
            >
                <MapPin size={18} className="cf-suggestion-icon" />
                <div className="cf-suggestion-text">
                    <strong>{feature.name || feature.address.split(',')[0]}</strong>
                    <span>{feature.address}</span>
                </div>
            </div>
        ))}
    </div>
)}
      </div>


      {/* Bottom Sheet (Mostly Unchanged) */}
      <div className={`cf-bottom-sheet ${isSheetExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="cf-sheet-handle-area" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
          <div className="cf-sheet-handle-bar" />
        </div>

        <div className="cf-sheet-content">
          <div className="cf-location-header">
            <h2 className="cf-location-title">
              {currentLocation.name.split(',')[0]}
            </h2>
            <p className="cf-location-subtitle">
              {currentLocation.name.split(',').slice(1,3).join(',') || "Current Location"}
            </p>
          </div>

          <div className="cf-action-grid">
            <button 
                className="cf-action-item primary" 
                onClick={handleAnalysis} 
                disabled={isLoading || !isWithinEasternZone(currentLocation.lat, currentLocation.lng)}
            >
              <div className="cf-icon-circle">
                {isLoading ? <div className="cf-spinner-small" /> : <Globe size={20} />}
              </div>
              <span>Analyze</span>
            </button>
            <button className="cf-action-item" onClick={() => setRadiusValue(String(parseFloat(radiusValue) + 0.5))}>
              <div className="cf-icon-circle"><Navigation size={20} /></div>
              <span>+ Radius</span>
            </button>
            <button className="cf-action-item" onClick={clearAnalysis}>
              <div className="cf-icon-circle"><Trash2 size={20} /></div>
              <span>Clear Map</span>
            </button>
            <button className="cf-action-item" onClick={toggleTheme}>
              <div className="cf-icon-circle">
                {themeMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <span>Theme</span>
            </button>
          </div>

          <div className="cf-radius-slider-container">
            <div className="cf-radius-label">
              <span>Analysis Radius</span>
              <strong>{radiusValue} km</strong>
            </div>
            <input 
              type="range" min="0.5" max="10" step="0.5" 
              value={radiusValue} 
              onChange={(e) => setRadiusValue(e.target.value)}
              className="cf-slider"
            />
          </div>

          {/* 5. Analysis Summary Box */}
          {analysisResults.length > 0 && (
            <div className="cf-analysis-summary" style={{ 
                marginTop: '20px', 
                padding: '12px', 
                borderRadius: '8px',
                backgroundColor: themeMode === 'dark' ? '#333' : '#f0f0f0',
                borderLeft: `5px solid ${t.accent}`
            }}>
                <h4 style={{ 
                    margin: '0 0 8px 0', 
                    color: t.accent, 
                    fontWeight: 'bold' 
                }}>Analysis Summary</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <p style={{ margin: '0 5px 0 0' }}>Total Points Scanned:</p>
                    <strong style={{ color: t.accent }}>{analysisSummary.totalCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <p style={{ margin: '0 5px 0 0' }}>Suitable Locations (Score &gt; 60%):</p>
                    <strong style={{ color: t.success }}>{analysisSummary.suitableCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <p style={{ margin: '0 5px 0 0' }}>Average Suitability Score:</p>
                    <strong style={{ color: t.warning }}>{analysisSummary.averageScore}%</strong>
                </div>
            </div>
          )}

        </div>
      </div>

      {/* History Overlay (Unchanged) */}
      <div className={`cf-history-overlay ${showHistory ? 'visible' : ''}`}>
        <div className="cf-history-header">
          <h3>Recent Locations</h3>
          <button onClick={() => setShowHistory(false)}><X size={24} /></button>
        </div>
        <div className="cf-history-list">
          {searchHistory.length > 0 ? (
            searchHistory.map((item, idx) => (
              <div key={idx} className="cf-history-row" onClick={() => {
                setCurrentLocation(item);
                setShowHistory(false);
              }}>
                <MapPin size={16} className="cf-history-icon" style={{ color: t.accent }} />
                <div className="cf-history-text">
                  <strong style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
                    {item.name.split(',')[0]}
                  </strong>
                  <span style={{ color: themeMode === 'dark' ? '#aaa' : '#666' }}>
                    {item.name}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="cf-history-empty" style={{ color: themeMode === 'dark' ? '#888' : '#999' }}>
              No search history yet.
            </div>
          )}
          
        </div>
        
        {searchHistory.length > 0 && (
            <button 
                onClick={clearSearchHistory} 
                className="cf-clear-history-button"
                style={{ 
                    marginTop: '20px', 
                    padding: '10px',
                    width: '100%',
                    backgroundColor: t.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                }}
            >
                <Trash2 size={18} />
                Clear All History
            </button>
        )}
      </div>
      {isLoading && (
        <div className="cf-loading-screen">
          <div className="cf-loading-box">
            <div className="cf-spinner-large" />
            <p>Analyzing zone...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;