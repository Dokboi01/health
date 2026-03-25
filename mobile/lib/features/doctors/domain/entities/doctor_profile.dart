class DoctorProfile {
  const DoctorProfile({
    required this.fullName,
    required this.email,
    required this.phone,
    required this.specialty,
    required this.clinicName,
    required this.licenseNumber,
    required this.yearsExperience,
    required this.bio,
    required this.activePatients,
    required this.upcomingAppointments,
    required this.activePrescriptions,
  });

  final String fullName;
  final String email;
  final String phone;
  final String specialty;
  final String clinicName;
  final String licenseNumber;
  final int yearsExperience;
  final String bio;
  final int activePatients;
  final int upcomingAppointments;
  final int activePrescriptions;

  factory DoctorProfile.fromApi(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final metrics = json['metrics'] as Map<String, dynamic>? ?? const <String, dynamic>{};

    return DoctorProfile(
      fullName: '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? 'No phone added',
      specialty: profile['specialty'] as String? ?? '',
      clinicName: profile['clinicName'] as String? ?? 'Independent practice',
      licenseNumber: profile['licenseNumber'] as String? ?? '',
      yearsExperience: metrics['yearsExperience'] as int? ?? profile['yearsExperience'] as int? ?? 0,
      bio: profile['bio'] as String? ?? '',
      activePatients: metrics['activePatients'] as int? ?? 0,
      upcomingAppointments: metrics['upcomingAppointments'] as int? ?? 0,
      activePrescriptions: metrics['activePrescriptions'] as int? ?? 0,
    );
  }
}

