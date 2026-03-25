import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router/route_names.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/dashboard_scaffold.dart';
import '../../../../core/widgets/metric_card.dart';
import '../../../../core/widgets/mini_trend_chart.dart';
import '../../../../core/widgets/section_card.dart';
import '../../../auth/presentation/providers/auth_controller.dart';

class PatientDashboardScreen extends ConsumerWidget {
  const PatientDashboardScreen({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authControllerProvider.notifier).signOut();
    if (context.mounted) {
      context.go(RouteNames.login);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DashboardScaffold(
      title: 'Patient Care Hub',
      subtitle:
          'Track your next appointment, medication schedule, and medical history in one calm, focused experience.',
      accentColor: const Color(0xFF4CBF90),
      onLogout: () => _logout(context, ref),
      metricCards: const [
        MetricCard(
          label: 'Upcoming appointments',
          value: '2',
          caption: 'Nearest visit is tomorrow at 10:00 AM',
          icon: Icons.event_available_outlined,
          iconBackground: Color(0xFFE3F0FF),
        ),
        MetricCard(
          label: 'Active medications',
          value: '4',
          caption: '1 reminder due in the next hour',
          icon: Icons.medication_outlined,
          iconBackground: Color(0xFFEAF9F3),
        ),
        MetricCard(
          label: 'Medical records',
          value: '18',
          caption: 'Latest lab result uploaded 2 days ago',
          icon: Icons.folder_open_outlined,
          iconBackground: Color(0xFFFFF2E3),
        ),
      ],
      sections: [
        const SectionCard(
          title: 'Medication adherence',
          subtitle: 'A simple progress view can make reminders feel more reassuring than stressful.',
          child: MiniTrendChart(
            points: [80, 84, 78, 88, 92, 90, 96],
            color: AppColors.primaryBlue,
          ),
        ),
        const SizedBox(height: 16),
        SectionCard(
          title: 'Phase 2 quick access',
          subtitle: 'Open the patient profile and care team views introduced in this phase.',
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              FilledButton.tonalIcon(
                onPressed: () => context.push(RouteNames.patientProfile),
                icon: const Icon(Icons.person_outline_rounded),
                label: const Text('View profile'),
              ),
              FilledButton.tonalIcon(
                onPressed: () => context.push(RouteNames.patientDoctors),
                icon: const Icon(Icons.local_hospital_outlined),
                label: const Text('My doctors'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const SectionCard(
          title: 'Today at a glance',
          subtitle: 'This summary becomes the heart of the patient home experience.',
          child: Column(
            children: [
              _DashboardListTile(
                title: '08:00 - Take Amlodipine 5mg',
                trailing: 'Due soon',
              ),
              Divider(height: 24),
              _DashboardListTile(
                title: '10:00 - Video consultation with Dr. Bello',
                trailing: 'Tomorrow',
              ),
              Divider(height: 24),
              _DashboardListTile(
                title: 'View updated blood pressure report',
                trailing: 'New',
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
