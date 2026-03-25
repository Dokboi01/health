import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/entities/patient_doctor_summary.dart';
import '../domain/entities/patient_profile.dart';

final patientsRepositoryProvider = Provider<PatientsRepository>((ref) {
  return PatientsRepository(ref.watch(apiClientProvider));
});

class PatientsRepository {
  PatientsRepository(this._dio);

  final Dio _dio;

  Future<PatientProfile> fetchMyProfile({String? accessToken}) async {
    if (AppConstants.useMockAuth) {
      await Future<void>.delayed(const Duration(milliseconds: 250));

      return const PatientProfile(
        fullName: 'David Okafor',
        email: 'patient@careaxis.dev',
        phone: '+234 803 111 2299',
        bloodGroup: 'O+',
        genotype: 'AA',
        emergencyContactName: 'Ngozi Okafor',
        emergencyContactPhone: '+234 808 444 5000',
        city: 'Lagos',
        careTeamSize: 2,
        upcomingAppointments: 2,
        activeMedications: 4,
      );
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/patients/me',
      options: Options(
        headers: {
          if (accessToken != null && accessToken.isNotEmpty) 'Authorization': 'Bearer $accessToken',
        },
      ),
    );

    final payload = response.data?['data'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    return PatientProfile.fromApi(payload);
  }

  Future<List<PatientDoctorSummary>> fetchMyDoctors({String? accessToken}) async {
    if (AppConstants.useMockAuth) {
      await Future<void>.delayed(const Duration(milliseconds: 250));

      return const [
        PatientDoctorSummary(
          doctorId: 'd1',
          fullName: 'Dr. Amara Bello',
          email: 'amara@careaxis.dev',
          phone: '+234 801 234 5678',
          specialty: 'Cardiology',
          clinicName: 'CareAxis Heart & Wellness',
          relationshipStatus: 'ACTIVE',
          isPrimaryDoctor: true,
        ),
        PatientDoctorSummary(
          doctorId: 'd2',
          fullName: 'Dr. Tolu Adebayo',
          email: 'tolu@careaxis.dev',
          phone: '+234 812 555 1212',
          specialty: 'Internal Medicine',
          clinicName: 'Lifeline Medical Centre',
          relationshipStatus: 'ACTIVE',
          isPrimaryDoctor: false,
        ),
      ];
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/patients/me/doctors',
      options: Options(
        headers: {
          if (accessToken != null && accessToken.isNotEmpty) 'Authorization': 'Bearer $accessToken',
        },
      ),
    );

    final payload = response.data?['data'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final items = payload['items'] as List<dynamic>? ?? const [];

    return items
        .whereType<Map<String, dynamic>>()
        .map(PatientDoctorSummary.fromApi)
        .toList(growable: false);
  }
}

