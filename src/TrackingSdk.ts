import {NativeModules, Platform} from 'react-native';

const {TrackingSdk, SsTrackingSdkModule} = NativeModules;

export type SavedTrackingStatus = {enabled: boolean; username?: string | null};
export type IosTrackingStateResponse = {enabled: boolean; trackingMode?: string};
export type IosTrackingConfig = {
  authBaseUrl: string;
  registrationBaseUrl: string;
  trackingServerURL: string;
  apiKey: string;
  clientId: string;
  tenantName: string;
};

// Replace placeholders with your deployment configuration. Do not commit secrets.
const iosTrackingConfig: IosTrackingConfig = {
  authBaseUrl: 'https://api-gw.sovereignsolutions.com/',
  registrationBaseUrl: 'https://testing.intelomatic.com/',
  trackingServerURL: 'https://testing.intelomatic.com/api/app-base/vdms-tracking/push',
  apiKey: 'YOUR_API_KEY',
  clientId: 'UUMCGD',
  tenantName: 'testing',
};

function nativeSdk(): any {
  if (Platform.OS === 'android') {
    if (!TrackingSdk) {
      throw new Error('TrackingSdk native module not found. Check TrackingSdkPackage and rebuild Android.');
    }
    return TrackingSdk;
  }
  if (Platform.OS === 'ios') {
    if (!SsTrackingSdkModule) {
      throw new Error('SsTrackingSdkModule not found. Add the Swift and Objective-C bridge files to the iOS target and rebuild.');
    }
    return SsTrackingSdkModule;
  }
  throw new Error('Tracking SDK supports Android and iOS only.');
}

function requireMethod(module: any, method: string): (...args: any[]) => Promise<any> {
  if (typeof module[method] !== 'function') {
    throw new Error(`${method} is not available in the ${Platform.OS} native module. Check native exports and rebuild.`);
  }
  return module[method].bind(module);
}

function messageFrom(result: unknown, fallback: string): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'message' in result) {
    const message = (result as {message?: unknown}).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/**
 * Starts tracking using the existing cross-platform public API.
 * Android: configuration is read from BuildConfig; distanceFilter is passed to native.
 * iOS: configuration is supplied below as positional arguments to the Swift bridge.
 * IMPORTANT: the supplied iOS SDK currently hardcodes distanceFilter=25 and does not
 * expose a distance-filter argument. The JS distanceFilter is NOT applied on iOS.
 */
export async function initAndStartTracking(
  username: string,
  skipLoginAndRegistration: boolean,
  callerAccessToken: string | null = null,
  distanceFilter: number = 50,
): Promise<any> {
  const sdk = nativeSdk();
  const cleanUsername = username.trim();
  if (!cleanUsername) throw new Error('Username is required.');
  if (!Number.isFinite(distanceFilter) || distanceFilter < 0) {
    throw new Error('distanceFilter must be a finite number >= 0.');
  }
  if (skipLoginAndRegistration && !callerAccessToken?.trim()) {
    throw new Error('callerAccessToken is required when skipLoginAndRegistration is true.');
  }

  if (Platform.OS === 'android') {
    return requireMethod(sdk, 'initAndStartTracking')(
      cleanUsername, distanceFilter, skipLoginAndRegistration, callerAccessToken,
    );
  }

  const config = iosTrackingConfig;
  if (!config.trackingServerURL.trim()) throw new Error('iOS trackingServerURL is required.');
  if (!config.tenantName.trim()) throw new Error('iOS tenantName is required.');
  if (!skipLoginAndRegistration) {
    if (!config.authBaseUrl.trim()) throw new Error('iOS authBaseUrl is required.');
    if (!config.registrationBaseUrl.trim()) throw new Error('iOS registrationBaseUrl is required.');
    if (!config.apiKey.trim() || config.apiKey === 'YOUR_API_KEY') {
      throw new Error('Configure the iOS apiKey before using SDK-managed authentication.');
    }
    if (!config.clientId.trim()) throw new Error('iOS clientId is required.');
  }

  // Matches the positional RCT_EXTERN_METHOD and Swift @objc selector.
  // The Swift bridge calls initSDK, then startTracking after initialization succeeds.
  return requireMethod(sdk, 'initAndStartTracking')(
    config.authBaseUrl,
    config.registrationBaseUrl,
    config.trackingServerURL,
    config.apiKey,
    cleanUsername,
    config.clientId,
    config.tenantName,
    skipLoginAndRegistration,
    callerAccessToken?.trim() || null,
  );
}

export async function startTracking(): Promise<string> {
  const response = await requireMethod(nativeSdk(), 'startTracking')();
  return messageFrom(response, 'Tracking started');
}

export async function stopTracking(): Promise<string> {
  const response = await requireMethod(nativeSdk(), 'stopTracking')();
  return messageFrom(response, 'Tracking stopped');
}

/** Returns false on native query failure, matching the existing wrapper contract. */
export async function getTrackingState(): Promise<boolean> {
  try {
    const response = await requireMethod(nativeSdk(), 'getTrackingState')();
    return Platform.OS === 'ios' ? Boolean(response?.enabled) : Boolean(response);
  } catch (error) {
    console.warn('getTrackingState failed:', error);
    return false;
  }
}

/** iOS-only detailed state; Android's existing API returns a boolean. */
export async function getIOSTrackingState(): Promise<IosTrackingStateResponse> {
  if (Platform.OS !== 'ios') throw new Error('getIOSTrackingState is iOS-only.');
  return requireMethod(nativeSdk(), 'getTrackingState')();
}

/** iOS SDK does not expose saved username; this returns the live enabled state. */
export async function getSavedTrackingStatus(): Promise<SavedTrackingStatus> {
  try {
    if (Platform.OS === 'android') {
      return await requireMethod(nativeSdk(), 'getSavedTrackingStatus')();
    }
    return {enabled: await getTrackingState(), username: ''};
  } catch (error) {
    console.warn('getSavedTrackingStatus failed:', error);
    return {enabled: false, username: ''};
  }
}

export async function syncTracking(): Promise<string> {
  const response = await requireMethod(nativeSdk(), 'syncTracking')();
  return messageFrom(response, 'Tracking sync completed');
}

/** iOS refresh is supported only when skipLoginAndRegistration=false. */
export async function refreshAccessToken(): Promise<string> {
  const response = await requireMethod(nativeSdk(), 'refreshAccessToken')();
  if (typeof response === 'string') return response;
  return typeof response?.accessToken === 'string' ? response.accessToken : '';
}

export async function destroyTrackingSdk(): Promise<string> {
  const response = await requireMethod(nativeSdk(), 'destroyTrackingSdk')();
  return messageFrom(response, 'Tracking SDK destroyed');
}

export interface DeviceHealth {
  locationPermissionOff: boolean;
  preciseLocationOff: boolean;
  backgroundLocationPermissionOff: boolean;
  locationServiceOff: boolean;
  batteryOptimizationEnabled: boolean;
  motionActivityDisabled: boolean;
  autoStartManagementAvailable: boolean;
  autoStartStatus: 'UNKNOWN' | 'NOT_APPLICABLE';
}

/** Android only: the supplied iOS SDK does not currently expose device health. */
export async function getDeviceHealth(): Promise<DeviceHealth | null> {
  if (Platform.OS !== 'android') return null;
  try {
    return await requireMethod(nativeSdk(), 'getDeviceHealth')();
  } catch (error) {
    console.warn('getDeviceHealth failed:', error);
    return null;
  }
}
