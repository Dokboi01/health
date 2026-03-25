import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/detail_info_row.dart';
import '../../../../core/widgets/metric_card.dart';
import '../../../../core/widgets/section_card.dart';
import '../providers/patients_providers.dart';

class PatientProfileScreen extends ConsumerWidget {
  const PatientProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(patientProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Profile'),
      ),
      body: SafeArea(
        child: profileAsync.when(
          data: (profile) => SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF0E6BA8),
                        AppColors.accentGreen,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.fullName,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'A calm, complete view of identity, emergency contact, and ongoing care context.',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Colors.white.withValues(alpha: 0.92),
                              height: 1.5,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 14,
                  runSpacing: 14,
                  children: [
                    SizedBox(
                      width: 250,
                      child: MetricCard(
                        label: 'Care team',
                        value: '${profile.careTeamSize}',
                        caption: 'Doctors linked to this patient profile',
                        icon: Icons.groups_2_outlined,
                        iconBackground: AppColors.accentGreenSoft,
                      ),
                    ),
                    SizedBox(
                      width: 250,
                      child: MetricCard(
                        label: 'Appointments ahead',
                        value: '${profile.upcomingAppointments}',
                        caption: 'Scheduled upcoming visits',
                        icon: Icons.event_available_outlined,
                        iconBackground: const Color(0xFFE3F0FF),
                      ),
                    ),
                    SizedBox(
                      width: 250,
                      child: MetricCard(
                        label: 'Active medications',
                        value: '${profile.activeMedications}',
                        caption: 'Current adherence workload',
                        icon: Icons.medication_outlined,
                        iconBackground: const Color(0xFFFFF2E3),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SectionCard(
                  title: 'Personal and emergency details',
                  subtitle: 'The patient management API is built to drive this view directly.',
                  child: Column(
                    children: [
                      DetailInfoRow(label: 'Email', value: profile.email),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Phone', value: profile.phone),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Blood group', value: profile.bloodGroup),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Genotype', value: profile.genotype),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Emergency contact', value: profile.emergencyContactName),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Emergency phone', value: profile.emergencyContactPhone),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'City', value: profile.city),
                    ],
                  ),
                ),
              ],
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: Text(
              'Unable to load patient profile.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        ),
      ),
    );
  }
}
