class PatientDoctorSummary {
  const PatientDoctorSummary({
    required this.doctorId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.specialty,
    required this.clinicName,
    required this.relationshipStatus,
    required this.isPrimaryDoctor,
  });

  final String doctorId;
  final String fullName;
  final String email;
  final String phone;
  final String specialty;
  final String clinicName;
  final String relationshipStatus;
  final bool isPrimaryDoctor;

  factory PatientDoctorSummary.fromApi(Map<String, dynamic> json) {
    return PatientDoctorSummary(
      doctorId: json['doctorId'] as String? ?? '',
      fullName: '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? 'Not provided',
      specialty: json['specialty'] as String? ?? 'General Practice',
      clinicName: json['clinicName'] as String? ?? 'CareAxis Clinic',
      relationshipStatus: json['relationshipStatus'] as String? ?? 'ACTIVE',
      isPrimaryDoctor: json['isPrimaryDoctor'] as bool? ?? false,
    );
  }
}

