import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Map, MapStyles, Camera } from '@sovereignsolutions/ssmap-react-native';

export const TrackingScreen = () => {
  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MapStyles.BRIGHT} compass={true}>
        <Camera initialViewState={{ center: [77.2090, 28.6139], zoom: 12 }} />
      </Map>
      <View style={styles.placeholderCard}>
        <Text style={styles.title}>Tracking Feature</Text>
        <Text style={styles.subtitle}>
          Placeholder for tracking implementation.
        </Text>
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
  placeholderCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
