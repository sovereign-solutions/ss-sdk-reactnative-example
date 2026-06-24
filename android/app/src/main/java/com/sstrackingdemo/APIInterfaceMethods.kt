package com.sstrackingdemo

import com.ss.tslocationmanager.TokenRequest
import com.ss.tslocationmanager.TokenResponse
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.Header
import retrofit2.http.POST
import com.sstrackingdemo.models.TrackingResponse
import retrofit2.http.Headers

interface APIInterfaceMethods {

    @POST("gateway/authen/generate-token")
    fun generateToken(
        @Header("X-Sovereign-Api-Key") apiKey: String,
        @Body request: TokenRequest
    ): Call<TokenResponse>

    @FormUrlEncoded
    @POST("gateway/authen/refresh-token")
    fun refreshToken(
        @Header("X-Sovereign-Api-Key") apiKey: String,
        @Field("grant_type") grantType: String = "refresh_token",
        @Field("refresh_token") refreshToken: String,
        @Field("client_id") clientId: String
    ): Call<TokenResponse>

    @Headers("Content-Type: application/json")
    @POST("gateway/testing/tracking/live/sample")
    fun getTrackingData(): Call<TrackingResponse>

}