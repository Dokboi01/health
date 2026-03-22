import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/dashboard/presentation/screens/admin_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/doctor_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/patient_dashboard_screen.dart';
import '../../features/splash/presentation/screens/splash_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/dashboard/admin',
        builder: (context, state) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: '/dashboard/doctor',
        builder: (context, state) => const DoctorDashboardScreen(),
      ),
      GoRoute(
        path: '/dashboard/patient',
        builder: (context, state) => const PatientDashboardScreen(),
      ),
    ],
  );
});

