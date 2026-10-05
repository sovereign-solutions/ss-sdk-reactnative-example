import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { SSMap } from "@sovereignsolutions/ssmap-react-native";
import { HomeScreen, SCREENS } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DutyTrackingScreen } from './src/screens/DutyTrackingScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { MapSnapshotScreen } from './src/screens/MapSnapshotScreen';
import { LiveTrackingScreen } from './src/screens/LiveTrackingScreen';
import { HistoryTrackingScreen } from './src/screens/HistoryTrackingScreen';
import { ShowMapScreen } from './src/screens/ShowMapScreen';
import { DrawPointScreen } from './src/screens/DrawPointScreen';
import { DrawLineScreen } from './src/screens/DrawLineScreen';
import { DrawPolygonScreen } from './src/screens/DrawPolygonScreen';
import { WhatHereScreen } from './src/screens/WhatHereScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { RouteScreen } from './src/screens/RouteScreen';
import { ClusterLayerScreen } from './src/screens/ClusterLayerScreen';
import { WeatherLocationScreen } from './src/screens/WeatherLocationScreen';
import { WeatherCityForecastScreen } from './src/screens/WeatherCityForecastScreen';
import { WeatherStatewiseRainfallScreen } from './src/screens/WeatherStatewiseRainfallScreen';
import { getSavedTrackingStatus } from './src/TrackingSdk';

// MAP API KEY

SSMap.setAPIKey("YOUR_API_KEY");

type HomeReturnScreen = 'Login' | 'DutyTracking' | null;

// APP

export default function App() {
  /*
   * First screen shown when app launches.
   */
  const [currentScreen, setCurrentScreen] = useState('Login');

  /*
   * Save logged-in username for DutyTrackingScreen
   * and Tracking SDK.
   */
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);

  const [restoringSession, setRestoringSession] = useState(true);

  const [homeReturnScreen, setHomeReturnScreen] = useState<HomeReturnScreen>(null);

  // RESTORE ACTIVE DUTY TRACKING

  useEffect(() => {
    let mounted = true;

    const restoreActiveTracking = async () => {
      try {
        const savedStatus = await getSavedTrackingStatus();

        const savedUsername = savedStatus.username?.trim() ?? '';

        if (mounted && savedStatus.enabled && savedUsername) {
          setLoggedInUsername(savedUsername);

          setCurrentScreen('DutyTracking');
        }
      } catch (error) {
        console.log('restoreActiveTracking:', error);
      } finally {
        if (mounted) {
          setRestoringSession(false);
        }
      }
    };

    restoreActiveTracking();

    return () => {
      mounted = false;
    };
  }, []);

  // LOGIN

  const handleLogin = (username: string) => {
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      return;
    }

    console.log('Login clicked:', cleanUsername);

    /*
     * Later you can call your login API here.
     *
     * For now:
     * username is treated as logged in.
     */

    setLoggedInUsername(cleanUsername);

    setHomeReturnScreen(null);

    /*
     * After Sign In, open DutyTrackingScreen.
     */
    setCurrentScreen('DutyTracking');
  };

  // EXPLORE MAP

  const handleExploreMaps = () => {
    /*
     * No login required.
     *
     * Goes to existing HomeScreen.
     */

    setHomeReturnScreen('Login');
    setCurrentScreen('Home');
  };

  const handleDutyExploreMaps = () => {
    setHomeReturnScreen('DutyTracking');
    setCurrentScreen('Home');
  };

  const handleBackFromHome = () => {
    if (!homeReturnScreen) {
      return;
    }

    const returnScreen = homeReturnScreen;

    setHomeReturnScreen(null);
    setCurrentScreen(returnScreen);
  };

  // CHANGE USER

  const handleChangeUser = () => {
    setHomeReturnScreen(null);

    setLoggedInUsername(null);

    setCurrentScreen('Login');
  };

  // TITLE

  const currentTitle = SCREENS.find(screen => screen.id === currentScreen)?.title ?? currentScreen;

  // RENDER SCREEN

  const renderScreen = () => {
    if (restoringSession) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0878ff" />
        </View>
      );
    }

    switch (currentScreen) {
      // LOGIN

      case 'Login':
        return <LoginScreen onExploreMaps={handleExploreMaps} onLogin={handleLogin} />;

      // DUTY TRACKING

      case 'DutyTracking':
        return (
          <DutyTrackingScreen
            username={loggedInUsername ?? ''}
            onChangeUser={handleChangeUser}
            onExploreMaps={handleDutyExploreMaps}
          />
        );

      // TRACKING

      case 'Tracking': return <TrackingScreen />;
      case 'MapSnapshot': return <MapSnapshotScreen />;
      case 'LiveTracking': return <LiveTrackingScreen />;
      case 'HistoryTracking': return <HistoryTrackingScreen />;
      case 'ShowMap': return <ShowMapScreen />;

      case 'DrawPoint': return <DrawPointScreen />;

      case 'DrawLine': return <DrawLineScreen />;

      case 'DrawPolygon': return <DrawPolygonScreen />;

      case 'WhatHere': return <WhatHereScreen />;

      case 'Search': return <SearchScreen />;

      case 'Route': return <RouteScreen />;

      case 'ClusterLayer': return <ClusterLayerScreen />;

      case 'WeatherLocation': return <WeatherLocationScreen />;

      case 'WeatherCityForecast': return <WeatherCityForecastScreen />;

      case 'WeatherStatewiseRainfall': return <WeatherStatewiseRainfallScreen />;

      // HOME

      default:
        return (
          <HomeScreen
            onNavigate={setCurrentScreen}
            onBack={homeReturnScreen ? handleBackFromHome : undefined}
            backLabel={homeReturnScreen === 'DutyTracking' ? 'Back to Duty Tracking' : 'Back to Login'}
          />
        );
    }
  };

  // UI

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page}>
        {/*
          Don't show header on:
          - Login
          - Home
          - DutyTracking

          DutyTrackingScreen has its own UI/header.
        */}

        {currentScreen !== 'Home' && currentScreen !== 'Login' && currentScreen !== 'DutyTracking' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backButton}>
              <Text style={styles.backButtonText}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{currentTitle}</Text>
          </View>
        )}

        <View style={styles.container}>{renderScreen()}</View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// STYLES

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  backButton: {
    paddingRight: 15,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
