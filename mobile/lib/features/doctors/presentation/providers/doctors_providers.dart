import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_controller.dart';
import '../../data/doctors_repository.dart';
import '../../domain/entities/doctor_patient_summary.dart';
import '../../domain/entities/doctor_profile.dart';

final doctorProfileProvider = FutureProvider<DoctorProfile>((ref) async {
  final token = ref.watch(authControllerProvider).session?.accessToken;
  return ref.watch(doctorsRepositoryProvider).fetchMyProfile(accessToken: token);
});

final doctorPatientsProvider = FutureProvider<List<DoctorPatientSummary>>((ref) async {
  final token = ref.watch(authControllerProvider).session?.accessToken;
  return ref.watch(doctorsRepositoryProvider).fetchMyPatients(accessToken: token);
});

