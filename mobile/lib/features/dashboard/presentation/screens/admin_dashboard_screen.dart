import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/dashboard_scaffold.dart';
import '../../../../core/widgets/metric_card.dart';
import '../../../../core/widgets/mini_trend_chart.dart';
import '../../../../core/widgets/section_card.dart';
import '../../../auth/presentation/providers/auth_controller.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authControllerProvider.notifier).signOut();
    if (context.mounted) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DashboardScaffold(
      title: 'Admin Command Center',
      subtitle:
          'Monitor platform health, user growth, and operational risk from one secure overview.',
      accentColor: AppColors.accentGreen,
      onLogout: () => _logout(context, ref),
      metricCards: const [
        MetricCard(
          label: 'Active doctors',
          value: '128',
          caption: '12 newly verified this month',
          icon: Icons.medical_services_outlined,
          iconBackground: Color(0xFFE3F0FF),
        ),
        MetricCard(
          label: 'Registered patients',
          value: '8,460',
          caption: '4.8% month-over-month growth',
          icon: Icons.groups_2_outlined,
          iconBackground: Color(0xFFEAF9F3),
        ),
        MetricCard(
          label: 'Reminders sent today',
          value: '2,145',
          caption: '98.7% successful delivery rate',
          icon: Icons.notifications_active_outlined,
          iconBackground: Color(0xFFFFF2E3),
        ),
      ],
      sections: [
        const SectionCard(
          title: 'Weekly platform activity',
          subtitle: 'Appointments, prescriptions, and notifications are trending upward.',
          child: MiniTrendChart(
            points: [12, 24, 20, 34, 40, 43, 55],
            color: AppColors.primaryBlue,
          ),
        ),
        const SizedBox(height: 16),
        const SectionCard(
          title: 'Operational priorities',
          subtitle: 'The admin panel will expand into moderation, audit, and governance tools.',
          child: Column(
            children: [
              _DashboardListTile(
                title: 'Review pending doctor verifications',
                trailing: '14 awaiting action',
              ),
              Divider(height: 24),
              _DashboardListTile(
                title: 'Investigate failed push notification batches',
                trailing: '2 incidents',
              ),
              Divider(height: 24),
              _DashboardListTile(
                title: 'Export monthly compliance audit pack',
                trailing: 'Ready',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DashboardListTile extends StatelessWidget {
  const _DashboardListTile({
    required this.title,
    required this.trailing,
  });

  final String title;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        Text(
          trailing,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
        ),
      ],
    );
  }
}

