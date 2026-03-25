# CareAxis Product Blueprint

## 1. Full product requirements

### Product vision

CareAxis is a high-trust digital health platform that helps clinics and independent doctors manage patients, while giving patients a premium mobile experience for appointments, medications, prescriptions, reminders, and medical records.

### Primary goals

- Reduce missed appointments and medication non-adherence
- Give doctors a fast operational view of active patients and upcoming care tasks
- Give patients a clear, mobile-first health command center
- Give admins visibility into users, system activity, and governance

### Non-functional requirements

- Mobile-first UX with a premium health-tech visual language
- Secure-by-default backend and role-based access control
- Clean, modular architecture for long-term scaling
- RESTful API with versioning and predictable response contracts
- Strong validation on both client and server
- Pagination, filtering, and search for every growing dataset
- Clear auditability for admin-sensitive actions
- Cloud-ready storage, notification, and deployment integrations

### Security baseline

- Short-lived JWT access tokens and rotated refresh tokens
- Password hashing with bcrypt
- Refresh token hashing at rest
- RBAC for admin, doctor, and patient boundaries
- Request validation and centralized error handling
- Helmet, CORS control, and safe HTTP defaults
- Audit logging for privileged actions
- Storage abstraction for Cloudinary or S3
- Device token registration for push notifications

### Key business rules

- Every user has exactly one system role: `ADMIN`, `DOCTOR`, or `PATIENT`
- Doctors and patients have separate profile tables tied to the shared `users` table
- Appointments always belong to one doctor and one patient
- Prescriptions are issued by doctors to patients and may generate medication trackers
- Reminders can be linked to appointments, medications, or general health tasks
- Medical records can be created by doctors and attached to appointments
- Admin accounts are not publicly self-registered in production

## 2. Feature breakdown by user role

### Admin

- Manage doctors, patients, and admins
- Suspend, activate, or review accounts
- View platform-wide activity and operational analytics
- Audit appointment volume, prescription activity, and reminder delivery
- Review system logs and moderation-sensitive events
- Configure platform settings and operational policies

### Doctor

- Maintain professional profile and clinic information
- View assigned patients and patient summaries
- Search and filter patient lists
- Manage appointment availability and bookings
- Confirm, reschedule, complete, or cancel appointments
- Create prescriptions and review medication adherence
- Upload or review medical records and consultation notes
- Receive reminders for scheduled consultations and follow-ups

### Patient

- Register, authenticate, and manage personal profile
- View assigned doctor relationships
- Book, reschedule, or cancel appointments
- View prescriptions, medications, and adherence history
- Receive appointment and medication reminders
- Review personal medical history and uploaded records
- Manage notification preferences and account settings

## 3. Complete database schema

The full PostgreSQL schema lives in `backend/db/schema.sql`.

### Core entity groups

- Identity: users, refresh tokens, user settings, device tokens
- Clinical relationships: doctor profiles, patient profiles, doctor-patient links
- Scheduling: doctor availability, appointments
- Clinical actions: prescriptions, prescription items, medications, medication logs
- Records: medical records, medical record files, patient conditions, allergies, vitals
- Engagement: reminders, notifications
- Governance: audit logs, file assets

## 4. Backend folder structure

```text
backend/
|-- db/
|   `-- schema.sql
|-- src/
|   |-- app.ts
|   |-- server.ts
|   |-- common/
|   |   |-- constants/
|   |   |-- errors/
|   |   |-- middleware/
|   |   |-- types/
|   |   `-- utils/
|   |-- config/
|   |-- modules/
|   |   |-- auth/
|   |   |-- health/
|   |   |-- admin/
|   |   |-- doctors/
|   |   |-- patients/
|   |   |-- appointments/
|   |   |-- prescriptions/
|   |   |-- medications/
|   |   |-- records/
|   |   |-- notifications/
|   |   `-- settings/
|   `-- routes/
|-- package.json
`-- tsconfig.json
```

### Backend architecture rules

- `common/` contains cross-cutting utilities, middleware, constants, and shared types
- `config/` contains environment and infrastructure wiring
- `modules/` owns business features end to end
- each feature module scales with its own route, controller, service, repository, schema, and DTO types
- `routes/` mounts versioned API modules

## 5. Flutter frontend folder structure

```text
mobile/
|-- lib/
|   |-- app/
|   |   |-- router/
|   |   `-- theme/
|   |-- core/
|   |   |-- constants/
|   |   |-- models/
|   |   |-- network/
|   |   |-- storage/
|   |   `-- widgets/
|   `-- features/
|       |-- splash/
|       |-- auth/
|       |-- dashboard/
|       |-- appointments/
|       |-- medications/
|       |-- prescriptions/
|       |-- records/
|       |-- notifications/
|       |-- search/
|       `-- settings/
|-- analysis_options.yaml
`-- pubspec.yaml
```

