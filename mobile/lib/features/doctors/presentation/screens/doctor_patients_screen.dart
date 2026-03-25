import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../core/widgets/empty_state_card.dart';
import '../../../../core/widgets/status_chip.dart';
import '../providers/doctors_providers.dart';

class DoctorPatientsScreen extends ConsumerStatefulWidget {
  const DoctorPatientsScreen({super.key});

  @override
  ConsumerState<DoctorPatientsScreen> createState() => _DoctorPatientsScreenState();
}

class _DoctorPatientsScreenState extends ConsumerState<DoctorPatientsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final patientsAsync = ref.watch(doctorPatientsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Patients'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search by patient name or email',
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
                child: patientsAsync.when(
                  data: (patients) {
                    final query = _searchController.text.trim().toLowerCase();
                    final filtered = patients.where((patient) {
                      if (query.isEmpty) {
                        return true;
                      }

                      return patient.fullName.toLowerCase().contains(query) ||
                          patient.email.toLowerCase().contains(query);
                    }).toList(growable: false);

                    if (filtered.isEmpty) {
                      return const EmptyStateCard(
                        title: 'No matching patients yet',
                        subtitle:
                            'As patient relationships grow, search and status filters will help doctors move faster.',
                        icon: Icons.group_off_outlined,
                      );
                    }

                    return ListView.separated(
                      itemCount: filtered.length,
                      separatorBuilder: (_, index) => const SizedBox(height: 14),
                      itemBuilder: (context, index) {
                        final patient = filtered[index];

                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: AppColors.accentGreenSoft,
                                      child: Text(
                                        patient.fullName.isNotEmpty ? patient.fullName[0] : 'P',
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
                                            patient.fullName,
                                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                  fontWeight: FontWeight.w800,
                                                ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            patient.email,
                                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                                  color: AppColors.textMuted,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    StatusChip(
                                      label: patient.relationshipStatus,
                                      isPositive: patient.relationshipStatus == 'ACTIVE',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    _InfoPill(label: 'Phone', value: patient.phone),
                                    _InfoPill(label: 'Blood group', value: patient.bloodGroup),
                                    _InfoPill(label: 'Genotype', value: patient.genotype),
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
                      'Unable to load patients right now.',
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
