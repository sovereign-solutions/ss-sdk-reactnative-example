//
//  SsTrackingSdkModule.m
//  SampleMap
//
//  Created by surya on 25/09/26.
//


#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SsTrackingSdkModule, NSObject)

RCT_EXTERN_METHOD(
  initAndStartTracking:
    (NSString *)authBaseUrl
  registrationBaseUrl:
    (NSString *)registrationBaseUrl
  trackingServerURL:
    (NSString *)trackingServerURL
  apiKey:
    (NSString *)apiKey
  username:
    (NSString *)username
  clientId:
    (NSString *)clientId
  tenantName:
    (NSString *)tenantName
  skipLogin:
    (BOOL)skipLogin
  accessToken:
    (NSString *)accessToken
  resolver:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  startTracking:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  stopTracking:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getTrackingState:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  syncTracking:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  refreshAccessToken:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  destroyTrackingSdk:
    (RCTPromiseResolveBlock)resolve
  rejecter:
    (RCTPromiseRejectBlock)reject
)

@end
