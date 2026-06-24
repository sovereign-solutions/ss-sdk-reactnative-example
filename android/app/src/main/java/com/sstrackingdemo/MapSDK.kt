package com.sstrackingdemo

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuItem
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.sstrackingdemo.LocationHelper
import com.sovereignsolutions.map.SSMap
import com.sovereignsolutions.map.SSMapView
import com.sovereignsolutions.map.model.SearchItem
import com.sovereignsolutions.map.model.WhatHereResultItem
import com.ss.tslocationmanager.SsBackgroundGeolocation
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.location.LocationComponentOptions
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.PropertyFactory.fillColor
import org.maplibre.android.style.layers.PropertyFactory.fillOpacity
import org.maplibre.android.style.layers.PropertyFactory.fillOutlineColor
import org.maplibre.android.style.layers.PropertyFactory.iconAllowOverlap
import org.maplibre.android.style.layers.PropertyFactory.iconImage
import org.maplibre.android.style.layers.PropertyFactory.lineColor
import org.maplibre.android.style.layers.PropertyFactory.lineWidth
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.LineString
import org.maplibre.geojson.Point
import org.maplibre.geojson.Polygon
import com.sstrackingdemo.models.TrackingResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.PropertyFactory.circleColor
import org.maplibre.android.style.layers.PropertyFactory.circleOpacity
import org.maplibre.android.style.layers.PropertyFactory.circleRadius
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeColor
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeWidth
import com.sstrackingdemo.models.Tracker
import org.maplibre.android.style.sources.GeoJsonOptions
import org.maplibre.android.style.layers.PropertyFactory.circleColor
import org.maplibre.android.style.layers.PropertyFactory.circleRadius
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeColor
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeWidth
import org.maplibre.android.style.layers.PropertyFactory.textColor
import org.maplibre.android.style.layers.PropertyFactory.textField
import org.maplibre.android.style.layers.PropertyFactory.textSize
import org.maplibre.android.style.expressions.Expression.eq
import org.maplibre.android.style.expressions.Expression.get
import org.maplibre.android.style.expressions.Expression.has
import org.maplibre.android.style.expressions.Expression.literal
import org.maplibre.android.style.expressions.Expression.step
import org.maplibre.android.style.expressions.Expression.toNumber

