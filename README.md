This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

## Tracking SDK integration (Android)

See the [React Native Android Tracking SDK integration guide](TRACKING_SDK_ANDROID.md) for Maven setup, backend configuration, Kotlin bridge registration, permissions, authentication modes, sample code, and troubleshooting.

## Tracking SDK integration (iOS)

See the [React Native iOS Tracking SDK integration guide](TRACKING_SDK_IOS.md) for CocoaPods setup, Swift bridge integration, background location configuration, authentication, and sample code. A [downloadable Word document](docs/Tracking_SDK_iOS_Integration_Guide.docx) includes the complete native bridge source.

## Installing the Sovereign Solutions Map SDK

To install the custom Sovereign Solutions map library, you need to provide your JFrog credentials in the `package.json` file.

1. Open `package.json` and locate the dependency for `@sovereignsolutions/ssmap-react-native`.
2. Replace `YOUR_JFROG_USERNAME` with your assigned JFrog username.
3. Replace `YOUR_JFROG_PASSWORD` with your assigned JFrog password.

It should look something like this:
```json
"dependencies": {
  "@sovereignsolutions/ssmap-react-native": "https://username:password@artifact.sovereignsolutions.tech/artifactory/ssmap-reactnative/sovereignsolutions-ssmap-react-native-0.0.3.tgz"
}
```
4. Run your package manager install command (e.g. `yarn install` or `npm install`).

---

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Map Examples

This sample app includes several interactive examples demonstrating the capabilities of the Sovereign Solutions Map SDK. You can navigate between them using the built-in screen switcher.

### Configuration
Before rendering the map or using any API endpoints, you must initialize the SDK by setting your access token. We recommend doing this at the entry point of your application (e.g., `App.tsx` or `index.js`).

```tsx
import { SSMap } from '@sovereignsolutions/ssmap-react-native';

// Initialize the SDK with your api key
SSMap.setAPIKey("YOUR_API_KEY");
```

### Show Map
**Location**: [`src/screens/ShowMapScreen.tsx`](src/screens/ShowMapScreen.tsx)

A basic map implementation with camera controls and user location.
```tsx
<Map style={styles.map} mapStyle={MapStyles.BRIGHT}>
  <Camera ref={cameraRef} initialViewState={{ center: [77.2090, 28.6139], zoom: 11 }} />
  <UserLocation />
</Map>
```

### Draw Point
**Location**: [`src/screens/DrawPointScreen.tsx`](src/screens/DrawPointScreen.tsx)

Demonstrates adding GeoJSON point features dynamically by tapping on the map.
```tsx
<GeoJSONSource id="point-source" data={geoJson}>
  <Layer
    id="point-layer"
    type="circle"
    paint={{
      'circle-radius': 10,
      'circle-color': '#FF3B30',
    }}
  />
</GeoJSONSource>
```

### Draw Line & Polygon
**Location**: [`src/screens/DrawLineScreen.tsx`](src/screens/DrawLineScreen.tsx) and [`src/screens/DrawPolygonScreen.tsx`](src/screens/DrawPolygonScreen.tsx)

Shows how to draw lines and closed polygons connecting multiple tapped points, using data-driven styling for dynamic coloring.
```tsx
<GeoJSONSource id="polygon-source" data={geoJson}>
  <Layer
    id="polygon-layer"
    type="fill"
    paint={{
      'fill-color': ['get', 'color'], // Uses color property from feature
      'fill-opacity': 0.5,
      'fill-outline-color': '#000',
    }}
  />
</GeoJSONSource>
```

### Search
**Location**: [`src/screens/SearchScreen.tsx`](src/screens/SearchScreen.tsx)

Integrates the `SSMap.search()` API to find locations and animates the camera to the selected result.
```tsx
// Fetch search results
const result = await SSMap.search("Delhi");
setResults(result.docs || []);

// Animate camera to selection
cameraRef.current?.flyTo({
  center: [lng, lat],
  zoom: 14,
  duration: 1000,
});
```

### What's Here?
**Location**: [`src/screens/WhatHereScreen.tsx`](src/screens/WhatHereScreen.tsx)

