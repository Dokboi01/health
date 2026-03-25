class PatientProfile {
  const PatientProfile({
    required this.fullName,
    required this.email,
    required this.phone,
    required this.bloodGroup,
    required this.genotype,
    required this.emergencyContactName,
    required this.emergencyContactPhone,
    required this.city,
    required this.careTeamSize,
    required this.upcomingAppointments,
    required this.activeMedications,
  });

  final String fullName;
  final String email;
  final String phone;
  final String bloodGroup;
  final String genotype;
  final String emergencyContactName;
  final String emergencyContactPhone;
  final String city;
  final int careTeamSize;
  final int upcomingAppointments;
  final int activeMedications;

  factory PatientProfile.fromApi(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final metrics = json['metrics'] as Map<String, dynamic>? ?? const <String, dynamic>{};

    return PatientProfile(
      fullName: '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? 'No phone added',
      bloodGroup: profile['bloodGroup'] as String? ?? 'Unknown',
      genotype: profile['genotype'] as String? ?? 'Unknown',
      emergencyContactName: profile['emergencyContactName'] as String? ?? 'Not set',
      emergencyContactPhone: profile['emergencyContactPhone'] as String? ?? 'Not set',
      city: profile['city'] as String? ?? 'No city added',
      careTeamSize: metrics['careTeamSize'] as int? ?? 0,
      upcomingAppointments: metrics['upcomingAppointments'] as int? ?? 0,
      activeMedications: metrics['activeMedications'] as int? ?? 0,
    );
  }
}

