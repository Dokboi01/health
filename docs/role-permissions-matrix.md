# CareAxis Roles and Permissions Specification

## Document Control

- Product: CareAxis Health Platform
- Document type: Roles and Permissions Specification
- Status: Draft for internal alignment
- Version: 1.0
- Last updated: 2026-03-22
- Intended audience: Product, engineering, design, compliance, operations, and QA

## 1. Purpose

This document defines the role model, authorization scope, and permission matrix for CareAxis. It is intended to guide API authorization, mobile UI visibility, admin tooling, QA test coverage, and future security reviews.

The platform has three system roles:

- `ADMIN`
- `DOCTOR`
- `PATIENT`

These roles are already reflected in the backend role constants and authentication middleware. This document expands those base roles into detailed access rules for key product domains.

## 2. Role Definitions

### 2.1 Admin

Admins are trusted operational users responsible for account governance, platform oversight, support intervention, reporting, compliance coordination, and policy management.

Admins have the broadest operational authority, but they do not automatically receive unrestricted clinical access. Clinical detail should be hidden by default unless access is required for a documented support, compliance, security, or legal workflow. Any expanded access must be audited.

### 2.2 Doctor

Doctors are licensed care providers using CareAxis to manage assigned patients, appointments, prescriptions, medications, and medical records.

Doctor access is limited to:

- their own professional profile
- their own schedule and availability
- patients linked to their care relationship
- clinical objects tied to those linked patients

Doctors must not access unrelated patients or modify global system configuration.

### 2.3 Patient

Patients are end users managing their own health journey through appointments, prescriptions, medication adherence, records, notifications, and profile settings.

Patient access is limited to:

- their own profile and account
- their own appointments
- their own prescriptions and medications
- their own notifications and settings
- medical records shared to their account

Patients must not access other users' data or alter clinical data authored by providers.

## 3. Access Model Principles

- Least privilege applies across all roles.
- API authorization and UI visibility must both enforce the same role boundaries.
- Row-level ownership rules apply to all user-generated and clinical records.
- Doctors can only access patients with an active doctor-patient relationship, unless an audited emergency-access workflow exists.
- Patients can only access records where `patient_id` or `user_id` matches their own identity.
- Admin access to sensitive clinical data must follow a documented need-to-know rule and be audit logged.
- Hard delete should be avoided for regulated or clinically relevant records. Lifecycle actions should prefer status changes, archival, or voiding.
- Approval permissions only apply to workflows that explicitly support pending or review states.
- Assignment permissions must be constrained by relationship rules, consent requirements, and auditability.

## 4. Permission Legend

The matrix uses the following permission language:

- `Full`: unrestricted access within the role's intended domain
- `Limited`: action is allowed, but only within a narrowly defined scope
- `Self only`: only the acting user's own record or account
- `Assigned only`: only records tied to the doctor's active patient relationships or schedule
- `Metadata only`: access to non-clinical or summary fields, not full clinical content
- `Audited exception only`: action requires a support, compliance, or emergency workflow and must be logged
- `No`: action is not allowed

## 5. Global Role Summary

| Capability | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Access own profile | Full | Full | Full |
| Access other users | Full operationally | Assigned patients only | No |
| Access clinical records | Metadata by default; full access by audited exception only | Assigned patients only | Self only |
| Manage platform configuration | Full | No | No |
| Manage care relationships | Full | Limited | Limited |
| Manage appointments | Full | Assigned only | Self only |
| Manage prescriptions | Audit and oversight only | Assigned only | View only |
| Manage medications | Audit and oversight only | Assigned only | Adherence only |
| Manage reports | Full | Own scope only | Self only |

## 6. Detailed Permission Matrix

### 6.1 Patients

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | Full; may create or import patient accounts through admin workflows | No direct account creation; may invite or link an existing patient if workflow allows | Self only through registration and profile setup |
| View | Full patient profile and linkage visibility | Assigned only; active linked patients only | Self only |
| Edit | Full operational edits; audited for sensitive changes | Limited; relationship notes and care-team metadata only, not core patient identity | Self only for personal profile fields |
| Delete | No hard delete; may deactivate, suspend, merge, or archive by policy | No | No hard delete; may request account closure |
| Approve | Limited; approve activation, recovery, merge, or support exceptions | No | No |
| Assign | Full; assign patients to doctors and update primary ownership | Limited; link an existing patient to self only within allowed workflow | Limited; choose a primary doctor from already linked doctors |
| Manage | Full patient lifecycle management | Limited; manage own patient panel status and relationship notes | Self only for own profile and care preferences |

### 6.2 Appointments

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | Full; may create on behalf of users and resolve support cases | Assigned only; may book within own schedule and linked patient scope | Self only; may book for self with a linked doctor and available slot |
| View | Full | Assigned only; own schedule and linked patients | Self only |
| Edit | Full; audited for overrides | Assigned only; may confirm, reschedule, add notes, or complete within own schedule | Self only; limited to upcoming appointments and allowed fields |
| Delete | No hard delete; cancel, void, or archive only | No hard delete; may cancel own appointments | No hard delete; may cancel own upcoming appointments |
| Approve | Limited; approve schedule exceptions or override conflicts | Limited; approve or confirm patient-submitted requests if request workflow exists | No |
| Assign | Full; may reassign doctor, slot, or operational owner | Limited; may move within own schedule but not reassign another doctor's calendar | No |
| Manage | Full appointment operations and policy controls | Assigned only; manage schedule, availability, and appointment outcomes | Self only; manage own bookings |

