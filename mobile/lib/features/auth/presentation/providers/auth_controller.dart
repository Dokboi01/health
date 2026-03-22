import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/app_role.dart';
import '../../data/auth_repository.dart';
import '../../domain/entities/auth_session.dart';

enum AuthStatus {
  unauthenticated,
  loading,
  authenticated,
  failure,
}

class AuthState {
  const AuthState({
    required this.status,
    this.session,
    this.errorMessage,
  });

  final AuthStatus status;
  final AuthSession? session;
  final String? errorMessage;

  bool get isLoading => status == AuthStatus.loading;
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

class AuthController extends Notifier<AuthState> {
  AuthRepository get _repository => ref.read(authRepositoryProvider);

  @override
  AuthState build() {
    return const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> signIn({
    required String email,
    required String password,
    required AppRole role,
  }) async {
    state = AuthState(status: AuthStatus.loading, session: state.session);

    try {
      final session = await _repository.signIn(
        email: email,
        password: password,
        role: role,
      );

      state = AuthState(
        status: AuthStatus.authenticated,
        session: session,
      );
    } catch (error) {
      state = AuthState(
        status: AuthStatus.failure,
        errorMessage: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> signOut() async {
    await _repository.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}
