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
  type StatewiseRainfall,
  type LngLatBounds,
} from "@sovereignsolutions/ssmap-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bounding box dimensions for pixel collision prevention
const BADGE_WIDTH = 120;
const BADGE_HEIGHT = 34;

// Comprehensive [longitude, latitude] coordinates mapping for all Indian States & Union Territories
export const STATE_COORDINATES: Record<string, [number, number]> = {
  // With (UT)
  "ANDAMAN & NICOBAR (UT)": [92.7483, 11.6670],
  "CHANDIGARH (UT)": [76.7794, 30.7333],
  "DADRA & NAGAR HAVELI AND DAMAN & DIU (UT)": [72.9698, 20.4283],
  "DAMAN & DIU (UT)": [72.8397, 20.3974],
  "DELHI (UT)": [77.2090, 28.6139],
  "JAMMU & KASHMIR (UT)": [74.7973, 33.7782],
  "LADAKH (UT)": [77.5771, 34.1526],
  "LAKSHADWEEP (UT)": [72.6369, 10.5667],
  "PUDUCHERRY (UT)": [79.8083, 11.9416],

  // Non-UT Variants & Aliases
  "ANDAMAN & NICOBAR": [92.7483, 11.6670],
  "ANDAMAN AND NICOBAR": [92.7483, 11.6670],
  "CHANDIGARH": [76.7794, 30.7333],
  "DADRA & NAGAR HAVELI AND DAMAN & DIU": [72.9698, 20.4283],
  "DADRA AND NAGAR HAVELI": [73.0169, 20.1809],
  "DAMAN & DIU": [72.8397, 20.3974],
  "DAMAN AND DIU": [72.8397, 20.3974],
  "DELHI": [77.2090, 28.6139],
  "JAMMU & KASHMIR": [74.7973, 33.7782],
  "JAMMU AND KASHMIR": [74.7973, 33.7782],
  "LADAKH": [77.5771, 34.1526],
  "LAKSHADWEEP": [72.6369, 10.5667],
  "PUDUCHERRY": [79.8083, 11.9416],
  "PONDICHERRY": [79.8083, 11.9416],

  // States
  "ANDHRA PRADESH": [80.6480, 15.9129],
  "ARUNACHAL PRADESH": [93.6053, 27.0844],
  "ASSAM": [92.9376, 26.2006],
  "BIHAR": [85.3131, 25.0961],
  "CHHATTISGARH": [81.8661, 21.2787],
  "GOA": [74.1240, 15.2993],
  "GUJARAT": [71.1924, 22.2587],
  "HARYANA": [76.0856, 29.0588],
  "HIMACHAL PRADESH": [77.1734, 31.1048],
  "JHARKHAND": [85.3346, 23.6102],
  "KARNATAKA": [75.7139, 15.3173],
  "KERALA": [76.2711, 10.8505],
  "MADHYA PRADESH": [77.4126, 22.9734],
  "MAHARASHTRA": [75.7139, 19.7515],
  "MANIPUR": [93.9063, 24.6637],
  "MEGHALAYA": [91.3662, 25.4670],
  "MIZORAM": [92.9376, 23.1645],
  "NAGALAND": [94.5624, 26.1584],
  "ODISHA": [84.4559, 20.9517],
  "ORISSA": [84.4559, 20.9517],
  "PUNJAB": [75.3412, 31.1471],
  "RAJASTHAN": [74.2179, 27.0238],
  "SIKKIM": [88.5122, 27.5330],
  "TAMIL NADU": [78.6569, 11.1271],
  "TELANGANA": [79.0193, 18.1124],
  "TRIPURA": [91.9882, 23.9408],
  "UTTAR PRADESH": [80.3297, 26.8467],
  "UTTARAKHAND": [79.0193, 30.0668],
  "WEST BENGAL": [87.8550, 22.9868],
};

