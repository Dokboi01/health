import '../../../../core/models/app_role.dart';

class AuthSession {
  const AuthSession({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.role,
    required this.accessToken,
    required this.refreshToken,
  });

  final String userId;
  final String fullName;
  final String email;
  final AppRole role;
  final String accessToken;
  final String refreshToken;

  factory AuthSession.fromApi(Map<String, dynamic> payload) {
    final user = payload['user'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final tokens = payload['tokens'] as Map<String, dynamic>? ?? const <String, dynamic>{};

    return AuthSession(
      userId: user['id'] as String? ?? '',
      fullName:
          '${user['firstName'] as String? ?? ''} ${user['lastName'] as String? ?? ''}'.trim(),
      email: user['email'] as String? ?? '',
      role: AppRole.fromValue(user['role'] as String? ?? 'PATIENT'),
      accessToken: tokens['accessToken'] as String? ?? '',
      refreshToken: tokens['refreshToken'] as String? ?? '',
    );
  }
}
