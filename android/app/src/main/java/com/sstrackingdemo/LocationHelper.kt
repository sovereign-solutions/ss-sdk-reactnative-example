package com.sstrackingdemo

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

object LocationHelper {

    fun fetchCurrentLocation(
        activity: Activity,
        onSuccess: (Location) -> Unit,
        onFailure: (String) -> Unit
    ) {
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(activity)

        // 1. Check if permissions are granted
        if (ActivityCompat.checkSelfPermission(
                activity,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            // If not granted, request them and fail this current attempt
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                1001
            )
            onFailure("Location permission not granted. Requesting permission...")
            return
        }

        // 2. Fetch a FRESH location (better than lastLocation for on-demand needs)
        val cancellationTokenSource = CancellationTokenSource()

        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_HIGH_ACCURACY,
            cancellationTokenSource.token
        ).addOnSuccessListener { location: Location? ->
            if (location != null) {
                onSuccess(location)
            } else {
                onFailure("Could not determine location. Ensure GPS is enabled.")
            }
        }.addOnFailureListener { exception ->
            onFailure("Error fetching location: ${exception.localizedMessage}")
        }
    }
}