Uses the `SSMap.whatHere()` reverse-geocoding API to fetch full address details for any tapped coordinate.
```tsx
const pos = [lng, lat] as [number, number];
const result = await SSMap.whatHere(pos);

if (Array.isArray(result) && result.length > 0) {
  const addressStr = `${result[0].Road}, ${result[0].District}, ${result[0].State}`;
  setAddress(addressStr);
}
```

### Routing and Distance
**Location**: [`src/screens/RouteScreen.tsx`](src/screens/RouteScreen.tsx)

Utilizes `SSMap.findRoute()` and `SSMap.optimizeRoute()` to calculate paths, calculate distances and estimated travel times, and draw routes between multiple waypoints.

```tsx
const points = waypoints.map(wp => [wp[0], wp[1]] as [number, number]);

// Standard route calculation
const routeResult = await SSMap.findRoute(points, VehicleType.Car);
const route = routeResult.routes[0];

// Extract distance (in meters) and duration (in seconds)
const distanceInMeters = route.distance;
const durationInSeconds = route.duration;
const distanceKm = (distanceInMeters / 1000).toFixed(2); // e.g. "14.25 km"
const durationMin = Math.round(durationInSeconds / 60);  // e.g. 28 min

// Optimized multi-stop route (TSP)
const optimizedResult = await SSMap.optimizeRoute(points);
const trip = optimizedResult.trips[0];
const optimizedDistance = trip.distance;

// Decode geometry string into coordinates array for Map rendering
const decodedCoords = SSMap.coordsDecode(route.geometry);
```

### Map Snapshot
**Location**: [`src/screens/MapSnapshotScreen.tsx`](src/screens/MapSnapshotScreen.tsx)

Demonstrates how to capture an image of the current map view using the map reference's `createStaticMapImage()` method, allowing users to save or preview the map state.

```tsx
const dataUri = await mapRef.current?.createStaticMapImage({
  output: 'base64',
});
```

### Live Tracking
**Location**: [`src/screens/LiveTrackingScreen.tsx`](src/screens/LiveTrackingScreen.tsx)

Displays simulated real-time tracking of drivers using custom animated markers. Features include data-driven pulse animations, heading rotation, MapLibre clustering, duty status filtering, and an active employee list that auto-follows selected drivers.

```tsx
const fetchData = () => {
  // Call API to get live tracking data, using mock data here.
  const mockData = require('../assets/mock-data/tracking-live-sample.json');
  setData(mockData.data.trackers || []);
};

// ... inside render:
<Map style={styles.map}>
  {clusteredPoints.map(cluster => {
    // Render markers for active/inactive drivers
    return (
      <Marker key={id} id={id} lngLat={coords} anchor="center">
        <View style={styles.markerWrapper}>
          {isActive && <PulseRing color={statusColor} />}
          {isActive && (
            <View style={{ transform: [{ rotate: `${heading}deg` }] }}>
              <View style={styles.headingArrow} />
            </View>
          )}
          <View style={styles.initialsCircle}>
            <Text>{initials}</Text>
          </View>
        </View>
      </Marker>
    );
  })}
</Map>
```

### History Tracking
**Location**: [`src/screens/HistoryTrackingScreen.tsx`](src/screens/HistoryTrackingScreen.tsx)

Visualizes a historical route trace with an interactive playback timeline. Features scrubbing, variable playback speeds, distance/time metrics, and synchronized camera following along the generated route.

```tsx
{/* Playback Controls */}
<View style={styles.controlsRow}>
  <TouchableOpacity onPress={togglePlayback}>
    <Text>{isPlaying ? '❚❚' : '▶'}</Text>
  </TouchableOpacity>
  <Slider value={playbackProgress} onValueChange={handleScrub} />
</View>

{/* Map Rendering */}
<Map>
  {/* The historical path line */}
  <GeoJSONSource id="route-source" data={routeGeoJson}>
    <Layer id="route-line" type="line" paint={{ 'line-color': '#0ea5e9' }} />
  </GeoJSONSource>
  
  {/* The moving vehicle marker */}
  {currentCoord && (
    <Marker id="vehicle-marker" lngLat={currentCoord} anchor="center">
      <VehicleIcon />
    </Marker>
  )}
</Map>
```

### Cluster Layer (Large Dataset & Interactive Zoom)
**Location**: [`src/screens/ClusterLayerScreen.tsx`](src/screens/ClusterLayerScreen.tsx)

