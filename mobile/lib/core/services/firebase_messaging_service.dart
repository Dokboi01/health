import 'dart:async';

import 'package:careaxis_mobile/firebase_options.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final firebaseMessagingServiceProvider = Provider<FirebaseMessagingService>((ref) {
  final service = FirebaseMessagingService(FirebaseMessaging.instance);
  ref.onDispose(service.dispose);
  return service;
});

bool _supportsFirebaseMessaging() {
  if (kIsWeb) {
    return false;
  }

  return switch (defaultTargetPlatform) {
    TargetPlatform.android => true,
    TargetPlatform.iOS => true,
    _ => false,
  };
}

Future<bool> ensureFirebaseInitializedSafely() async {
  if (!_supportsFirebaseMessaging()) {
    return false;
  }

  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }

    return true;
  } catch (error, stackTrace) {
    debugPrint('Firebase initialization failed: $error');
    debugPrintStack(stackTrace: stackTrace);
    return false;
  }
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await ensureFirebaseInitializedSafely();
  debugPrint('Background push received: ${message.messageId}');
}

class FirebaseMessagingService {
  FirebaseMessagingService(this._messaging);

  final FirebaseMessaging _messaging;

  final StreamController<RemoteMessage> _foregroundMessagesController =
      StreamController<RemoteMessage>.broadcast();
  final StreamController<RemoteMessage> _openedMessagesController =
      StreamController<RemoteMessage>.broadcast();
  final StreamController<String> _tokenRefreshController =
      StreamController<String>.broadcast();

  StreamSubscription<RemoteMessage>? _foregroundMessagesSubscription;
  StreamSubscription<RemoteMessage>? _openedMessagesSubscription;
  StreamSubscription<String>? _tokenRefreshSubscription;

  bool _initialized = false;
  bool _firebaseAvailable = false;

  Stream<RemoteMessage> get foregroundMessages => _foregroundMessagesController.stream;
  Stream<RemoteMessage> get openedMessages => _openedMessagesController.stream;
  Stream<String> get tokenRefreshStream => _tokenRefreshController.stream;

  Future<bool> initialize() async {
    if (_initialized) {
      return _firebaseAvailable;
    }

    _initialized = true;
    _firebaseAvailable = await ensureFirebaseInitializedSafely();

    if (!_firebaseAvailable) {
      return false;
    }

    await _messaging.setAutoInitEnabled(true);
    await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    _foregroundMessagesSubscription = FirebaseMessaging.onMessage.listen(
      _foregroundMessagesController.add,
    );
    _openedMessagesSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
      _openedMessagesController.add,
    );
    _tokenRefreshSubscription = _messaging.onTokenRefresh.listen(
      _tokenRefreshController.add,
    );

    final initialMessage = await _messaging.getInitialMessage();

    if (initialMessage != null) {
      scheduleMicrotask(() => _openedMessagesController.add(initialMessage));
    }

    return true;
  }

  Future<String?> getDeviceToken() async {
    final initialized = await initialize();

    if (!initialized) {
      return null;
    }

    try {
      return _messaging.getToken();
    } catch (error, stackTrace) {
      debugPrint('Unable to fetch Firebase messaging token: $error');
      debugPrintStack(stackTrace: stackTrace);
      return null;
    }
  }

  void dispose() {
    unawaited(_foregroundMessagesSubscription?.cancel());
    unawaited(_openedMessagesSubscription?.cancel());
    unawaited(_tokenRefreshSubscription?.cancel());
    unawaited(_foregroundMessagesController.close());
    unawaited(_openedMessagesController.close());
    unawaited(_tokenRefreshController.close());
  }
}
