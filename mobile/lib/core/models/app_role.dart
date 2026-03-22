enum AppRole {
  admin,
  doctor,
  patient;

  String get label => switch (this) {
        AppRole.admin => 'Admin',
        AppRole.doctor => 'Doctor',
        AppRole.patient => 'Patient',
      };

  String get apiValue => switch (this) {
        AppRole.admin => 'ADMIN',
        AppRole.doctor => 'DOCTOR',
        AppRole.patient => 'PATIENT',
      };

  String get dashboardRoute => switch (this) {
        AppRole.admin => '/dashboard/admin',
        AppRole.doctor => '/dashboard/doctor',
        AppRole.patient => '/dashboard/patient',
      };

  static AppRole fromValue(String value) {
    switch (value.toUpperCase()) {
      case 'ADMIN':
        return AppRole.admin;
      case 'DOCTOR':
        return AppRole.doctor;
      default:
        return AppRole.patient;
    }
  }
}