import org.maplibre.android.style.expressions.Expression.not
import org.maplibre.android.style.layers.PropertyFactory.textHaloColor
import org.maplibre.android.style.layers.PropertyFactory.textHaloWidth
import org.maplibre.android.style.layers.PropertyFactory.textOffset
import org.maplibre.android.style.layers.PropertyFactory.textAllowOverlap
import org.maplibre.android.style.layers.Property.TEXT_JUSTIFY_CENTER
import org.maplibre.android.style.layers.Property.TEXT_ANCHOR_CENTER
import org.maplibre.android.style.layers.PropertyFactory.textJustify
import org.maplibre.android.style.layers.PropertyFactory.textAnchor
import org.maplibre.android.style.layers.PropertyFactory.iconSize

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MapSDK : AppCompatActivity() {

    private lateinit var sdk: SsBackgroundGeolocation
    private lateinit var switchDuty: Switch
    private lateinit var toolbar: Toolbar
    private lateinit var mapView: SSMapView
    private lateinit var map: MapLibreMap

    private var trackingStartInProgress = false
    private var trackingStopInProgress = false
    private var isProgrammaticSwitchUpdate = false

    private var pendingTrackingUsername: String? = null

    companion object {
        private const val TAG = "Surya"

        private const val MAP_KEY = "your_map_key"

        private const val BASE_URL = "https://api-gw.sovereignsolutions.com/"
        private const val API_KEY = "your_API_key"
        private const val CLIENT_ID = "your_client_id"
        private var progressDialog: android.app.ProgressDialog? = null

        private const val PREF_NAME = "ss_tracking_pref"
        private const val KEY_TRACKING_ENABLED = "tracking_enabled"
        private const val KEY_TRACKING_USERNAME = "tracking_username"

    }



    private val TRACKING_CLUSTER_SOURCE_ID = "tracking-cluster-source-marker-v1"
    private val TRACKING_CLUSTER_MARKER_LAYER_ID = "tracking-cluster-marker-layer-v1"
    private val TRACKING_CLUSTER_COUNT_LAYER_ID = "tracking-cluster-count-layer-v1"
    private val TRACKING_UNCLUSTERED_MARKER_LAYER_ID = "tracking-unclustered-marker-layer-v1"
    private val TRACKING_POPUP_SOURCE_ID = "tracking-popup-source-marker-v1"
    private val TRACKING_POPUP_LAYER_ID = "tracking-popup-layer-marker-v1"

    private val TRACKING_MARKER_ICON_ID = "tracking-marker-icon-v1"

    private val trackingRefreshHandler = Handler(Looper.getMainLooper())
    private val trackingRefreshIntervalMs = 30_000L
    private var isTrackingRefreshRunning = false
    private var trackingApiCallInProgress = false

    private val trackingRefreshRunnable = object : Runnable {
        override fun run() {
            if (!::map.isInitialized) {
                trackingRefreshHandler.postDelayed(this, trackingRefreshIntervalMs)
                return
            }

            callGetTrackingData(showLoading = false)

            trackingRefreshHandler.postDelayed(this, trackingRefreshIntervalMs)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        SSMap.setAPIKey(this, MAP_KEY)
        setContentView(R.layout.mainscreen)

        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.isAppearanceLightStatusBars = true

        toolbar = findViewById(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.title = "SDK Live Demo"

        switchDuty = findViewById(R.id.switchDuty)
        attachSwitchListener()

        sdk = SsBackgroundGeolocation(this)
        sdk.setActivity(this)

        restoreSwitchFromSavedStatus()

        if (isTrackingEnabledSaved()) {
            val savedUsername = getSavedTrackingUsername()

            if (!savedUsername.isNullOrEmpty()) {
                requestPermissionsBeforeInit(savedUsername)
            } else {
                disableTrackingUiAndPreference("Username is required")
            }
        } else {
            syncSwitchWithTrackingState(autoRestartIfNeeded = false)
        }

        val locationLoader = findViewById<ProgressBar>(R.id.locationLoader)

        mapView = findViewById(R.id.mapView)
        mapView.onCreate(savedInstanceState)

        mapView.getMapAsync { readyMap ->
            this.map = readyMap

            mapView.setStyle("https://map-api-new.sovereignsolutions.net/sovereign/styles/bright/bright.json?api-key=$MAP_KEY") { style ->
                setupLayers(style)
                addTrackingPopupLayerIfNeeded()
                setupTrackingPointClickListener()
                callGetTrackingData(showLoading = true)
                startTrackingInfoRefresh()
                locationLoader.visibility = View.VISIBLE

                LocationHelper.fetchCurrentLocation(
                    activity = this@MapSDK,
                    onSuccess = { location ->
                        val currentLatLng = LatLng(location.latitude, location.longitude)

                        val newPosition = CameraPosition.Builder()
                            .target(currentLatLng)
                            .zoom(14.0)
                            .build()

                        map.animateCamera(CameraUpdateFactory.newCameraPosition(newPosition))

                        val greenOptions = LocationComponentOptions.builder(this@MapSDK)
                            .foregroundTintColor(Color.GREEN)
                            .build()

                        map.locationComponent.activateLocationComponent(
                            LocationComponentActivationOptions.builder(this@MapSDK, style)
                                .locationComponentOptions(greenOptions)
                                .build()
                        )

                        if (
                            ActivityCompat.checkSelfPermission(
                                this@MapSDK,
                                Manifest.permission.ACCESS_FINE_LOCATION
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
                            map.locationComponent.isLocationComponentEnabled = true
                            isLocationComponentInitialized = true
                        }

                        locationLoader.visibility = View.GONE

                        map.addOnMapLongClickListener { latLng ->
                            if (startPoint == null && endPoint == null) {
                                drawPoint(latLng)
                            } else {
                                val listPoint = buildList {
                                    startPoint?.let { add(it) }
                                    addAll(midPoints)
                                    endPoint?.let { add(it) }
                                    add(latLng)
                                }
                                drawPoints(listPoint)
                            }

                            showPopupMenu(latLng)
                            true
                        }

                        map.addOnCameraMoveListener {
                            popupView?.let { removePopup() }
                            removeTrackingPopup()
                        }

                        map.uiSettings.setCompassMargins(0, 180, 16, 16)
                    },
                    onFailure = {
                        locationLoader.visibility = View.GONE
                        Toast.makeText(
                            this@MapSDK,
                            "Failed to get location",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                )
            }
        }

        setupSearch()
        setupButtonMyLocation()
        setupRefreshButton()


    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (::sdk.isInitialized) {
            sdk.onRequestPermissionsResult(requestCode, permissions, grantResults)
        }
    }

    fun getAppVersionWithBuild(context: Context): String {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val versionName = packageInfo.versionName ?: "1.0.0"

            @Suppress("DEPRECATION")
            val versionCode = packageInfo.versionCode

            "$versionName($versionCode)"
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    override fun onStart() {
        super.onStart()
        mapView.onStart()
        if (::map.isInitialized) {
            startTrackingInfoRefresh()
        }
    }

    override fun onResume() {
        super.onResume()
        mapView.onResume()
        restoreSwitchFromSavedStatus()
        syncSwitchWithTrackingState(autoRestartIfNeeded = true)
    }

    override fun onPause() {
        super.onPause()
        mapView.onPause()
    }

    override fun onStop() {
        super.onStop()
        stopTrackingInfoRefresh()
        mapView.onStop()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        mapView.onLowMemory()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopTrackingInfoRefresh()
        removeTrackingPopup()
        mapView.onDestroy()
        searchHandler.removeCallbacksAndMessages(null)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        mapView.onSaveInstanceState(outState)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.example_menu, menu)
        menuItemOptimizeRoute = menu.findItem(R.id.action_optimize_route)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        removePopup()

        return when (item.itemId) {
            R.id.action_draw_point -> {
                drawPoint(LatLng(28.6139, 77.2090))
                true
            }

            R.id.action_draw_line -> {
                val linePoints = listOf(
                    Point.fromLngLat(77.2090, 28.6139),
                    Point.fromLngLat(77.2090, 28.6239),
                    Point.fromLngLat(77.2290, 28.6139),
                    Point.fromLngLat(77.2190, 28.6339)
                )

                drawLine(linePoints)
                true
            }

            R.id.action_draw_polygon -> {
                val points = listOf(
                    Point.fromLngLat(77.2090, 28.6139),
                    Point.fromLngLat(77.2090, 28.6239),
                    Point.fromLngLat(77.2290, 28.6139)
                )

                drawPolygon(points)
                true
            }

            R.id.action_optimize_route -> {
                optimizeRoute()
                true
            }

            R.id.action_clear -> {
                clearAll()
                true
            }

            else -> super.onOptionsItemSelected(item)
        }
    }

    private var isLocationComponentInitialized = false

    private fun setupButtonMyLocation() {
        val btnMyLocation = findViewById<ImageButton>(R.id.btnMyLocation)

        btnMyLocation.setOnClickListener {
            if (isLocationComponentInitialized) {
                moveToMyLocation()
            } else if (::map.isInitialized) {
                map.getStyle { style ->
                    enableLocationComponent(style)
                }
            }
        }
    }

    private fun setupRefreshButton(){
        val refresh = findViewById<ImageButton>(R.id.refreshdata)
        refresh.setOnClickListener {
            callGetTrackingData(showLoading = true)
        }

    }

    private fun enableLocationComponent(loadedMapStyle: Style) {
        if (
            ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            val locationComponent = map.locationComponent

            locationComponent.activateLocationComponent(
                LocationComponentActivationOptions.builder(this, loadedMapStyle).build()
            )

            locationComponent.isLocationComponentEnabled = true
            isLocationComponentInitialized = true
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                1001
            )
        }
    }

    private fun moveToMyLocation() {
        val location = map.locationComponent.lastKnownLocation

        location?.let {
            map.animateCamera(
                CameraUpdateFactory.newLatLngZoom(
                    LatLng(it.latitude, it.longitude),
                    16.0
                )
            )
        }
    }

    private lateinit var pointSource: GeoJsonSource
    private lateinit var lineSource: GeoJsonSource
    private lateinit var polygonSource: GeoJsonSource

    private fun setupLayers(style: Style) {
        if (!::pointSource.isInitialized) {
            val bitmap = BitmapFactory.decodeResource(resources, R.drawable.pin_blue)

            style.addImage("my-marker", bitmap)
            style.addImage(TRACKING_MARKER_ICON_ID, bitmap)

            pointSource = GeoJsonSource("point-source")
            style.addSource(pointSource)

            val pointLayer = SymbolLayer("point-layer", "point-source")
                .withProperties(
                    iconImage("my-marker"),
                    iconAllowOverlap(true)
                )

            style.addLayer(pointLayer)

            lineSource = GeoJsonSource("line-source")
            style.addSource(lineSource)

            val lineLayer = LineLayer("line-layer", "line-source")
                .withProperties(
                    lineColor("#ff0000"),
                    lineWidth(4f)
                )

            style.addLayer(lineLayer)

            polygonSource = GeoJsonSource("polygon-source")
            style.addSource(polygonSource)

            val fillLayer = FillLayer("polygon-layer", "polygon-source")
                .withProperties(
                    fillColor("#00ff00"),
                    fillOpacity(0.5f),
                    fillOutlineColor("#ff0000")
                )

            style.addLayer(fillLayer)


        }
    }

    private fun clearAll() {
        if (::pointSource.isInitialized) {
            pointSource.setGeoJson(FeatureCollection.fromFeatures(arrayOf()))
            lineSource.setGeoJson(FeatureCollection.fromFeatures(arrayOf()))
            polygonSource.setGeoJson(FeatureCollection.fromFeatures(arrayOf()))
        }

        removePopup()

        startPoint = null
        endPoint = null
        midPoints.clear()
        menuItemOptimizeRoute.isVisible = false
    }

    private fun drawPoints(latLngs: List<LatLng>) {
        if (!::pointSource.isInitialized) return

        val features = latLngs.map { latLng ->
            val point = Point.fromLngLat(latLng.longitude, latLng.latitude)
            Feature.fromGeometry(point)
        }

        val featureCollection = FeatureCollection.fromFeatures(features)
        pointSource.setGeoJson(featureCollection)
    }

    private fun drawPoint(latLng: LatLng) {
        if (!::pointSource.isInitialized) return

        val point = Point.fromLngLat(latLng.longitude, latLng.latitude)
        val feature = Feature.fromGeometry(point)

        pointSource.setGeoJson(feature)
    }

    private fun drawLine(linePoints: List<Point>) {
        if (!::lineSource.isInitialized || linePoints.size < 2) return

        val lineString = LineString.fromLngLats(linePoints)
        val feature = Feature.fromGeometry(lineString)

        lineSource.setGeoJson(feature)
    }

    private fun drawPolygon(polygon: List<Point>) {
        if (!::polygonSource.isInitialized || polygon.size < 3) return

        val closed = polygon.toMutableList()
        closed.add(polygon.first())

        val pol = Polygon.fromLngLats(listOf(closed))
        val feature = Feature.fromGeometry(pol)

        polygonSource.setGeoJson(feature)
    }

    private var popupView: View? = null
    private var trackingPopupView: View? = null

    private fun removePopup() {
        (popupView?.parent as? ViewGroup)?.removeView(popupView)
        popupView = null
    }

    private fun showPopupMenu(latLng: LatLng) {
        if (!::map.isInitialized || !::mapView.isInitialized) return

        removePopup()

        val view = LayoutInflater.from(this).inflate(R.layout.map_popup, mapView, false)
        val container = view.findViewById<LinearLayout>(R.id.popup_container)

        val tv = TextView(this).apply {
            text = "What's here"
            setPadding(24, 16, 24, 16)
            setOnClickListener {
                removePopup()
                whatHere(latLng)
            }
        }

        container.addView(tv)

        val from = TextView(this).apply {
            text = "From here"
            setPadding(24, 16, 24, 16)
            setOnClickListener {
                removePopup()
                startPoint = latLng

                if (startPoint != null && endPoint != null) {
                    findRoute(startPoint!!, endPoint!!)
                }
            }
        }

        container.addView(from)

        if (startPoint != null || endPoint != null) {
            val mid = TextView(this).apply {
                text = "Add mid point"
                setPadding(24, 16, 24, 16)
                setOnClickListener {
                    removePopup()
                    midPoints.add(latLng)

                    if (startPoint != null && endPoint != null) {
                        findRoute(startPoint!!, endPoint!!, midPoints)
                    }
                }
            }

            container.addView(mid)
        }

        val to = TextView(this).apply {
            text = "To here"
            setPadding(24, 16, 24, 16)
            setOnClickListener {
                removePopup()
                endPoint = latLng

                if (startPoint != null && endPoint != null) {
                    if (midPoints.isNotEmpty()) {
                        findRoute(startPoint!!, endPoint!!, midPoints)
                    } else {
                        findRoute(startPoint!!, endPoint!!)
                    }
                }
            }
        }

        container.addView(to)

        view.measure(
            View.MeasureSpec.UNSPECIFIED,
            View.MeasureSpec.UNSPECIFIED
        )

        val screenPoint = map.projection.toScreenLocation(latLng)

        view.x = screenPoint.x.toFloat() - view.measuredWidth / 2
        view.y = screenPoint.y.toFloat() - 60 - view.measuredHeight

        mapView.addView(view)
        popupView = view
    }

    private fun whatHere(latLng: LatLng) {
        SSMap.whatHere(latLng) { result, error ->
            result?.let {
                if (it.isNotEmpty()) {
                    showPopupWhathere(latLng, it[0])
                } else {
                    showPopupWhathere(latLng)
                }
            }

            error?.let {
                it.message?.let { message ->
                    Log.e("What Here", message)
                }

                showPopupWhathere(latLng)
            }
        }
    }

    private fun showPopupWhathere(latLng: LatLng, item: WhatHereResultItem? = null) {
        if (!::map.isInitialized || !::mapView.isInitialized) return

        removePopup()

        val view = LayoutInflater.from(this).inflate(R.layout.map_popup, mapView, false)
        val container = view.findViewById<LinearLayout>(R.id.popup_container)

        val tvTitle = TextView(this).apply {
            text = item?.let {
                "${it.road} ${it.tehsil} ${it.district}, ${it.state}"
            } ?: "Selected Point"

            typeface = Typeface.DEFAULT_BOLD
            maxWidth = 600
        }

        container.addView(tvTitle)

        val tvCoord = TextView(this).apply {
            text = String.format("%.4f, %.4f", latLng.latitude, latLng.longitude)
            isSingleLine = false
            maxWidth = 600
        }

        container.addView(tvCoord)

        view.measure(
            View.MeasureSpec.UNSPECIFIED,
            View.MeasureSpec.UNSPECIFIED
        )

        val screenPoint = map.projection.toScreenLocation(latLng)

        view.x = screenPoint.x.toFloat() - view.measuredWidth / 2
        view.y = screenPoint.y.toFloat() - 60 - view.measuredHeight

        mapView.addView(view)
        popupView = view
    }

    private lateinit var searchEditText: EditText
    private lateinit var searchResultsContainer: LinearLayout

    private fun setupSearch() {
        searchEditText = findViewById(R.id.searchEditText)
        searchResultsContainer = findViewById(R.id.searchResultsContainer)

        searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(
                s: CharSequence?,
                start: Int,
                count: Int,
                after: Int
            ) = Unit

            override fun onTextChanged(
                s: CharSequence?,
                start: Int,
                before: Int,
                count: Int
            ) {
                val query = s.toString()

                if (query.length > 2) {
                    performSearch(query)
                } else {
                    searchResultsContainer.removeAllViews()
                    searchResultsContainer.visibility = View.GONE
                }
            }

            override fun afterTextChanged(s: Editable?) = Unit
        })
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN) {
            val v = currentFocus

            if (v is EditText) {
                val outRect = Rect()
                v.getGlobalVisibleRect(outRect)

                if (!outRect.contains(event.rawX.toInt(), event.rawY.toInt())) {
                    v.clearFocus()

                    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                    imm.hideSoftInputFromWindow(v.windowToken, 0)
                }
            }
        }

        return super.dispatchTouchEvent(event)
    }

    private val searchHandler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null

    private fun performSearch(query: String) {
        searchRunnable?.let {
            searchHandler.removeCallbacks(it)
        }

        searchRunnable = Runnable {
            SSMap.search(query) { result, _ ->
                result?.let {
                    searchResultsContainer.removeAllViews()

                    val results = it.data

                    if (!results.isNullOrEmpty()) {
                        searchResultsContainer.visibility = View.VISIBLE

                        results.take(10).forEach { item ->
                            val textView = TextView(this).apply {
                                text = item?.name
                                setPadding(32, 24, 32, 24)
                                textSize = 16f

                                setOnClickListener {
                                    val latitude = item?.latitude
                                    val longitude = item?.longitude

                                    if (latitude == null || longitude == null) {
                                        return@setOnClickListener
                                    }

                                    drawPoint(LatLng(latitude, longitude))

                                    map.moveCamera(
                                        CameraUpdateFactory.newLatLngZoom(
                                            LatLng(latitude, longitude),
                                            12.0
                                        ),
                                        object : MapLibreMap.CancelableCallback {
                                            override fun onCancel() = Unit

                                            override fun onFinish() {
                                                showPopupSearchResult(item)
                                            }
                                        }
                                    )

                                    searchResultsContainer.visibility = View.GONE
                                }
                            }

                            searchResultsContainer.addView(textView)
                        }
                    } else {
                        searchResultsContainer.visibility = View.GONE
                        searchResultsContainer.removeAllViews()
                    }
                }
            }
        }

        searchHandler.postDelayed(searchRunnable!!, 500)
    }

    private fun showPopupSearchResult(item: SearchItem) {
        if (!::map.isInitialized || !::mapView.isInitialized) return

        val latitude = item.latitude ?: return
        val longitude = item.longitude ?: return

        removePopup()

        val view = LayoutInflater.from(this).inflate(R.layout.map_popup, mapView, false)
        val container = view.findViewById<LinearLayout>(R.id.popup_container)

        val tvTitle = TextView(this).apply {
            text = item.name
            typeface = Typeface.DEFAULT_BOLD
            maxWidth = 600
        }

        container.addView(tvTitle)

        val tvCoord = TextView(this).apply {
            text = item.address
            isSingleLine = false
            maxWidth = 600
        }

        container.addView(tvCoord)

        view.measure(
            View.MeasureSpec.UNSPECIFIED,
            View.MeasureSpec.UNSPECIFIED
        )

        val screenPoint = map.projection.toScreenLocation(LatLng(latitude, longitude))

        view.x = screenPoint.x.toFloat() - view.measuredWidth / 2
        view.y = screenPoint.y.toFloat() - 60 - view.measuredHeight

        mapView.addView(view)
        popupView = view
    }

    var startPoint: LatLng? = null
    var endPoint: LatLng? = null
    val midPoints: MutableList<LatLng> = mutableListOf()

    private lateinit var menuItemOptimizeRoute: MenuItem

    private fun findRoute(start: LatLng, end: LatLng) {
        SSMap.findRoute(start, end) { result, _ ->
            result?.let {
                val geometry = it.routes?.getOrNull(0)?.geometry ?: return@let
                val routeLine = SSMap.coordsDecode(geometry)

                drawLine(
                    routeLine.map { point ->
                        Point.fromLngLat(point.longitude, point.latitude)
                    }
                )

                drawPoints(listOf(start, end))
            }
        }
    }

    private fun findRoute(start: LatLng, end: LatLng, mids: List<LatLng>) {
        val list: List<LatLng> = buildList {
            add(start)
            addAll(mids)
            add(end)
        }

        SSMap.findRoute(list) { result, _ ->
            result?.let {
                val geometry = it.routes?.getOrNull(0)?.geometry ?: return@let
                val routeLine = SSMap.coordsDecode(geometry)

                val line = buildList {
                    add(start)
                    addAll(routeLine)
                    add(end)
                }

                drawLine(
                    line.map { point ->
                        Point.fromLngLat(point.longitude, point.latitude)
                    }
                )

                drawPoints(list)
                menuItemOptimizeRoute.isVisible = mids.size >= 2
            }
        }
    }

    private fun optimizeRoute() {
        val start = startPoint ?: return
        val end = endPoint ?: return

        val list: List<LatLng> = buildList {
            add(start)
            addAll(midPoints)
            add(end)
        }

        SSMap.optimizeRoute(list) { result, _ ->
            result?.let {
                val geometry = it.routes?.getOrNull(0)?.geometry ?: return@let
                val routeLine = SSMap.coordsDecode(geometry)

                drawLine(
                    routeLine.map { point ->
                        Point.fromLngLat(point.longitude, point.latitude)
                    }
                )

                drawPoints(list)
            }
        }
    }

    fun checkLocationPermission() {
        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ),
                1001
            )
        }
    }

    private fun saveTrackingEnabled(enabled: Boolean) {
        getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_TRACKING_ENABLED, enabled)
            .apply()
    }

    private fun isTrackingEnabledSaved(): Boolean {
        return getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_TRACKING_ENABLED, false)
    }

    private fun saveTrackingUsername(username: String) {
        getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TRACKING_USERNAME, username.trim())
            .apply()
    }

    private fun getSavedTrackingUsername(): String? {
        return getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TRACKING_USERNAME, null)
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
    }

    private fun updateSwitchUi(isOn: Boolean) {
        runOnUiThread {
            isProgrammaticSwitchUpdate = true
            switchDuty.isChecked = isOn
            switchDuty.text = if (isOn) "ON" else "OFF"
            isProgrammaticSwitchUpdate = false
        }
    }

    private fun restoreSwitchFromSavedStatus() {
        updateSwitchUi(isTrackingEnabledSaved())
    }

    private fun showTrackingMessage(message: String? = null) {
        message?.let {
            runOnUiThread {
                Toast.makeText(this, it, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun disableTrackingUiAndPreference(message: String? = null) {
        saveTrackingEnabled(false)
        pendingTrackingUsername = null
        updateSwitchUi(false)
        showTrackingMessage(message)
    }

    private fun keepTrackingIntentOn(message: String? = null) {
        saveTrackingEnabled(true)
        updateSwitchUi(true)
        showTrackingMessage(message)
    }

    private fun showUsernamePopupBeforeStart() {
        val input = EditText(this)
        input.hint = "Enter username"
        input.setSingleLine(true)
        input.setPadding(48, 32, 48, 16)

        val savedUsername = getSavedTrackingUsername()
        if (!savedUsername.isNullOrEmpty()) {
            input.setText(savedUsername)
            input.setSelection(savedUsername.length)
        }

        val container = LinearLayout(this)
        container.orientation = LinearLayout.VERTICAL
        container.setPadding(48, 16, 48, 0)
        container.addView(input)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Start Tracking")
            .setMessage("Please enter username to start tracking")
            .setView(container)
            .setPositiveButton("Start", null)
            .setNegativeButton("Cancel") { dialogInterface, _ ->
                dialogInterface.dismiss()
                disableTrackingUiAndPreference("Tracking cancelled")
            }
            .create()

        dialog.setOnShowListener {
            val startButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE)

            startButton.setOnClickListener {
                val username = input.text.toString().trim()

                if (username.isEmpty()) {
                    input.error = "Username is required"
                    input.requestFocus()
                    return@setOnClickListener
                }

                saveTrackingUsername(username)
                saveTrackingEnabled(true)
                updateSwitchUi(true)

                dialog.dismiss()
                requestPermissionsBeforeInit(username)
            }

            input.requestFocus()

            dialog.window?.setSoftInputMode(
                WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE
            )
        }

        dialog.setOnCancelListener {
            disableTrackingUiAndPreference("Tracking cancelled")
        }

        dialog.show()
    }

    private enum class PermissionStep {
        NOTIFICATIONS,
        LOCATION,
        ACTIVITY,
        DONE
    }

    private var currentPermissionStep = PermissionStep.NOTIFICATIONS

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            when (currentPermissionStep) {
                PermissionStep.NOTIFICATIONS -> {
                    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        result[Manifest.permission.POST_NOTIFICATIONS] == true
                    } else {
                        true
                    }

                    if (granted) {
                        requestLocationPermissionStep()
                    } else {
                        disableTrackingUiAndPreference("Notification permission denied")
                    }
                }

                PermissionStep.LOCATION -> {
                    val fineGranted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true
                    val coarseGranted = result[Manifest.permission.ACCESS_COARSE_LOCATION] == true

                    if (fineGranted || coarseGranted) {
                        requestActivityPermissionStep()
                    } else {
                        disableTrackingUiAndPreference("Location permission denied")
                    }
                }

                PermissionStep.ACTIVITY -> {
                    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        result[Manifest.permission.ACTIVITY_RECOGNITION] == true
                    } else {
                        true
                    }

                    if (granted) {
                        currentPermissionStep = PermissionStep.DONE

                        val username = pendingTrackingUsername ?: getSavedTrackingUsername()

                        if (username.isNullOrEmpty()) {
                            disableTrackingUiAndPreference("Username is required")
                        } else {
                            initSdkAndStartTracking(username)
                        }
                    } else {
                        val username = pendingTrackingUsername ?: getSavedTrackingUsername()

                        if (username.isNullOrEmpty()) {
                            disableTrackingUiAndPreference("Username is required")
                        } else {
                            currentPermissionStep = PermissionStep.DONE
                            initSdkAndStartTracking(username)
                        }
                    }
                }

                PermissionStep.DONE -> Unit
            }
        }

    private fun requestPermissionsBeforeInit(username: String) {
        val cleanUsername = username.trim()

        if (cleanUsername.isEmpty()) {
            disableTrackingUiAndPreference("Username is required")
            return
        }

        pendingTrackingUsername = cleanUsername
        requestNotificationPermissionStep()
    }

    private fun requestNotificationPermissionStep() {
        currentPermissionStep = PermissionStep.NOTIFICATIONS

        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            requestLocationPermissionStep()
            return
        }

        permissionLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
    }

    private fun requestLocationPermissionStep() {
        currentPermissionStep = PermissionStep.LOCATION

        val fineGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (fineGranted || coarseGranted) {
            requestActivityPermissionStep()
            return
        }

        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    private fun requestActivityPermissionStep() {
        currentPermissionStep = PermissionStep.ACTIVITY

        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            currentPermissionStep = PermissionStep.DONE

            val username = pendingTrackingUsername ?: getSavedTrackingUsername()

            if (username.isNullOrEmpty()) {
                disableTrackingUiAndPreference("Username is required")
            } else {
                initSdkAndStartTracking(username)
            }

            return
        }

        permissionLauncher.launch(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION))
    }

    private fun initSdkAndStartTracking(username: String) {
        val cleanUsername = username.trim()

        if (cleanUsername.isEmpty()) {
            disableTrackingUiAndPreference("Username is required")
            return
        }

        if (!isTrackingEnabledSaved()) {
            Log.d(TAG, "Saved tracking status is OFF. Not starting SDK.")
            updateSwitchUi(false)
            return
        }

        if (trackingStartInProgress) {
            Log.d(TAG, "Tracking start already in progress. Ignoring duplicate request.")
            return
        }

        trackingStartInProgress = true
        updateSwitchUi(true)

        try {
            sdk.initSDK(
                baseUrl = BASE_URL,
                apiKey = API_KEY,
                username = cleanUsername,
                context = this,
                clientId = CLIENT_ID
            ) { success, token, error ->
                if (success) {
                    Log.d(TAG, "SDK initialized for username=$cleanUsername. Token: $token")
                    startTrackingInternal()
                } else {
                    Log.e(TAG, "SDK init failed ❌: $error")
                    trackingStartInProgress = false

                    // Temporary SDK/network failure must not erase user's ON intent.
                    // keepTrackingIntentOn("Tracking will retry when connectivity is available")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "initSDK exception: ${e.message}")
            trackingStartInProgress = false

            // Temporary SDK/network failure must not erase user's ON intent.
            // keepTrackingIntentOn("Tracking will retry when connectivity is available")
        }
    }

    private fun startTrackingInternal() {
        if (!isTrackingEnabledSaved()) {
            Log.d(TAG, "Saved tracking status became OFF. Not starting tracking.")
            trackingStartInProgress = false
            updateSwitchUi(false)
            return
        }

        try {
            sdk.startTracking(
                onSuccess = {
                    Log.d(TAG, "Tracking started ✅")
                    trackingStartInProgress = false
                    saveTrackingEnabled(true)
                    updateSwitchUi(true)
                },
                onError = {
                    Log.e(TAG, "Tracking failed ❌: $it")
                    trackingStartInProgress = false

                    // Temporary SDK/network failure must not erase user's ON intent.
                    // keepTrackingIntentOn("Tracking will retry when connectivity is available")
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "startTracking exception: ${e.message}")
            trackingStartInProgress = false

            // Temporary SDK/network failure must not erase user's ON intent.
            // keepTrackingIntentOn("Tracking will retry when connectivity is available")
        }
    }

    private fun stopTrackingInternal() {
        if (trackingStopInProgress) {
            Log.d(TAG, "Tracking stop already in progress. Ignoring duplicate request.")
            return
        }

        trackingStopInProgress = true

        saveTrackingEnabled(false)
        pendingTrackingUsername = null
        updateSwitchUi(false)

        try {
            sdk.stopTracking(
                onSuccess = {
                    trackingStopInProgress = false
                    Log.d(TAG, "Tracking stopped ✅")
                    saveTrackingEnabled(false)
                    updateSwitchUi(false)
                },
                onError = {
                    trackingStopInProgress = false
                    Log.e(TAG, "Stop failed ❌: $it")

                    saveTrackingEnabled(false)
                    updateSwitchUi(false)
                }
            )
        } catch (e: Exception) {
            trackingStopInProgress = false
            Log.e(TAG, "Stop exception: ${e.message}")

            saveTrackingEnabled(false)
            updateSwitchUi(false)
        }
    }

    private fun syncSwitchWithTrackingState(autoRestartIfNeeded: Boolean) {
        val shouldBeTracking = isTrackingEnabledSaved()

        updateSwitchUi(shouldBeTracking)

        if (!shouldBeTracking) {
            return
        }

        try {
            sdk.getState(
                onResult = { isTracking, _ ->
                    runOnUiThread {
                        when {
                            isTracking -> {
                                saveTrackingEnabled(true)
                                updateSwitchUi(true)
                            }

                            autoRestartIfNeeded && !trackingStartInProgress -> {
                                updateSwitchUi(true)

                                val savedUsername = getSavedTrackingUsername()

                                if (!savedUsername.isNullOrEmpty()) {
                                    requestPermissionsBeforeInit(savedUsername)
                                } else {
                                    disableTrackingUiAndPreference("Username is required")
                                }
                            }

                            else -> {
                                updateSwitchUi(true)
                            }
                        }
                    }
                },
                onError = { error ->
                    Log.e(TAG, "getState failed: $error")

                    runOnUiThread {
                        updateSwitchUi(true)

                        if (autoRestartIfNeeded && !trackingStartInProgress) {
                            val savedUsername = getSavedTrackingUsername()

                            if (!savedUsername.isNullOrEmpty()) {
                                requestPermissionsBeforeInit(savedUsername)
                            } else {
                                disableTrackingUiAndPreference("Username is required")
                            }
                        }
                    }
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "syncSwitch exception: ${e.message}")

            runOnUiThread {
                updateSwitchUi(true)

                if (autoRestartIfNeeded && !trackingStartInProgress) {
                    val savedUsername = getSavedTrackingUsername()

                    if (!savedUsername.isNullOrEmpty()) {
                        requestPermissionsBeforeInit(savedUsername)
                    } else {
                        disableTrackingUiAndPreference("Username is required")
                    }
                }
            }
        }
    }

    private fun attachSwitchListener() {
        switchDuty.setOnCheckedChangeListener { _, isChecked ->
            if (isProgrammaticSwitchUpdate) return@setOnCheckedChangeListener

            if (isChecked) {
                showUsernamePopupBeforeStart()
            } else {
                stopTrackingInternal()
            }
        }
    }

    private fun showLoader() {
        progressDialog = android.app.ProgressDialog(this).apply {
            setMessage("Loading tracking data...")
            setCancelable(false)
            show()
        }
    }

    private fun hideLoader() {
        progressDialog?.dismiss()
        progressDialog = null
    }

    private fun callGetTrackingData(showLoading: Boolean = false) {
        if (trackingApiCallInProgress) {
            Log.d("TRACKING_REFRESH", "Tracking API call already running. Skipping duplicate request.")
            return
        }

        trackingApiCallInProgress = true

        if (showLoading) {
            showLoader()
        }

        val api = APIClientService
            .getClient(BASE_URL)
            .create(APIInterfaceMethods::class.java)

        api.getTrackingData()
            .enqueue(object : Callback<TrackingResponse> {

                override fun onResponse(
                    call: Call<TrackingResponse>,
                    response: Response<TrackingResponse>
                ) {
                    trackingApiCallInProgress = false

                    if (showLoading) {
                        hideLoader()
                    }

                    if (response.isSuccessful) {
                        val trackers = response.body()?.data?.trackers ?: emptyList()

                        Log.d("TRACKING_API", "Trackers size: ${trackers.size}")
                        updateTrackingClusterLayer(trackers)
                    } else {
                        Log.e("TRACKING_API", "Error code: ${response.code()}")
                        Log.e("TRACKING_API", "Error body: ${response.errorBody()?.string()}")
                    }
                }

                override fun onFailure(call: Call<TrackingResponse>, t: Throwable) {
                    trackingApiCallInProgress = false

                    if (showLoading) {
                        hideLoader()
                    }

                    Log.e("TRACKING_API", "API failed: ${t.message}")
                }
            })
    }

    private fun updateTrackingClusterLayer(trackers: List<Tracker>) {
        if (!::map.isInitialized) {
            Log.e("TRACKING_CLUSTER", "Map not initialized")
            return
        }

        val features = mutableListOf<Feature>()

        trackers.forEach { tracker ->
            tracker.trackingInfo?.forEach { info ->
                val lat = info.lat
                val lng = info.lng

                if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
                    val feature = Feature.fromGeometry(
                        Point.fromLngLat(lng, lat)
                    )

                    val tsSeconds = info.ts ?: 0L

                    feature.addStringProperty("driver", tracker.driver ?: "")
                    feature.addStringProperty("trackerId", info.trackerId ?: "")
                    feature.addBooleanProperty("isActive", info.isActive ?: false)
                    feature.addNumberProperty("timestamp", tsSeconds)
                    feature.addStringProperty("trackingTime", formatTrackingTime(tsSeconds))

                    features.add(feature)
                }
            }
        }

        val featureCollection = FeatureCollection.fromFeatures(features)

        map.getStyle { style ->

            val existingSource =
                style.getSourceAs<GeoJsonSource>(TRACKING_CLUSTER_SOURCE_ID)

            if (existingSource == null) {
                val source = GeoJsonSource(
                    TRACKING_CLUSTER_SOURCE_ID,
                    featureCollection,
                    GeoJsonOptions()
                        .withCluster(true)
                        .withClusterMaxZoom(14)
                        .withClusterRadius(50)
                )

                style.addSource(source)
                Log.d("TRACKING_CLUSTER", "Cluster source added with marker icon")
            } else {
                existingSource.setGeoJson(featureCollection)
                Log.d("TRACKING_CLUSTER", "Cluster source updated")
            }

            if (style.getLayer(TRACKING_CLUSTER_MARKER_LAYER_ID) == null) {
                val clusterMarkerLayer = SymbolLayer(
                    TRACKING_CLUSTER_MARKER_LAYER_ID,
                    TRACKING_CLUSTER_SOURCE_ID
                ).withProperties(
                    iconImage(TRACKING_MARKER_ICON_ID),
                    iconSize(
                        step(
                            toNumber(get("point_count")),
                            literal(1.20f),
                            literal(10), literal(1.40f),
                            literal(50), literal(1.70f),
                            literal(100), literal(2.00f)
                        )
                    ),
                    iconAllowOverlap(true)
                )

                clusterMarkerLayer.setFilter(
                    has("point_count")
                )

                style.addLayer(clusterMarkerLayer)
                Log.d("TRACKING_CLUSTER", "Cluster marker layer added")
            }

            if (style.getLayer(TRACKING_CLUSTER_COUNT_LAYER_ID) == null) {
                val clusterCountLayer = SymbolLayer(
                    TRACKING_CLUSTER_COUNT_LAYER_ID,
                    TRACKING_CLUSTER_SOURCE_ID
                ).withProperties(
                    textField("{point_count_abbreviated}"),
                    textSize(12f),
                    textColor("#FFFFFF"),
                    textHaloColor("#000000"),
                    textHaloWidth(1f),
                    textAnchor(TEXT_ANCHOR_CENTER),
                    textJustify(TEXT_JUSTIFY_CENTER),
                    textOffset(arrayOf(0f, -0.35f)),
                    textAllowOverlap(true)
                )

                clusterCountLayer.setFilter(
                    has("point_count")
                )

                style.addLayer(clusterCountLayer)
                Log.d("TRACKING_CLUSTER", "Cluster count layer added")
            }

            if (style.getLayer(TRACKING_UNCLUSTERED_MARKER_LAYER_ID) == null) {
                val unclusteredMarkerLayer = SymbolLayer(
                    TRACKING_UNCLUSTERED_MARKER_LAYER_ID,
                    TRACKING_CLUSTER_SOURCE_ID
                ).withProperties(
                    iconImage(TRACKING_MARKER_ICON_ID),
                    iconSize(1.00f),
                    iconAllowOverlap(true)
                )

                unclusteredMarkerLayer.setFilter(
                    not(has("point_count"))
                )

                style.addLayer(unclusteredMarkerLayer)
                Log.d("TRACKING_CLUSTER", "Unclustered marker layer added")
            }

            Log.d("TRACKING_CLUSTER", "Total tracking points: ${features.size}")
        }
    }

    private fun setupTrackingPointClickListener() {
        map.addOnMapClickListener { latLng ->

            val screenPoint = map.projection.toScreenLocation(latLng)

            val clusterFeatures = map.queryRenderedFeatures(
                screenPoint,
                TRACKING_CLUSTER_MARKER_LAYER_ID
            )

            if (clusterFeatures.isNotEmpty()) {
                clearTrackingPopup()

                map.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(
                        latLng,
                        map.cameraPosition.zoom + 2.0
                    )
                )

                return@addOnMapClickListener true
            }

            val pointFeatures = map.queryRenderedFeatures(
                screenPoint,
                TRACKING_UNCLUSTERED_MARKER_LAYER_ID
            )

            if (pointFeatures.isNotEmpty()) {
                val feature = pointFeatures[0]
                val geometry = feature.geometry() as? Point

                val driverName = feature.getStringProperty("driver") ?: "Unknown"
                val trackingTime = feature.getStringProperty("trackingTime") ?: "N/A"

                val popupLat = geometry?.latitude() ?: latLng.latitude
                val popupLng = geometry?.longitude() ?: latLng.longitude

                showTrackingPopup(
                    lat = popupLat,
                    lng = popupLng,
                    driverName = driverName,
                    trackingTime = trackingTime
                )

                return@addOnMapClickListener true
            }

            clearTrackingPopup()
            false
        }
    }
    private fun showTrackingPopup(
        lat: Double,
        lng: Double,
        driverName: String,
        trackingTime: String
    ) {
        if (!::map.isInitialized || !::mapView.isInitialized) return

        removeTrackingPopup()

        val latLng = LatLng(lat, lng)

        val view = LayoutInflater.from(this)
            .inflate(R.layout.tracking_driver_popup, mapView, false)

        val tvDriverName = view.findViewById<TextView>(R.id.tvDriverName)
        val tvTimestamp = view.findViewById<TextView>(R.id.timestamp)

        tvTimestamp.text = "As on: $trackingTime"
        tvDriverName.text = driverName.ifEmpty { "Unknown Driver" }


        view.measure(
            View.MeasureSpec.UNSPECIFIED,
            View.MeasureSpec.UNSPECIFIED
        )

        val screenPoint = map.projection.toScreenLocation(latLng)

        view.x = screenPoint.x.toFloat() - view.measuredWidth / 2
        view.y = screenPoint.y.toFloat() - view.measuredHeight - 18

        mapView.addView(view)
        trackingPopupView = view
    }

    private fun clearTrackingPopup() {
        removeTrackingPopup()
    }

    private fun addTrackingPopupLayerIfNeeded() {
        map.getStyle { style ->

            if (style.getSource(TRACKING_POPUP_SOURCE_ID) == null) {
                style.addSource(
                    GeoJsonSource(
                        TRACKING_POPUP_SOURCE_ID,
                        FeatureCollection.fromFeatures(emptyArray())
                    )
                )
            }

            if (style.getLayer(TRACKING_POPUP_LAYER_ID) == null) {
                val popupLayer = SymbolLayer(
                    TRACKING_POPUP_LAYER_ID,
                    TRACKING_POPUP_SOURCE_ID
                ).withProperties(
                    textField("{driver}"),
                    textSize(14f),
                    textColor("#000000"),
                    textHaloColor("#FFFFFF"),
                    textHaloWidth(2f),
                    textOffset(arrayOf(0f, -1.6f)),
                    textAllowOverlap(true)
                )

                style.addLayer(popupLayer)
            }
        }
    }

    private fun removeTrackingPopup() {
        (trackingPopupView?.parent as? ViewGroup)?.removeView(trackingPopupView)
        trackingPopupView = null
    }

    private fun formatTrackingTime(ts: Long?): String {
        if (ts == null || ts <= 0) return "N/A"

        return try {
            val date = Date(ts * 1000L)
            val formatter = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault())
            formatter.format(date)
        } catch (e: Exception) {
            "N/A"
        }
    }

    private fun startTrackingInfoRefresh() {
        if (isTrackingRefreshRunning) return

        isTrackingRefreshRunning = true
        trackingRefreshHandler.removeCallbacks(trackingRefreshRunnable)
        trackingRefreshHandler.postDelayed(trackingRefreshRunnable, trackingRefreshIntervalMs)

        Log.d("TRACKING_REFRESH", "Tracking refresh started")
    }

    private fun stopTrackingInfoRefresh() {
        isTrackingRefreshRunning = false
        trackingRefreshHandler.removeCallbacks(trackingRefreshRunnable)

        Log.d("TRACKING_REFRESH", "Tracking refresh stopped")
    }
}