import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/empty_state_card.dart';
import '../../../../core/widgets/status_chip.dart';
import '../providers/patients_providers.dart';

class PatientDoctorsScreen extends ConsumerStatefulWidget {
  const PatientDoctorsScreen({super.key});

  @override
  ConsumerState<PatientDoctorsScreen> createState() => _PatientDoctorsScreenState();
}

class _PatientDoctorsScreenState extends ConsumerState<PatientDoctorsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final doctorsAsync = ref.watch(patientDoctorsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Doctors'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search by doctor name, specialty, or clinic',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _searchController.clear()),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 18),
              Expanded(
                child: doctorsAsync.when(
                  data: (doctors) {
                    final query = _searchController.text.trim().toLowerCase();
                    final filtered = doctors.where((doctor) {
                      if (query.isEmpty) {
                        return true;
                      }

                      return doctor.fullName.toLowerCase().contains(query) ||
                          doctor.specialty.toLowerCase().contains(query) ||
                          doctor.clinicName.toLowerCase().contains(query);
                    }).toList(growable: false);

                    if (filtered.isEmpty) {
                      return const EmptyStateCard(
                        title: 'No matching doctors',
                        subtitle:
                            'Care team search and filtering will become especially useful once more specialties are added.',
                        icon: Icons.medical_information_outlined,
                      );
                    }

                    return ListView.separated(
                      itemCount: filtered.length,
                      separatorBuilder: (_, index) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final doctor = filtered[index];

                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: const Color(0xFFE3F0FF),
                                      child: Text(
                                        doctor.fullName.isNotEmpty ? doctor.fullName[0] : 'D',
                                        style: const TextStyle(
                                          color: AppColors.textPrimary,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            doctor.fullName,
                                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                  fontWeight: FontWeight.w800,
                                                ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${doctor.specialty}  •  ${doctor.clinicName}',
                                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                                  color: AppColors.textMuted,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (doctor.isPrimaryDoctor)
                                      const StatusChip(label: 'Primary', isPositive: true),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    _InfoPill(label: 'Email', value: doctor.email),
                                    _InfoPill(label: 'Phone', value: doctor.phone),
                                    StatusChip(
                                      label: doctor.relationshipStatus,
                                      isPositive: doctor.relationshipStatus == 'ACTIVE',
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, stackTrace) => Center(
                    child: Text(
                      'Unable to load care team right now.',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(
        '$label: $value',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
