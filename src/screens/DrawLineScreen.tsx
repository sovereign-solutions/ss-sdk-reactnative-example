import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Map, MapStyles, GeoJSONSource, Layer, Camera } from "@sovereignsolutions/ssmap-react-native";

export const DrawLineScreen = () => {
  const [lines, setLines] = useState<number[][][]>([]);
  const [currentLine, setCurrentLine] = useState<number[][]>([]);

  const handlePress = (e: any) => {
    const coords = e?.geometry?.coordinates || e?.nativeEvent?.lngLat;
    if (coords) {
      const pos = Array.isArray(coords) ? coords : [coords.lng, coords.lat];
      setCurrentLine([...currentLine, pos]);
    }
  };

  const handleNewLine = () => {
    if (currentLine.length > 0) {
      setLines([...lines, currentLine]);
      setCurrentLine([]);
    }
  };

  const handleClear = () => {
    setLines([]);
    setCurrentLine([]);
  };

  const allLines = currentLine.length > 0 ? [...lines, currentLine] : lines;
  
  // Only valid lines have >= 2 points
  const validLines = allLines.filter(line => line.length >= 2);

  const COLORS = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6'];

  const geoJson : any = {
    type: 'FeatureCollection',
    features: validLines.map((line, index) => ({
      type: 'Feature',
      id: `line-${index}`,
      geometry: {
        type: 'LineString',
        coordinates: line,
      },
      properties: {
        color: COLORS[index % COLORS.length]
      },
    }))
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
        <GeoJSONSource id="lines-source" data={geoJson}>
          <Layer
            id="lines-layer"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 4,
            }}
          />
        </GeoJSONSource>
      </Map>
      <View style={styles.toolbar}>
        <Text style={styles.instructions}>Tap 2 or more points to draw line</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={handleNewLine}>
            <Text style={styles.btnText}>Start New Line</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.clearBtn]} onPress={handleClear}>
            <Text style={styles.btnText}>Clear All</Text>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  btn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearBtn: {
    backgroundColor: '#FF3B30',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
