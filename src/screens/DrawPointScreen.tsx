import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Map, MapStyles, GeoJSONSource, Layer, Camera } from "@sovereignsolutions/ssmap-react-native";

export const DrawPointScreen = () => {
  const [points, setPoints] = useState<number[][]>([]);

  const handlePress = (e: any) => {
    const coords = e?.geometry?.coordinates || e?.nativeEvent?.lngLat;
    if (coords) {
      const pos = Array.isArray(coords) ? coords : [coords.lng, coords.lat];
      setPoints([...points, pos]);
    }
  };

  const pointFeatures = points.map((pt, index) => ({
    type: 'Feature',
    id: `point-${index}`,
    geometry: { type: 'Point', coordinates: pt },
    properties: {},
  }));

  const geoJson = {
    type: 'FeatureCollection',
    features: pointFeatures,
  };

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        mapStyle={MapStyles.BRIGHT}
        compass={true}
        onPress={handlePress}
      >
        <Camera initialViewState={{ center: [77.2090, 28.6139], zoom: 11 }} />
    
        <GeoJSONSource id="points-source" data={geoJson as any}>
          <Layer
            id="points-layer"
            type="circle"
            source='points-source'
            paint={{
              'circle-radius': 10,
              'circle-color': '#007AFF',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            }}
          />
        </GeoJSONSource>
        
      </Map>
      <View style={styles.toolbar}>
        <Text style={styles.instructions}>Tap on the map to draw point</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={() => setPoints([])}>
          <Text style={styles.clearBtnText}>Clear All Points</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  toolbar: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  instructions: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  clearBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
