import { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, TextInput, ScrollView, Keyboard } from 'react-native';
import { Map, MapStyles, Camera, Marker } from '@sovereignsolutions/ssmap-react-native';
import Supercluster from 'supercluster';
import type { BBox, GeoJsonProperties } from 'geojson';


// Component for the pulsing active ring
const PulseRing = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    animation.start();
    
    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.2, 0],
  });

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

export const LiveTrackingScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [isClusterOn, setIsClusterOn] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<'All' | 'OnDuty' | 'OffDuty'>('All');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isListVisible, setIsListVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const cameraRef = useRef<any>(null);
  
  // Default bbox/zoom roughly matching the initial camera state
  const [bbox, setBbox] = useState<BBox>([77.0, 12.0, 78.0, 14.0]);
  const [zoom, setZoom] = useState<number>(10);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        // In a real application, you would call fetchData() here.
        // For mock data, we simulate live movement locally.
        simulateMovement();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const fetchData = () => {
    // Note: call api to get live tracking data.
    // Using simulated mock data.
    const mockData = require('../assets/mock-data/tracking-live-sample.json');
    setData(mockData.data.trackers || []);
  };

  const simulateMovement = () => {
    setData((prevData) => {
      return prevData.map((tracker: any) => {
        const info = tracker.trackingInfo[0];
        const dutyEvent = tracker.latest_events?.DUTY || tracker.latest_duty_event || info;
        const isActive = dutyEvent.action_code === 'on_duty';
        
        if (!isActive) return tracker;

        // Clone the tracker to simulate a fresh API response
        const newTracker = JSON.parse(JSON.stringify(tracker));
        const newInfo = newTracker.trackingInfo[0];
        
        const heading = (newInfo.heading !== undefined && newInfo.heading >= 0) ? newInfo.heading : 0;
        const speed = newInfo.speed || 30; // default 30km/h if 0
        
        // Convert heading to radians
        const headingRad = (heading * Math.PI) / 180;
        
        // Very rough approximation: 1 degree latitude is ~111km
        // In 5 seconds, at speed km/h: distance = speed * (5 / 3600) km
        const distanceDegrees = (speed * (5 / 3600)) / 111;
        
        const dLat = Math.cos(headingRad) * distanceDegrees;
        const dLng = Math.sin(headingRad) * distanceDegrees;
        
        newInfo.lat += dLat;
        newInfo.lng += dLng;
        newInfo.ts = Math.floor(Date.now() / 1000); // update timestamp
        
        return newTracker;
      });
    });
  };

  // Map raw tracker data into standard GeoJSON features once
  const allFeatures = useMemo(() => {
    return data.map((tracker: any) => {
      const info = tracker.trackingInfo[0];
      const dutyEvent = tracker.latest_events?.DUTY || tracker.latest_duty_event || info;
      
      const isActive = dutyEvent.action_code === 'on_duty';
      
      let statusColor = '#94a3b8'; // Default inactive (Gray)
      if (isActive) {
        statusColor = '#10b981'; // Active (Green)
      } else if (dutyEvent.action_code === 'force_off_duty') {
        statusColor = '#f59e0b'; // Force off duty (Orange)
      }

      // Default heading to 0 (North) if missing or -1 so the arrow is always visible on active markers
      const heading = (info.heading !== undefined && info.heading >= 0) ? info.heading : 0;

      const nameStr = info.employee_full_name || tracker.driver || '';
      const nameParts = nameStr.trim().split(' ');
      const firstInitial = nameParts[0]?.[0] || '';
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
      const initials = (firstInitial + lastInitial).toUpperCase();

      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [info.lng, info.lat] },
        properties: {
          id: info.trackerId || info.session,
          driverId: info.employee_username || tracker.driver || '',
          name: nameStr,
          speed: info.speed || 0,
          address: info.address || 'Location unavailable',
          ts: info.ts || 0,
          initials,
          isActive,
          statusColor,
          heading,
        }
      };
    });
  }, [data]);

  const onDutyCount = allFeatures.filter((f: any) => f.properties.isActive).length;
  const offDutyCount = allFeatures.length - onDutyCount;

  const filteredFeatures = useMemo(() => {
    if (filter === 'All') return allFeatures;
    if (filter === 'OnDuty') return allFeatures.filter((f: any) => f.properties.isActive);
    if (filter === 'OffDuty') return allFeatures.filter((f: any) => !f.properties.isActive);
    return allFeatures;
  }, [allFeatures, filter]);

  const selectedMarker = useMemo(() => {
    if (!selectedMarkerId) return null;
    return allFeatures.find((f: any) => f.properties.id === selectedMarkerId) || null;
  }, [allFeatures, selectedMarkerId]);

  const searchedEmployees = useMemo(() => {
    if (!searchQuery) return filteredFeatures;
    const q = searchQuery.toLowerCase();
    return filteredFeatures.filter(f => 
      f.properties.name.toLowerCase().includes(q) || 
      f.properties.driverId.toLowerCase().includes(q)
    );
  }, [filteredFeatures, searchQuery]);

  // Initialize supercluster
  const supercluster = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 21, // Increased maxZoom to Mapbox's max so they always cluster when overlapping
    });
    sc.load(filteredFeatures);
    return sc;
  }, [filteredFeatures]);

  // Get visible clusters based on the current viewport
  const clusters = useMemo(() => {
    if (!isClusterOn) return filteredFeatures;
    
    // Clamp zoom to 22 max so supercluster doesn't choke on unindexed depths
    const clusterZoom = Math.min(Math.floor(zoom), 21);
    return supercluster.getClusters(bbox, clusterZoom);
  }, [supercluster, bbox, zoom, isClusterOn, filteredFeatures]);

  const onRegionDidChange = (e: any) => {
    setBbox(e.nativeEvent.bounds);
    setZoom(e.nativeEvent.zoom);
  };

  const handleFitAll = () => {
    if (filteredFeatures.length === 0) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    filteredFeatures.forEach((f: any) => {
      const [lng, lat] = f.geometry.coordinates;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    });
    cameraRef.current?.fitBounds(
      [minLng, minLat, maxLng, maxLat],
      { padding: { top: 120, right: 40, bottom: 40, left: 40 }, duration: 800 }
    );
  };

  const closePanel = () => setSelectedMarkerId(null);

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        mapStyle={MapStyles.BRIGHT} 
        compass={true}
        compassPosition={{top: 85, left:5}}
        onRegionDidChange={onRegionDidChange}
      >
        <Camera 
          ref={cameraRef}
          maxZoom={21} // Prevent user from zooming past MapLibre's stable limit where it stutters
          initialViewState={{ 
            center: [77.62, 12.93],
            zoom: 10 
          }} 
        />

        {/* Render Clusters & Individual Markers entirely through React Native */}
        {clusters.map((feature: any) => {
          const isCluster = feature.properties?.cluster;
          const coords = feature.geometry.coordinates;

          if (isCluster) {
            const pointCount = feature.properties.point_count;
            return (
              <Marker 
                key={`cluster-${feature.properties.cluster_id}`}
                id={`cluster-${feature.properties.cluster_id}`}
                lngLat={coords}
                anchor="center"
              >
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => {
                    const expansionZoom = supercluster.getClusterExpansionZoom(feature.properties.cluster_id);
                    cameraRef.current?.easeTo({
                      center: coords,
                      zoom: Math.min(expansionZoom, 21), // Clamp to Mapbox max
                      duration: 400,
                    });
                  }}
                  style={styles.clusterCircle}
                >
                  <Text style={styles.clusterText}>{pointCount}</Text>
                </TouchableOpacity>
              </Marker>
            );
          }

          // Individual Marker
          const { id, initials, isActive, statusColor, heading } = feature.properties as any;
          return (
            <Marker 
              key={id}
              id={id}
              lngLat={coords}
              anchor="center"
            >
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => {
                  setSelectedMarkerId(id);
                  cameraRef.current?.easeTo({
                    center: coords,
                    duration: 500,
                  });
                }}
              >
                <View style={styles.markerWrapper}>
                  {isActive && <PulseRing color={statusColor} />}

                  {/* Rotating Heading Arrow (Only if active) */}
                  {isActive && (
                    <View 
                      style={[
                        styles.headingWrapper,
                        { transform: [{ rotate: `${heading}deg` }] }
                      ]}
                    >
                      <View style={[styles.headingArrow, { borderBottomColor: statusColor }]} />
                    </View>
                  )}

                  <View style={[styles.initialsCircle, { borderColor: statusColor }]}>
                    <Text style={styles.initialsText}>{initials}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </Map>

      {/* Control Bar Overlay */}
      <View style={styles.controlBarContainer}>
        <View style={styles.controlBar}>
          
          {/* Top Row: Controls */}
          <View style={styles.controlRow}>
            {/* Status Toggle */}
            <TouchableOpacity 
              style={[styles.btnBox, { borderColor: isLive ? '#10b981' : '#64748b', minWidth: 85, justifyContent: 'center' }]} 
              onPress={() => setIsLive(!isLive)}
            >
              <View style={[styles.smallDot, { backgroundColor: isLive ? '#10b981' : '#64748b' }]} />
              <Text style={[styles.btnBoxText, { color: isLive ? '#10b981' : '#64748b' }]}>
                {isLive ? 'LIVE' : 'PAUSED'}
              </Text>
            </TouchableOpacity>

            {/* Play/Pause & Refresh */}
            <TouchableOpacity onPress={() => setIsLive(!isLive)} style={styles.iconBtn}>
              {isLive ? (
                <View style={styles.pauseIcon}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <Text style={styles.iconBtnText}>▶</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={simulateMovement}>
              <Text style={styles.iconBtnText}>↻</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Cluster Toggle */}
            <TouchableOpacity 
              style={isClusterOn ? [styles.btnBox, { borderColor: '#0ea5e9' }] : styles.btnBoxOff} 
              onPress={() => setIsClusterOn(!isClusterOn)}
            >
              <Text style={[styles.btnBoxText, { color: isClusterOn ? '#0ea5e9' : '#94a3b8' }]}>
                ❖ Cluster: {isClusterOn ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Fit All */}
            <TouchableOpacity onPress={handleFitAll} style={styles.fitAllBtn}>
              <Text style={styles.fitAllText}>Fit All</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Row: Filters & Employee List */}
          <View style={styles.controlRowBottom}>
            <View style={styles.filterGroup}>
              {/* Filter: All */}
              <TouchableOpacity 
                style={filter === 'All' ? styles.filterBtnActiveAll : styles.filterBtn}
                onPress={() => { setFilter('All'); setSelectedMarkerId(null); }}
              >
                <Text style={filter === 'All' ? styles.filterTextActive : styles.filterTextDefault}>
                  All ({allFeatures.length})
                </Text>
              </TouchableOpacity>

              {/* Filter: On Duty */}
              <TouchableOpacity 
                style={filter === 'OnDuty' ? styles.filterBtnActiveOnDuty : styles.filterBtn}
                onPress={() => { setFilter('OnDuty'); setSelectedMarkerId(null); }}
              >
                <Text style={filter === 'OnDuty' ? styles.filterTextActive : styles.filterTextGreen}>
                  On Duty ({onDutyCount})
                </Text>
              </TouchableOpacity>

              {/* Filter: Off Duty */}
              <TouchableOpacity 
                style={filter === 'OffDuty' ? styles.filterBtnActiveOffDuty : styles.filterBtn}
                onPress={() => { setFilter('OffDuty'); setSelectedMarkerId(null); }}
              >
                <Text style={filter === 'OffDuty' ? styles.filterTextActive : styles.filterTextGray}>
                  Off Duty ({offDutyCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Employee List Button */}
            <TouchableOpacity 
              style={styles.listBtn}
              onPress={() => setIsListVisible(true)}
            >
              <Text style={styles.listBtnText}>☰ List</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* Visible Employee List Modal/Overlay */}
      {isListVisible && (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Employee List ({filteredFeatures.length})</Text>
            <TouchableOpacity 
              onPress={() => {
                Keyboard.dismiss();
                setIsListVisible(false);
              }} 
              style={styles.closeBtnOverlay}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput 
            style={styles.searchInput}
            placeholder="Search name or ID..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          <ScrollView 
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
          >
            {searchedEmployees.length > 0 ? (
              searchedEmployees.map(f => (
                <TouchableOpacity 
                  key={f.properties.id} 
                  style={styles.listItem}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsListVisible(false);
                    setSelectedMarkerId(f.properties.id);
                    cameraRef.current?.easeTo({
                      center: f.geometry.coordinates,
                      zoom: 16,
                      duration: 500,
                    });
                  }}
                >
                  <View style={[styles.panelInitials, { borderColor: f.properties.statusColor, width: 32, height: 32, borderRadius: 16 }]}>
                    <Text style={[styles.panelInitialsText, { fontSize: 12 }]}>{f.properties.initials}</Text>
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName} numberOfLines={1}>{f.properties.name}</Text>
                    <Text style={styles.listItemId}>@{f.properties.driverId}</Text>
                  </View>
                  <View style={[styles.smallDot, { backgroundColor: f.properties.statusColor, marginRight: 0 }]} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResultsText}>No employees found.</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Selected Marker Detail Panel (Simplified) */}
      {selectedMarker && !isListVisible && (
        <View style={styles.bottomPanel}>
          <TouchableOpacity style={styles.closeBtn} onPress={closePanel}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.panelHeader}>
            <View style={[styles.panelInitials, { borderColor: selectedMarker.properties.statusColor }]}>
              <Text style={styles.panelInitialsText}>{selectedMarker.properties.initials}</Text>
            </View>
            <View style={styles.panelNameCol}>
              <Text style={styles.panelName} numberOfLines={1}>{selectedMarker.properties.name}</Text>
              <Text style={styles.panelId}>ID: @{selectedMarker.properties.driverId}</Text>
            </View>
          </View>

          <View style={styles.panelContent}>
            <View style={styles.panelRow}>
              <View style={[styles.panelBadge, { backgroundColor: selectedMarker.properties.statusColor + '20', borderColor: selectedMarker.properties.statusColor }]}>
                <Text style={[styles.panelBadgeText, { color: selectedMarker.properties.statusColor }]}>
                  {selectedMarker.properties.isActive ? '● ON DUTY' : '○ OFF DUTY'}
                </Text>
              </View>
              <Text style={styles.panelInfo}>Speed: {selectedMarker.properties.speed} km/h</Text>
              <Text style={styles.panelInfo}>Heading: {selectedMarker.properties.heading}°</Text>
            </View>

            <View style={styles.panelAddressBox}>
              <Text style={styles.panelCoords}>
                {selectedMarker.geometry.coordinates[1].toFixed(5)}° N, {selectedMarker.geometry.coordinates[0].toFixed(5)}° E
              </Text>
              <Text style={styles.panelAddress} numberOfLines={2}>
                {selectedMarker.properties.address}
              </Text>
            </View>

            <View style={styles.panelFooter}>
              <Text style={styles.panelTime}>
                {selectedMarker.properties.ts ? `Updated: ${formatTime(selectedMarker.properties.ts)}` : ''}
              </Text>

              <TouchableOpacity 
                style={styles.centerBtn}
                onPress={() => {
                  cameraRef.current?.easeTo({
                    center: selectedMarker.geometry.coordinates,
                    zoom: 16,
                    duration: 500,
                  });
                }}
              >
                <Text style={styles.centerBtnText}>Center</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  
  // Control Bar
  controlBarContainer: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
  },
  controlBar: {
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  controlRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  btnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  btnBoxOff: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  btnBoxText: {
    fontSize: 11,
    fontWeight: '700',
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  iconBtn: {
    paddingHorizontal: 4,
  },
  iconBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 2,
    height: 10,
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  pauseBar: {
    width: 3,
    height: '100%',
    backgroundColor: '#cbd5e1',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
  },
  
  // Filters & List Btn
  filterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterBtnActiveAll: {
    backgroundColor: '#0ea5e9',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterBtnActiveOnDuty: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterBtnActiveOffDuty: {
    backgroundColor: '#64748b',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterTextDefault: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextGreen: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextGray: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  
  fitAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fitAllText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  listBtn: {
    backgroundColor: '#334155',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  listBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Cluster Styles
  clusterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  clusterText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Marker Styles
  markerWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  initialsText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  pulseRing: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 22,
    borderWidth: 1.5,
    zIndex: 1,
  },
  headingWrapper: {
    position: 'absolute',
    width: 44,
    height: 44,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 0,
  },
  headingArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    top: -6,
  },

  // List Overlay
  listContainer: {
    position: 'absolute',
    top: 90,
    left: 10,
    right: 10,
    bottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtnOverlay: {
    padding: 4,
  },
  searchInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemId: {
    color: '#94a3b8',
    fontSize: 13,
  },
  noResultsText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },

  // Bottom Info Panel
  bottomPanel: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  panelInitialsText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  panelNameCol: {
    flex: 1,
    paddingRight: 20,
  },
  panelName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  panelId: {
    color: '#94a3b8',
    fontSize: 13,
  },
  panelContent: {
    gap: 12,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  panelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  panelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  panelInfo: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  panelAddressBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
  },
  panelCoords: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  panelAddress: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  panelTime: {
    color: '#64748b',
    fontSize: 11,
  },
  centerBtn: {
    backgroundColor: '#38bdf8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  }
});
