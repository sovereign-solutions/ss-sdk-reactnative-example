
package com.sstrackingdemo.models
data class TrackingResponse(
    val result: Int,
    val status: Status,
    val data: TrackingData
)