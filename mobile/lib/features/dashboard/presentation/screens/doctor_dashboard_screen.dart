import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/dashboard_scaffold.dart';
import '../../../../core/widgets/metric_card.dart';
import '../../../../core/widgets/mini_trend_chart.dart';
import '../../../../core/widgets/section_card.dart';
import '../../../auth/presentation/providers/auth_controller.dart';

class DoctorDashboardScreen extends ConsumerWidget {
  const DoctorDashboardScreen({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authControllerProvider.notifier).signOut();
    if (context.mounted) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DashboardScaffold(
      title: 'Doctor Dashboard',
      subtitle:
          'Stay ahead of your day with patient snapshots, appointment readiness, and prescription flow.',
      accentColor: const Color(0xFF3CB2A8),
      onLogout: () => _logout(context, ref),
      metricCards: const [
        MetricCard(
          label: 'Appointments today',
          value: '11',
          caption: '3 checkups begin in the next 90 minutes',
          icon: Icons.calendar_month_outlined,
          iconBackground: Color(0xFFE3F0FF),
        ),
        MetricCard(
          label: 'Assigned patients',
          value: '86',
          caption: '9 require follow-up this week',
          icon: Icons.favorite_border_rounded,
          iconBackground: Color(0xFFEAF9F3),
        ),
        MetricCard(
          label: 'Active prescriptions',
          value: '54',
          caption: '7 adherence alerts need review',
          icon: Icons.receipt_long_outlined,
          iconBackground: Color(0xFFFFF2E3),
        ),
      ],
      sections: [
        const SectionCard(
          title: 'Patient engagement trend',
          subtitle: 'Completed consultations and follow-up adherence over the last 7 days.',
          child: MiniTrendChart(
            points: [18, 22, 20, 28, 32, 29, 36],
            color: AppColors.accentGreen,
          ),
        ),
        const SizedBox(height: 16),
        const SectionCard(
          title: 'Next actions',
          subtitle: 'These are the kinds of high-value workflows we will flesh out in the next phases.',
          child: Column(
            children: [
              _DashboardListTile(
                title: '09:30 - Review consultation notes for David Okafor',
                trailing: 'Upcoming',
              ),
              Divider(height: 24),
              _DashboardListTile(
                title: '13:00 - Approve refill request for hypertension medication',
                trailing: 'Pending',
              ),
              Divider(height: 24),
              _DashboardListTile(
                title: '15:30 - Upload lab interpretation to patient record',
                trailing: 'Scheduled',
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

