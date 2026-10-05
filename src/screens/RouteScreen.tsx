import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
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
} from "@sovereignsolutions/ssmap-react-native";

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
}

export const RouteScreen = () => {
  const [waypoints, setWaypoints] = useState<number[][]>([]);
  const [routeLine, setRouteLine] = useState<number[][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const cameraRef = useRef<CameraRef>(null);

  // Track position when permission is granted and feature is turned on
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

  const formatDistance = (meters?: number): string => {
    if (meters === undefined || meters === null) return '--';
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (seconds?: number): string => {
    if (seconds === undefined || seconds === null) return '--';
    const totalMinutes = Math.round(seconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs} hr ${mins} min`;
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

  const handlePress = (e: any) => {
    const coords = e?.geometry?.coordinates || e?.nativeEvent?.lngLat;
    if (coords) {
      const pos = Array.isArray(coords) ? coords : [coords.lng, coords.lat];
      setWaypoints([...waypoints, pos]);
      // Clear previous route when new point is added
      setRouteLine(null);
      setRouteInfo(null);
    }
  };

  const handleFindRoute = async () => {
    if (waypoints.length < 2) return;
    setLoading(true);
    try {
      const points = waypoints.map(wp => [wp[0], wp[1]] as [number, number]);
      const result = await SSMap.findRoute(points);
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const geometryStr = route.geometry;
        if (geometryStr) {
          const decoded = SSMap.coordsDecode(geometryStr);
          setRouteLine(decoded);
          setRouteInfo({
            distance: typeof route.distance === 'number' ? route.distance : parseFloat(route.distance || 0),
            duration: typeof route.duration === 'number' ? route.duration : parseFloat(route.duration || 0),
          });
        } else {
          Alert.alert("Error", "No route geometry returned.");
        }
      } else {
        Alert.alert("Error", "No routes found.");
      }
    } catch (err: any) {
      Alert.alert("Route Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRoute = async () => {
    if (waypoints.length < 3) return; // Need at least 3 points to optimize
    setLoading(true);
    try {
      const points = waypoints.map(wp => [wp[0], wp[1]] as [number, number]);
      const result = await SSMap.optimizeRoute(points);
      if (result.trips && result.trips.length > 0) {
        const trip = result.trips[0];
        const geometryStr = trip.geometry;
        if (geometryStr) {
          const decoded = SSMap.coordsDecode(geometryStr);
          setRouteLine(decoded);
          setRouteInfo({
            distance: typeof trip.distance === 'number' ? trip.distance : parseFloat(trip.distance || 0),
            duration: typeof trip.duration === 'number' ? trip.duration : parseFloat(trip.duration || 0),
          });
        } else {
          Alert.alert("Error", "No route geometry returned.");
        }
      } else {
        Alert.alert("Error", "No optimized routes found.");
      }
    } catch (err: any) {
      Alert.alert("Optimize Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setWaypoints([]);
    setRouteLine(null);
    setRouteInfo(null);
  };

  const pointFeatures = waypoints.map((wp, index) => ({
    type: 'Feature',
    id: `waypoint-${index}`,
    geometry: { type: 'Point', coordinates: wp },
    properties: { index: (index + 1).toString() },
  }));

  const pointsGeoJson: any = {
    type: 'FeatureCollection',
    features: pointFeatures,
  };

  const routeGeoJson: any = routeLine ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routeLine },
      properties: {},
    }]
  } : null;

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        mapStyle={MapStyles.BRIGHT}
        compass={true}
        onPress={handlePress}
      >
        <Camera ref={cameraRef} initialViewState={{ center: [77.2090, 28.6139], zoom: 11 }} />
        {locationGranted && showLocation && <UserLocation />}
        {routeGeoJson && (
          <GeoJSONSource id="route-source" data={routeGeoJson}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                'line-color': '#007AFF',
                'line-width': 5,
              }}
            />
          </GeoJSONSource>
        )}
        
        {pointFeatures.length > 0 && (
          <GeoJSONSource id="waypoints-source" data={pointsGeoJson}>
            <Layer
              id="waypoints-layer"
              type="symbol"
              layout={{
                'text-field': '{index}',
                'text-size': 16,
                'text-allow-overlap': true,
              }}
              paint={{
                'text-color': '#fff',
                'text-halo-color': '#007AFF',
                'text-halo-width': 2,
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      {/* Floating Location Button */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          showLocation && styles.fabActive,
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
      
      {/* Bottom Control Panel */}
      <View style={styles.toolbar}>
        <Text style={styles.instructions}>
          {waypoints.length === 0 
            ? 'Tap on map to place waypoints' 
            : waypoints.length === 1 
            ? 'Select at least 1 more point' 
            : 'Ready to calculate route'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.btn, waypoints.length < 2 && styles.disabledBtn]} 
            onPress={handleFindRoute} 
            disabled={waypoints.length < 2 || loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Find Route</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btn, styles.optimizeBtn, waypoints.length < 3 && styles.disabledBtn]} 
            onPress={handleOptimizeRoute} 
            disabled={waypoints.length < 3 || loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Optimize</Text>}
          </TouchableOpacity>
        </View>
        
        {/* Bottom Info Row with Points & Distance/Time */}
        <View style={styles.clearRow}>
          <View style={styles.pointsAndDistanceRow}>
            <Text style={styles.pointCountText}>Points: {waypoints.length}</Text>
            {routeInfo && (
              <Text style={styles.distanceInfoText}>
                {'  |  '}<Text style={styles.distanceHighlight}>{formatDistance(routeInfo.distance)}</Text> ({formatDuration(routeInfo.duration)})
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.btn, styles.clearBtn, waypoints.length === 0 && styles.disabledBtn]} 
            onPress={handleClear}
            disabled={waypoints.length === 0}
          >
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  instructions: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    width: '100%',
  },
  clearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    width: '100%',
  },
  pointsAndDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  pointCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  distanceInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  distanceHighlight: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  btn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
  },
  optimizeBtn: {
    backgroundColor: '#10B981',
  },
  clearBtn: {
    backgroundColor: '#EF4444',
    minWidth: 70,
    paddingVertical: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 140,
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
