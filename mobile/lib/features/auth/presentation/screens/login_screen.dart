import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/forms/validators/field_validators.dart';
import '../../../../core/models/app_role.dart';
import '../providers/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'doctor@careaxis.dev');
  final _passwordController = TextEditingController(text: 'Secure123');
  AppRole _selectedRole = AppRole.doctor;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    FocusScope.of(context).unfocus();

    await ref.read(authControllerProvider.notifier).signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
          role: _selectedRole,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      if (next.status == AuthStatus.authenticated && next.session != null) {
        context.go(next.session!.role.dashboardRoute);
      }

      if (next.status == AuthStatus.failure && next.errorMessage != null) {
        ScaffoldMessenger.of(context)
          ..clearSnackBars()
          ..showSnackBar(
            SnackBar(content: Text(next.errorMessage!)),
          );
      }
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFFF6FBFF),
              Color(0xFFEFF8F4),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 960),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Wrap(
                      spacing: 28,
                      runSpacing: 28,
                      children: [
                        SizedBox(
                          width: 360,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.accentGreenSoft,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  'Premium healthcare operations',
                                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                              const SizedBox(height: 22),
                              Text(
                                'Connected care, elegantly organized.',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      height: 1.15,
                                    ),
                              ),
                              const SizedBox(height: 14),
                              Text(
                                'CareAxis gives admins, doctors, and patients one secure home for appointments, records, prescriptions, and reminders.',
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      color: AppColors.textMuted,
                                      height: 1.6,
                                    ),
                              ),
                              const SizedBox(height: 28),
                              Container(
                                padding: const EdgeInsets.all(22),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      AppColors.primaryBlueDark,
                                      AppColors.primaryBlue,
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(28),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'What this shell already includes',
                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    const SizedBox(height: 18),
                                    const _FeatureBullet(text: 'Role-based login flow powered by Riverpod'),
                                    const _FeatureBullet(text: 'Dashboard shells for admin, doctor, and patient'),
                                    const _FeatureBullet(text: 'Production-oriented Node + PostgreSQL backend foundation'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          width: 420,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Sign in',
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w800,
                                    ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                AppConstants.useMockAuth
                                    ? 'Demo mode is enabled. Pick a role and sign in to preview the experience.'
                                    : 'Use your registered account credentials.',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: AppColors.textMuted,
                                    ),
                              ),
                              const SizedBox(height: 28),
                              Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    TextFormField(
                                      controller: _emailController,
                                      keyboardType: TextInputType.emailAddress,
                                      decoration: const InputDecoration(
                                        labelText: 'Email address',
                                        prefixIcon: Icon(Icons.mail_outline_rounded),
                                      ),
                                      validator: FieldValidators.email,
                                    ),
                                    const SizedBox(height: 18),
                                    TextFormField(
                                      controller: _passwordController,
                                      obscureText: true,
                                      decoration: const InputDecoration(
                                        labelText: 'Password',
                                        prefixIcon: Icon(Icons.lock_outline_rounded),
                                      ),
                                      validator: (value) =>
                                          FieldValidators.minLength(value, 4, fieldName: 'Password'),
                                    ),
                                    const SizedBox(height: 18),
                                    Text(
                                      'Role preview',
                                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    const SizedBox(height: 10),
                                    SegmentedButton<AppRole>(
                                      showSelectedIcon: false,
                                      segments: AppRole.values
                                          .map(
                                            (role) => ButtonSegment<AppRole>(
                                              value: role,
                                              label: Text(role.label),
                                            ),
                                          )
                                          .toList(),
                                      selected: {_selectedRole},
                                      onSelectionChanged: (selection) {
                                        setState(() {
                                          _selectedRole = selection.first;
                                        });
                                      },
                                    ),
                                    const SizedBox(height: 24),
                                    SizedBox(
                                      width: double.infinity,
                                      child: FilledButton(
                                        onPressed: authState.isLoading ? null : _submit,
                                        child: authState.isLoading
                                            ? const SizedBox(
                                                height: 20,
                                                width: 20,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  color: Colors.white,
                                                ),
                                              )
                                            : const Text('Continue to dashboard'),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),
                              Container(
                                padding: const EdgeInsets.all(18),
                                decoration: BoxDecoration(
                                  color: AppColors.background,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Text(
                                  'Demo credentials: any valid-looking email and a password of at least 4 characters.',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: AppColors.textMuted,
                                      ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureBullet extends StatelessWidget {
  const _FeatureBullet({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 4),
            height: 9,
            width: 9,
            decoration: const BoxDecoration(
              color: Color(0xFFB7F2DA),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white,
                    height: 1.5,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