### Frontend architecture rules

- `app/` contains global setup such as routing and theming
- `core/` contains reusable models, networking, storage, and shared widgets
- `features/` owns UI, state, and data boundaries per module
- Riverpod manages app state and dependency injection
- each feature can grow into `data`, `domain`, and `presentation` folders

## 6. API endpoint plan

### Authentication

- `POST /api/v1/auth/register/patient`
- `POST /api/v1/auth/register/doctor`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Admin

- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:userId/status`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/reports/activity`

### Doctors

- `GET /api/v1/doctors/me`
- `PATCH /api/v1/doctors/me`
- `GET /api/v1/doctors/me/patients`
- `POST /api/v1/doctors/me/patients`
- `PATCH /api/v1/doctors/me/patients/:patientId`
- `GET /api/v1/doctors/me/appointments`
- `GET /api/v1/doctors/me/prescriptions`
- `GET /api/v1/doctors/me/availability`
- `PUT /api/v1/doctors/me/availability`

### Patients

- `GET /api/v1/patients/me`
- `PATCH /api/v1/patients/me`
- `GET /api/v1/patients/me/doctors`
- `PATCH /api/v1/patients/me/primary-doctor`
- `GET /api/v1/patients/me/appointments`
- `GET /api/v1/patients/me/prescriptions`
- `GET /api/v1/patients/me/medications`
- `GET /api/v1/patients/me/records`

### Appointments

- `POST /api/v1/appointments`
- `GET /api/v1/appointments`
- `GET /api/v1/appointments/:appointmentId`
- `PATCH /api/v1/appointments/:appointmentId`
- `PATCH /api/v1/appointments/:appointmentId/status`

### Prescriptions

- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:prescriptionId`
- `PATCH /api/v1/prescriptions/:prescriptionId`

### Medications

- `POST /api/v1/medications`
- `GET /api/v1/medications`
- `GET /api/v1/medications/:medicationId`
- `PATCH /api/v1/medications/:medicationId`
- `POST /api/v1/medications/:medicationId/logs`
- `GET /api/v1/medications/:medicationId/logs`

### Records

- `POST /api/v1/records`
- `GET /api/v1/records`
- `GET /api/v1/records/:recordId`
- `PATCH /api/v1/records/:recordId`
- `POST /api/v1/records/:recordId/files`

### Notifications and reminders

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:notificationId/read`
- `POST /api/v1/device-tokens`
- `DELETE /api/v1/device-tokens/:tokenId`
- `GET /api/v1/reminders`
- `PATCH /api/v1/reminders/:reminderId`

### Search and filters

- `GET /api/v1/search/global`
- `GET /api/v1/search/patients`
- `GET /api/v1/search/doctors`
- `GET /api/v1/search/appointments`
- `GET /api/v1/search/prescriptions`

## 7. Screen/page list

### Shared

- Splash screen
- Login screen
- Forgot password screen
- Notifications center
- Profile screen
- Settings screen

### Admin

- Admin dashboard
- User management
- Doctor management
- Patient management
- Audit log viewer
- Reports and analytics

### Doctor

- Doctor dashboard
- Patient list
- Patient details
- Appointment calendar or list
- Appointment details
- Create prescription
- Prescription history
- Medical record upload or review
- Availability management

### Patient

- Patient dashboard
- Appointment booking
- Appointment details
- Medications and reminders
- Prescription list or details
- Medical records list or details
- Reminder history

## 8. Implementation phases

### Phase 0: architecture and planning

- finalize product requirements
- design schema, APIs, screens, and project structure

### Phase 1: foundation and auth

- backend app bootstrapping
- PostgreSQL connection layer
- auth flows with JWT access and refresh tokens
- RBAC middleware and validation
- Flutter shell, routing, login flow, and role-based dashboards

### Phase 2: doctor-patient management

- doctor and patient profile APIs
- doctor-patient relationship management
- list views, filters, and search

### Phase 3: appointments

- doctor availability management
- booking, rescheduling, cancelation, completion
- reminders and schedule conflict handling

### Phase 4: prescriptions and medications

- prescription creation and updates
- medication tracker generation
- adherence logging and reminder support

### Phase 5: medical records and files

- medical history endpoints
- secure file upload integration
- doctor notes and patient record views

### Phase 6: notifications, analytics, and admin operations

- FCM integration
- reminder scheduler jobs
- admin analytics and audit tooling
- production hardening and deployment setup
