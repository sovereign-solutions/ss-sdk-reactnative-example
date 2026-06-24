package com.sstrackingdemo

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MapSdkModule(
    private val reactApplicationContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactApplicationContext) {

    override fun getName(): String = "MapSdk"

    @ReactMethod
    fun openMapScreen(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
                ?: throw IllegalStateException("Current activity is null")

            val intent = Intent(activity, MapSDK::class.java)
            activity.startActivity(intent)

            promise.resolve("Map screen opened")
        } catch (e: Exception) {
            promise.reject("OPEN_MAP_SCREEN_ERROR", e.message, e)
        }
    }
}