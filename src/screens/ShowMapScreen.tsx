import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { Map, MapStyles, UserLocation, Camera, useCurrentPosition } from "@sovereignsolutions/ssmap-react-native";
import type { CameraRef } from "@sovereignsolutions/ssmap-react-native";

export const ShowMapScreen = () => {
  const [currentStyle, setCurrentStyle] = useState<string>(MapStyles.BRIGHT);
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
        setLocationGranted(true); // iOS triggers via Info.plist when UserLocation is mounted
      }
    }
    requestLocationPermission();
  }, []);

  const stylesList = [
    { name: 'Bright', val: MapStyles.BRIGHT },
    { name: 'Dark', val: MapStyles.DARK },
    { name: '3D', val: MapStyles['3D'] },
    { name: 'Terrain', val: MapStyles.TERRAIN },
  ];

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
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Change Map Style:</Text>
        <View style={styles.buttonRow}>
          {stylesList.map((s) => (
            <TouchableOpacity 
              key={s.name} 
              style={[styles.styleBtn, currentStyle === s.val && styles.styleBtnActive]}
              onPress={() => setCurrentStyle(s.val)}
            >
              <Text style={[styles.btnText, currentStyle === s.val && styles.btnTextActive]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Map style={styles.map} mapStyle={currentStyle} compass={true}>
        <Camera ref={cameraRef} initialViewState={{ center: [77.2090, 28.6139], zoom: 11 }} />
        {locationGranted && showLocation && <UserLocation />}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  toolbar: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  toolbarTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  styleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    marginRight: 5,
    marginBottom: 5,
  },
  styleBtnActive: {
    backgroundColor: '#007AFF',
  },
  btnText: {
    color: '#333',
    fontSize: 14,
  },
  btnTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
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
  }
});
