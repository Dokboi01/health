# CareAxis RBAC Permission Matrix

## Scope legend

- `All`: unrestricted access across the platform within the resource area
- `Assigned`: limited to records tied to the doctor's linked patients or professional workflow
- `Own`: limited to the signed-in user's own profile, records, or settings
- `Own or Assigned`: limited to the user's own operational items plus assigned patient workflow
- `None`: no permission

## Role summary

### Admin

- Owns platform governance, configuration, moderation, reporting, and operational oversight
- Can access and manage all business resources
- Can approve sensitive workflows, assign relationships, and manage system-wide reports

### Doctor

- Owns care delivery workflows for assigned patients
- Can manage appointments, prescriptions, medications, records, and notifications within their patient network
- Cannot administer platform-wide settings or unrestricted system reports

### Patient

- Owns personal identity, care experience, bookings, reminders, and health visibility
- Can access only personal data and actions tied to their own care journey
- Cannot manage other users or platform-wide workflows

## Permission matrix

### Patients

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | Own | Admin can create any patient account. Doctors can register or attach patients into their care workflow where allowed. Patients can create only their own account. |
| View | All | Assigned | Own | Doctors can view only linked patients. Patients can view only their own profile. |
| Edit | All | Assigned | Own | Doctors can update limited clinical-facing profile data for assigned patients. Patients can update their own personal profile data. |
| Delete | All | None | None | Only admin can hard-delete or archive patient accounts. |
| Approve | All | None | None | Admin approves sensitive account states, verification, suspension, or reactivation. |
| Assign | All | Assigned | None | Admin can assign any doctor-patient relationship. Doctors can assign patients into their own care list only. |
| Manage | All | Assigned | Own | Admin manages the patient domain globally. Doctors manage assigned patient relationships. Patients manage only their own account context. |

### Appointments

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | Own | Patients can book their own appointments. Doctors can create appointments for their assigned patients. |
| View | All | Assigned | Own | Doctors see appointments tied to their care workload. Patients see only their own bookings. |
| Edit | All | Assigned | Own | Doctors can reschedule or update assigned appointments. Patients can reschedule their own within policy rules. |
| Delete | All | Assigned | Own | Admin can remove invalid appointments. Doctors and patients can cancel within allowed scope. |
| Approve | All | Assigned | Own | Admin can override states. Doctors approve confirmations or completions. Patients can accept or confirm reschedules for their own visits. |
| Assign | All | Assigned | None | Admin can assign any doctor or patient to an appointment. Doctors can assign slots within their own calendar. |
| Manage | All | Assigned | Own | Admin governs the appointment system. Doctors manage their care schedule. Patients manage their personal bookings. |

### Prescriptions

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | None | Only doctors and admins can issue prescriptions. Doctors are restricted to assigned patients. |
| View | All | Assigned | Own | Patients can view only prescriptions written for them. |
| Edit | All | Assigned | None | Doctors can update active prescriptions for assigned patients. |
| Delete | All | Assigned | None | Admin can remove invalid records. Doctors can discontinue or cancel prescriptions they own. |
| Approve | All | Assigned | Own | Admin can approve sensitive overrides. Doctors approve prescription lifecycle steps. Patients can acknowledge or accept their own prescription updates. |
| Assign | All | Assigned | None | Admin can reassign ownership. Doctors can attach prescriptions to their own assigned patient cases. |
| Manage | All | Assigned | None | Prescription administration is owned by admin and assigned doctors only. |

### Medications

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | Own | Doctors can create medication plans for assigned patients. Patients can add personal medication tracking entries for themselves. |
| View | All | Assigned | Own | Patients see only their own medication trackers and logs. |
| Edit | All | Assigned | Own | Doctors can adjust assigned medication plans. Patients can edit personal adherence and reminder settings for their own entries. |
| Delete | All | Assigned | Own | Admin can remove invalid medication records. Doctors and patients can stop records within allowed scope. |
| Approve | All | Assigned | Own | Doctors approve medication changes for assigned patients. Patients can confirm intake or acknowledge updates on their own plans. |
| Assign | All | Assigned | None | Admin can reassign medication ownership. Doctors can attach plans to assigned patients only. |
| Manage | All | Assigned | Own | Admin governs the module. Doctors manage assigned treatment plans. Patients manage their own adherence experience. |

### Notifications

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | None | Admin can broadcast or target notifications platform-wide. Doctors can create patient-facing notifications only within assigned care workflows. |
| View | All | Own or Assigned | Own | Doctors can view their own operational alerts and patient-facing items tied to assigned workflows. Patients can view only their own notifications. |
| Edit | All | Own or Assigned | Own | Doctors can update notification state for their own or assigned workflow items. Patients can mark only their own notifications as read. |
| Delete | All | Own or Assigned | Own | Doctors can dismiss operational alerts they own or control. Patients can dismiss only their own notifications. |
| Approve | All | None | None | Approval of notification templates, channels, or sensitive campaigns belongs to admin only. |
| Assign | All | Assigned | None | Admin can route notifications anywhere. Doctors can target only assigned-patient notifications. |
| Manage | All | Assigned | Own | Admin manages notification policy globally. Doctors manage assigned care notifications. Patients manage personal notification preferences and read state. |