Demonstrates client-side clustering and rendering of large datasets (e.g. 30,000 GeoJSON points) with stepped color/size badge styling and interactive tap-to-zoom into clusters using native expansion zoom queries.

```tsx
<GeoJSONSource
  id="cluster-source"
  ref={sourceRef}
  data={pointsData}
  cluster={true}
  clusterRadius={60}
  clusterMaxZoom={14}
  onPress={handleSourcePress}
>
  {/* Cluster Bubble Circles */}
  <Layer
    id="cluster-circles"
    type="circle"
    filter={['has', 'point_count']}
    paint={{
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#6366f1', // < 100 points
        100,
        '#3b82f6', // 100 - 499 points
        500,
        '#10b981', // 500 - 1999 points
        2000,
        '#ef4444', // >= 2000 points
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        18,
        100,
        24,
        500,
        30,
        2000,
        36,
      ],
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#ffffff',
    }}
  />

  {/* Cluster Count Label */}
  <Layer
    id="cluster-count-label"
    type="symbol"
    filter={['has', 'point_count']}
    layout={{
      'text-field': ['to-string', ['get', 'point_count']],
      'text-size': 12,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    }}
    paint={{
      'text-color': '#ffffff',
    }}
  />

  {/* Individual Unclustered Points */}
  <Layer
    id="unclustered-points"
    type="circle"
    filter={['!', ['has', 'point_count']]}
    paint={{
      'circle-color': '#007AFF',
      'circle-radius': 6,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff',
    }}
  />
</GeoJSONSource>
```

### Current Weather by Location
**Location**: [`src/screens/WeatherLocationScreen.tsx`](src/screens/WeatherLocationScreen.tsx)

Fetches live weather conditions (temperature, humidity, wind speed, pressure, and weather description) for any tapped coordinate or current GPS location using `SSMap.getWeather()`.

```tsx
// Fetch current weather by coordinates [longitude, latitude] or (lat, lng)
const weather = await SSMap.getWeather(latitude, longitude);

console.log(`Temperature: ${weather.temp_c}°C`);
console.log(`Condition: ${weather.weather_condition}`);
console.log(`Humidity: ${weather.relative_humidity_percent}%`);
console.log(`Wind: ${weather.wind_kph} km/h`);
```

### City Weather Forecast (7-Day Forecast)
**Location**: [`src/screens/WeatherCityForecastScreen.tsx`](src/screens/WeatherCityForecastScreen.tsx)

Fetches comprehensive 7-day weather forecasts across cities with `SSMap.getCityWeatherForecast()`. Badges are dynamically rendered on the map with viewport virtualization and collision prevention.

```tsx
// Fetch cities weather forecasts
const forecasts = await SSMap.getCityWeatherForecast();

// Each forecast item contains today's and 7-day projections:
forecasts.forEach(city => {
  console.log(`Station: ${city.Station_Name}`);
  console.log(`Today Max: ${city.Today_Max_temp}°C | Min: ${city.Today_Min_temp}°C`);
  console.log(`Today Forecast: ${city.Todays_Forecast}`);
  console.log(`Coordinates: [${city.Longitude}, ${city.Latitude}]`);
});
```

### Statewise Rainfall
**Location**: [`src/screens/WeatherStatewiseRainfallScreen.tsx`](src/screens/WeatherStatewiseRainfallScreen.tsx)

Retrieves daily, weekly, cumulative, and monthly rainfall statistics across 41 Indian States and Union Territories with `SSMap.getStatewiseRainfall()`.

```tsx
// Fetch statewise rainfall statistics
const rainfallData = await SSMap.getStatewiseRainfall();

rainfallData.forEach(stateItem => {
  console.log(`State: ${stateItem.State}`);
  console.log(`Daily Actual: ${stateItem['Daily Actual']} mm | Normal: ${stateItem['Daily Normal']} mm`);
  console.log(`Daily Departure: ${stateItem['Daily Departure Per']} (Category: ${stateItem['Daily Category']})`);
  console.log(`Weekly Actual: ${stateItem['Weekly Actual']} mm`);
  console.log(`Cumulative Actual: ${stateItem['Cumulative Actual']} mm`);
});
```
