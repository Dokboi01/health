import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/services/firebase_messaging_service.dart';
import '../core/services/push_notification_coordinator.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';
import '../features/auth/presentation/providers/auth_controller.dart';

class HealthApp extends ConsumerStatefulWidget {
  const HealthApp({super.key});

  @override
  ConsumerState<HealthApp> createState() => _HealthAppState();
}

class _HealthAppState extends ConsumerState<HealthApp> {
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundMessageSubscription;
  StreamSubscription<RemoteMessage>? _openedMessageSubscription;

  @override
  void initState() {
    super.initState();

    final coordinator = ref.read(pushNotificationCoordinatorProvider);
    final messagingService = ref.read(firebaseMessagingServiceProvider);

    unawaited(coordinator.initialize());

    _tokenRefreshSubscription = messagingService.tokenRefreshStream.listen((_) {
      final session = ref.read(authControllerProvider).session;

      if (session != null) {
        unawaited(ref.read(pushNotificationCoordinatorProvider).syncSessionDeviceToken(session));
      }
    });

    _foregroundMessageSubscription = messagingService.foregroundMessages.listen(
      ref.read(pushNotificationCoordinatorProvider).handleForegroundMessage,
    );
    _openedMessageSubscription = messagingService.openedMessages.listen(
      ref.read(pushNotificationCoordinatorProvider).handleOpenedMessage,
    );
  }

  @override
  void dispose() {
    unawaited(_tokenRefreshSubscription?.cancel());
    unawaited(_foregroundMessageSubscription?.cancel());
    unawaited(_openedMessageSubscription?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      if (next.status == AuthStatus.authenticated && next.session != null) {
        unawaited(ref.read(pushNotificationCoordinatorProvider).syncSessionDeviceToken(next.session!));
      }
    });

    final router = ref.watch(goRouterProvider);

    return MaterialApp.router(
      title: 'CareAxis',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
