import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_controller.dart';
import '../../data/patients_repository.dart';
import '../../domain/entities/patient_doctor_summary.dart';
import '../../domain/entities/patient_profile.dart';

final patientProfileProvider = FutureProvider<PatientProfile>((ref) async {
  final token = ref.watch(authControllerProvider).session?.accessToken;
  return ref.watch(patientsRepositoryProvider).fetchMyProfile(accessToken: token);
});

final patientDoctorsProvider = FutureProvider<List<PatientDoctorSummary>>((ref) async {
  final token = ref.watch(authControllerProvider).session?.accessToken;
  return ref.watch(patientsRepositoryProvider).fetchMyDoctors(accessToken: token);
});
