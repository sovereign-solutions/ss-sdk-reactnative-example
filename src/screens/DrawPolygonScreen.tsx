import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Map, MapStyles, GeoJSONSource, Layer, Camera } from "@sovereignsolutions/ssmap-react-native";

export const DrawPolygonScreen = () => {
  const [polygons, setPolygons] = useState<number[][][]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<number[][]>([]);

  const handlePress = (e: any) => {
    const coords = e?.geometry?.coordinates || e?.nativeEvent?.lngLat;
    if (coords) {
      const pos = Array.isArray(coords) ? coords : [coords.lng, coords.lat];
      setCurrentPolygon([...currentPolygon, pos]);
    }
  };

  const handleNewPolygon = () => {
    if (currentPolygon.length >= 3) {
      setPolygons([...polygons, currentPolygon]);
      setCurrentPolygon([]);
    }
  };

  const handleClear = () => {
    setPolygons([]);
    setCurrentPolygon([]);
  };

  const allPolygons = currentPolygon.length >= 3 ? [...polygons, currentPolygon] : polygons;

  const COLORS = ['#34C759', '#007AFF', '#FF3B30', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6'];

  const geoJson: any = {
    type: 'FeatureCollection',
    features: allPolygons.map((poly, index) => {
      // Ensure the polygon is closed
      const closedPoly = [...poly];
      if (
        closedPoly[0][0] !== closedPoly[closedPoly.length - 1][0] ||
        closedPoly[0][1] !== closedPoly[closedPoly.length - 1][1]
      ) {
        closedPoly.push(closedPoly[0]);
      }
      return {
        type: 'Feature',
        id: `polygon-${index}`,
        geometry: {
          type: 'Polygon',
          coordinates: [closedPoly],
        },
        properties: {
          color: COLORS[index % COLORS.length]
        },
      };
    })
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
        {allPolygons.length > 0 && (
          <GeoJSONSource id="polygon-source" data={geoJson}>
            <Layer
              id="polygon-layer"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.5,
                'fill-outline-color': '#000',
              }}
            />
          </GeoJSONSource>
        )}
      </Map>
      <View style={styles.toolbar}>
        <Text style={styles.instructions}>Tap 3 or more points to draw polygon</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={handleNewPolygon}>
            <Text style={styles.btnText}>Start New Polygon</Text>
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
