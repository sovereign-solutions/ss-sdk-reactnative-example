import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Keyboard, 
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
  type SearchLocationDoc,
} from "@sovereignsolutions/ssmap-react-native";

export const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchLocationDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchLocationDoc | null>(null);
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    Keyboard.dismiss();
    setSelectedItem(null); // Clear previous details
    try {
      const result = await SSMap.search(query);
      setResults(result.docs || []);
    } catch (err: any) {
      console.warn("Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (item: SearchLocationDoc) => {
    const lat = item.latitude || item.location?.latitude;
    const lng = item.longitude || item.location?.longitude;
    
    if (lat !== undefined && lng !== undefined) {
      const pos = [lng, lat];
      setSelectedPoint(pos);
      setSelectedItem(item);
      cameraRef.current?.flyTo({
        center: pos as [number, number],
        zoom: 14,
        duration: 1000,
      });
    }
    setResults([]); // Hide results after selection
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
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search places..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchBtnText}>{loading ? '...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapContainer}>
        <Map style={styles.map} mapStyle={MapStyles.BRIGHT} compass={true}>
          <Camera ref={cameraRef} initialViewState={{ center: [77.2090, 28.6139], zoom: 11 }} />
          {locationGranted && showLocation && <UserLocation />}
          {geoJson && (
            <GeoJSONSource id="search-result-source" data={geoJson}>
              <Layer
                id="search-result-layer"
                type="circle"
                paint={{
                  'circle-radius': 10,
                  'circle-color': '#007AFF',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#fff',
                }}
              />
            </GeoJSONSource>
          )}
        </Map>
        
        <TouchableOpacity 
          style={[styles.fab, showLocation && styles.fabActive, selectedItem && results.length === 0 && styles.fabWithDetail]} 
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

        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={results}
              keyExtractor={(item, index) => index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectResult(item)}>
                  <Text style={styles.resultTitle}>{item.name || item.address}</Text>
                  {item.district && <Text style={styles.resultSub}>{item.district}, {item.province}</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Selected Item Details Card */}
        {selectedItem && results.length === 0 && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{selectedItem.name}</Text>
            {selectedItem.categorye && <Text style={styles.detailCategory}>{selectedItem.categorye}</Text>}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>District:</Text>
              <Text style={styles.detailValue}>{selectedItem.district || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Province:</Text>
              <Text style={styles.detailValue}>{selectedItem.province || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Coordinates:</Text>
              <Text style={styles.detailValue}>
                {selectedItem.latitude?.toFixed(4)}, {selectedItem.longitude?.toFixed(4)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    maxHeight: 250,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  resultSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  detailCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  detailCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 10,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detailLabel: {
    width: 90,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
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
  fabWithDetail: {
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
});
