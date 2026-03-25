import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/domain/entities/auth_session.dart';
import '../../features/auth/presentation/providers/auth_controller.dart';
import '../../features/notifications/data/notifications_repository.dart';
import '../constants/app_constants.dart';
import 'firebase_messaging_service.dart';

final pushNotificationCoordinatorProvider = Provider<PushNotificationCoordinator>((ref) {
  return PushNotificationCoordinator(
    ref,
    ref.watch(firebaseMessagingServiceProvider),
    ref.watch(notificationsRepositoryProvider),
  );
});

class PushNotificationCoordinator {
  PushNotificationCoordinator(
    this._ref,
    this._messagingService,
    this._notificationsRepository,
  );

  final Ref _ref;
  final FirebaseMessagingService _messagingService;
  final NotificationsRepository _notificationsRepository;

  Future<void> initialize() async {
    if (!AppConstants.enableFirebaseMessaging) {
      return;
    }

    final initialized = await _messagingService.initialize();

    if (!initialized) {
      return;
    }

    final session = _ref.read(authControllerProvider).session;

    if (session != null) {
      await syncSessionDeviceToken(session);
    }
  }

  Future<void> syncSessionDeviceToken(AuthSession session) async {
    if (!AppConstants.enableFirebaseMessaging || AppConstants.useMockAuth) {
      return;
    }

    if (session.accessToken.isEmpty) {
      return;
    }

    final token = await _messagingService.getDeviceToken();

    if (token == null || token.isEmpty) {
      return;
    }

    try {
      await _notificationsRepository.registerDeviceToken(
        accessToken: session.accessToken,
        token: token,
        platform: _resolvePlatform(),
      );
    } catch (error, stackTrace) {
      debugPrint('Failed to register FCM device token: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  void handleForegroundMessage(RemoteMessage message) {
    debugPrint('Foreground push received: ${message.messageId} ${message.data}');
  }

  void handleOpenedMessage(RemoteMessage message) {
    debugPrint('Push opened by user: ${message.messageId} ${message.data}');
    debugPrint(
      'Notification tap routing is ready for a future notifications screen or deep-link flow.',
    );
  }

  String _resolvePlatform() {
    if (kIsWeb) {
      return 'WEB';
    }

    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'ANDROID',
      TargetPlatform.iOS => 'IOS',
      _ => 'WEB',
    };
  }
}
