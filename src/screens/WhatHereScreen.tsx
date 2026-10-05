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
  type WhatHereResult 
} from "@sovereignsolutions/ssmap-react-native";

export const WhatHereScreen = () => {
  const [point, setPoint] = useState<number[] | null>(null);
  const [address, setAddress] = useState<string>('Tap anywhere on the map');
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

  const handlePress = async (e: any) => {
    const coords = e?.geometry?.coordinates || e?.nativeEvent?.lngLat;
    if (coords) {
      const pos = Array.isArray(coords) ? coords : [coords.lng, coords.lat];
      setPoint(pos);
      setLoading(true);
      setAddress('Fetching address...');
      
      try {
        const result = await SSMap.whatHere(pos as [number, number]);
        if (Array.isArray(result) && result.length > 0) {
          const item: WhatHereResult = result[0];
          const parts = [
            item.Road,
            item.Village,
            item.Tehsil,
            item.District,
            item.State,
            item.Country,
          ].filter((p): p is string => Boolean(p && p.trim().length > 0));

          let addrStr = parts.join(', ');
          if (item.PinCode?.Value) {
            addrStr += ` - ${item.PinCode.Value}`;
          }
          setAddress(addrStr || 'Unknown address');
        } else {
          setAddress('No address found for this location');
        }
      } catch (err: any) {
        setAddress(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const geoJson : any = point ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: point,
      },
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
        {geoJson && (
          <GeoJSONSource id="point-source" data={geoJson}>
            <Layer
              id="point-layer"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': '#007AFF',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
            />
          </GeoJSONSource>
        )}
      </Map>
      <TouchableOpacity 
        style={[styles.fab, showLocation && styles.fabActive]} 
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
      <View style={styles.overlay}>
        {loading ? <ActivityIndicator size="small" color="#007AFF" /> : <Text style={styles.addressText}>{address}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 95,
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

