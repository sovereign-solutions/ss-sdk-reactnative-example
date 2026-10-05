import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  backLabel?: string;
}

interface MenuItem {
  id: string;
  title: string;
  icon: any;
}

export const SCREENS: MenuItem[] = [
  // {
  //   id: 'Tracking',
  //   title: 'Tracking',
  //   icon: require('../assets/ic-tracking.png'),
  // },
  {
    id: 'ShowMap',
    title: 'Show Map (Style & Location)',
    icon: require('../assets/ic-map.png'),
  },
  {
    id: 'DrawPoint',
    title: 'Draw Point',
    icon: require('../assets/ic-point.png'),
  },
  {
    id: 'DrawLine',
    title: 'Draw Line',
    icon: require('../assets/ic-line.png'),
  },
  {
    id: 'DrawPolygon',
    title: 'Draw Polygon',
    icon: require('../assets/ic-polygon.png'),
  },
  {
    id: 'WhatHere',
    title: 'What is Here',
    icon: require('../assets/ic-whathere.png'),
  },
  {
    id: 'Search',
    title: 'Search Location',
    icon: require('../assets/ic-search.png'),
  },
  {
    id: 'Route',
    title: 'Routing - Optimize - Distance',
    icon: require('../assets/ic-route.png'),
  },
  {
    id: 'ClusterLayer',
    title: 'Cluster layer',
    icon: require('../assets/ic-cluster.png'),
  },
  {
    id: 'MapSnapshot',
    title: 'Map Snapshot',
    icon: require('../assets/ic-map.png'),
  },
  {
    id: 'WeatherLocation',
    title: 'Weather on Map Location',
    icon: require('../assets/ic-weather.png'),
  },
  {
    id: 'WeatherCityForecast',
    title: 'Weather City Forecast 7 Days',
    icon: require('../assets/ic-sun.png'),
  },
  {
    id: 'WeatherStatewiseRainfall',
    title: 'Weather Statewise Rainfall',
    icon: require('../assets/ic-rain.png'),
  },
  {
    id: 'LiveTracking',
    title: 'Live Tracking',
    icon: require('../assets/ic-tracking.png'),
  },
  {
    id: 'HistoryTracking',
    title: 'History Tracking',
    icon: require('../assets/ic-tracking.png'),
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, onBack, backLabel}) => {
  const [isBusinessExpanded, setIsBusinessExpanded] = useState(true);
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(false);

  const businessIds = [
    // 'Tracking',
    'WhatHere',
    'Search',
    'Route',
    'ClusterLayer',
    'LiveTracking',
    'HistoryTracking'
  ];
  
  const businessScreens = SCREENS.filter(s => businessIds.includes(s.id));
  const generalScreens = SCREENS.filter(s => !businessIds.includes(s.id));

  const renderSection = (title: string, data: MenuItem[], isExpanded: boolean, toggle: () => void) => (
    <View>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.chevronContainer}>
          <Image 
            source={isExpanded ? require('../assets/icons/ic-chevron-up.png') : require('../assets/icons/ic-chevron-down.png')}
            style={styles.sectionChevronIcon}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.list}>
          {data.map(screen => (
            <TouchableOpacity
              key={screen.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => onNavigate(screen.id)}
            >
              <View style={styles.iconCircle}>
                <Image source={screen.icon} style={styles.cardIcon} resizeMode="contain" />
              </View>
              <Text style={styles.cardTitle}>{screen.title}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/img-background1.png')}
        style={styles.backgroundImage}
        resizeMode="contain"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={onBack}>
            <Text style={styles.backButtonText}>
              {`‹ ${backLabel ?? 'Back'}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Header Section with Logo & Titles */}
        <View style={styles.header}>
          <Image
            source={require('../assets/img-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Sovereign Solutions{'\n'}Map SDK</Text>
          <Text style={styles.subtitle}>Select a feature to explore.</Text>
        </View>

        {renderSection('BUSINESS USE CASES', businessScreens, isBusinessExpanded, () => setIsBusinessExpanded(!isBusinessExpanded))}
        {renderSection('GENERAL EXAMPLES', generalScreens, isGeneralExpanded, () => setIsGeneralExpanded(!isGeneralExpanded))}
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 280,
    height: 280,
    opacity: 0.95,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingRight: 12,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#0878ff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logo: {
    width: 170,
    height: 48,
    marginBottom: 20,
    marginLeft: -10,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionChevronIcon: {
    width: 24,
    height: 24,
    tintColor: '#1e293b',
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'left',
    alignSelf: 'flex-start',
    fontSize: 28,
    fontWeight: '800',
    color: '#1c314f',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'left',
    alignSelf: 'flex-start',
    fontSize: 15,
    color: '#8e9aa8',
    fontWeight: '500',
  },
  list: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIcon: {
    width: 22,
    height: 22,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  chevron: {
    fontSize: 22,
    color: '#94a3b8',
    fontWeight: '600',
    marginLeft: 8,
  },
});
