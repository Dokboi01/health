class DoctorPatientSummary {
  const DoctorPatientSummary({
    required this.patientId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.bloodGroup,
    required this.genotype,
    required this.relationshipStatus,
  });

  final String patientId;
  final String fullName;
  final String email;
  final String phone;
  final String bloodGroup;
  final String genotype;
  final String relationshipStatus;

  factory DoctorPatientSummary.fromApi(Map<String, dynamic> json) {
    return DoctorPatientSummary(
      patientId: json['patientId'] as String? ?? '',
      fullName: '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? 'Not provided',
      bloodGroup: json['bloodGroup'] as String? ?? 'Unknown',
      genotype: json['genotype'] as String? ?? 'Unknown',
      relationshipStatus: json['relationshipStatus'] as String? ?? 'ACTIVE',
    );
  }
}

