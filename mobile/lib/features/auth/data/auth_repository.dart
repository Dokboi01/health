import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/models/app_role.dart';
import '../../../core/network/api_client.dart';
import '../domain/entities/auth_session.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<AuthSession> signIn({
    required String email,
    required String password,
    required AppRole role,
  }) async {
    if (AppConstants.useMockAuth) {
      await Future<void>.delayed(const Duration(milliseconds: 700));

      if (password.length < 4) {
        throw Exception('Use a longer password in demo mode.');
      }

      return AuthSession(
        userId: 'demo-${role.name}',
        fullName: switch (role) {
          AppRole.admin => 'Platform Admin',
          AppRole.doctor => 'Dr. Amara Bello',
          AppRole.patient => 'David Okafor',
        },
        email: email,
        role: role,
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      final payload =
          response.data?['data'] as Map<String, dynamic>? ?? const <String, dynamic>{};
      return AuthSession.fromApi(payload);
    } on DioException catch (error) {
      final responseData = error.response?.data;
      String? message;

      if (responseData is Map<String, dynamic>) {
        final errorPayload = responseData['error'];

        if (errorPayload is Map<String, dynamic>) {
          message = errorPayload['message'] as String?;
        }
      }

      throw Exception(message ?? 'Unable to sign in right now.');
    }
  }

  Future<void> signOut() async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }
}
