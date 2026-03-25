# Firebase Mobile Integration

This project now includes Flutter-side Firebase Messaging integration in Dart:

- Firebase bootstrap registration
- FCM token fetch and refresh handling
- device-token sync to the backend notifications API
- foreground, background, and notification-open event hooks
- Android and iOS Flutter platform scaffolding
- Android Google Services plugin wiring
- Android 13 notification permission and iOS remote-notification background mode

## Implemented Files

- `mobile/lib/core/services/firebase_messaging_service.dart`
- `mobile/lib/core/services/push_notification_coordinator.dart`
- `mobile/lib/features/notifications/data/notifications_repository.dart`
- `mobile/lib/app/app.dart`
- `mobile/lib/bootstrap.dart`
- `mobile/lib/firebase_options.dart`
- `mobile/firebase.json`
- `mobile/android/app/google-services.json`
- `mobile/android/...`
- `mobile/ios/...`

## Current State

The project now has generated native Flutter platform folders for:

- `mobile/android/`
- `mobile/ios/`

The production mobile app identifiers are now:

- Android application ID: `com.careaxis.mobile`
- Android namespace: `com.careaxis.mobile`
- iOS bundle ID: `com.careaxis.mobile`

FlutterFire has been configured successfully against Firebase project `careaxis-5caee`.
The app now initializes Firebase with generated `DefaultFirebaseOptions.currentPlatform`.

## What You Need To Do Next

1. Rebuild the Flutter app so the generated Firebase configuration is picked up.

2. For full iOS push delivery, still complete Apple push setup:

- enable the Push Notifications capability in the iOS target
- configure an APNs authentication key or certificate in the Firebase console

3. For backend push delivery, keep the backend FCM service-account values populated in `backend/.env`.

## Current App Behavior

- If the user signs in against the real backend, the app will register the device token through:

`POST /api/v1/notifications/device-tokens`

## Reference

- Firebase Flutter setup: https://firebase.google.com/docs/flutter/setup
- `firebase_core`: https://pub.dev/packages/firebase_core
- `firebase_messaging`: https://pub.dev/packages/firebase_messaging
