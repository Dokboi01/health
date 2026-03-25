import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(ref.watch(apiClientProvider));
});

class NotificationsRepository {
  NotificationsRepository(this._dio);

  final Dio _dio;

  Future<void> registerDeviceToken({
    required String accessToken,
    required String token,
    required String platform,
  }) async {
    try {
      await _dio.post<void>(
        '/notifications/device-tokens',
        data: {
          'token': token,
          'platform': platform,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $accessToken',
          },
        ),
      );
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map<String, dynamic>) {
        final errorPayload = responseData['error'];

        if (errorPayload is Map<String, dynamic>) {
          throw ApiException(
            message: errorPayload['message'] as String? ?? 'Unable to register device token.',
            code: errorPayload['code'] as String?,
            statusCode: error.response?.statusCode,
          );
        }
      }

      throw ApiException(
        message: 'Unable to register device token.',
        statusCode: error.response?.statusCode,
      );
    }
  }
}