export const getStateCoords = (stateName?: string): [number, number] | null => {
  if (!stateName) return null;
  const cleaned = stateName.trim().toUpperCase();
  if (STATE_COORDINATES[cleaned]) {
    return STATE_COORDINATES[cleaned];
  }
  // Partial fuzzy matching
  for (const [key, coords] of Object.entries(STATE_COORDINATES)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return coords;
    }
  }
  return null;
};

export const WeatherStatewiseRainfallScreen = () => {
  const [rainfallData, setRainfallData] = useState<StatewiseRainfall[]>([]);
  const [selectedState, setSelectedState] = useState<StatewiseRainfall | null>(null);
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

  const getRainfallDisplay = (item: StatewiseRainfall): string => {
    const val = item['Daily Actual'] ?? item['Weekly Actual'] ?? item['Cumulative Actual'];
    if (val !== undefined && val !== null && val !== '') {
      return `${val} mm`;
    }
    return '-- mm';
  };

  const getCategoryColor = (cat?: string | null): string => {
    const c = (cat || '').trim().toUpperCase();
    if (c === 'LE' || c === 'E') return '#3B82F6'; // Excess (Blue dot)
    if (c === 'N') return '#22C55E';               // Normal (Green dot)
    if (c === 'D') return '#EAB308';               // Deficient (Yellow/Gold dot)
    if (c === 'LD' || c === 'NR') return '#EF4444';// Large Deficient / No Rain (Red dot)
    return '#94A3B8';                              // Unknown / No Data (Gray)
  };

  // Pixel-Distance Bounding Box Collision Filter for State Badges
  const visibleStates = useMemo(() => {
    if (!rainfallData || rainfallData.length === 0) return [];
    if (!viewportBounds) return rainfallData.slice(0, 15);

    const [west, south, east, north] = viewportBounds;
    const minLng = Math.min(west, east);
    const maxLng = Math.max(west, east);
    const minLat = Math.min(south, north);
    const maxLat = Math.max(south, north);

    const spanLng = maxLng - minLng;
    const spanLat = maxLat - minLat;
    if (spanLng <= 0 || spanLat <= 0) return [];

    const placedBoxes: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    const result: StatewiseRainfall[] = [];

    for (const item of rainfallData) {
      const coords = getStateCoords(item.State);
      if (!coords) continue;
      const [lng, lat] = coords;

      if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
        continue;
      }

      const pixelX = ((lng - minLng) / spanLng) * SCREEN_WIDTH;
      const pixelY = ((maxLat - lat) / spanLat) * SCREEN_HEIGHT;

      const box = {
        left: pixelX - BADGE_WIDTH / 2,
        right: pixelX + BADGE_WIDTH / 2,
        top: pixelY - BADGE_HEIGHT / 2,
        bottom: pixelY + BADGE_HEIGHT / 2,
      };

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
  }, [rainfallData, viewportBounds]);

  const handleLoadRainfallData = async () => {
    setLoading(true);
    setError(null);
    setSelectedState(null);

    try {
      const data = await SSMap.getStatewiseRainfall();
      const list = Array.isArray(data) ? data : [];
      setRainfallData(list);

      // Calculate bounding box across all mapped states
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      let validCount = 0;

      for (const item of list) {
        const coords = getStateCoords(item.State);
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
      setError(err?.message || 'Failed to load statewise rainfall data');
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

        {/* Render rainfall badges on map */}
        {visibleStates.map((item, index) => {
          const coords = getStateCoords(item.State);
          if (!coords) return null;
          const rainfall = getRainfallDisplay(item);
          const dotColor = getCategoryColor(item['Daily Category'] ?? item['Weekly Category'] ?? item['Cumulative Category']);
          const key = `state-${item.State || index}`;

          return (
            <ViewAnnotation
              key={key}
              id={key}
              lngLat={coords}
              anchor="center"
              onPress={() => setSelectedState(item)}
            >
              <TouchableOpacity 
                activeOpacity={0.85} 
                style={styles.badge}
                onPress={() => setSelectedState(item)}
              >
                <View style={[styles.badgeDot, { backgroundColor: dotColor }]} />
                <Text style={styles.badgeName} numberOfLines={1}>{item.State || 'Unknown'}</Text>
                <Text style={styles.badgeRainfall}>{rainfall}</Text>
              </TouchableOpacity>
            </ViewAnnotation>
          );
        })}
      </Map>

      {/* Rainfall Category Legend Bar */}
      {rainfallData.length > 0 && (
        <View style={styles.legendBar}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Excess</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>Normal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendText}>Deficient</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Large Deficient</Text>
          </View>
        </View>
      )}

      {/* Floating Location Button */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          showLocation && styles.fabActive,
          selectedState && styles.fabRaised
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

      {/* Detailed Rainfall Sheet for selected state */}
      {selectedState && (
        <View style={styles.detailCard}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => setSelectedState(null)}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.detailTitle}>{selectedState.State}</Text>
          {selectedState.Date && (
            <Text style={styles.detailDate}>Date: {selectedState.Date}</Text>
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailContent}
          >
            {/* Daily Rainfall Row */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Daily Rainfall</Text>
              <View style={styles.statRow}>
                <Text style={styles.statVal}>Actual: <Text style={styles.valHighlight}>{selectedState['Daily Actual'] ?? '--'} mm</Text></Text>
                <Text style={styles.statVal}>Normal: {selectedState['Daily Normal'] ?? '--'} mm</Text>
                <Text style={[styles.categoryBadge, { color: getCategoryColor(selectedState['Daily Category']) }]}>
                  {selectedState['Daily Departure Per'] ?? ''} ({selectedState['Daily Category']?.trim() ?? '--'})
                </Text>
              </View>
            </View>

            {/* Weekly Rainfall Row */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weekly Rainfall ({selectedState['Week Date']?.trim() || 'This Week'})</Text>
              <View style={styles.statRow}>
                <Text style={styles.statVal}>Actual: <Text style={styles.valHighlight}>{selectedState['Weekly Actual'] ?? '--'} mm</Text></Text>
                <Text style={styles.statVal}>Normal: {selectedState['Weekly Normal'] ?? '--'} mm</Text>
                <Text style={[styles.categoryBadge, { color: getCategoryColor(selectedState['Weekly Category']) }]}>
                  {selectedState['Weekly Departure Per'] ?? ''} ({selectedState['Weekly Category']?.trim() ?? '--'})
                </Text>
              </View>
            </View>

            {/* Cumulative Rainfall Row */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Cumulative Rainfall</Text>
              <View style={styles.statRow}>
                <Text style={styles.statVal}>Actual: <Text style={styles.valHighlight}>{selectedState['Cumulative Actual'] ?? '--'} mm</Text></Text>
                <Text style={styles.statVal}>Normal: {selectedState['Cumulative Normal'] ?? '--'} mm</Text>
                <Text style={[styles.categoryBadge, { color: getCategoryColor(selectedState['Cumulative Category']) }]}>
                  {selectedState['Cumulative Departue Per'] ?? ''} ({selectedState['Cumulative Category']?.trim() ?? '--'})
                </Text>
              </View>
            </View>
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
          onPress={handleLoadRainfallData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loadBtnText}>
              {rainfallData.length > 0 ? `Refresh Rainfall Data (${rainfallData.length})` : 'Load Rainfall Data'}
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
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeName: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 6,
    flexShrink: 0,
  },
  badgeRainfall: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: 'bold',
    flexShrink: 0,
  },
  legendBar: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
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
    bottom: 250,
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
    maxHeight: 220,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
    fontWeight: '500',
  },
  detailContent: {
    paddingVertical: 2,
  },
  statBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statVal: {
    color: '#64748B',
    fontSize: 11,
  },
  valHighlight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: 'bold',
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
