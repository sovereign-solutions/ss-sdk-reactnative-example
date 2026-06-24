import {NativeModules, Platform} from 'react-native';


const {TrackingSdk} = NativeModules;
const {MapSdk} = NativeModules;

const BASE_URL = 'https://api-gw.sovereignsolutions.com/';
const API_KEY = 'YOUR_API_KEY';
const CLIENT_ID = 'UUMCGD';

export type SavedTrackingStatus = {
  enabled: boolean;
  username?: string;
};

function assertAndroid() {
  if (Platform.OS !== 'android') {
    throw new Error('Tracking SDK is currently available only on Android.');
  }

  if (!TrackingSdk) {
    throw new Error(
      'TrackingSdk native module not found. Please check TrackingSdkPackage registration.',
    );
  }
}

export async function initAndStartTracking(username: string): Promise<string> {
  assertAndroid();

  return TrackingSdk.initAndStartTracking(
    BASE_URL,
    API_KEY,
    username,
    CLIENT_ID,
  );
}

export async function stopTracking(): Promise<string> {
  assertAndroid();

  return TrackingSdk.stopTracking();
}

export async function getTrackingState(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TrackingSdk) {
    return false;
  }

  return TrackingSdk.getTrackingState();
}

export async function getSavedTrackingStatus(): Promise<SavedTrackingStatus> {
  if (Platform.OS !== 'android' || !TrackingSdk) {
    return {
      enabled: false,
      username: '',
    };
  }

  return TrackingSdk.getSavedTrackingStatus();
}

export async function openNativeMapScreen(): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('Map SDK native screen is currently available only on Android.');
  }

  if (!MapSdk) {
    throw new Error('MapSdk native module not found. Check package registration.');
  }

  return MapSdk.openMapScreen();
}