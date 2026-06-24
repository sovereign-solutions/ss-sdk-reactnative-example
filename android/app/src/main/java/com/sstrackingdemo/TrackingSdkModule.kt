package com.sstrackingdemo

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.ss.tslocationmanager.SsBackgroundGeolocation

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

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {
            override fun onNewIntent(intent: Intent) {
                // No operation required
            }
        }

    init {
        reactApplicationContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = NAME

    private fun getCurrentActivityOrThrow(): Activity {
        return reactApplicationContext.currentActivity
            ?: throw IllegalStateException("Current activity is null")
    }

    private fun getSdk(): SsBackgroundGeolocation {
        val activity = getCurrentActivityOrThrow()

        if (sdk == null) {
            sdk = SsBackgroundGeolocation(activity)
            sdk?.setActivity(activity)
        }

        return sdk!!
    }

    private fun saveTrackingEnabled(enabled: Boolean) {
        reactApplicationContext
            .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_TRACKING_ENABLED, enabled)
            .apply()
    }

    private fun isTrackingEnabledSaved(): Boolean {
        return reactApplicationContext
            .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_TRACKING_ENABLED, false)
    }

    private fun saveTrackingUsername(username: String) {
        reactApplicationContext
            .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TRACKING_USERNAME, username.trim())
            .apply()
    }

    private fun getSavedTrackingUsername(): String? {
        return reactApplicationContext
            .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TRACKING_USERNAME, null)
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
    }

    @ReactMethod
    fun initAndStartTracking(
        baseUrl: String,
        apiKey: String,
        username: String,
        clientId: String,
        promise: Promise
    ) {
        val cleanUsername = username.trim()

        if (cleanUsername.isEmpty()) {
            saveTrackingEnabled(false)
            promise.reject("USERNAME_REQUIRED", "Username is required")
            return
        }

        if (trackingStartInProgress) {
            promise.resolve("Tracking start already in progress")
            return
        }

        trackingStartInProgress = true
        saveTrackingUsername(cleanUsername)
        saveTrackingEnabled(true)

        try {
            val activity = getCurrentActivityOrThrow()
            val trackingSdk = getSdk()

            trackingSdk.initSDK(
                baseUrl = baseUrl,
                apiKey = apiKey,
                username = cleanUsername,
                context = activity,
                clientId = clientId
            ) { success, token, error ->
                if (success) {
                    Log.d(TAG, "SDK initialized successfully. Token: $token")

                    trackingSdk.startTracking(
                        onSuccess = {
                            trackingStartInProgress = false
                            saveTrackingEnabled(true)
                            promise.resolve("Tracking started")
                        },
                        onError = {
                            trackingStartInProgress = false
                            Log.e(TAG, "Tracking start failed: $it")
                            promise.reject("START_TRACKING_ERROR", it)
                        }
                    )
                } else {
                    trackingStartInProgress = false
                    Log.e(TAG, "SDK init failed: $error")
                    promise.reject("INIT_SDK_ERROR", error ?: "SDK init failed")
                }
            }
        } catch (e: Exception) {
            trackingStartInProgress = false
            Log.e(TAG, "initAndStartTracking exception: ${e.message}")
            promise.reject("INIT_START_EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        if (trackingStopInProgress) {
            promise.resolve("Tracking stop already in progress")
            return
        }

        trackingStopInProgress = true
        saveTrackingEnabled(false)

        try {
            val trackingSdk = getSdk()

            trackingSdk.stopTracking(
                onSuccess = {
                    trackingStopInProgress = false
                    saveTrackingEnabled(false)
                    promise.resolve("Tracking stopped")
                },
                onError = {
                    trackingStopInProgress = false
                    saveTrackingEnabled(false)
                    Log.e(TAG, "Stop tracking failed: $it")
                    promise.reject("STOP_TRACKING_ERROR", it)
                }
            )
        } catch (e: Exception) {
            trackingStopInProgress = false
            saveTrackingEnabled(false)
            Log.e(TAG, "stopTracking exception: ${e.message}")
            promise.reject("STOP_TRACKING_EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun getTrackingState(promise: Promise) {
        try {
            val trackingSdk = getSdk()

            trackingSdk.getState(
                onResult = { isTracking, _ ->
                    saveTrackingEnabled(isTracking)
                    promise.resolve(isTracking)
                },
                onError = { error ->
                    Log.e(TAG, "getState failed: $error")
                    promise.reject("GET_STATE_ERROR", error)
                }
            )
        } catch (e: Exception) {
            promise.reject("GET_STATE_EXCEPTION", e.message, e)
        }
    }

    @ReactMethod
    fun getSavedTrackingStatus(promise: Promise) {
        val result = Arguments.createMap()
        result.putBoolean("enabled", isTrackingEnabledSaved())
        result.putString("username", getSavedTrackingUsername())
        promise.resolve(result)
    }

    
}