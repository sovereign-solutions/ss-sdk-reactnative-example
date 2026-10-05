import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  Map,
  MapStyles,
  GeoJSONSource,
  Layer,
  Camera,
  UserLocation,
  useCurrentPosition,
  type CameraRef,
  type GeoJSONSourceRef,
} from '@sovereignsolutions/ssmap-react-native';

const TOTAL_POINTS = 30000;

// Bounding box roughly covering mainland region
const REGION_BOUNDS = {
  minLng: 68.7,
  maxLng: 97.25,
  minLat: 8.4,
  maxLat: 35.5,
};

// Seeded PRNG for reproducible and uniform distribution
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generatePoints(count: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const lng =
      REGION_BOUNDS.minLng +
      pseudoRandom(i * 2 + 1) * (REGION_BOUNDS.maxLng - REGION_BOUNDS.minLng);
    const lat =
      REGION_BOUNDS.minLat +
      pseudoRandom(i * 2 + 2) * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat);

    features[i] = {
      type: 'Feature',
      id: i + 1,
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      properties: {
        id: i + 1,
        name: `Point #${i + 1}`,
      },
    };
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export const ClusterLayerScreen = () => {
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);

  const [pointsData, setPointsData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedPointInfo, setSelectedPointInfo] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

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

  useEffect(() => {
    // Generate data on mount asynchronously to prevent blocking UI transition
    const timer = setTimeout(() => {
      const data = generatePoints(TOTAL_POINTS);
      setPointsData(data);
    }, 50);

    return () => {
      clearTimeout(timer);
      setPointsData(null); // Release big data for GC immediately
    };
  }, []);

  const handleSourcePress = async (event: any) => {
    // React Native NativeSyntheticEvent wraps the payload in nativeEvent
    const features = event?.nativeEvent?.features || event?.features;
    const feature = features?.[0];
    if (!feature) return;

    const isCluster = feature.properties?.cluster === true || feature.properties?.cluster === 'true';

    if (isCluster) {
      setSelectedPointInfo(null); // Reset previous point selection
      const clusterId = Number(feature.properties?.cluster_id);
      const coords = feature.geometry?.coordinates;

      if (!isNaN(clusterId) && coords) {
        try {
          // Query expansion zoom level from native source
          const expansionZoom = await sourceRef.current?.getClusterExpansionZoom(clusterId);
          const targetZoom = typeof expansionZoom === 'number' && expansionZoom > 0 ? expansionZoom : 10;

          cameraRef.current?.flyTo({
            center: [coords[0], coords[1]],
            zoom: targetZoom,
            duration: 500,
          });
        } catch (err) {
          // Fallback if getClusterExpansionZoom fails: zoom in +2 levels
          cameraRef.current?.flyTo({
            center: [coords[0], coords[1]],
            zoom: 10,
            duration: 500,
          });
        }
      }
    } else {
      // Unclustered individual point tapped
      const name = feature.properties?.name || `Point #${feature.properties?.id || ''}`;
      const coords = feature.geometry?.coordinates;
      setSelectedPointInfo(`${name} (${coords?.[1]?.toFixed(4)}, ${coords?.[0]?.toFixed(4)})`);
    }
  };

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MapStyles.BRIGHT} compass={true}>
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [78.9629, 22.5937],
            zoom: 4,
          }}
        />

        {locationGranted && showLocation && <UserLocation />}

        {pointsData && (
          <GeoJSONSource
            id="cluster-source"
            ref={sourceRef}
            data={pointsData}
            cluster={true}
            clusterRadius={60}
            clusterMaxZoom={14}
            onPress={handleSourcePress}
          >
            {/* Cluster Circles Layer */}
            <Layer
              id="cluster-circles"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': [
                  'step',
                  ['get', 'point_count'],
                  '#6366f1', // < 100 points
                  100,
                  '#3b82f6', // 100 - 499 points
                  500,
                  '#10b981', // 500 - 1999 points
                  2000,
                  '#ef4444', // >= 2000 points
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  18, // < 100 points
                  100,
                  24, // 100 - 499 points
                  500,
                  30, // 500 - 1999 points
                  2000,
                  36, // >= 2000 points
                ],
                'circle-stroke-width': 2.5,
                'circle-stroke-color': '#ffffff',
              }}
            />

            {/* Cluster Count Text Labels */}
            <Layer
              id="cluster-count-label"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['to-string', ['get', 'point_count']],
                'text-size': 12,
                'text-allow-overlap': true,
                'text-ignore-placement': true,
              }}
              paint={{
                'text-color': '#ffffff',
              }}
            />

            {/* Individual Unclustered Points Layer */}
            <Layer
              id="unclustered-points"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': '#007AFF',
                'circle-radius': 6,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      {/* FAB Location Button */}
      <TouchableOpacity
        style={[styles.fab, showLocation && styles.fabActive]}
        onPress={handleLocationPress}
      >
        <Text
          style={[
            styles.fabText,
            showLocation && styles.fabTextActive,
            { transform: [{ rotate: '-135deg' }], marginTop: -2, marginLeft: -8 },
          ]}
        >
          ➤
        </Text>
      </TouchableOpacity>

      {/* Info Card / Instructions */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Rendering 30,000 random data points.</Text>
        <Text style={styles.infoSubtitle}>Tap any cluster to zoom in.</Text>
        {selectedPointInfo && (
          <Text style={styles.selectedText}>Selected: {selectedPointInfo}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
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
    zIndex: 10,
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
  infoBox: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  selectedText: {
    marginTop: 6,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
});
