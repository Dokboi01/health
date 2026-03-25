import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/entities/doctor_patient_summary.dart';
import '../domain/entities/doctor_profile.dart';

final doctorsRepositoryProvider = Provider<DoctorsRepository>((ref) {
  return DoctorsRepository(ref.watch(apiClientProvider));
});

class DoctorsRepository {
  DoctorsRepository(this._dio);

  final Dio _dio;

  Future<DoctorProfile> fetchMyProfile({String? accessToken}) async {
    if (AppConstants.useMockAuth) {
      await Future<void>.delayed(const Duration(milliseconds: 250));

      return const DoctorProfile(
        fullName: 'Dr. Amara Bello',
        email: 'doctor@careaxis.dev',
        phone: '+234 801 234 5678',
        specialty: 'Cardiology',
        clinicName: 'CareAxis Heart & Wellness',
        licenseNumber: 'MD-NG-48291',
        yearsExperience: 11,
        bio:
            'Focused on preventive cardiology, long-term hypertension care, and clear patient communication.',
        activePatients: 86,
        upcomingAppointments: 11,
        activePrescriptions: 54,
      );
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/doctors/me',
      options: Options(
        headers: {
          if (accessToken != null && accessToken.isNotEmpty) 'Authorization': 'Bearer $accessToken',
        },
      ),
    );

    final payload = response.data?['data'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    return DoctorProfile.fromApi(payload);
  }

  Future<List<DoctorPatientSummary>> fetchMyPatients({String? accessToken}) async {
    if (AppConstants.useMockAuth) {
      await Future<void>.delayed(const Duration(milliseconds: 250));

      return const [
        DoctorPatientSummary(
          patientId: 'p1',
          fullName: 'David Okafor',
          email: 'david@example.com',
          phone: '+234 809 100 2211',
          bloodGroup: 'O+',
          genotype: 'AA',
          relationshipStatus: 'ACTIVE',
        ),
        DoctorPatientSummary(
          patientId: 'p2',
          fullName: 'Chioma Eze',
          email: 'chioma@example.com',
          phone: '+234 706 333 1199',
          bloodGroup: 'A+',
          genotype: 'AS',
          relationshipStatus: 'ACTIVE',
        ),
        DoctorPatientSummary(
          patientId: 'p3',
          fullName: 'Kunle Adeyemi',
          email: 'kunle@example.com',
          phone: '+234 803 555 8181',
          bloodGroup: 'B+',
          genotype: 'AA',
          relationshipStatus: 'PENDING',
        ),
      ];
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/doctors/me/patients',
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
        .map(DoctorPatientSummary.fromApi)
        .toList(growable: false);
  }
}

