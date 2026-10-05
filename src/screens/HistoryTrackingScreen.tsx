import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, PanResponder, Modal, ActivityIndicator } from 'react-native';
import {
  Map,
  MapStyles,
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Marker,
} from '@sovereignsolutions/ssmap-react-native';

const formatTime = (timestamp: number) => {
  if (!timestamp) return '00:00:00';
  const date = new Date(timestamp * 1000); // Assuming it's in seconds
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
};

const calculateHaversineDistance = (pt1: [number, number], pt2: [number, number]) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(pt2[1] - pt1[1]);
  const dLon = toRad(pt2[0] - pt1[0]);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(pt1[1])) * Math.cos(toRad(pt2[1])) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export const HistoryTrackingScreen = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTrackOn, setIsTrackOn] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const scrubStartProgressRef = useRef(0);
  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    // Simulate network delay for fetching tracking history data.
    setTimeout(() => {
      const mockData = require('../assets/mock-data/tracking-history-sample.json');
      setData(mockData.data[0]);
      setLoading(false);
    }, 1500);
  };


  // Playback is now driven by the VehicleTracker component to avoid 60fps parent re-renders.
  const handleProgressUpdate = useCallback((newProgress: number, isFinished: boolean) => {
    setCurrentIndex(Math.floor(newProgress));
    if (isFinished) {
      if (isLooping) {
        setCurrentIndex(0);
      } else {
        setIsPlaying(false);
      }
    }
  }, [isLooping]);

  const togglePlayback = () => {
    if (currentIndex >= (data?.data?.length || 1) - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsPlaying(false);
      const clickX = evt.nativeEvent.locationX;
      const newPercent = Math.max(0, Math.min(1, clickX / sliderWidth));
      const newIndex = newPercent * ((data?.data?.length || 1) - 1);
      scrubStartProgressRef.current = newIndex;
      setCurrentIndex(Math.floor(newIndex));
    },
    onPanResponderMove: (evt, gestureState) => {
      const deltaPercent = gestureState.dx / sliderWidth;
      const deltaIndex = deltaPercent * ((data?.data?.length || 1) - 1);
      let newIndex = scrubStartProgressRef.current + deltaIndex;
      newIndex = Math.max(0, Math.min((data?.data?.length || 1) - 1, newIndex));
      setCurrentIndex(Math.floor(newIndex));
    },
  }), [sliderWidth, data, isPlaying]);

  const routeBounds = useMemo(() => {
    if (!data?.data?.length) return undefined;
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    data.data.forEach(([lng, lat]: [number, number]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    return [minLng, minLat, maxLng, maxLat] as [number, number, number, number];
  }, [data]);

  const fitRoute = () => {
    if (routeBounds && cameraRef.current) {
      cameraRef.current.fitBounds(routeBounds, {
        padding: { top: 160, bottom: 160, left: 40, right: 40 },
        duration: 800,
      });
    }
  };

  useEffect(() => {
    if (isMapReady) {
      fitRoute();
    }
  }, [routeBounds, isMapReady]);

  useEffect(() => {
    // Only apply the data AFTER the map is ready and 1 frame has passed.
    // This allows GeoJSONSource to mount with empty data, flushing out the dangerous recycled clustered source caused by ClusterLayerSCreen.
    if (isMapReady && data?.data) {
      const timer = setTimeout(() => {
        setRouteGeoJSON({
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates: data.data,
              },
              properties: {},
            },
          ],
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isMapReady, data]);

  const currentMeta = data?.metaData?.[currentIndex];
  const currentTime = data?.times?.[currentIndex];
  const startTime = data?.times?.[0];
  const endTime = data?.times?.[data?.times?.length ? data.times.length - 1 : 0];
  const progressPercent = data?.data?.length ? (currentIndex / (data.data.length - 1)) * 100 : 0;

  // Calculate cumulative distances along the route
  const cumulativeDistances = useMemo(() => {
    if (!data?.data?.length) return [];
    let total = 0;
    const dists = [0];
    for (let i = 1; i < data.data.length; i++) {
      total += calculateHaversineDistance(data.data[i - 1], data.data[i]);
      dists.push(total);
    }
    return dists;
  }, [data]);

  const totalDistance = cumulativeDistances.length > 0 ? cumulativeDistances[cumulativeDistances.length - 1] : 0;
  const currentDistance = cumulativeDistances.length > 0 ? cumulativeDistances[currentIndex] : 0;

  const tripStats = useMemo(() => {
    if (!data?.data || !data?.metaData || !data?.times) return null;
    
    let stopsCount = 0;
    let stopStartTime: number | null = null;
    let isCurrentlyStopped = false;
    let maxSpeed = 0;
    let sumSpeed = 0;
    
    for (let i = 0; i < data.data.length; i++) {
      // Speed is provided in m/s in mock data, convert to km/h
      const speed = (data.metaData[i]?.speed || 0) * 3.6;
      const time = data.times[i];
      
      sumSpeed += speed;
      if (speed > maxSpeed) maxSpeed = speed;
      
      // Stop detection logic: < 2km/h for > 90s
      if (speed < 2) {
        if (stopStartTime === null) {
          stopStartTime = time;
        } else if (!isCurrentlyStopped && (time - stopStartTime > 90)) {
          stopsCount++;
          isCurrentlyStopped = true;
        }
      } else {
        stopStartTime = null;
        isCurrentlyStopped = false;
      }
    }
    
    const avgSpeed = data.data.length > 0 ? (sumSpeed / data.data.length) : 0;
    
    // Total Duration formatting
    const totalSeconds = data.times[data.times.length - 1] - data.times[0];
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const durationStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
    
    return {
      pings: data.data.length,
      maxSpeed,
      avgSpeed,
      durationStr,
      stopsCount
    };
  }, [data]);

  // Camera tracking is now handled inside VehicleTracker to avoid re-renders at 60fps

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        mapStyle={MapStyles.BRIGHT} 
        compass={true}
        compassPosition={{top:105, left:5}}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
      >
        <Camera 
          ref={cameraRef}
          initialViewState={{ center: [77.209, 28.6139], zoom: 12 }} 
        />

        {/* Mount it IMMEDIATELY so it flushes the recycled source, but pass empty FeatureCollection initially */}
        <GeoJSONSource id="route-source-id" data={routeGeoJSON || { type: 'FeatureCollection', features: [] }}>
           {routeGeoJSON && (
             <Layer
                id="route-layer"
                type="line"
                paint={{
                  'line-color': '#334155',
                  'line-width': 5,
                }}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                }}
             />
           )}
        </GeoJSONSource>

        {/* Start Marker */}
        {isMapReady && data?.data?.[0] && (
          <Marker id="startMarker" lngLat={data.data[0]} anchor={'center'}>
            <View style={styles.markerDotContainer}>
              <View style={styles.startDot} />
              <View style={[styles.markerLabelPill, styles.markerStartLabelPill]}>
                <Text style={styles.markerText} numberOfLines={1}>START</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        {isMapReady && data?.data?.length && data.data[data.data.length - 1] && (
          <Marker
            id="endMarker"
            lngLat={data.data[data.data.length - 1]}
            anchor={'center'}
          >
            <View style={styles.markerDotContainer}>
              <View style={styles.endDot} />
              <View style={[styles.markerLabelPill, styles.markerEndLabelPill]}>
                <Text style={styles.markerText} numberOfLines={1}>DEST</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Vehicle Marker */}
        {isMapReady && data?.data?.length > 0 && (
          <VehicleTracker
            data={data.data}
            metaData={data.metaData}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            isTrackOn={isTrackOn}
            cameraRef={cameraRef}
            initialProgress={currentIndex}
            onProgressUpdate={handleProgressUpdate}
          />
        )}
      </Map>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Fetching tracking history...</Text>
        </View>
      )}

      {/* Top Info Card */}
      {!loading && (
      <>
      <View style={styles.topInfoCard}>
        <View style={styles.topInfoHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flex: 1, marginRight: 10 }}>
            <Text style={styles.topInfoTitle}>Route Playback</Text>
            <Text style={[styles.topInfoId, { flexShrink: 1 }]} numberOfLines={1}>
              #{data?.deviceStatus?.session || 'Unknown'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.topInfoIconBtn} 
            onPress={() => setShowInfoModal(true)}
          >
            <Text style={styles.topInfoIconBtnText}>ℹ</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.topInfoStatsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Speed</Text>
            <Text style={[styles.statValue, { color: '#38bdf8' }]}>
              {((currentMeta?.speed || 0) * 3.6).toFixed(1)} km/h
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Heading</Text>
            <Text style={[styles.statValue, { color: '#4ade80' }]}>
              {Math.round(currentMeta?.heading || 0)}°
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Traveled</Text>
            <Text style={[styles.statValue, { color: '#c084fc' }]}>
              {currentDistance.toFixed(2)} / {totalDistance.toFixed(2)} km
            </Text>
          </View>
        </View>
      </View>

      {/* Info Modal */}
      <Modal transparent={true} visible={showInfoModal} animationType="fade">
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalRow}>
               <Text style={styles.infoModalLabel}>Total Distance & Pings:</Text>
               <Text style={styles.infoModalValue}>{totalDistance.toFixed(2)} km • {tripStats?.pings} pts</Text>
            </View>
            <View style={styles.infoModalRow}>
               <Text style={styles.infoModalLabel}>Trip Duration:</Text>
               <Text style={styles.infoModalValue}>{tripStats?.durationStr}</Text>
            </View>
            <View style={styles.infoModalRow}>
               <Text style={styles.infoModalLabel}>Avg / Max Speed:</Text>
               <Text style={styles.infoModalValue}>{tripStats?.avgSpeed.toFixed(1)} / {tripStats?.maxSpeed.toFixed(1)} km/h</Text>
            </View>
            <View style={styles.infoModalRow}>
               <Text style={styles.infoModalLabel}>Departure → Arrival:</Text>
               <Text style={styles.infoModalValue}>{formatTime(data?.times?.[0] || 0)} → {formatTime(data?.times?.[data?.times?.length - 1] || 0)}</Text>
            </View>
            <View style={[styles.infoModalRow, { borderBottomWidth: 0 }]}>
               <Text style={styles.infoModalLabel}>Stoppages (&gt;90s):</Text>
               <Text style={[styles.infoModalValue, { color: '#fbbf24' }]}>{tripStats?.stopsCount} stops detected</Text>
            </View>

            <TouchableOpacity 
               style={styles.infoModalCloseBtn} 
               onPress={() => setShowInfoModal(false)}>
               <Text style={styles.infoModalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Map Action Buttons */}
      <View style={styles.mapControlsRow}>
        <TouchableOpacity style={styles.mapControlButton} onPress={fitRoute}>
          <Text style={styles.mapControlText}>Fit Route</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.mapControlButton, isTrackOn && styles.mapControlButtonActive]} 
          onPress={() => setIsTrackOn(!isTrackOn)}
        >
          <Text style={[styles.mapControlIcon, isTrackOn && styles.mapControlIconActive]}>⌖</Text>
          <Text style={[styles.mapControlText, isTrackOn && styles.mapControlTextActive]}>
            Track: {isTrackOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Playback Bar */}
      <View style={styles.playbackContainer}>
        {/* Progress Timeline */}
        <View style={styles.timelineRow}>
          <Text style={styles.timeText}>{formatTime(startTime)}</Text>
          <View 
            style={styles.scrubTouchableArea}
            onLayout={(e) => setSliderWidth(Math.max(1, e.nativeEvent.layout.width))}
            {...panResponder.panHandlers}
          >
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} pointerEvents="none" />
              {/* Simple scrubber knob */}
              <View style={[styles.scrubberKnob, { left: `${progressPercent}%` }]} pointerEvents="none" />
            </View>
          </View>
          <Text style={styles.timeText}>{formatTime(endTime)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <View style={styles.playbackButtonsGroup}>
            <TouchableOpacity onPress={() => { setCurrentIndex(0); setIsPlaying(false); }} style={styles.secondaryPlayBtn}>
              <Text style={styles.secondaryPlayBtnText}>↺</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setCurrentIndex(prev => Math.max(0, prev - 50))} style={styles.secondaryPlayBtn}>
              <Text style={styles.secondaryPlayBtnText}>⏪︎</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
              <Text style={[styles.playButtonText, !isPlaying && { marginLeft: 3 }]}>{isPlaying ? '❚❚' : '▷'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCurrentIndex(prev => Math.min((data?.data?.length || 1) - 1, prev + 50))} style={styles.secondaryPlayBtn}>
              <Text style={styles.secondaryPlayBtnText}>⏩︎</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsLooping(!isLooping)} 
              style={[styles.loopBtn, isLooping && styles.loopBtnActive]}
            >
              <Text style={[styles.loopBtnText, isLooping && styles.loopBtnTextActive]}>Loop</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.currentTimeDisplay}>
            {formatTime(currentTime)} • <Text style={{ color: '#38bdf8' }}>{progressPercent.toFixed(1)}%</Text>
          </Text>
        </View>

        {/* Speed Controls (New Line) */}
        <View style={styles.speedControlsRow}>
          {[1, 2, 5, 10, 25, 50].map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[styles.speedButton, playbackSpeed === speed && styles.speedButtonActive]}
              onPress={() => setPlaybackSpeed(speed)}
            >
              <Text
                style={[styles.speedButtonText, playbackSpeed === speed && styles.speedButtonTextActive]}
              >
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </>
      )}
    </View>
  );
};

