import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  await runZonedGuarded(
    () async {
      runApp(const ProviderScope(child: HealthApp()));
    },
    (error, stackTrace) {
      debugPrint('Unhandled app error: $error');
      debugPrintStack(stackTrace: stackTrace);
    },
  );
}

