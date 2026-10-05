//
//  SsTrackingSdkModule.swift
//  SampleMap
//
//  Created by surya on 25/09/26.
//


import Foundation
import React
import Sovereigniostracking

@objc(SsTrackingSdkModule)
final class SsTrackingSdkModule: NSObject {

    private let sdk = SSBackgroundGeolocation.shared

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc(initAndStartTracking:registrationBaseUrl:trackingServerURL:apiKey:username:clientId:tenantName:skipLogin:accessToken:resolver:rejecter:)
    func initAndStartTracking(
        _ authBaseUrl: String,
        registrationBaseUrl: String,
        trackingServerURL: String,
        apiKey: String,
        username: String,
        clientId: String,
        tenantName: String,
        skipLogin: Bool,
        accessToken: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            self.sdk.initSDK(
                authBaseUrl: authBaseUrl,
                registrationBaseUrl: registrationBaseUrl,
                trackingServerURL: trackingServerURL,
                apiKey: apiKey,
                username: username,
                clientId: clientId,
                accessToken: accessToken,
                skipLogin: skipLogin,
                tenantName: tenantName
            ) { success, token, error in

                guard success else {
                    reject(
                        "INIT_SDK_ERROR",
                        error ?? "SDK initialization failed",
                        nil
                    )
                    return
                }

                self.sdk.startTracking(
                    onSuccess: {
                        resolve([
                            "success": true,
                            "message": "Tracking started successfully",
                            "username": username,
                            "accessToken": token ?? ""
                        ])
                    },
                    onError: { message in
                        reject("START_TRACKING_ERROR", message, nil)
                    }
                )
            }
        }
    }

    @objc(startTracking:rejecter:)
    func startTracking(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            self.sdk.startTracking(
                onSuccess: {
                    resolve("Tracking started")
                },
                onError: { message in
                    reject("START_TRACKING_ERROR", message, nil)
                }
            )
        }
    }

    @objc(stopTracking:rejecter:)
    func stopTracking(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            self.sdk.stopTracking(
                onSuccess: {
                    resolve("Tracking stopped")
                },
                onError: { message in
                    reject("STOP_TRACKING_ERROR", message, nil)
                }
            )
        }
    }

    @objc(getTrackingState:rejecter:)
    func getTrackingState(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        sdk.getState(
            onResult: { enabled, trackingMode in
                resolve([
                    "enabled": enabled,
                    "trackingMode": trackingMode ?? ""
                ])
            },
            onError: { message in
                reject("GET_STATE_ERROR", message, nil)
            }
        )
    }

    @objc(syncTracking:rejecter:)
    func syncTracking(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        sdk.sync(
            onSuccess: {
                resolve("Sync completed")
            },
            onError: { message in
                reject("SYNC_ERROR", message, nil)
            }
        )
    }

    @objc(refreshAccessToken:rejecter:)
    func refreshAccessToken(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        sdk.refreshAccessToken { success, token, error in
            if success {
                resolve([
                    "success": true,
                    "accessToken": token ?? ""
                ])
            } else {
                reject(
                    "TOKEN_REFRESH_ERROR",
                    error ?? "Token refresh failed",
                    nil
                )
            }
        }
    }

    @objc(destroyTrackingSdk:rejecter:)
    func destroyTrackingSdk(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            self.sdk.destroy(
                onSuccess: {
                    resolve("Tracking SDK destroyed")
                },
                onError: { message in
                    reject("DESTROY_SDK_ERROR", message, nil)
                }
            )
        }
    }
}