### 6.3 Prescriptions

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | No direct clinical authoring | Assigned only; may issue prescriptions for linked patients | No |
| View | Metadata only by default; full content by audited exception only | Assigned only; linked patient prescriptions | Self only |
| Edit | No direct clinical edits except audited metadata correction workflow | Assigned only; may update, renew, or discontinue prescriptions they control | No |
| Delete | No hard delete; void or archive under audited correction flow only | No hard delete; may void or discontinue per policy | No |
| Approve | No | Limited; approve refill, renewal, or continuation requests if workflow exists | No |
| Assign | No direct assignment beyond operational correction workflows | Limited; attach prescription to patient and appointment context | No |
| Manage | Audit, compliance, and incident oversight only | Assigned only; full lifecycle management for own patient prescriptions | Limited; view, acknowledge, and request follow-up only |

### 6.4 Medications

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | No direct clinical authoring | Assigned only; may create medication plans directly or via prescriptions | No |
| View | Metadata only by default; full content by audited exception only | Assigned only | Self only |
| Edit | No direct regimen edits except audited support correction workflow | Assigned only; may adjust regimen, duration, status, and reminder behavior | Limited; may update reminder preference and adherence note fields only |
| Delete | No hard delete; archive under policy only | No hard delete; may discontinue or archive medications | No |
| Approve | No | Limited; approve continuation or refill workflows if supported | No |
| Assign | No | Assigned only; assign medication plan to linked patient | No |
| Manage | Oversight metrics only | Assigned only; manage medication schedules and adherence follow-up | Limited; manage self-adherence logging only |

### 6.5 Notifications

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | Full; may create system, incident, broadcast, or manual notifications | Limited; care-related notifications to linked patients only if feature exists | No |
| View | Full delivery visibility and per-user records | Limited; own inbox and care-triggered notification outcomes where exposed | Self only |
| Edit | Full for drafts, templates, and unsent notifications | Limited; own inbox state and unsent care notices only if supported | Self only for read state and inbox state |
| Delete | Full for drafts and unsent sends; sent records retained by policy | No server-side delete | No server-side delete |
| Approve | Full; approve campaign, policy, or broadcast sends | No | No |
| Assign | Full; set recipients, segments, channels, and delivery rules | Limited; assign linked patient recipients only for manual care notices | No |
| Manage | Full notification operations and delivery monitoring | Limited; manage own inbox only | Self only; manage own inbox only |

### 6.6 Medical Records

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | No direct clinical authoring | Assigned only; may create or upload records for linked patients | No |
| View | Metadata only by default; full clinical content by audited exception only | Assigned only; linked patient records | Self only for records shared to the patient |
| Edit | Limited; metadata correction under audited workflow only | Assigned only; may edit own draft or authored records, otherwise add addendum | No |
| Delete | No hard delete; retention-based archival or legal correction process only | No hard delete; may request archival or supersession under policy | No |
| Approve | Limited; legal hold, release, or compliance workflows only | Limited; may finalize or sign authored records if workflow exists | No |
| Assign | Limited; emergency-access grant or ownership transfer under policy | Limited; attach record to patient, appointment, and patient-visible scope | No |
| Manage | Storage governance, access governance, and audit oversight | Assigned only; manage authored records and attachments | Limited; download or export own records only |

### 6.7 Dashboards

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | Full; may create role dashboards, widgets, and shared operational views | Limited; may create personal saved views if feature exists | Limited; may create personal saved views if feature exists |
| View | Full admin dashboards and platform metrics | Doctor dashboard only | Patient dashboard only |
| Edit | Full; may change widgets, KPIs, and role-level dashboard configuration | Limited; personalize own layout and widgets only | Limited; personalize own layout and widgets only |
| Delete | Full; may retire shared dashboard modules | Limited; remove own saved views only | Limited; remove own saved views only |
| Approve | Full; approve shared metric definitions and dashboard releases | No | No |
| Assign | Full; assign dashboard visibility by role or admin group | No | No |
| Manage | Full dashboard governance | Self only for dashboard preferences | Self only for dashboard preferences |

### 6.8 Settings

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | Full; may create platform policies, configuration entries, and admin-managed defaults | Self only; device, session, and account preference setup | Self only; device, session, and account preference setup |
| View | Full platform settings plus own account settings | Self only | Self only |
| Edit | Full; platform settings, role policies, and own account settings | Self only; own profile, password, notification preferences, and device settings | Self only; own profile, password, notification preferences, and device settings |
| Delete | Full for revocable configs, tokens, and non-retained settings; audited where sensitive | Self only for own device tokens and sessions | Self only for own device tokens and sessions |
| Approve | Full; approve sensitive configuration or account status changes | No | No |
| Assign | Full; assign policies, defaults, and access scopes by role | No | No |
| Manage | Full platform governance and session management | Self only; manage sessions and preferences | Self only; manage sessions and preferences |

