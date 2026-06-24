package com.sstrackingdemo

import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object APIClientService {

    private var retrofit: Retrofit? = null
    private var currentBaseUrl: String? = null

    fun getClient(newBaseUrl: String): Retrofit {
        // Only recreate if the instance is null OR the URL has changed
        if (retrofit == null || newBaseUrl != currentBaseUrl) {
            Log.d("APIClient", "Building new Retrofit instance for: $newBaseUrl")

            currentBaseUrl = newBaseUrl

            val interceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(interceptor)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(newBaseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .client(client)
                .build()
        }

        return retrofit!!
    }
}