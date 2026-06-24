

package com.sstrackingdemo.models
data class TrackingInfo(
    val trackerId: String,
    val lat: Double,
    val lng: Double,
    val ts: Long,
    val speed: Double,
    val heading: Double,
    val device_status: Int,
    val session: String,
    val employee_username: String,
    val employee_organization_id: Int,
    val employee_team_id: Int,
    val employee_type_id: Int,
    val received: Long,
    val employee_full_name: String,
    val address: String,
    val action_code: String,
    val typeCode: String,
    val event_ts: Long,
    val motionActivity: Int,
    val employee_status: Int,
    val isActive: Boolean
)