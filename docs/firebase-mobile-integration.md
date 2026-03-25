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

The remaining Firebase-specific step is either to authenticate the Firebase CLI and run:

```bash
flutterfire configure --project=careaxis-5caee
```

or to register those app IDs manually in Firebase and download:

- `google-services.json` for Android
- `GoogleService-Info.plist` for iOS

## What You Need To Do Next

1. Log in to the Firebase CLI on this machine:

```bash
firebase login
```

2. In the Firebase console, create:

- an Android app with package name `com.careaxis.mobile`
- an iOS app with bundle ID `com.careaxis.mobile`

3. Then either run FlutterFire configure:

```bash
flutterfire configure --project=careaxis-5caee
```

or place the downloaded native config files in:

- `mobile/android/app/google-services.json`
- `mobile/ios/Runner/GoogleService-Info.plist`

4. Rebuild the app after the generated Firebase config lands.

## Current App Behavior

- If Firebase is not configured yet, the app will fail gracefully and keep running.
- If Firebase is configured and the user signs in against the real backend, the app will register the device token through:

`POST /api/v1/notifications/device-tokens`

## Reference

- Firebase Flutter setup: https://firebase.google.com/docs/flutter/setup
- `firebase_core`: https://pub.dev/packages/firebase_core
- `firebase_messaging`: https://pub.dev/packages/firebase_messaging
