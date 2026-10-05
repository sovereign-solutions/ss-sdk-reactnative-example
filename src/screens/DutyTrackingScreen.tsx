import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDeviceHealth, getTrackingState, initAndStartTracking, stopTracking } from '../TrackingSdk';

type DutyTrackingScreenProps = {
  username: string;
  onChangeUser: () => void;
  onExploreMaps: () => void;
};

export function DutyTrackingScreen({ username, onChangeUser, onExploreMaps }: DutyTrackingScreenProps) {
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const [statusText, setStatusText] = useState('Tracking OFF');

  const [loading, setLoading] = useState(false);

  /**
   * Your selected/default distance filter.
   *
   * Later you can replace this with:
   * - value received from server
   * - dropdown
   * - modal
   * - user preference
   */
  // Android receives this parameter. The current iOS SDK uses its own
  // configured distance filter until the native iOS API exposes it.
  const distanceFilter = 50;

  // INITIAL TRACKING STATE

  useEffect(() => {
    loadTrackingState();
  }, []);

  const loadTrackingState = async () => {
    try {
      const enabled = await getTrackingState();

      setTrackingEnabled(Boolean(enabled));

      setStatusText(enabled ? 'Tracking ON' : 'Tracking OFF');
    } catch (error) {
      console.log('loadTrackingState:', error);

      setTrackingEnabled(false);

      setStatusText('Tracking OFF');
    }
  };

  // DEVICE HEALTH

  const showDeviceHealth = async (): Promise<boolean> => {
    /*
     * DeviceHealthUtils currently comes from
     * the Android native bridge.
     *
     * For iOS simply continue.
     */
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const health = await getDeviceHealth();

      if (!health) {
        Alert.alert('Device Health', 'Unable to read device health.');

        return false;
      }

      const message =
        `Location Permission : ${health.locationPermissionOff ? '❌ OFF' : '✅ ON'}\n\n` +
        `Precise Location : ${health.preciseLocationOff ? '❌ OFF' : '✅ ON'}\n\n` +
        `Background Location : ${health.backgroundLocationPermissionOff ? '❌ OFF' : '✅ ON'}\n\n` +
        `Location Services / GPS : ${health.locationServiceOff ? '❌ OFF' : '✅ ON'}\n\n` +
        `Battery Optimization : ${health.batteryOptimizationEnabled ? '⚠️ ENABLED' : '✅ DISABLED'}\n\n` +
        `Motion Activity : ${health.motionActivityDisabled ? '❌ OFF' : '✅ ON'}\n\n` +
        `Auto Start Management : ${health.autoStartManagementAvailable ? 'AVAILABLE' : 'NOT APPLICABLE'}`;

      return new Promise(resolve => {
        Alert.alert(
          'Device Health',
          message,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Continue',
              onPress: () => resolve(true),
            },
          ],
          {
            cancelable: false,
          },
        );
      });
    } catch (error: any) {
      Alert.alert('Device Health Error', String(error?.message ?? error));

      return false;
    }
  };

  // BACKGROUND LOCATION DISCLOSURE

  const showBackgroundLocationDisclosure = (): Promise<boolean> => {
    return new Promise(resolve => {
      Alert.alert(
        'Background Location Access',

        'Sovereign SDK collects location data to enable live tracking, route monitoring and duty/session updates even when the app is closed or not in use.\n\n' +
          'Location tracking starts only after you agree and grant the required permissions.\n\n' +
          'You can stop tracking at any time by turning Duty Tracking OFF.',

        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },

          {
            text: 'Agree',
            onPress: () => resolve(true),
          },
        ],

        {
          cancelable: false,
        },
      );
    });
  };

  // OPEN SETTINGS

  const showOpenSettingsAlert = (): Promise<boolean> => {
    return new Promise(resolve => {
      Alert.alert(
        'Background Location Required',

        'Please enable location permission as "Allow all the time" in App Settings for background tracking.',

        [
          {
            text: 'Cancel',

            style: 'cancel',

            onPress: () => resolve(false),
          },

          {
            text: 'Open Settings',

            onPress: async () => {
              try {
                await Linking.openSettings();
              } catch (error) {
                console.log('openSettings:', error);
              }

              resolve(false);
            },
          },
        ],

        {
          cancelable: false,
        },
      );
    });
  };

  // ANDROID PERMISSIONS

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const apiLevel = Number(Platform.Version);

    try {
      // Android 13+: notifications are useful for tracking status, but
      // denial alone does not necessarily prevent a foreground service.
      if (apiLevel >= 33) {
        const notificationPermission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        const alreadyGranted = await PermissionsAndroid.check(notificationPermission);
        if (!alreadyGranted) {
          const result = await PermissionsAndroid.request(notificationPermission);
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Notifications disabled',
              'You may not see tracking notifications. Location permission is still required.',
            );
          }
        }
      }

      const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      const coarsePermission = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
      let fineGranted = await PermissionsAndroid.check(finePermission);
      let coarseGranted = await PermissionsAndroid.check(coarsePermission);

      if (!fineGranted && !coarseGranted) {
        const results = await PermissionsAndroid.requestMultiple([finePermission, coarsePermission]);
        fineGranted = results[finePermission] === PermissionsAndroid.RESULTS.GRANTED;
        coarseGranted = results[coarsePermission] === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (!fineGranted && !coarseGranted) {
        Alert.alert('Location required', 'Allow location access to start duty tracking.');
        return false;
      }

      // Android 10+: request motion permission when supported.
      // The tracking SDK decides whether this is essential for its operation.
      if (apiLevel >= 29) {
        const activityPermission = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
        if (!(await PermissionsAndroid.check(activityPermission))) {
          const result = await PermissionsAndroid.request(activityPermission);
          console.log('Activity recognition permission:', result);
        }
      }

      // Android 10: background location may be requested at runtime.
      // Android 11+: users must enable "Allow all the time" in app settings.
      if (apiLevel >= 29) {
        const backgroundPermission = PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;
        let backgroundGranted = await PermissionsAndroid.check(backgroundPermission);

        if (!backgroundGranted && apiLevel === 29) {
          const result = await PermissionsAndroid.request(backgroundPermission);
          backgroundGranted = result === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (!backgroundGranted) {
          await showOpenSettingsAlert();
          return false;
        }
      }

      return true;
    } catch (error: any) {
      console.log('Android permission error:', error);
      Alert.alert('Permission Error', String(error?.message ?? error));
      return false;
    }
  };

  // CROSS PLATFORM PERMISSIONS

  const requestTrackingPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      return requestAndroidPermissions();
    }

    if (Platform.OS === 'ios') {
      /*
       * Your iOS Tracking SDK handles
       * Location + Motion permissions.
       */
      return true;
    }

    return false;
  };

  // START TRACKING

  const startTrackingFlow = async () => {
    if (!username.trim()) {
      Alert.alert('Username Required', 'Username is required to start tracking.');

      setTrackingEnabled(false);

      return;
    }

    try {
      setLoading(true);

      // STEP 1 - DEVICE HEALTH

      setStatusText('Checking device health...');

      const healthConfirmed = await showDeviceHealth();

      if (!healthConfirmed) {
        setTrackingEnabled(false);

        setStatusText('Tracking OFF');

        return;
      }

      // STEP 2 - BACKGROUND LOCATION DISCLOSURE

      setStatusText('Waiting for consent...');

      const consent = await showBackgroundLocationDisclosure();

      if (!consent) {
        setTrackingEnabled(false);

        setStatusText('Tracking OFF');

        return;
      }

      // STEP 3 - PERMISSIONS

      setStatusText('Requesting permissions...');

      const permissionGranted = await requestTrackingPermissions();

      if (!permissionGranted) {
        setTrackingEnabled(false);

        setStatusText('Tracking OFF');

        return;
      }

      // STEP 4 - SDK INIT + START

      setStatusText('Initializing tracking SDK...');

      /*
       * false:
       * SDK performs token generation
       * and registration.
       */
      const skipLoginAndRegistration = false;

      const callerAccessToken: string | null = null;

      const result = await initAndStartTracking(
        username.trim(),
        skipLoginAndRegistration,
        callerAccessToken,
        distanceFilter,
      );

      console.log('initAndStartTracking:', result);

      setTrackingEnabled(true);

      setStatusText('Tracking ON');

      Alert.alert('Tracking Started', `Duty tracking started for ${username}.`);
    } catch (error: any) {
      console.log('startTracking error:', error);

      setTrackingEnabled(false);

      setStatusText('Tracking OFF');

      Alert.alert('Tracking Error', String(error?.message ?? error));
    } finally {
      setLoading(false);
    }
  };

  // STOP TRACKING

  const stopTrackingFlow = async () => {
    try {
      setLoading(true);

      setStatusText('Stopping tracking...');

      await stopTracking();

      setTrackingEnabled(false);

      setStatusText('Tracking OFF');

      Alert.alert('Tracking Stopped', 'Duty tracking has been stopped.');
    } catch (error: any) {
      console.log('stopTracking error:', error);

      const actualState = await getTrackingState();

      setTrackingEnabled(Boolean(actualState));

      setStatusText(actualState ? 'Tracking ON' : 'Tracking OFF');

      Alert.alert('Stop Tracking Error', String(error?.message ?? error));
    } finally {
      setLoading(false);
    }
  };

  // TOGGLE

  const onToggleTracking = (value: boolean) => {
    if (loading) {
      return;
    }

    // TURN ON

    if (value) {
      /*
       * Don't turn the visual switch ON until
       * initialization actually succeeds.
       */

      setTrackingEnabled(false);

      startTrackingFlow();

      return;
    }

    // TURN OFF

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

          onPress: stopTrackingFlow,
        },
      ],
      {
        cancelable: false,
      },
    );
  };

  // CHANGE USER

  const handleChangeUser = () => {
    if (trackingEnabled) {
      Alert.alert('Tracking Active', 'Please turn Duty Tracking OFF before changing the user.');

      return;
    }

    onChangeUser();
  };

  // UI

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}

      <View style={styles.header}>
        <Image
          source={require('../assets/img-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Sovereign Solutions logo"
        />

        <Text style={styles.title}>Sovereign Tracking</Text>

        <Text style={styles.subtitle}>Login, manage duty tracking, and experience Sovereign SDK.</Text>

        <Text
          style={
            styles.platform
          }>
          Platform:{' '}
          {Platform.OS === 'ios'
            ? 'iOS'
            : 'Android'}
        </Text>
      </View>

      {/* TRACKING CARD */}

      <View style={styles.card}>
        {/* USER */}

        <View style={styles.userCard}>
          <View>
            <Text style={styles.userLabel}>Logged in as</Text>

            <Text style={styles.userName}>{username}</Text>
          </View>

          <TouchableOpacity
            disabled={loading || trackingEnabled}
            style={[styles.changeButton, (loading || trackingEnabled) && styles.disabled]}
            onPress={handleChangeUser}
          >
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* SWITCH */}

        <View style={styles.switchCard}>
          <View style={styles.switchContent}>
            <Text style={styles.switchTitle}>Duty Tracking</Text>

            <Text style={styles.switchSubtitle}>Tap switch to start or stop tracking</Text>
          </View>

          <Switch
            value={trackingEnabled}
            disabled={loading}
            onValueChange={onToggleTracking}
            thumbColor="#ffffff"
            trackColor={{
              false: '#d1d5db',
              true: '#16a34a',
            }}
          />
        </View>

        {/* STATUS */}

        <View style={styles.statusBox}>
          {loading ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={[styles.statusDot, trackingEnabled ? styles.statusDotOn : styles.statusDotOff]} />
          )}

          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <Text style={styles.note}>
          Turning ON duty will check device health, show the background location disclosure, request the required
          permissions, then initialize and start the tracking SDK.
        </Text>

        {/* EXPLORE MAP */}

        <TouchableOpacity activeOpacity={0.85} style={styles.exploreButton} onPress={onExploreMaps}>
          <Text style={styles.exploreButtonText}>Explore Map</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// STYLES

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logo: {
    width: 220,
    height: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    textAlign: 'center',
  },
  platform: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: '#078b7d',
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
  userCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLabel: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
  },
  userName: {
    marginTop: 5,
    fontSize: 18,
    color: '#064e3b',
    fontWeight: '800',
  },
  changeButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  changeText: {
    color: '#078b7d',
    fontWeight: '800',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
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
  switchContent: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  switchSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBox: {
    marginTop: 18,
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
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
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  note: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#6b7280',
  },
  exploreButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#078b7d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
