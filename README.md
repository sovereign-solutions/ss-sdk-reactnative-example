# Sovereign Solutions SDK React Native Example (Map & Tracking)

This repository provides a reference integration for the **Sovereign Solutions Location Tracking & Map SDK** in a React Native application. 

> [!NOTE]
> Currently, the native modules and SDK wrappers are implemented for **Android**. iOS is supported as a standard shell project.

---

## Features

- **Background Location Tracking**: Initialized and run as an Android foreground service with persistent tracking support.
- **Interactive Native Maps**: Implements custom native MapLibre GL maps with custom Sovereign styles.
- **Native Bridges**: Clean TypeScript wrappers around native Android Kotlin modules.

---

## Prerequisites

Before starting, ensure you have:
- **Node.js**: version `22.11.0` or higher.
- **Android SDK / Studio**: configured with Android SDK 36, NDK `27.1.12297006`, and Java environment.
- **Artifactory Credentials**: Access credentials to the Sovereign Solutions Maven Artifactory (to fetch the native dependencies).

---

## Installation

1. Clone the repository.
2. Install npm dependencies:
   ```bash
   npm install
   ```

---

## Credentials & Security Setup

To prepare this project for publication or production integration, secrets and private Maven credentials must be configured securely. **Do not check credentials into your git repository.**

### 1. Configure Maven Artifactory Access (Private SDKs)
The native Android SDKs (`tracking-sdk` and `ssmap-android`) are hosted on a private Artifactory repository. To access them securely:

1. Open (or create) your local gradle properties file at `~/.gradle/gradle.properties` (User Home directory):
   ```properties
   artifactory_user=YOUR_ARTIFACTORY_USERNAME
   artifactory_password=YOUR_ARTIFACTORY_PASSWORD
   ```
2. The project's `settings.gradle` is already configured to automatically read these values from your system's global Gradle properties.

### 2. Configure SDK & Map API Keys
To initialize the tracking and map screen, you must supply your API and Map credentials. 

In your application code, provide these values to the SDK methods:
- **Tracking Service**: Pass credentials when calling `initAndStartTracking`:
  ```typescript
  import { initAndStartTracking } from './src/TrackingSdk';

  const BASE_URL = 'https://api-gw.sovereignsolutions.com/';
  const API_KEY = 'YOUR_API_KEY';
  const CLIENT_ID = 'YOUR_CLIENT_ID';
  const USERNAME = 'test_user';

  await initAndStartTracking(USERNAME);
  ```
- **Map Screen**: Configure the native map screen with your map credentials before starting it.

---

## Running the Application

### Step 1: Start Metro
Run the Metro bundler to compile your Javascript bundle:
```bash
npm start
```

### Step 2: Build & Run on Android
With Metro running, open a new terminal and run:
```bash
npm run android
```
*Alternatively, you can open the `/android` folder in Android Studio and run the application directly from the IDE.*

---

## API Reference

### Location Tracking
Location tracking services are defined in `src/TrackingSdk.ts`:

* **`initAndStartTracking(username: string): Promise<string>`**
  Requests permissions, initializes the native `SsBackgroundGeolocation` client, and starts location collection/sync services.
  
* **`stopTracking(): Promise<string>`**
  Stops background tracking services.

* **`getTrackingState(): Promise<boolean>`**
  Queries the native service to check if location tracking is currently active.

* **`getSavedTrackingStatus(): Promise<SavedTrackingStatus>`**
  Checks if tracking was previously active and retrieves the last logged-in username.

### Interactive Maps
* **`openNativeMapScreen(): Promise<string>`**
  Launches the native Android Map Activity containing MapLibre GL widgets styled with Sovereign maps.

---

## Native Android Configuration Details

### Permissions
The application requires the following location and foreground service permissions in `AndroidManifest.xml`:
* `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (device location access)
* `ACCESS_BACKGROUND_LOCATION` (enables persistent background tracking)
* `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_LOCATION` (foreground service support)
* `POST_NOTIFICATIONS` (foreground service status notification for Android 13+)

---

## Production / Release Checklist

When packaging this application for production or sharing it with clients:
1. **Enable Proguard/R8**: Ensure code shrinking and obfuscation are enabled in `android/app/build.gradle` by setting `enableProguardInReleaseBuilds = true`.
2. **Review HTTP Logging**: Ensure `HttpLoggingInterceptor` body logging is disabled in production to protect user privacy (location data and tokens).
3. **Configure Android App Signing**: Generate a secure production keystore instead of utilizing the debug keystore for release builds.