### Medical records

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | None | Doctors can create records only for assigned patients. |
| View | All | Assigned | Own | Patients can view only their own records. |
| Edit | All | Assigned | None | Doctors can update records they own within assigned care scope. |
| Delete | All | Assigned | None | Admin can purge invalid records. Doctors can archive records within their clinical scope. |
| Approve | All | Assigned | None | Admin can approve exceptional release flows. Doctors approve clinical record finalization for assigned cases. |
| Assign | All | Assigned | None | Admin can reassign record ownership. Doctors can attach records to assigned patients and appointments. |
| Manage | All | Assigned | Own | Admin manages record governance. Doctors manage assigned clinical records. Patients manage only their access and download experience, not record content. |

### Dashboards

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | None | None | None | Dashboards are system-defined views rather than user-created records. |
| View | All | Own | Own | Each role sees only its own dashboard context, except admin which can view platform-wide panels. |
| Edit | None | None | None | Dashboard layout editing is not exposed as a standard user action by default. |
| Delete | None | None | None | Dashboard resources are not user-deletable. |
| Approve | None | None | None | No approval workflow is needed for dashboard access. |
| Assign | None | None | None | Dashboard assignment is handled by role mapping, not manual assignment. |
| Manage | All | Own | Own | Admin manages dashboard availability and operational widgets. Doctors and patients manage only their personal dashboard experience where customization exists. |

### Settings

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | None | None | None | Settings are provisioned by the system when accounts are created. |
| View | All | Own | Own | Admin can inspect settings across the platform for support or governance. Doctors and patients view only their own settings. |
| Edit | All | Own | Own | Admin can change global or user-level settings. Doctors and patients can change only personal preferences. |
| Delete | None | None | None | Settings are updated or reset, not deleted as business records. |
| Approve | None | None | None | Approval is generally not part of the normal settings flow. |
| Assign | None | None | None | Settings are role-scoped and system-bound, not manually assigned. |
| Manage | All | Own | Own | Admin manages platform settings and policies. Doctors and patients manage only their personal account settings. |

### Reports

| Action | Admin | Doctor | Patient | Access rule |
| --- | --- | --- | --- | --- |
| Create | All | Assigned | None | Admin can create operational reports. Doctors can generate care reports limited to assigned patients or personal practice data. |
| View | All | Assigned | Own | Patients may view only personal summaries or self-service exports. |
| Edit | All | None | None | Editing saved report definitions is an admin responsibility. |
| Delete | All | None | None | Deleting report definitions or exports is restricted to admin. |
| Approve | All | None | None | Approval of compliance, audit, or operational reports belongs to admin. |
| Assign | All | None | None | Report routing and ownership assignment are admin-level actions. |
| Manage | All | Assigned | Own | Admin manages the reporting system, doctors manage assigned clinical outputs, and patients manage only their own downloadable summaries. |

## Role-based access rules by domain

### Patients

- A doctor may access patient data only when an active doctor-patient link exists.
- A patient may never view, edit, or delete another patient's data.
- Admin can override status, assignment, and lifecycle events for patient accounts.

### Appointments

- Doctors can act only on appointments that belong to them or their assigned patients.
- Patients can create, confirm, reschedule, and cancel only their own appointments.
- Admin can audit, override, or reassign appointments across the platform.

### Prescriptions

- Only doctors and admins can issue or change prescriptions.
- Patients can only read and acknowledge prescriptions written for them.
- Prescription deletion should usually mean cancellation or archival, not destructive removal.

### Medications

- Doctors can manage medication plans derived from prescriptions for assigned patients.
- Patients can manage their own adherence logs, reminder state, and self-added medication trackers.
- Admin can intervene for compliance, dispute resolution, or data correction.

### Notifications

- Admin controls templates, campaigns, broadcast behavior, and policy.
- Doctors can trigger care notifications only for their own assigned patients.
- Patients can only read, dismiss, or configure their own notification preferences.

### Medical records

- Doctors can create and edit records only for assigned patients.
- Patients can view and export their own records but cannot alter the clinical source of truth.
- Admin access should be audited because medical records are highly sensitive.

### Dashboards

- Dashboard content is role-scoped.
- Admin sees platform analytics and governance panels.
- Doctor sees workload, patient, and prescription operations.
- Patient sees personal care activity, reminders, and medical overview.

### Settings

- Admin manages platform settings plus user-support overrides.
- Doctors and patients manage only their own preference settings.
- Security-sensitive settings should require re-authentication in production.

### Reports

- Admin owns organization-wide, compliance, finance, and operational reports.
- Doctors can view only practice or assigned-patient reports.
- Patients can access only personal health summaries and self-service exports.

## Recommended enforcement strategy

- Use role checks first to gate major route groups.
- Apply permission checks second for resource-action combinations.
- Enforce ownership or assignment checks inside services or repositories where record context is known.
- Audit all admin overrides and sensitive medical record access.
