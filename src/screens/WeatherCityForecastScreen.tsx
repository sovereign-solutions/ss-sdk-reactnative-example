import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  PermissionsAndroid, 
  Platform,
  Dimensions,
} from 'react-native';
import { 
  Map, 
  MapStyles, 
  SSMap, 
  Camera, 
  UserLocation, 
  ViewAnnotation,
  useCurrentPosition, 
  type CameraRef, 
  type CityWeatherForecast, 
  type LngLatBounds,
} from "@sovereignsolutions/ssmap-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions of a badge pill (including margin) for pixel collision checking
const BADGE_WIDTH = 115;
const BADGE_HEIGHT = 34;

export const WeatherCityForecastScreen = () => {
  const [cityForecasts, setCityForecasts] = useState<CityWeatherForecast[]>([]);
  const [selectedStation, setSelectedStation] = useState<CityWeatherForecast | null>(null);
  const [viewportBounds, setViewportBounds] = useState<LngLatBounds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationGranted, setLocationGranted] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const cameraRef = useRef<CameraRef>(null);

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

  const getCoords = (item: CityWeatherForecast): [number, number] | null => {
    const lat = typeof item.Latitude === 'number' ? item.Latitude : parseFloat(item.Latitude || '');
    const lng = typeof item.Longitude === 'number' ? item.Longitude : parseFloat(item.Longitude || '');
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lng, lat];
    }
    return null;
  };

  const getWeatherIcon = (forecast?: string) => {
    const f = (forecast || '').toLowerCase();
    if (f.includes('thunder') || f.includes('lightning') || f.includes('storm')) return '⚡';
    if (f.includes('rain') || f.includes('drizzle') || f.includes('shower')) return '🌧️';
    if (f.includes('cloud') || f.includes('overcast') || f.includes('fog')) return '⛅';
    if (f.includes('sun') || f.includes('clear') || f.includes('hot') || f.includes('fine')) return '☀️';
    return '⚡';
  };

  const getTempDisplay = (item: CityWeatherForecast): string => {
    const t = item.Todays_Forecast_Max_Temp ?? item.Today_Max_temp ?? item.Day_2_Max_Temp;
    if (t !== undefined && t !== null && t !== '') {
      const num = typeof t === 'number' ? t : parseFloat(t as string);
      if (!isNaN(num)) {
        return `${num.toFixed(1)}°C`;
      }
      return `${t}°C`;
    }
    return '--';
  };

  // Method 1: Pixel-Distance Bounding Box Collision Filter
  const visibleStations = useMemo(() => {
    if (!cityForecasts || cityForecasts.length === 0) return [];
    if (!viewportBounds) return cityForecasts.slice(0, 15); // Default initial slice before bounds emit

    const [west, south, east, north] = viewportBounds;
    const minLng = Math.min(west, east);
    const maxLng = Math.max(west, east);
    const minLat = Math.min(south, north);
    const maxLat = Math.max(south, north);

    const spanLng = maxLng - minLng;
    const spanLat = maxLat - minLat;
    if (spanLng <= 0 || spanLat <= 0) return [];

    const placedBoxes: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    const result: CityWeatherForecast[] = [];

    for (const item of cityForecasts) {
      const coords = getCoords(item);
      if (!coords) continue;
      const [lng, lat] = coords;

      // Check if inside viewport (with 10% screen margin)
      if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
        continue;
      }

      // Project (lng, lat) to screen pixel coordinates (x, y)
      const pixelX = ((lng - minLng) / spanLng) * SCREEN_WIDTH;
      const pixelY = ((maxLat - lat) / spanLat) * SCREEN_HEIGHT;

      // Construct bounding box for this badge
      const box = {
        left: pixelX - BADGE_WIDTH / 2,
        right: pixelX + BADGE_WIDTH / 2,
        top: pixelY - BADGE_HEIGHT / 2,
        bottom: pixelY + BADGE_HEIGHT / 2,
      };

      // Check 2D bounding box collision against all already placed badges
      const collides = placedBoxes.some(
        (placed) =>
          box.left < placed.right &&
          box.right > placed.left &&
          box.top < placed.bottom &&
          box.bottom > placed.top
      );

      if (!collides) {
        placedBoxes.push(box);
        result.push(item);
      }
    }

    return result;
  }, [cityForecasts, viewportBounds]);

  const handleLoadWeatherData = async () => {
    setLoading(true);
    setError(null);
    setSelectedStation(null);

    try {
      const data = await SSMap.getCityWeatherForecast();
      const list = Array.isArray(data) ? data : [];
      setCityForecasts(list);

      // Calculate bounding box across all valid station coordinates
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      let validCount = 0;

      for (const item of list) {
        const coords = getCoords(item);
        if (coords) {
          validCount++;
          const [lng, lat] = coords;
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        }
      }

      if (validCount > 0 && cameraRef.current) {
        cameraRef.current.fitBounds(
          [minLng, minLat, maxLng, maxLat],
          {
            padding: { top: 70, right: 40, bottom: 140, left: 40 },
            duration: 1200,
          }
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load weather forecast');
    } finally {
      setLoading(false);
    }
  };

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

  const getSevenDayDays = (station: CityWeatherForecast) => {
    return [
      {
        day: 'Today',
        forecast: station.Todays_Forecast || station.Today_Max_temp ? 'Today' : undefined,
        max: station.Todays_Forecast_Max_Temp ?? station.Today_Max_temp,
        min: station.Todays_Forecast_Min_temp ?? station.Today_Min_temp,
      },
      {
        day: 'Day 2',
        forecast: station.Day_2_Forecast,
        max: station.Day_2_Max_Temp,
        min: station.Day_2_Min_temp,
      },
      {
        day: 'Day 3',
        forecast: station.Day_3_Forecast,
        max: station.Day_3_Max_Temp,
        min: station.Day_3_Min_temp,
      },
      {
        day: 'Day 4',
        forecast: station.Day_4_Forecast,
        max: station.Day_4_Max_Temp,
        min: station.Day_4_Min_temp,
      },
      {
        day: 'Day 5',
        forecast: station.Day_5_Forecast,
        max: station.Day_5_Max_Temp,
        min: station.Day_5_Min_temp,
      },
      {
        day: 'Day 6',
        forecast: station.Day_6_Forecast,
        max: station.Day_6_Max_Temp,
        min: station.Day_6_Min_temp,
      },
      {
        day: 'Day 7',
        forecast: station.Day_7_Forecast,
        max: station.Day_7_Max_Temp,
        min: station.Day_7_Min_temp,
      },
    ];
  };

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        mapStyle={MapStyles.TERRAIN}
        compass={true}
        onRegionDidChange={(e) => {
          if (e?.nativeEvent?.bounds) {
            setViewportBounds(e.nativeEvent.bounds);
          }
        }}
      >
        <Camera ref={cameraRef} initialViewState={{ center: [78.9629, 22.5937], zoom: 4.5 }} />
        {locationGranted && showLocation && <UserLocation />}

        {/* Pixel Collision Free ViewAnnotations */}
        {visibleStations.map((item, index) => {
          const coords = getCoords(item);
          if (!coords) return null;
          const temp = getTempDisplay(item);
          const icon = getWeatherIcon(item.Todays_Forecast || item.Day_2_Forecast);
          const key = `city-${item.Station_Code || item.Station_Name || index}`;

          return (
            <ViewAnnotation
              key={key}
              id={key}
              lngLat={coords}
              anchor="center"
              onPress={() => setSelectedStation(item)}
            >
              <TouchableOpacity 
                activeOpacity={0.85} 
                style={styles.badge}
                onPress={() => setSelectedStation(item)}
              >
                <Text style={styles.badgeIcon}>{icon}</Text>
                <Text style={styles.badgeName} numberOfLines={1}>{item.Station_Name || 'Unknown'}</Text>
                <Text style={styles.badgeTemp}>{temp}</Text>
              </TouchableOpacity>
            </ViewAnnotation>
          );
        })}
      </Map>

      {/* Floating Location Button */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          showLocation && styles.fabActive,
          selectedStation && styles.fabRaised
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

      {/* 7-Day Detail Card for selected station */}
      {selectedStation && (
        <View style={styles.detailCard}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => setSelectedStation(null)}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.detailTitle}>{selectedStation.Station_Name}</Text>
          {selectedStation.Date && (
            <Text style={styles.detailDate}>Date: {selectedStation.Date}</Text>
          )}
          {selectedStation.Todays_Forecast && (
            <Text style={styles.detailSubtitle}>Today: {selectedStation.Todays_Forecast}</Text>
          )}
          <Text style={styles.detailTempRange}>
            Max Temp: <Text style={styles.maxTempText}>{selectedStation.Todays_Forecast_Max_Temp ?? selectedStation.Today_Max_temp ?? '--'}°C</Text>
            {'  |  '}
            Min Temp: <Text style={styles.minTempText}>{selectedStation.Todays_Forecast_Min_temp ?? selectedStation.Today_Min_temp ?? '--'}°C</Text>
          </Text>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastRow}
          >
            {getSevenDayDays(selectedStation).map((d, i) => (
              <View key={i} style={styles.dayItem}>
                <Text style={styles.dayText}>{d.day}</Text>
                <Text style={styles.dayIcon}>{getWeatherIcon(d.forecast)}</Text>
                <Text style={styles.dayMax}>
                  {d.max !== undefined && d.max !== null ? `${d.max}°` : '--'}
                </Text>
                <Text style={styles.dayMin}>
                  {d.min !== undefined && d.min !== null ? `${d.min}°` : '--'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Error Card */}
      {error && !loading && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.loadBtn, loading && styles.loadBtnDisabled]} 
          onPress={handleLoadWeatherData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loadBtnText}>
              {cityForecasts.length > 0 ? `Refresh Weather Data (${cityForecasts.length})` : 'Load Weather Data'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    backgroundColor: '#FFFFFF',
    borderColor: '#0284C7',
    borderWidth: 1.8,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    fontSize: 10,
    marginRight: 5,
  },
  badgeName: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
    marginRight: 6,
    flexShrink: 0,
  },
  badgeTemp: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: 'bold',
    flexShrink: 0,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  loadBtn: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  loadBtnDisabled: {
    backgroundColor: '#60A5FA',
  },
  loadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 85,
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
  fabRaised: {
    bottom: 220,
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
  detailCard: {
    position: 'absolute',
    bottom: 85,
    left: 15,
    right: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  detailDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  detailSubtitle: {
    color: '#0284C7',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600',
  },
  detailTempRange: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
    fontWeight: '600',
  },
  maxTempText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  minTempText: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
  forecastRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  dayItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 62,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  dayMax: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dayMin: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  errorCard: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
});
