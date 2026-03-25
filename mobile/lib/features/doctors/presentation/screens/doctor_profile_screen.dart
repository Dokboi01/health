import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/detail_info_row.dart';
import '../../../../core/widgets/metric_card.dart';
import '../../../../core/widgets/section_card.dart';
import '../providers/doctors_providers.dart';

class DoctorProfileScreen extends ConsumerWidget {
  const DoctorProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(doctorProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Doctor Profile'),
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
                        AppColors.primaryBlueDark,
                        AppColors.primaryBlue,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 34,
                        backgroundColor: Colors.white.withValues(alpha: 0.18),
                        child: Text(
                          profile.fullName.isNotEmpty ? profile.fullName[0] : 'D',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        profile.fullName,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${profile.specialty}  •  ${profile.clinicName}',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Colors.white.withValues(alpha: 0.92),
                            ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        profile.bio,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.white.withValues(alpha: 0.9),
                              height: 1.55,
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
                        label: 'Active patients',
                        value: '${profile.activePatients}',
                        caption: 'People currently under your care team',
                        icon: Icons.groups_outlined,
                        iconBackground: AppColors.accentGreenSoft,
                      ),
                    ),
                    SizedBox(
                      width: 250,
                      child: MetricCard(
                        label: 'Upcoming visits',
                        value: '${profile.upcomingAppointments}',
                        caption: 'Confirmed or pending sessions ahead',
                        icon: Icons.calendar_month_outlined,
                        iconBackground: const Color(0xFFE3F0FF),
                      ),
                    ),
                    SizedBox(
                      width: 250,
                      child: MetricCard(
                        label: 'Active prescriptions',
                        value: '${profile.activePrescriptions}',
                        caption: 'Currently open treatment plans',
                        icon: Icons.receipt_long_outlined,
                        iconBackground: const Color(0xFFFFF2E3),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SectionCard(
                  title: 'Professional details',
                  subtitle: 'The Phase 2 profile API is designed to populate this section directly.',
                  child: Column(
                    children: [
                      DetailInfoRow(label: 'Email', value: profile.email),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Phone', value: profile.phone),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'License number', value: profile.licenseNumber),
                      const Divider(height: 1),
                      DetailInfoRow(
                        label: 'Experience',
                        value: '${profile.yearsExperience} years',
                      ),
                      const Divider(height: 1),
                      DetailInfoRow(label: 'Clinic', value: profile.clinicName),
                    ],
                  ),
                ),
              ],
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: Text(
              'Unable to load doctor profile.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        ),
      ),
    );
  }
}
