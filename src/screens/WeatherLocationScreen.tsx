import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  PermissionsAndroid, 
  Platform 
} from 'react-native';
import { 
  Map, 
  MapStyles, 
  SSMap,
  GeoJSONSource,
  Layer,
  Camera, 
  UserLocation, 
  useCurrentPosition,
  type CameraRef,
  type WeatherResult,
} from "@sovereignsolutions/ssmap-react-native";

export const WeatherLocationScreen = () => {
  const [selectedPoint, setSelectedPoint] = useState<number[] | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationGranted, setLocationGranted] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const cameraRef = useRef<CameraRef>(null);

  const pendingWeatherFetchRef = useRef(false);

  const currentPosition = useCurrentPosition({ enabled: locationGranted && showLocation });

  useEffect(() => {
    async function requestLocationPermission() {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setLocationGranted(true);
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        setLocationGranted(true);
      }
    }
    requestLocationPermission();
  }, []);

  // When current location is ready after user clicked 'current location weather'
  useEffect(() => {
    if (pendingWeatherFetchRef.current && currentPosition?.coords) {
      pendingWeatherFetchRef.current = false;
      const userPos: [number, number] = [currentPosition.coords.longitude, currentPosition.coords.latitude];
      cameraRef.current?.flyTo({
        center: userPos,
        zoom: 14,
        duration: 1000,
      });
      fetchWeather(userPos);
    }
  }, [currentPosition]);

  const fetchWeather = async (pos: [number, number]) => {
    setSelectedPoint(pos);
    setLoading(true);
    setError(null);
    try {
      const result = await SSMap.getWeather(pos);
      setWeather(result);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('404')) {
        setError('Cannot get weather in this location');
      } else {
        setError(msg || 'Failed to fetch weather');
      }
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setWeather(null);
    setError(null);
  };

  const handleMapPress = (e: any) => {
    const coords = e?.geometry?.coordinates || e?.nativeEvent?.lngLat;
    if (coords) {
      const pos: [number, number] = Array.isArray(coords) ? [coords[0], coords[1]] : [coords.lng, coords.lat];
      fetchWeather(pos);
    }
  };

  // Location button (FAB): just toggle location / fly to user
  const handleLocationPress = () => {
    if (!showLocation) {
      setShowLocation(true);
    } else {
      if (currentPosition?.coords) {
        cameraRef.current?.flyTo({
          center: [currentPosition.coords.longitude, currentPosition.coords.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    }
  };

  // "Tap here for current location weather" button handler
  const handleCurrentLocationWeather = () => {
    if (!showLocation) {
      setShowLocation(true);
    }

    if (currentPosition?.coords) {
      const userPos: [number, number] = [currentPosition.coords.longitude, currentPosition.coords.latitude];
      cameraRef.current?.flyTo({
        center: userPos,
        zoom: 14,
        duration: 1000,
      });
      fetchWeather(userPos);
    } else {
      pendingWeatherFetchRef.current = true;
      setLoading(true);
    }
  };

  const geoJson: any = selectedPoint ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: selectedPoint },
      properties: {},
    }]
  } : null;

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        mapStyle={MapStyles.BRIGHT}
        compass={true}
        onPress={handleMapPress}
      >
        <Camera ref={cameraRef} initialViewState={{ center: [77.2090, 28.6139], zoom: 11 }} />
        {locationGranted && showLocation && <UserLocation />}
        {geoJson && (
          <GeoJSONSource id="weather-point-source" data={geoJson}>
            <Layer
              id="weather-point-layer"
              type="circle"
              paint={{
                'circle-radius': 9,
                'circle-color': '#FF9500',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          showLocation && styles.fabActive
        ]} 
        onPress={handleLocationPress}
      >
        <Text style={[
          styles.fabText, 
          showLocation && styles.fabTextActive, 
          { transform: [{ rotate: '-135deg' }], marginTop: -2, marginLeft: -8 }
        ]}>
          ➤
        </Text>
      </TouchableOpacity>

      {/* Instruction Banner when nothing is selected */}
      {!weather && !loading && !error && (
        <View style={styles.promptBanner}>
          <Text style={styles.promptText}>Tap anywhere on the map to get weather</Text>
          <TouchableOpacity onPress={handleCurrentLocationWeather} style={styles.promptSubButton} activeOpacity={0.7}>
            <Text style={styles.promptSubText}>or tap here for current location weather</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View style={styles.card}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Fetching weather data...</Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View style={[styles.card, styles.errorCard]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Weather Result Card */}
      {weather && !loading && (
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Header Row: Temperature & Condition */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tempText}>
                {weather.temperature !== undefined ? `${weather.temperature}°C` : '--'}
              </Text>
              {weather.feels_like !== undefined && (
                <Text style={styles.feelsLikeText}>Feels like {weather.feels_like}°C</Text>
              )}
            </View>
            <View style={styles.conditionContainer}>
              <Text style={styles.conditionText}>{weather.condition || 'Unknown'}</Text>
              {weather.timezone && (
                <Text style={styles.timezoneText}>{weather.timezone}</Text>
              )}
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.grid}>
            {weather.relativeHumidity !== undefined && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Humidity</Text>
                <Text style={styles.gridValue}>{weather.relativeHumidity}%</Text>
              </View>
            )}

            {weather.wind_speed_kph !== undefined && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Wind</Text>
                <Text style={styles.gridValue}>
                  {weather.wind_speed_kph} km/h {weather.wind_direction || ''}
                </Text>
              </View>
            )}

            {weather.rain_probability_percent !== undefined && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Rain Prob.</Text>
                <Text style={styles.gridValue}>{weather.rain_probability_percent}%</Text>
              </View>
            )}

            {weather.uvIndex !== undefined && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>UV Index</Text>
                <Text style={styles.gridValue}>{weather.uvIndex}</Text>
              </View>
            )}

            {weather.cloudCover !== undefined && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Cloud Cover</Text>
                <Text style={styles.gridValue}>{weather.cloudCover}%</Text>
              </View>
            )}

            {weather.thunderstormProbability !== undefined && (
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Thunderstorm</Text>
                <Text style={styles.gridValue}>{weather.thunderstormProbability}%</Text>
              </View>
            )}
          </View>

          {/* Coordinates footer */}
          {selectedPoint && (
            <Text style={styles.coordText}>
              Location: {selectedPoint[1].toFixed(4)}, {selectedPoint[0].toFixed(4)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  promptBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  promptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  promptSubButton: {
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  promptSubText: {
    color: '#64B5F6',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  card: {
    position: 'absolute',
    bottom: 25,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  errorCard: {
    backgroundColor: '#FFF0F0',
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
    paddingRight: 28,
    marginBottom: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  tempText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
  },
  feelsLikeText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  conditionContainer: {
    alignItems: 'flex-end',
  },
  conditionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  timezoneText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: '#777',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  coordText: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },

  fabActive: {
    backgroundColor: '#007AFF',
  },
  fabText: {
    fontSize: 24,
  },
  fabTextActive: {
    color: '#fff',
  },
});
