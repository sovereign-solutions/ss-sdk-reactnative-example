import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import {
  getSavedTrackingStatus,
  getTrackingState,
  initAndStartTracking,
  stopTracking,
  openNativeMapScreen,
} from './src/TrackingSdk';

function App() {
  const scrollRef = useRef<ScrollView>(null);

  const [username, setUsername] = useState('');
  const [loggedInUsername, setLoggedInUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [statusText, setStatusText] = useState('Tracking OFF');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    restoreTrackingState();
  }, []);

  const restoreTrackingState = async () => {
    try {
      const saved = await getSavedTrackingStatus();

      if (saved?.username) {
        setUsername(saved.username);
        setLoggedInUsername(saved.username);

        /**
         * NAVIGATION POINT 1:
         * If saved username exists, show tracking/map screen directly.
         */
        setIsLoggedIn(true);
      }

      const isTracking = await getTrackingState();

      setTrackingEnabled(Boolean(isTracking));
      setStatusText(isTracking ? 'Tracking ON' : 'Tracking OFF');
    } catch (error) {
      console.log('restoreTrackingState error:', error);
      setTrackingEnabled(false);
      setStatusText('Tracking OFF');
    }
  };

  const onLogin = () => {
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      Alert.alert('Username Required', 'Please enter username to continue.');
      return;
    }

    Keyboard.dismiss();

    setLoggedInUsername(cleanUsername);

    /**
     * NAVIGATION POINT 2:
     * This changes the screen from Login UI to Tracking/Map UI.
     * No react-navigation is used here.
     * We are conditionally rendering based on isLoggedIn.
     */
    setIsLoggedIn(true);

    setStatusText(trackingEnabled ? 'Tracking ON' : 'Tracking OFF');
  };

  const onLogout = async () => {
    if (trackingEnabled) {
      Alert.alert(
        'Tracking Active',
        'Please stop tracking before changing the username.',
      );
      return;
    }

    /**
     * NAVIGATION POINT 3:
     * This changes the screen from Tracking/Map UI back to Login UI.
     */
    setIsLoggedIn(false);

    setLoggedInUsername('');
    setUsername('');
    setStatusText('Tracking OFF');
  };

  const openMapScreen = async () => {
    try {
      /**
       * NATIVE NAVIGATION POINT:
       * This calls Android native module method.
       * React Native button -> openNativeMapScreen()
       * -> TrackingSdk native module
       * -> Android starts MapSDK Activity.
       */
      await openNativeMapScreen();
    } catch (error: any) {
      console.log('open map error:', error);
      Alert.alert('Map Error', String(error?.message || error));
    }
  };

  const requestAndroidPermissions = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Number(Platform.Version) >= 33) {
        const notificationResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (notificationResult !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Required',
            'Notification permission is required for tracking.',
          );
          return false;
        }
      }

      const locationResult = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineGranted =
        locationResult[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const coarseGranted =
        locationResult[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      if (!fineGranted && !coarseGranted) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to start tracking.',
        );
        return false;
      }

      if (Number(Platform.Version) >= 29) {
        const activityResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        );

        console.log('ACTIVITY_RECOGNITION result:', activityResult);
      }

      if (Number(Platform.Version) >= 29) {
        const backgroundResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        );

        console.log('ACCESS_BACKGROUND_LOCATION result:', backgroundResult);

        if (backgroundResult !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Background Location Required',
            'For background tracking, please enable "Allow all the time" in App Settings.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ],
          );
        }
      }

      return true;
    } catch (error) {
      console.log('Permission error:', error);
      Alert.alert('Permission Error', String(error));
      return false;
    }
  };

  const startTrackingFlow = async () => {
    const cleanUsername = loggedInUsername.trim();

    if (!cleanUsername) {
      Alert.alert('Username Required', 'Please login before starting tracking.');
      setTrackingEnabled(false);
      return;
    }

    try {
      setLoading(true);
      setStatusText('Requesting permissions...');

      const hasPermission = await requestAndroidPermissions();

      if (!hasPermission) {
        setTrackingEnabled(false);
        setStatusText('Tracking OFF');
        return;
      }

      setStatusText('Initializing SDK...');

      const result = await initAndStartTracking(cleanUsername);

      setTrackingEnabled(true);
      setStatusText(String(result || 'Tracking ON'));
      Alert.alert('Success', 'Tracking started.');
    } catch (error: any) {
      console.log('start tracking error:', error);

      setTrackingEnabled(false);
      setStatusText('Tracking start failed');

      Alert.alert('Tracking Error', String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const stopTrackingFlow = async () => {
    try {
      setLoading(true);
      setStatusText('Stopping tracking...');

      const result = await stopTracking();

      setTrackingEnabled(false);
      setStatusText(String(result || 'Tracking OFF'));
      Alert.alert('Success', 'Tracking stopped.');
    } catch (error: any) {
      console.log('stop tracking error:', error);

      setTrackingEnabled(false);
      setStatusText('Tracking stop failed');

      Alert.alert('Stop Error', String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const onToggleTracking = (value: boolean) => {
    if (loading) {
      return;
    }

    if (!isLoggedIn || !loggedInUsername.trim()) {
      Alert.alert('Login Required', 'Please login with username first.');
      setTrackingEnabled(false);
      return;
    }

    if (value) {
      Alert.alert(
        'Start Tracking',
        `Do you want to start duty tracking for ${loggedInUsername}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setTrackingEnabled(false),
          },
          {
            text: 'Start',
            onPress: () => {
              setTrackingEnabled(true);
              startTrackingFlow();
            },
          },
        ],
      );

      return;
    }

    Alert.alert(
      'Stop Tracking',
      'Do you want to stop duty tracking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setTrackingEnabled(true),
        },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            setTrackingEnabled(false);
            stopTrackingFlow();
          },
        },
      ],
    );
  };

  const isTrackingOn = trackingEnabled;

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.container,
            !isLoggedIn && styles.loginContainer,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>SS</Text>
            </View>

            <Text style={styles.title}>Sovereign SDK Demo</Text>
            <Text style={styles.subtitle}>
              Login, manage duty tracking, and feel sovereign map experience.
            </Text>
          </View>

          {!isLoggedIn ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Login</Text>
              <Text style={styles.sectionSubtitle}>
                Enter username to continue
              </Text>

              <Text style={styles.label}>Username</Text>

              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onLogin}
                blurOnSubmit
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({
                      y: 80,
                      animated: true,
                    });
                  }, 250);
                }}
                style={styles.input}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.loginButton}
                onPress={onLogin}>
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.userCard}>
                <View>
                  <Text style={styles.userLabel}>Logged in as</Text>
                  <Text style={styles.userName}>{loggedInUsername}</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.changeUserButton,
                    (loading || trackingEnabled) && styles.disabledButton,
                  ]}
                  onPress={onLogout}
                  disabled={loading || trackingEnabled}>
                  <Text style={styles.changeUserText}>Change</Text>
                </TouchableOpacity>
              </View>


              <View style={styles.switchCard}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchText}>Duty Tracking</Text>
                  <Text style={styles.switchSubText}>
                    Tap switch to start or stop tracking
                  </Text>
                </View>

                <Switch
                  value={trackingEnabled}
                  disabled={loading}
                  onValueChange={onToggleTracking}
                  thumbColor={trackingEnabled ? '#ffffff' : '#f4f4f5'}
                  trackColor={{
                    false: '#d1d5db',
                    true: '#16a34a',
                  }}
                />
              </View>

              <View style={styles.statusBox}>
                {loading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <View
                    style={[
                      styles.statusDot,
                      isTrackingOn ? styles.statusDotOn : styles.statusDotOff,
                    ]}
                  />
                )}

                <Text style={styles.status}>{statusText}</Text>
              </View>

              <Text style={styles.note}>
                Turning ON duty will ask permissions first, then initialize and
                start the tracking SDK.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.mapButton}
                onPress={openMapScreen}>
                <Text style={styles.mapButtonText}>Explore Map</Text>
              </TouchableOpacity>

              
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 60,
  },
  loginContainer: {
    justifyContent: 'flex-start',
    paddingTop: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 22,
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: '#111827',
    fontSize: 15,
  },
  loginButton: {
    marginTop: 22,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  userCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLabel: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  userName: {
    marginTop: 4,
    fontSize: 17,
    color: '#064e3b',
    fontWeight: '800',
  },
  changeUserButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  disabledButton: {
    opacity: 0.5,
  },
  changeUserText: {
    color: '#0f766e',
    fontWeight: '800',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeOn: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeOff: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadgeTextOn: {
    color: '#15803d',
  },
  statusBadgeTextOff: {
    color: '#b91c1c',
  },
  switchCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  switchText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  switchSubText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBox: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusDotOn: {
    backgroundColor: '#16a34a',
  },
  statusDotOff: {
    backgroundColor: '#ef4444',
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  note: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: '#6b7280',
  },
  mapButton: {
    marginTop: 22,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  refreshButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default App;