const VehicleTracker = ({ data, metaData, isPlaying, playbackSpeed, isTrackOn, cameraRef, initialProgress, onProgressUpdate }: any) => {
  const [progress, setProgress] = useState(initialProgress);
  const progressRef = useRef(initialProgress);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const lastUiUpdateRef = useRef<number>(0);
  const lastCameraUpdateRef = useRef<number>(0);

  // Sync initial progress when user scrubs or when a jump/loop occurs
  useEffect(() => {
    if (!isPlaying || Math.abs(progressRef.current - initialProgress) > 2) {
      setProgress(initialProgress);
      progressRef.current = initialProgress;
    }
  }, [initialProgress, isPlaying]);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        const deltaProgress = (deltaTime / 1000) * playbackSpeed;
        
        let next = progressRef.current + deltaProgress;
        let isFinished = false;

        if (next >= data.length - 1) {
          next = data.length - 1;
          isFinished = true;
        }

        setProgress(next);
        progressRef.current = next;

        if (isFinished) {
          onProgressUpdate(next, true);
        } else if (time - lastUiUpdateRef.current > 300) {
          onProgressUpdate(next, false);
          lastUiUpdateRef.current = time;
        }

        if (isTrackOn && cameraRef.current && (time - lastCameraUpdateRef.current > 33)) {
          const tempCurrIdx = Math.floor(next);
          const tempNextIdx = Math.min(tempCurrIdx + 1, data.length - 1);
          const tempFrac = next - tempCurrIdx;
          const t1 = data[tempCurrIdx];
          const t2 = data[tempNextIdx];
          if (t1 && t2) {
            const trackingCoord = [
              t1[0] + (t2[0] - t1[0]) * tempFrac,
              t1[1] + (t2[1] - t1[1]) * tempFrac,
            ];
            cameraRef.current.jumpTo({ center: trackingCoord as [number, number] });
          }
          lastCameraUpdateRef.current = time;
        }
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying && data?.length) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, data, onProgressUpdate, isTrackOn]);

  const currentIndex = Math.floor(progress);
  const nextIndex = Math.min(currentIndex + 1, data.length - 1);
  const fraction = progress - currentIndex;
  
  const pt1 = data[currentIndex];
  const pt2 = data[nextIndex];
  const currentMeta = metaData?.[currentIndex];
  
  const currentCoordinate = (pt1 && pt2) ? [
    pt1[0] + (pt2[0] - pt1[0]) * fraction,
    pt1[1] + (pt2[1] - pt1[1]) * fraction,
  ] as [number, number] : pt1;

  useEffect(() => {
    if (!isPlaying && isTrackOn && currentCoordinate && cameraRef.current) {
      cameraRef.current.jumpTo({ center: currentCoordinate });
    }
  }, [currentCoordinate, isTrackOn, isPlaying, cameraRef]);

  if (!currentCoordinate) return null;

  return (
    <Marker id="vehicleMarker" lngLat={currentCoordinate} anchor="center">
      <View style={styles.vehicleWrapper}>
        <View style={[styles.vehicleIcon, { transform: [{ rotate: `${currentMeta?.heading || 0}deg` }] }]}>
          <View style={styles.arrowUp} />
        </View>
        <View style={styles.vehicleSpeedBadge}>
          <Text style={styles.vehicleSpeedText} numberOfLines={1}>{((currentMeta?.speed || 0) * 3.6).toFixed(1)} km/h</Text>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Loading Overlay
  loadingOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#38bdf8',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },

  // Top Info Card
  topInfoCard: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  topInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  topInfoTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginRight: 8 },
  topInfoId: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  topInfoStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1 },
  statLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  // Info Modal Button
  topInfoIconBtn: {
    backgroundColor: '#1e293b',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  topInfoIconBtnText: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },

  // Info Modal
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalCard: {
    backgroundColor: '#0f172a',
    width: '90%',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  infoModalLabel: { color: '#94a3b8', fontSize: 12 },
  infoModalValue: { color: '#f8fafc', fontSize: 12, fontWeight: '600' },
  infoModalCloseBtn: {
    marginTop: 15,
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoModalCloseBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },

  // Markers
  markerText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  markerDotContainer: { alignItems: 'center', justifyContent: 'center', width: 24, height: 24, overflow: 'visible' },
  startDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#ffffff' },
  endDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#f43f5e', borderWidth: 2, borderColor: '#ffffff' },
  
  markerLabelPill: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#020617',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center'
  },
  markerStartLabelPill: { borderColor: '#059669' },
  markerEndLabelPill: { borderColor: '#e11d48' },

  vehicleWrapper: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, overflow: 'visible' },
  vehicleSpeedBadge: { position: 'absolute', top: -36, backgroundColor: '#020617', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#38bdf8', minWidth: 90, alignItems: 'center' },
  vehicleSpeedText: { color: '#38bdf8', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  vehicleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#020617', borderWidth: 3, borderColor: '#38bdf8', alignItems: 'center', justifyContent: 'center' },
  arrowUp: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#ffffff', transform: [{ translateY: -2 }] },

  // Bottom Playback Bar
  playbackContainer: {
    position: 'absolute',
    bottom: 16,
    left: 5,
    right: 5,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  timeText: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  scrubTouchableArea: { flex: 1, height: 40, justifyContent: 'center', marginHorizontal: 12, backgroundColor: 'transparent' },
  progressBarTrack: { width: '100%', height: 6, backgroundColor: '#334155', borderRadius: 3, position: 'relative' },
  progressBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#e2e8f0', borderRadius: 3 },
  scrubberKnob: { position: 'absolute', top: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#e2e8f0', borderWidth: 2, borderColor: '#0f172a', marginLeft: -8 },

  controlsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  playbackButtonsGroup: { flexDirection: 'row', alignItems: 'center' },
  secondaryPlayBtn: { width: 24, height: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  secondaryPlayBtnText: { color: '#94a3b8', fontSize: 16 },
  playButton: { width: 32, height: 32, borderRadius: 20, backgroundColor: '#38bdf8', alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  playButtonText: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  loopBtn: { marginLeft: 2, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6, backgroundColor: '#1e293b' },
  loopBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  loopBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  loopBtnTextActive: { color: '#38bdf8' },
  currentTimeDisplay: { color: '#ffffff', fontSize: 13, fontWeight: '600', marginLeft: 16 },

  speedControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speedButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, backgroundColor: '#1e293b' },
  speedButtonActive: { backgroundColor: '#0369a1' },
  speedButtonText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  speedButtonTextActive: { color: '#ffffff' },

  // Map Controls
  mapControlsRow: { position: 'absolute', bottom: 155, right: 10, flexDirection: 'row', gap: 8 },
  mapControlButton: { flexDirection: 'row', backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  mapControlButtonActive: { backgroundColor: '#bae6fd', borderColor: '#38bdf8' },
  mapControlIcon: { color: '#38bdf8', fontSize: 16, marginRight: 6, fontWeight: '900' },
  mapControlIconActive: { color: '#0ea5e9' },
  mapControlText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  mapControlTextActive: { color: '#0ea5e9' },
});
