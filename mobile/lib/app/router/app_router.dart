import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'route_names.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/dashboard/presentation/screens/admin_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/doctor_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/patient_dashboard_screen.dart';
import '../../features/doctors/presentation/screens/doctor_patients_screen.dart';
import '../../features/doctors/presentation/screens/doctor_profile_screen.dart';
import '../../features/patients/presentation/screens/patient_doctors_screen.dart';
import '../../features/patients/presentation/screens/patient_profile_screen.dart';
import '../../features/splash/presentation/screens/splash_screen.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RouteNames.splash,
    routes: [
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.adminDashboard,
        builder: (context, state) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: RouteNames.doctorDashboard,
        builder: (context, state) => const DoctorDashboardScreen(),
      ),
      GoRoute(
        path: RouteNames.patientDashboard,
        builder: (context, state) => const PatientDashboardScreen(),
      ),
      GoRoute(
        path: RouteNames.doctorProfile,
        builder: (context, state) => const DoctorProfileScreen(),
      ),
      GoRoute(
        path: RouteNames.doctorPatients,
        builder: (context, state) => const DoctorPatientsScreen(),
      ),
      GoRoute(
        path: RouteNames.patientProfile,
        builder: (context, state) => const PatientProfileScreen(),
      ),
      GoRoute(
        path: RouteNames.patientDoctors,
        builder: (context, state) => const PatientDoctorsScreen(),
      ),
    ],
  );
});
