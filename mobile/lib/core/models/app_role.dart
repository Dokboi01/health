import '../../app/router/route_names.dart';

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
        AppRole.admin => RouteNames.adminDashboard,
        AppRole.doctor => RouteNames.doctorDashboard,
        AppRole.patient => RouteNames.patientDashboard,
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