### 6.9 Reports

| Action | Admin | Doctor | Patient |
| --- | --- | --- | --- |
| Create | Full; generate operational, compliance, audit, and business reports | Limited; generate reports within assigned patient and schedule scope | Self only; generate personal exports and health summaries |
| View | Full | Limited; own scope reports only | Self only |
| Edit | Full; edit templates, filters, schedules, and draft exports | Limited; edit saved filters and draft reports within own scope | Self only; edit export parameters for own data only |
| Delete | Full; delete draft or scheduled reports under retention rules | Limited; delete own saved reports and drafts | Self only; delete own saved export requests |
| Approve | Full; approve official compliance, investor, or external reports | Limited; approve or sign provider-authored clinical summaries if workflow exists | No |
| Assign | Full; distribute reports to authorized recipients and teams | Limited; share to linked patients or authorized internal users where policy allows | Limited; share or download only to self-controlled destinations |
| Manage | Full reporting operations and retention controls | Limited; manage own report library and recurring summaries | Self only; manage own exports and downloads |

## 7. Role-Based Access Rules by Domain

### 7.1 Patients

- A doctor may access a patient only when an active doctor-patient link exists.
- Doctors may not edit patient identity, account status, or security settings.
- Patients may only change their own personal and non-clinical profile fields.
- Admins may suspend or archive patient accounts, but should avoid viewing unrelated clinical detail unless required.

### 7.2 Appointments

- Patients may only book appointments for themselves.
- Doctors may only manage appointments in their own schedule.
- Appointment reassignment across doctors is an admin-controlled operation unless an approved transfer workflow exists.
- Deletion should be represented as cancellation, voiding, or archival rather than hard deletion.

### 7.3 Prescriptions

- Only doctors may author prescriptions.
- Doctors may issue prescriptions only for patients linked to them.
- Patients may read prescriptions but may not change dosage, medication details, or validity.
- Admins should not routinely access prescription content; they should use metadata and audit views by default.

### 7.4 Medications

- Medication records may be created by doctors directly or derived from prescriptions.
- Patients may log adherence and control reminder-related preferences, but may not alter the prescribed regimen.
- Discontinuation should preserve history instead of deleting the record.

### 7.5 Notifications

- System notifications can be generated automatically from product events or manually by admins.
- Doctors should not have broadcast capability across the platform.
- Patients may manage their inbox state, but may not modify sent notification payloads.
- Delivery monitoring and channel management belong to admins.

### 7.6 Medical Records

- Medical records are clinically sensitive and should be append-oriented.
- Doctors should edit only records they authored, or otherwise create an addendum or superseding entry.
- Patients may view only the records made available to them.
- Admin access to full medical record content should require an audited support, compliance, or legal reason.

### 7.7 Dashboards

- Each role only sees dashboard content intended for that role.
- Admin dashboards show operational and governance metrics.
- Doctor dashboards show schedule, patient, and prescription workflow data within assigned scope.
- Patient dashboards show only self-related health actions and reminders.

### 7.8 Settings

- Platform-wide settings belong to admins only.
- Doctors and patients may manage only their own settings, sessions, and notification preferences.
- Role changes, account suspension, and policy changes require admin approval and audit logging.

### 7.9 Reports

- Admin reports may span the full platform, subject to compliance rules.
- Doctor reports must be limited to assigned patient and provider activity scope.
- Patient reports must be limited to the patient's own data export, summaries, and history.
- Report distribution must follow least-privilege rules and create an audit trail for sensitive exports.

## 8. Enforcement Requirements

- Authorization must be enforced in the API, not only in the mobile client.
- UI elements must be hidden when a role lacks permission, but server-side checks remain authoritative.
- Every privileged action must capture actor, entity, action, timestamp, and relevant metadata in audit logs.
- Break-glass access should require an explicit reason, elevated review path where needed, and a dedicated audit event.
- Search endpoints must respect the same row-level authorization rules as direct detail endpoints.
- File access for medical records must use signed or protected URLs scoped to the authorized user and session.

## 9. Recommended Implementation Notes

- Model row-level checks around `req.user.role`, `req.user.id`, and entity ownership such as `doctor_id`, `patient_id`, `user_id`, and active link tables.
- Keep role authorization separate from business-rule validation. For example, a doctor may be authorized to edit an appointment but still blocked if the appointment is completed.
- Introduce explicit permission helpers for repeated policies such as "doctor linked to patient" and "admin break-glass clinical access".
- Prefer status transitions over destructive deletes for appointments, prescriptions, medications, records, and reports with retention requirements.
- Align frontend route guards and navigation menus with the same permissions matrix to avoid confusing dead-end UI states.

## 10. Summary

CareAxis uses a three-role access model with strong role boundaries:

- Admins govern the platform and operations, with controlled and audited access to sensitive clinical detail.
- Doctors manage only their own schedule and linked patient care.
- Patients manage only their own account and health experience.

This model should be treated as the baseline contract for all future modules, APIs, dashboards, and workflows.
