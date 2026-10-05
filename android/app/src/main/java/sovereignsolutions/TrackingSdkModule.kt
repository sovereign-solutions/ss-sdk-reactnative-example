package sovereignsolutions.ssmap.example

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.ss.tslocationmanager.SsBackgroundGeolocation
import com.ss.tslocationmanager.DeviceHealthUtils
import com.facebook.react.bridge.WritableMap

class TrackingSdkModule(
    private val reactApplicationContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactApplicationContext) {

    companion object {
        const val NAME = "TrackingSdk"
        private const val TAG = "TrackingSdkModule"

        private const val PREF_NAME = "ss_tracking_pref"
        private const val KEY_TRACKING_ENABLED = "tracking_enabled"
        private const val KEY_TRACKING_USERNAME = "tracking_username"
    }

    private var sdk: SsBackgroundGeolocation? = null

    private var trackingStartInProgress = false
    private var trackingStopInProgress = false
    private var sdkInitializationInProgress = false

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {

            override fun onNewIntent(intent: Intent) {
                // No operation required
            }
        }

    init {
        reactApplicationContext.addActivityEventListener(
            activityEventListener
        )
    }

    override fun getName(): String = NAME

    // ============================================================
    // Activity / SDK
    // ============================================================

    private fun getCurrentActivityOrThrow(): Activity {
        return reactApplicationContext.currentActivity
            ?: throw IllegalStateException(
                "Current activity is null"
            )
    }

    private fun getSdk(): SsBackgroundGeolocation {
        val activity = getCurrentActivityOrThrow()

        val existingSdk = sdk

        if (existingSdk != null) {
            existingSdk.setActivity(activity)
            return existingSdk
        }

        return SsBackgroundGeolocation(
            reactApplicationContext.applicationContext
        ).also { newSdk ->

            newSdk.setActivity(activity)
            sdk = newSdk
        }
    }

    // ============================================================
    // SharedPreferences
    // ============================================================

    private fun saveTrackingEnabled(
        enabled: Boolean
    ) {
        reactApplicationContext
            .getSharedPreferences(
                PREF_NAME,
                Context.MODE_PRIVATE
            )
            .edit()
            .putBoolean(
                KEY_TRACKING_ENABLED,
                enabled
            )
            .apply()
    }

    private fun isTrackingEnabledSaved(): Boolean {
        return reactApplicationContext
            .getSharedPreferences(
                PREF_NAME,
                Context.MODE_PRIVATE
            )
            .getBoolean(
                KEY_TRACKING_ENABLED,
                false
            )
    }

    private fun saveTrackingUsername(
        username: String
    ) {
        reactApplicationContext
            .getSharedPreferences(
                PREF_NAME,
                Context.MODE_PRIVATE
            )
            .edit()
            .putString(
                KEY_TRACKING_USERNAME,
                username.trim()
            )
            .apply()
    }

    private fun getSavedTrackingUsername(): String? {
        return reactApplicationContext
            .getSharedPreferences(
                PREF_NAME,
                Context.MODE_PRIVATE
            )
            .getString(
                KEY_TRACKING_USERNAME,
                null
            )
            ?.trim()
            ?.takeIf {
                it.isNotEmpty()
            }
    }

    // ============================================================
    // BuildConfig validation
    // ============================================================

    private fun validateSdkConfiguration(
        skipLoginAndRegistration: Boolean
    ): String? {

        if (BuildConfig.TRACKING_BASE_URL.isBlank()) {
            return "TRACKING_BASE_URL is missing in app/build.gradle"
        }

        if (BuildConfig.TRACKING_SERVER_URL.isBlank()) {
            return "TRACKING_SERVER_URL is missing in app/build.gradle"
        }

        if (BuildConfig.TRACKING_TENANT_NAME.isBlank()) {
            return "TRACKING_TENANT_NAME is missing in app/build.gradle"
        }

        /*
         * These values are only mandatory when
         * Tracking SDK handles:
         *
         * - Generate token
         * - Refresh token
         * - Device registration
         */
        if (!skipLoginAndRegistration) {

            if (
                BuildConfig
                    .TRACKING_REGISTRATION_BASE_URL
                    .isBlank()
            ) {
                return "TRACKING_REGISTRATION_BASE_URL is missing in app/build.gradle"
            }

            if (
                BuildConfig
                    .TRACKING_API_KEY
                    .isBlank()
            ) {
                return "TRACKING_API_KEY is missing in app/build.gradle"
            }

            if (
                BuildConfig
                    .TRACKING_CLIENT_ID
                    .isBlank()
            ) {
                return "TRACKING_CLIENT_ID is missing in app/build.gradle"
            }
        }

        return null
    }

    // ============================================================
    // Init + Start Tracking
    // ============================================================

    @ReactMethod
    fun initAndStartTracking(
        username: String,
        distanceFilter: Double,
        skipLoginAndRegistration: Boolean,
        callerAccessToken: String?,
        promise: Promise
    ) {

        val cleanUsername =
            username.trim()

        val cleanCallerAccessToken =
            callerAccessToken
                ?.trim()
                ?.takeIf {
                    it.isNotEmpty()
                }

        // --------------------------------------------------------
        // Android version validation
        // --------------------------------------------------------

        if (
            Build.VERSION.SDK_INT <
            Build.VERSION_CODES.M
        ) {

            promise.reject(
                "UNSUPPORTED_ANDROID_VERSION",
                "Tracking SDK requires Android 6.0 or above"
            )

            return
        }

        // --------------------------------------------------------
        // Username validation
        // --------------------------------------------------------

        if (cleanUsername.isEmpty()) {

            saveTrackingEnabled(false)

            promise.reject(
                "USERNAME_REQUIRED",
                "Username is required"
            )

            return
        }

        // --------------------------------------------------------
        // Distance filter validation
        // --------------------------------------------------------

        if (!distanceFilter.isFinite() || distanceFilter < 0.0) {

            saveTrackingEnabled(false)

            promise.reject(
                "INVALID_DISTANCE_FILTER",
                "distanceFilter must be a valid number greater than or equal to 0"
            )

            return
        }

        // --------------------------------------------------------
        // Caller provided access token validation
        // --------------------------------------------------------

        if (
            skipLoginAndRegistration &&
            cleanCallerAccessToken.isNullOrBlank()
        ) {

            saveTrackingEnabled(false)

            promise.reject(
                "CALLER_ACCESS_TOKEN_REQUIRED",
                "Caller access token is required when login and registration are skipped"
            )

            return
        }

        // --------------------------------------------------------
        // BuildConfig validation
        // --------------------------------------------------------

        val configurationError =
            validateSdkConfiguration(
                skipLoginAndRegistration
            )

        if (configurationError != null) {

            saveTrackingEnabled(false)

            Log.e(
                TAG,
                configurationError
            )

            promise.reject(
                "SDK_CONFIGURATION_ERROR",
                configurationError
            )

            return
        }

        // --------------------------------------------------------
        // Prevent duplicate initialization
        // --------------------------------------------------------

        if (
            trackingStartInProgress ||
            sdkInitializationInProgress
        ) {

            val result =
                Arguments.createMap()

            result.putBoolean(
                "success",
                true
            )

            result.putString(
                "message",
                "SDK initialization or tracking start already in progress"
            )

            promise.resolve(
                result
            )

            return
        }

        sdkInitializationInProgress =
            true

        trackingStartInProgress =
            true

        saveTrackingUsername(
            cleanUsername
        )

        /*
         * Tracking is not marked enabled until
         * startTracking() succeeds.
         */
        saveTrackingEnabled(
            false
        )

        try {

            val trackingSdk =
                getSdk()

            Log.d(
                TAG,
                "================================================"
            )

            Log.d(
                TAG,
                "Initializing Tracking SDK"
            )

            Log.d(
                TAG,
                "username=$cleanUsername"
            )

            Log.d(
                TAG,
                "baseUrl=${BuildConfig.TRACKING_BASE_URL}"
            )

            Log.d(
                TAG,
                "registrationBaseUrl=${BuildConfig.TRACKING_REGISTRATION_BASE_URL}"
            )

            Log.d(
                TAG,
                "serverUrl=${BuildConfig.TRACKING_SERVER_URL}"
            )

            Log.d(
                TAG,
                "clientId=${BuildConfig.TRACKING_CLIENT_ID}"
            )

            Log.d(
                TAG,
                "tenantName=${BuildConfig.TRACKING_TENANT_NAME}"
            )

            Log.d(
                TAG,
                "distanceFilter=$distanceFilter"
            )

            Log.d(
                TAG,
                "skipLoginAndRegistration=$skipLoginAndRegistration"
            )

            Log.d(
                TAG,
                "callerAccessTokenAvailable=${!cleanCallerAccessToken.isNullOrBlank()}"
            )

            Log.d(
                TAG,
                "================================================"
            )

            trackingSdk.initSDK(

                baseUrl =
                    BuildConfig.TRACKING_BASE_URL,

                registrationBaseUrl =
                    BuildConfig.TRACKING_REGISTRATION_BASE_URL,

                serverUrl =
                    BuildConfig.TRACKING_SERVER_URL,

                apiKey =
                    BuildConfig.TRACKING_API_KEY,

                username =
                    cleanUsername,

                clientId =
                    BuildConfig.TRACKING_CLIENT_ID,

                tenantName =
                    BuildConfig.TRACKING_TENANT_NAME,

                distanceFilter =
                    distanceFilter.toFloat(),

                skipLoginAndRegistration =
                    skipLoginAndRegistration,

                callerAccessToken =
                    cleanCallerAccessToken

            ) { success, token, error ->

                sdkInitializationInProgress =
                    false

                // ------------------------------------------------
                // SDK initialization failed
                // ------------------------------------------------

                if (!success) {

                    trackingStartInProgress =
                        false

                    saveTrackingEnabled(
                        false
                    )

                    Log.e(
                        TAG,
                        "SDK initialization failed: $error"
                    )

                    promise.reject(
                        "INIT_SDK_ERROR",
                        error
                            ?: "SDK initialization failed"
                    )

                    return@initSDK
                }

                // ------------------------------------------------
                // SDK initialization successful
                // ------------------------------------------------

                Log.d(
                    TAG,
                    "SDK initialized successfully"
                )

                Log.d(
                    TAG,
                    "Token available=${!token.isNullOrBlank()}"
                )

                // ------------------------------------------------
                // Start tracking
                // ------------------------------------------------

                trackingSdk.startTracking(

                    onSuccess = {

                        trackingStartInProgress =
                            false

                        saveTrackingEnabled(
                            true
                        )

                        Log.d(
                            TAG,
                            "Tracking started successfully"
                        )

                        val result =
                            Arguments.createMap()

                        result.putBoolean(
                            "success",
                            true
                        )

                        result.putString(
                            "message",
                            "Tracking started successfully"
                        )

                        result.putString(
                            "accessToken",
                            token
                                ?: cleanCallerAccessToken
                                ?: ""
                        )

                        result.putBoolean(
                            "skipLoginAndRegistration",
                            skipLoginAndRegistration
                        )

                        result.putString(
                            "username",
                            cleanUsername
                        )

                        result.putDouble(
                            "distanceFilter",
                            distanceFilter
                        )

                        promise.resolve(
                            result
                        )
                    },

                    onError = { startError ->

                        trackingStartInProgress =
                            false

                        saveTrackingEnabled(
                            false
                        )

                        Log.e(
                            TAG,
                            "Tracking start failed: $startError"
                        )

                        promise.reject(
                            "START_TRACKING_ERROR",
                            startError
                        )
                    }
                )
            }

        } catch (exception: Exception) {

            sdkInitializationInProgress =
                false

            trackingStartInProgress =
                false

            saveTrackingEnabled(
                false
            )

            Log.e(
                TAG,
                "initAndStartTracking exception: ${exception.message}",
                exception
            )

            promise.reject(
                "INIT_START_EXCEPTION",
                exception.message
                    ?: "initAndStartTracking failed",
                exception
            )
        }
    }

    // ============================================================
    // Stop Tracking
    // ============================================================

    @ReactMethod
    fun stopTracking(
        promise: Promise
    ) {

        if (trackingStopInProgress) {

            promise.resolve(
                "Tracking stop already in progress"
            )

            return
        }

        trackingStopInProgress =
            true

        try {

            val trackingSdk =
                getSdk()

            trackingSdk.stopTracking(

                onSuccess = {

                    trackingStopInProgress =
                        false

                    trackingStartInProgress =
                        false

                    saveTrackingEnabled(
                        false
                    )

                    Log.d(
                        TAG,
                        "Tracking stopped successfully"
                    )

                    promise.resolve(
                        "Tracking stopped"
                    )
                },

                onError = { error ->

                    trackingStopInProgress =
                        false

                    Log.e(
                        TAG,
                        "Stop tracking failed: $error"
                    )

                    promise.reject(
                        "STOP_TRACKING_ERROR",
                        error
                    )
                }
            )

        } catch (exception: Exception) {

            trackingStopInProgress =
                false

            Log.e(
                TAG,
                "stopTracking exception: ${exception.message}",
                exception
            )

            promise.reject(
                "STOP_TRACKING_EXCEPTION",
                exception.message
                    ?: "Failed to stop tracking",
                exception
            )
        }
    }

    // ============================================================
    // Current SDK Tracking State
    // ============================================================

    @ReactMethod
    fun getTrackingState(
        promise: Promise
    ) {

        try {

            val trackingSdk =
                getSdk()

            trackingSdk.getState(

                onResult = {
                        isTracking,
                        _ ->

                    saveTrackingEnabled(
                        isTracking
                    )

                    promise.resolve(
                        isTracking
                    )
                },

                onError = { error ->

                    Log.e(
                        TAG,
                        "getState failed: $error"
                    )

                    promise.reject(
                        "GET_STATE_ERROR",
                        error
                    )
                }
            )

        } catch (exception: Exception) {

            Log.e(
                TAG,
                "getTrackingState exception: ${exception.message}",
                exception
            )

            promise.reject(
                "GET_STATE_EXCEPTION",
                exception.message
                    ?: "Failed to get tracking state",
                exception
            )
        }
    }

    // ============================================================
    // Saved Tracking State
    // ============================================================

    @ReactMethod
    fun getSavedTrackingStatus(
        promise: Promise
    ) {

        val result =
            Arguments.createMap()

        result.putBoolean(
            "enabled",
            isTrackingEnabledSaved()
        )

        result.putString(
            "username",
            getSavedTrackingUsername()
        )

        promise.resolve(
            result
        )
    }
 @ReactMethod
    fun getDeviceHealth(promise: Promise) {
        try {
            val context = reactApplicationContext

            val health = DeviceHealthUtils.getDeviceHealth(context)

            val result: WritableMap = Arguments.createMap().apply {
                putBoolean(
                    "locationPermissionOff",
                    health.locationPermissionOff
                )

                putBoolean(
                    "preciseLocationOff",
                    health.preciseLocationOff
                )

                putBoolean(
                    "backgroundLocationPermissionOff",
                    health.backgroundLocationPermissionOff
                )

                putBoolean(
                    "locationServiceOff",
                    health.locationServiceOff
                )

                putBoolean(
                    "batteryOptimizationEnabled",
                    health.batteryOptimizationEnabled
                )

                putBoolean(
                    "motionActivityDisabled",
                    health.motionActivityDisabled
                )

                putBoolean(
                    "autoStartManagementAvailable",
                    health.autoStartManagementAvailable
                )

                // Android cannot reliably detect actual auto-start state.
                putString(
                    "autoStartStatus",
                    if (health.autoStartManagementAvailable) {
                        "UNKNOWN"
                    } else {
                        "NOT_APPLICABLE"
                    }
                )
            }

            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject(
                "DEVICE_HEALTH_ERROR",
                "Failed to get device health: ${e.message}",
                e
            )
        }
    }


    // ============================================================
    // React Native cleanup
    // ============================================================

    override fun invalidate() {

        try {

            reactApplicationContext
                .removeActivityEventListener(
                    activityEventListener
                )

        } catch (exception: Exception) {

            Log.w(
                TAG,
                "Unable to remove ActivityEventListener",
                exception
            )
        }

        sdk = null

        super.invalidate()
    }
}