# CareAxis REST API Plan

## Overview

This document defines the production-ready REST API plan for the CareAxis medical platform backend.
All endpoints use the base path:

```text
/api/v1
```

The API is designed for three roles:

- `ADMIN`
- `DOCTOR`
- `PATIENT`

## Global API Standards

### Authentication

- Protected endpoints require `Authorization: Bearer <access_token>`.
- Access tokens are short-lived JWTs.
- Refresh tokens are rotated and stored hashed at rest.
- Row-level authorization rules apply in addition to role checks.

### Standard response envelope

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### Standard validation rules

- All `:id` path params must be UUID v4.
- All timestamps use ISO 8601 UTC format.
- `page` must be `>= 1`.
- `limit` must be between `1` and `100`.
- Unknown request fields should be rejected.
- String inputs should be trimmed before persistence.
- Email values should be normalized to lowercase.

### Access scope language

- `Public`: no login required
- `Authenticated`: any logged-in user
- `Own`: the current authenticated user's own resource
- `Assigned`: a doctor-patient relationship or direct appointment relationship exists

### Soft delete policy

Clinical and audit-sensitive resources should use status-based archival or soft delete behavior instead of destructive hard deletes.

---

## Auth Endpoints

### POST `/api/v1/auth/register/patient`

- Method: `POST`
- Route: `/api/v1/auth/register/patient`
- Description: Register a new patient account and patient profile.
- Who can access it: `Public`
- Request body:

```json
{
  "firstName": "Amina",
  "lastName": "Okafor",
  "email": "amina.okafor@example.com",
  "password": "SecurePass123!",
  "phone": "+2348012345678",
  "dateOfBirth": "1994-08-12",
  "gender": "FEMALE"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Patient registered successfully.",
  "data": {
    "user": {
      "id": "0db52db0-24ae-4ef8-a0db-4a3ddf4fc701",
      "role": "PATIENT",
      "email": "amina.okafor@example.com"
    },
    "patient": {
      "id": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
      "fullName": "Amina Okafor"
    }
  }
}
```

- Validation rules:
  - `firstName` and `lastName` are required, 2-100 chars
  - `email` must be valid and unique
  - `password` must be 8-128 chars with uppercase, lowercase, number, and special char
  - `phone` must be valid E.164 format if provided
  - `dateOfBirth` cannot be in the future
  - `gender` must be one of `MALE`, `FEMALE`, `OTHER`

### POST `/api/v1/auth/register/doctor`

- Method: `POST`
- Route: `/api/v1/auth/register/doctor`
- Description: Create a doctor account and doctor profile.
- Who can access it: `ADMIN`
- Request body:

```json
{
  "firstName": "Samuel",
  "lastName": "Adebayo",
  "email": "dr.samuel@example.com",
  "password": "SecurePass123!",
  "phone": "+2348098765432",
  "licenseNumber": "MDCN-445533",
  "specialization": "Cardiology",
  "yearsOfExperience": 12,
  "clinicName": "CareAxis Specialist Clinic"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Doctor registered successfully.",
  "data": {
    "user": {
      "id": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
      "role": "DOCTOR",
      "email": "dr.samuel@example.com"
    },
    "doctor": {
      "id": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
      "licenseNumber": "MDCN-445533",
      "specialization": "Cardiology"
    }
  }
}
```

- Validation rules:
  - `firstName`, `lastName`, `email`, `password`, `licenseNumber`, and `specialization` are required
  - `email` must be valid and unique
  - `licenseNumber` must be 4-40 chars and unique
  - `yearsOfExperience` must be an integer between `0` and `60`
  - `clinicName` must be 2-150 chars if provided

### POST `/api/v1/auth/login`

- Method: `POST`
- Route: `/api/v1/auth/login`
- Description: Authenticate a user and issue access and refresh tokens.
- Who can access it: `Public`
- Request body:

```json
{
  "email": "dr.samuel@example.com",
  "password": "SecurePass123!",
  "deviceName": "iPhone 15 Pro",
  "platform": "ios",
  "deviceToken": "fcm_device_token_here"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Authenticated successfully.",
  "data": {
    "user": {
      "id": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
      "role": "DOCTOR",
      "email": "dr.samuel@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

- Validation rules:
  - `email` must be valid
  - `password` is required, 8-128 chars
  - `platform` must be one of `ios`, `android`, `web` if provided
  - `deviceToken` must be 20-512 chars if provided

### POST `/api/v1/auth/refresh`

- Method: `POST`
- Route: `/api/v1/auth/refresh`
- Description: Rotate refresh token and issue a new token pair.
- Who can access it: `Public`
- Request body:

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

- Validation rules:
  - `refreshToken` is required
  - token must be a valid, non-revoked refresh token

### POST `/api/v1/auth/logout`

- Method: `POST`
- Route: `/api/v1/auth/logout`
- Description: Revoke the provided refresh token and end the session.
- Who can access it: `Authenticated`
- Request body:

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Logged out successfully.",
  "data": null
}
```

- Validation rules:
  - `refreshToken` is required
  - token must belong to the authenticated user

### POST `/api/v1/auth/forgot-password`

- Method: `POST`
- Route: `/api/v1/auth/forgot-password`
- Description: Request a password reset email or SMS flow.
- Who can access it: `Public`
- Request body:

```json
{
  "email": "amina.okafor@example.com"
}
```

- Response example:

```json
{
  "success": true,
  "message": "If the account exists, a reset link has been sent.",
  "data": null
}
```

- Validation rules:
  - `email` must be valid
  - endpoint should return a generic response to avoid account enumeration

### POST `/api/v1/auth/reset-password`

- Method: `POST`
- Route: `/api/v1/auth/reset-password`
- Description: Reset password using a one-time reset token.
- Who can access it: `Public`
- Request body:

```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Password reset successfully.",
  "data": null
}
```

- Validation rules:
  - `token` is required
  - `newPassword` must satisfy password policy
  - `confirmPassword` must match `newPassword`

### PATCH `/api/v1/auth/change-password`

- Method: `PATCH`
- Route: `/api/v1/auth/change-password`
- Description: Change password for an authenticated user.
- Who can access it: `Authenticated`
- Request body:

```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Password changed successfully.",
  "data": null
}
```

- Validation rules:
  - `currentPassword` is required
  - `newPassword` must satisfy password policy
  - `newPassword` must be different from `currentPassword`

### GET `/api/v1/auth/me`

- Method: `GET`
- Route: `/api/v1/auth/me`
- Description: Return the currently authenticated user session profile.
- Who can access it: `Authenticated`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Authenticated user fetched successfully.",
  "data": {
    "id": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
    "role": "DOCTOR",
    "email": "dr.samuel@example.com",
    "profileCompleted": true
  }
}
```

- Validation rules:
  - valid bearer token is required

---

## Users Endpoints

### GET `/api/v1/users/me`

- Method: `GET`
- Route: `/api/v1/users/me`
- Description: Return the base user account data for the current user.
- Who can access it: `Authenticated`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "User profile fetched successfully.",
  "data": {
    "id": "0db52db0-24ae-4ef8-a0db-4a3ddf4fc701",
    "role": "PATIENT",
    "email": "amina.okafor@example.com",
    "phone": "+2348012345678",
    "status": "ACTIVE"
  }
}
```

- Validation rules:
  - valid bearer token is required

### PATCH `/api/v1/users/me`

- Method: `PATCH`
- Route: `/api/v1/users/me`
- Description: Update account-level fields for the current user.
- Who can access it: `Authenticated`
- Request body:

```json
{
  "phone": "+2348011111111",
  "avatarUrl": "https://cdn.careaxis.app/avatar.png",
  "timezone": "Africa/Lagos",
  "language": "en"
}
```

- Response example:

```json
{
  "success": true,
  "message": "User profile updated successfully.",
  "data": {
    "id": "0db52db0-24ae-4ef8-a0db-4a3ddf4fc701",
    "phone": "+2348011111111",
    "timezone": "Africa/Lagos"
  }
}
```

- Validation rules:
  - `phone` must be valid E.164 if provided
  - `avatarUrl` must be a valid HTTPS URL if provided
  - `timezone` must be a valid IANA timezone if provided
  - `language` must be 2-5 chars if provided

### GET `/api/v1/users`

- Method: `GET`
- Route: `/api/v1/users`
- Description: List platform users with filtering and pagination.
- Who can access it: `ADMIN`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "role": "DOCTOR",
  "status": "ACTIVE",
  "q": "samuel"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Users fetched successfully.",
  "data": [
    {
      "id": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
      "email": "dr.samuel@example.com",
      "role": "DOCTOR",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `role` must be one of `ADMIN`, `DOCTOR`, `PATIENT` if provided
  - `status` must be one of `ACTIVE`, `INACTIVE`, `SUSPENDED`, `ARCHIVED` if provided
  - `q` must be 1-100 chars if provided

### GET `/api/v1/users/:userId`

- Method: `GET`
- Route: `/api/v1/users/:userId`
- Description: Fetch a single user account by ID.
- Who can access it: `ADMIN`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "User fetched successfully.",
  "data": {
    "id": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
    "email": "dr.samuel@example.com",
    "role": "DOCTOR",
    "status": "ACTIVE",
    "createdAt": "2026-03-22T10:00:00.000Z"
  }
}
```

- Validation rules:
  - `userId` must be a UUID

### PATCH `/api/v1/users/:userId/status`

- Method: `PATCH`
- Route: `/api/v1/users/:userId/status`
- Description: Update user lifecycle state such as activation or suspension.
- Who can access it: `ADMIN`
- Request body:

```json
{
  "status": "SUSPENDED",
  "reason": "Repeated policy violations"
}
```

- Response example:

```json
{
  "success": true,
  "message": "User status updated successfully.",
  "data": {
    "id": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
    "status": "SUSPENDED"
  }
}
```

- Validation rules:
  - `status` must be one of `ACTIVE`, `INACTIVE`, `SUSPENDED`, `ARCHIVED`
  - `reason` is required when `status` is `SUSPENDED` or `ARCHIVED`

---

## Doctors Endpoints

### GET `/api/v1/doctors/me`

- Method: `GET`
- Route: `/api/v1/doctors/me`
- Description: Fetch the logged-in doctor's profile.
- Who can access it: `DOCTOR`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Doctor profile fetched successfully.",
  "data": {
    "id": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
    "fullName": "Dr Samuel Adebayo",
    "specialization": "Cardiology",
    "clinicName": "CareAxis Specialist Clinic"
  }
}
```

- Validation rules:
  - valid bearer token with `DOCTOR` role is required

### PATCH `/api/v1/doctors/me`

- Method: `PATCH`
- Route: `/api/v1/doctors/me`
- Description: Update the logged-in doctor's professional profile.
- Who can access it: `DOCTOR`
- Request body:

```json
{
  "bio": "Board-certified cardiologist with focus on preventive care.",
  "specialization": "Cardiology",
  "clinicName": "CareAxis Specialist Clinic",
  "yearsOfExperience": 13
}
```

- Response example:

```json
{
  "success": true,
  "message": "Doctor profile updated successfully.",
  "data": {
    "id": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
    "specialization": "Cardiology",
    "yearsOfExperience": 13
  }
}
```

- Validation rules:
  - `bio` max 2000 chars if provided
  - `specialization` 2-120 chars if provided
  - `clinicName` 2-150 chars if provided
  - `yearsOfExperience` integer between `0` and `60` if provided

### GET `/api/v1/doctors`

- Method: `GET`
- Route: `/api/v1/doctors`
- Description: List doctors for admin operations or patient discovery.
- Who can access it: `ADMIN`, `PATIENT`, `DOCTOR`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "specialization": "Cardiology",
  "q": "Samuel",
  "acceptingPatients": true
}
```

- Response example:

```json
{
  "success": true,
  "message": "Doctors fetched successfully.",
  "data": [
    {
      "id": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
      "fullName": "Dr Samuel Adebayo",
      "specialization": "Cardiology",
      "acceptingPatients": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `specialization` 2-120 chars if provided
  - `q` 1-100 chars if provided
  - `acceptingPatients` must be boolean if provided

### GET `/api/v1/doctors/:doctorId`

- Method: `GET`
- Route: `/api/v1/doctors/:doctorId`
- Description: Fetch a doctor profile by ID.
- Who can access it: `ADMIN`, `PATIENT`, `DOCTOR`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Doctor fetched successfully.",
  "data": {
    "id": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
    "fullName": "Dr Samuel Adebayo",
    "specialization": "Cardiology",
    "clinicName": "CareAxis Specialist Clinic"
  }
}
```

- Validation rules:
  - `doctorId` must be a UUID

### GET `/api/v1/doctors/:doctorId/patients`

- Method: `GET`
- Route: `/api/v1/doctors/:doctorId/patients`
- Description: List patients assigned to a doctor.
- Who can access it: `ADMIN`, `DOCTOR` (`Own`)
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "q": "Amina",
  "status": "ACTIVE"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Doctor patients fetched successfully.",
  "data": [
    {
      "id": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
      "fullName": "Amina Okafor",
      "relationshipStatus": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `doctorId` must be a UUID
  - doctor can only access their own `doctorId` unless admin
  - `status` must be one of `ACTIVE`, `INACTIVE` if provided

### POST `/api/v1/doctors/:doctorId/patients`

- Method: `POST`
- Route: `/api/v1/doctors/:doctorId/patients`
- Description: Assign a patient to a doctor.
- Who can access it: `ADMIN`, `DOCTOR` (`Own`)
- Request body:

```json
{
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "relationshipType": "PRIMARY",
  "notes": "Initial long-term care assignment."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Patient assigned to doctor successfully.",
  "data": {
    "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
    "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
    "relationshipType": "PRIMARY"
  }
}
```

- Validation rules:
  - `patientId` must be a UUID
  - `relationshipType` must be `PRIMARY`, `SECONDARY`, or `CONSULTING`
  - duplicate active assignments are not allowed

### DELETE `/api/v1/doctors/:doctorId/patients/:patientId`

- Method: `DELETE`
- Route: `/api/v1/doctors/:doctorId/patients/:patientId`
- Description: End the doctor-patient assignment.
- Who can access it: `ADMIN`, `DOCTOR` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Doctor-patient assignment ended successfully.",
  "data": null
}
```

- Validation rules:
  - `doctorId` and `patientId` must be UUIDs
  - the relationship must exist and be active before removal

---

## Patients Endpoints

### GET `/api/v1/patients/me`

- Method: `GET`
- Route: `/api/v1/patients/me`
- Description: Fetch the logged-in patient's profile.
- Who can access it: `PATIENT`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Patient profile fetched successfully.",
  "data": {
    "id": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
    "fullName": "Amina Okafor",
    "bloodGroup": "O+",
    "primaryDoctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296"
  }
}
```

- Validation rules:
  - valid bearer token with `PATIENT` role is required

### PATCH `/api/v1/patients/me`

- Method: `PATCH`
- Route: `/api/v1/patients/me`
- Description: Update the logged-in patient's profile.
- Who can access it: `PATIENT`
- Request body:

```json
{
  "address": "12 Admiralty Way, Lekki",
  "bloodGroup": "O+",
  "heightCm": 170,
  "weightKg": 67
}
```

- Response example:

```json
{
  "success": true,
  "message": "Patient profile updated successfully.",
  "data": {
    "id": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
    "bloodGroup": "O+",
    "heightCm": 170,
    "weightKg": 67
  }
}
```

- Validation rules:
  - `address` max 300 chars if provided
  - `bloodGroup` must be one of `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`
  - `heightCm` must be between `30` and `300` if provided
  - `weightKg` must be between `1` and `500` if provided

### GET `/api/v1/patients`

- Method: `GET`
- Route: `/api/v1/patients`
- Description: List patients for admin or doctor care-team workflows.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "q": "Amina",
  "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Patients fetched successfully.",
  "data": [
    {
      "id": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
      "fullName": "Amina Okafor",
      "primaryDoctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - doctors can only see assigned patients unless elevated by admin privileges
  - `q` 1-100 chars if provided
  - `doctorId` must be a UUID if provided

### GET `/api/v1/patients/:patientId`

- Method: `GET`
- Route: `/api/v1/patients/:patientId`
- Description: Fetch a patient profile by ID.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Patient fetched successfully.",
  "data": {
    "id": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
    "fullName": "Amina Okafor",
    "bloodGroup": "O+",
    "allergiesSummary": "Penicillin"
  }
}
```

- Validation rules:
  - `patientId` must be a UUID
  - doctors must be assigned to the patient
  - patients can only fetch their own `patientId`

### GET `/api/v1/patients/:patientId/doctors`

- Method: `GET`
- Route: `/api/v1/patients/:patientId/doctors`
- Description: List doctors linked to a patient.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Patient doctors fetched successfully.",
  "data": [
    {
      "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
      "fullName": "Dr Samuel Adebayo",
      "relationshipType": "PRIMARY"
    }
  ]
}
```

- Validation rules:
  - `patientId` must be a UUID
  - row-level access rules apply

### PATCH `/api/v1/patients/:patientId/primary-doctor`

- Method: `PATCH`
- Route: `/api/v1/patients/:patientId/primary-doctor`
- Description: Change a patient's primary doctor relationship.
- Who can access it: `ADMIN`, `PATIENT` (`Own`)
- Request body:

```json
{
  "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Primary doctor updated successfully.",
  "data": {
    "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
    "primaryDoctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296"
  }
}
```

- Validation rules:
  - `doctorId` must be a UUID
  - the selected doctor must already be linked to the patient

---

## Appointments Endpoints

### POST `/api/v1/appointments`

- Method: `POST`
- Route: `/api/v1/appointments`
- Description: Create an appointment between a doctor and a patient.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body:

```json
{
  "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "scheduledStart": "2026-03-25T09:00:00.000Z",
  "scheduledEnd": "2026-03-25T09:30:00.000Z",
  "appointmentType": "CONSULTATION",
  "reason": "Chest pain follow-up",
  "locationType": "VIRTUAL"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Appointment created successfully.",
  "data": {
    "id": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
    "status": "BOOKED",
    "scheduledStart": "2026-03-25T09:00:00.000Z"
  }
}
```

- Validation rules:
  - `doctorId` and `patientId` must be UUIDs
  - `scheduledStart` must be in the future
  - `scheduledEnd` must be after `scheduledStart`
  - appointment duration must be between `15` and `240` minutes
  - `appointmentType` must be one of `CONSULTATION`, `FOLLOW_UP`, `LAB`, `PROCEDURE`
  - `locationType` must be `PHYSICAL` or `VIRTUAL`
  - doctor and patient must be allowed to book together
  - overlapping active appointments are not allowed

### GET `/api/v1/appointments`

- Method: `GET`
- Route: `/api/v1/appointments`
- Description: List appointments with role-based filtering.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "status": "BOOKED",
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-31",
  "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Appointments fetched successfully.",
  "data": [
    {
      "id": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
      "status": "BOOKED",
      "scheduledStart": "2026-03-25T09:00:00.000Z",
      "doctorName": "Dr Samuel Adebayo",
      "patientName": "Amina Okafor"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `status` must be one of `BOOKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
  - `dateFrom` and `dateTo` must be valid dates if provided
  - patients can only view their own appointments
  - doctors can only view appointments they are assigned to

### GET `/api/v1/appointments/:appointmentId`

- Method: `GET`
- Route: `/api/v1/appointments/:appointmentId`
- Description: Fetch a single appointment.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Appointment fetched successfully.",
  "data": {
    "id": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
    "status": "BOOKED",
    "scheduledStart": "2026-03-25T09:00:00.000Z",
    "scheduledEnd": "2026-03-25T09:30:00.000Z",
    "reason": "Chest pain follow-up"
  }
}
```

- Validation rules:
  - `appointmentId` must be a UUID
  - row-level access rules apply

### PATCH `/api/v1/appointments/:appointmentId`

- Method: `PATCH`
- Route: `/api/v1/appointments/:appointmentId`
- Description: Update mutable appointment details such as time or notes.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`, limited fields)`
- Request body:

```json
{
  "scheduledStart": "2026-03-25T10:00:00.000Z",
  "scheduledEnd": "2026-03-25T10:30:00.000Z",
  "reason": "Updated consultation reason"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Appointment updated successfully.",
  "data": {
    "id": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
    "scheduledStart": "2026-03-25T10:00:00.000Z",
    "scheduledEnd": "2026-03-25T10:30:00.000Z"
  }
}
```

- Validation rules:
  - only future appointments can be rescheduled
  - patients cannot change doctor assignment
  - time and overlap validation must be re-checked

### PATCH `/api/v1/appointments/:appointmentId/status`

- Method: `PATCH`
- Route: `/api/v1/appointments/:appointmentId/status`
- Description: Transition appointment workflow state.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`, cancel only)`
- Request body:

```json
{
  "status": "CONFIRMED",
  "reason": "Doctor approved booking"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Appointment status updated successfully.",
  "data": {
    "id": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
    "status": "CONFIRMED"
  }
}
```

- Validation rules:
  - `status` must be one of `BOOKED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
  - patients can only transition to `CANCELLED`
  - `reason` is required for `CANCELLED` and `NO_SHOW`

### GET `/api/v1/appointments/availability/slots`

- Method: `GET`
- Route: `/api/v1/appointments/availability/slots`
- Description: Return bookable slots for a doctor on a given date.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body: `None`
- Query params:

```json
{
  "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
  "date": "2026-03-25",
  "timezone": "Africa/Lagos"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Available slots fetched successfully.",
  "data": [
    {
      "start": "2026-03-25T09:00:00.000Z",
      "end": "2026-03-25T09:30:00.000Z"
    }
  ]
}
```

- Validation rules:
  - `doctorId` must be a UUID
  - `date` must be a valid calendar date
  - `timezone` must be a valid IANA timezone

---

## Prescriptions Endpoints

### POST `/api/v1/prescriptions`

- Method: `POST`
- Route: `/api/v1/prescriptions`
- Description: Create a prescription for a patient.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body:

```json
{
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "appointmentId": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
  "diagnosis": "Hypertension",
  "notes": "Take as directed for 30 days.",
  "items": [
    {
      "drugName": "Lisinopril",
      "dosage": "10 mg",
      "frequency": "Once daily",
      "durationDays": 30,
      "route": "ORAL",
      "instructions": "Take in the morning after breakfast."
    }
  ]
}
```

- Response example:

```json
{
  "success": true,
  "message": "Prescription created successfully.",
  "data": {
    "id": "5da1e765-1325-4bd6-b53f-d07f15ceac2a",
    "status": "ISSUED",
    "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
    "itemCount": 1
  }
}
```

- Validation rules:
  - `patientId` must be a UUID
  - `appointmentId` must be a UUID if provided
  - `diagnosis` required, 2-500 chars
  - `items` array required, min 1 max 20
  - each item must have `drugName`, `dosage`, `frequency`, and `durationDays`
  - `durationDays` must be between `1` and `365`

### GET `/api/v1/prescriptions`

- Method: `GET`
- Route: `/api/v1/prescriptions`
- Description: List prescriptions visible to the caller.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "status": "ISSUED",
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Prescriptions fetched successfully.",
  "data": [
    {
      "id": "5da1e765-1325-4bd6-b53f-d07f15ceac2a",
      "status": "ISSUED",
      "diagnosis": "Hypertension",
      "issuedAt": "2026-03-22T09:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `status` must be one of `DRAFT`, `ISSUED`, `DISCONTINUED`, `COMPLETED`
  - patients can only view their own prescriptions
  - doctors can only view prescriptions they issued or are authorized to manage

### GET `/api/v1/prescriptions/:prescriptionId`

- Method: `GET`
- Route: `/api/v1/prescriptions/:prescriptionId`
- Description: Fetch a prescription with items.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Prescription fetched successfully.",
  "data": {
    "id": "5da1e765-1325-4bd6-b53f-d07f15ceac2a",
    "status": "ISSUED",
    "diagnosis": "Hypertension",
    "items": [
      {
        "drugName": "Lisinopril",
        "dosage": "10 mg"
      }
    ]
  }
}
```

- Validation rules:
  - `prescriptionId` must be a UUID
  - row-level access rules apply

### PATCH `/api/v1/prescriptions/:prescriptionId`

- Method: `PATCH`
- Route: `/api/v1/prescriptions/:prescriptionId`
- Description: Update prescription details while still clinically editable.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`)
- Request body:

```json
{
  "notes": "Continue for 60 days if blood pressure remains elevated.",
  "items": [
    {
      "drugName": "Lisinopril",
      "dosage": "20 mg",
      "frequency": "Once daily",
      "durationDays": 60,
      "route": "ORAL",
      "instructions": "Take in the morning after breakfast."
    }
  ]
}
```

- Response example:

```json
{
  "success": true,
  "message": "Prescription updated successfully.",
  "data": {
    "id": "5da1e765-1325-4bd6-b53f-d07f15ceac2a",
    "status": "ISSUED"
  }
}
```

- Validation rules:
  - issued or completed prescriptions may restrict editable fields
  - `items` max 20 if provided
  - item validation rules must still apply

### PATCH `/api/v1/prescriptions/:prescriptionId/status`

- Method: `PATCH`
- Route: `/api/v1/prescriptions/:prescriptionId/status`
- Description: Update prescription status such as issue, discontinue, or complete.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`)
- Request body:

```json
{
  "status": "DISCONTINUED",
  "reason": "Medication changed after review."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Prescription status updated successfully.",
  "data": {
    "id": "5da1e765-1325-4bd6-b53f-d07f15ceac2a",
    "status": "DISCONTINUED"
  }
}
```

- Validation rules:
  - `status` must be one of `DRAFT`, `ISSUED`, `DISCONTINUED`, `COMPLETED`
  - `reason` required when discontinuing

---

## Medications Endpoints

### POST `/api/v1/medications`

- Method: `POST`
- Route: `/api/v1/medications`
- Description: Create a medication tracker for a patient, optionally linked to a prescription.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body:

```json
{
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "prescriptionId": "5da1e765-1325-4bd6-b53f-d07f15ceac2a",
  "name": "Lisinopril",
  "dosage": "10 mg",
  "form": "TABLET",
  "route": "ORAL",
  "startDate": "2026-03-22",
  "endDate": "2026-04-21",
  "instructions": "Take in the morning."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medication created successfully.",
  "data": {
    "id": "0d7adbd7-7db2-4dd4-aa77-32d84b0fa7e4",
    "name": "Lisinopril",
    "status": "ACTIVE"
  }
}
```

- Validation rules:
  - `patientId` must be a UUID
  - `prescriptionId` must be a UUID if provided
  - `name`, `dosage`, `form`, `route`, and `startDate` are required
  - `endDate` must be on or after `startDate` if provided

### GET `/api/v1/medications`

- Method: `GET`
- Route: `/api/v1/medications`
- Description: List medications visible to the caller.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "status": "ACTIVE",
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medications fetched successfully.",
  "data": [
    {
      "id": "0d7adbd7-7db2-4dd4-aa77-32d84b0fa7e4",
      "name": "Lisinopril",
      "status": "ACTIVE",
      "startDate": "2026-03-22"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `status` must be one of `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`
  - row-level access rules apply

### GET `/api/v1/medications/:medicationId`

- Method: `GET`
- Route: `/api/v1/medications/:medicationId`
- Description: Fetch a single medication tracker.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Medication fetched successfully.",
  "data": {
    "id": "0d7adbd7-7db2-4dd4-aa77-32d84b0fa7e4",
    "name": "Lisinopril",
    "dosage": "10 mg",
    "status": "ACTIVE"
  }
}
```

- Validation rules:
  - `medicationId` must be a UUID
  - row-level access rules apply

### PATCH `/api/v1/medications/:medicationId`

- Method: `PATCH`
- Route: `/api/v1/medications/:medicationId`
- Description: Update medication details or lifecycle state.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`)
- Request body:

```json
{
  "dosage": "20 mg",
  "endDate": "2026-05-21",
  "instructions": "Take in the morning after breakfast.",
  "status": "ACTIVE"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medication updated successfully.",
  "data": {
    "id": "0d7adbd7-7db2-4dd4-aa77-32d84b0fa7e4",
    "dosage": "20 mg"
  }
}
```

- Validation rules:
  - `status` must be one of `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED` if provided
  - `endDate` must not be before `startDate`

### POST `/api/v1/medications/:medicationId/schedules`

- Method: `POST`
- Route: `/api/v1/medications/:medicationId/schedules`
- Description: Add a reminder schedule for a medication.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body:

```json
{
  "times": ["08:00", "20:00"],
  "daysOfWeek": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
  "timezone": "Africa/Lagos",
  "reminderEnabled": true
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medication schedule created successfully.",
  "data": {
    "scheduleId": "8e970830-b5c9-4ad7-90b0-b7dc3c19003a",
    "medicationId": "0d7adbd7-7db2-4dd4-aa77-32d84b0fa7e4"
  }
}
```

- Validation rules:
  - `medicationId` must be a UUID
  - `times` must contain 1-12 `HH:mm` values
  - `daysOfWeek` must contain valid day enums
  - `timezone` must be a valid IANA timezone

### POST `/api/v1/medications/:medicationId/logs`

- Method: `POST`
- Route: `/api/v1/medications/:medicationId/logs`
- Description: Record a medication intake event or missed dose.
- Who can access it: `PATIENT` (`Own`), `ADMIN`, `DOCTOR` (`Assigned`)
- Request body:

```json
{
  "scheduleId": "8e970830-b5c9-4ad7-90b0-b7dc3c19003a",
  "status": "TAKEN",
  "takenAt": "2026-03-22T08:05:00.000Z",
  "notes": "Taken after breakfast."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medication log created successfully.",
  "data": {
    "id": "6d03c5e2-f0f4-43c8-b2e2-b311df7a1258",
    "status": "TAKEN",
    "takenAt": "2026-03-22T08:05:00.000Z"
  }
}
```

- Validation rules:
  - `scheduleId` must be a UUID if provided
  - `status` must be one of `TAKEN`, `SKIPPED`, `MISSED`
  - `takenAt` required when `status` is `TAKEN`
  - patients can only log their own medications

### GET `/api/v1/medications/:medicationId/logs`

- Method: `GET`
- Route: `/api/v1/medications/:medicationId/logs`
- Description: List medication adherence logs.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-31"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medication logs fetched successfully.",
  "data": [
    {
      "id": "6d03c5e2-f0f4-43c8-b2e2-b311df7a1258",
      "status": "TAKEN",
      "takenAt": "2026-03-22T08:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `medicationId` must be a UUID
  - `dateFrom` and `dateTo` must be valid dates if provided

---

## Reminders Endpoints

### POST `/api/v1/reminders`

- Method: `POST`
- Route: `/api/v1/reminders`
- Description: Create a reminder for appointments, medications, or general care tasks.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body:

```json
{
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "type": "MEDICATION",
  "referenceType": "MEDICATION",
  "referenceId": "0d7adbd7-7db2-4dd4-aa77-32d84b0fa7e4",
  "title": "Take evening medication",
  "scheduledFor": "2026-03-22T20:00:00.000Z",
  "repeatPattern": "DAILY",
  "channel": "PUSH"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Reminder created successfully.",
  "data": {
    "id": "2333dd55-a026-4c75-86de-c24974ff6ffd",
    "status": "SCHEDULED"
  }
}
```

- Validation rules:
  - `patientId` must be a UUID
  - `type` must be one of `APPOINTMENT`, `MEDICATION`, `GENERAL`
  - `referenceType` must match the target resource if provided
  - `scheduledFor` must be in the future
  - `repeatPattern` must be one of `NONE`, `DAILY`, `WEEKLY`, `MONTHLY`
  - `channel` must be one of `PUSH`, `EMAIL`, `SMS`

### GET `/api/v1/reminders`

- Method: `GET`
- Route: `/api/v1/reminders`
- Description: List reminders visible to the caller.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "status": "SCHEDULED",
  "type": "MEDICATION"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Reminders fetched successfully.",
  "data": [
    {
      "id": "2333dd55-a026-4c75-86de-c24974ff6ffd",
      "title": "Take evening medication",
      "status": "SCHEDULED",
      "scheduledFor": "2026-03-22T20:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `status` must be one of `SCHEDULED`, `SENT`, `SNOOZED`, `DISMISSED`, `CANCELLED`
  - `type` must be one of `APPOINTMENT`, `MEDICATION`, `GENERAL`
  - row-level access rules apply

### GET `/api/v1/reminders/:reminderId`

- Method: `GET`
- Route: `/api/v1/reminders/:reminderId`
- Description: Fetch a single reminder.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Reminder fetched successfully.",
  "data": {
    "id": "2333dd55-a026-4c75-86de-c24974ff6ffd",
    "title": "Take evening medication",
    "status": "SCHEDULED"
  }
}
```

- Validation rules:
  - `reminderId` must be a UUID
  - row-level access rules apply

### PATCH `/api/v1/reminders/:reminderId`

- Method: `PATCH`
- Route: `/api/v1/reminders/:reminderId`
- Description: Update reminder timing or content before execution.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT` (`Own`)
- Request body:

```json
{
  "title": "Take evening medication after dinner",
  "scheduledFor": "2026-03-22T20:30:00.000Z"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Reminder updated successfully.",
  "data": {
    "id": "2333dd55-a026-4c75-86de-c24974ff6ffd",
    "scheduledFor": "2026-03-22T20:30:00.000Z"
  }
}
```

- Validation rules:
  - `scheduledFor` must be in the future if provided
  - cancelled reminders cannot be edited

### PATCH `/api/v1/reminders/:reminderId/status`

- Method: `PATCH`
- Route: `/api/v1/reminders/:reminderId/status`
- Description: Update reminder state such as snooze, dismiss, or cancel.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT` (`Own`)
- Request body:

```json
{
  "status": "SNOOZED",
  "snoozeUntil": "2026-03-22T20:45:00.000Z"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Reminder status updated successfully.",
  "data": {
    "id": "2333dd55-a026-4c75-86de-c24974ff6ffd",
    "status": "SNOOZED"
  }
}
```

- Validation rules:
  - `status` must be one of `SCHEDULED`, `SENT`, `SNOOZED`, `DISMISSED`, `CANCELLED`
  - `snoozeUntil` is required when `status` is `SNOOZED`

---

## Medical Records Endpoints

### POST `/api/v1/records`

- Method: `POST`
- Route: `/api/v1/records`
- Description: Create a medical record entry for a patient.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body:

```json
{
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "appointmentId": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
  "recordType": "CONSULTATION_NOTE",
  "title": "Cardiology review",
  "summary": "Patient reviewed after blood pressure spike.",
  "clinicalNotes": "Continue current treatment and monitor weekly.",
  "diagnosis": "Hypertension",
  "followUpDate": "2026-04-01"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medical record created successfully.",
  "data": {
    "id": "11f7b75f-694c-4ab0-9396-2af35c1a0739",
    "recordType": "CONSULTATION_NOTE",
    "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71"
  }
}
```

- Validation rules:
  - `patientId` must be a UUID
  - `appointmentId` must be a UUID if provided
  - `recordType` must be one of `CONSULTATION_NOTE`, `LAB_RESULT`, `IMAGING`, `DISCHARGE_SUMMARY`, `GENERAL`
  - `title` required, 2-200 chars
  - `summary` max 1000 chars if provided
  - `clinicalNotes` max 10000 chars if provided

### GET `/api/v1/records`

- Method: `GET`
- Route: `/api/v1/records`
- Description: List medical records visible to the caller.
- Who can access it: `ADMIN`, `DOCTOR`, `PATIENT`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "recordType": "CONSULTATION_NOTE"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medical records fetched successfully.",
  "data": [
    {
      "id": "11f7b75f-694c-4ab0-9396-2af35c1a0739",
      "recordType": "CONSULTATION_NOTE",
      "title": "Cardiology review",
      "createdAt": "2026-03-22T09:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `recordType` must be a valid enum if provided
  - patients can only view their own records
  - doctors can only view records for assigned patients

### GET `/api/v1/records/:recordId`

- Method: `GET`
- Route: `/api/v1/records/:recordId`
- Description: Fetch a single medical record.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`), `PATIENT` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Medical record fetched successfully.",
  "data": {
    "id": "11f7b75f-694c-4ab0-9396-2af35c1a0739",
    "recordType": "CONSULTATION_NOTE",
    "title": "Cardiology review",
    "diagnosis": "Hypertension"
  }
}
```

- Validation rules:
  - `recordId` must be a UUID
  - row-level access rules apply

### PATCH `/api/v1/records/:recordId`

- Method: `PATCH`
- Route: `/api/v1/records/:recordId`
- Description: Update a medical record created by the care team.
- Who can access it: `ADMIN`, `DOCTOR` (`Assigned`)
- Request body:

```json
{
  "summary": "Patient reviewed after elevated blood pressure reading.",
  "clinicalNotes": "Continue medication. Review again in one week.",
  "followUpDate": "2026-04-05"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Medical record updated successfully.",
  "data": {
    "id": "11f7b75f-694c-4ab0-9396-2af35c1a0739",
    "followUpDate": "2026-04-05"
  }
}
```

- Validation rules:
  - `followUpDate` must be a valid date if provided
  - records marked locked or signed-off should reject mutable field updates

### POST `/api/v1/records/:recordId/vital-signs`

- Method: `POST`
- Route: `/api/v1/records/:recordId/vital-signs`
- Description: Attach a vital signs entry to a medical record.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body:

```json
{
  "bloodPressureSystolic": 128,
  "bloodPressureDiastolic": 82,
  "heartRate": 74,
  "temperatureCelsius": 36.8,
  "weightKg": 67,
  "heightCm": 170
}
```

- Response example:

```json
{
  "success": true,
  "message": "Vital signs recorded successfully.",
  "data": {
    "id": "58f2e1ab-6cf4-4600-a787-f68d83cd4a3b",
    "recordId": "11f7b75f-694c-4ab0-9396-2af35c1a0739"
  }
}
```

- Validation rules:
  - `recordId` must be a UUID
  - vital sign numbers must be positive and clinically reasonable
  - at least one vital sign value must be provided

### POST `/api/v1/records/:recordId/files`

- Method: `POST`
- Route: `/api/v1/records/:recordId/files`
- Description: Attach uploaded file metadata to a medical record after cloud upload.
- Who can access it: `ADMIN`, `DOCTOR`
- Request body:

```json
{
  "storageProvider": "S3",
  "fileUrl": "https://cdn.careaxis.app/records/report-001.pdf",
  "fileName": "lab-report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 523001
}
```

- Response example:

```json
{
  "success": true,
  "message": "Record file attached successfully.",
  "data": {
    "fileId": "1f99bc2f-2278-42d4-8b82-ebf14ef8dd56",
    "recordId": "11f7b75f-694c-4ab0-9396-2af35c1a0739"
  }
}
```

- Validation rules:
  - `recordId` must be a UUID
  - `storageProvider` must be `S3` or `CLOUDINARY`
  - `fileUrl` must be a valid HTTPS URL
  - `sizeBytes` must be greater than `0`

---

## Notifications Endpoints

### GET `/api/v1/notifications`

- Method: `GET`
- Route: `/api/v1/notifications`
- Description: List notifications for the current user.
- Who can access it: `Authenticated`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "isRead": false,
  "type": "APPOINTMENT"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Notifications fetched successfully.",
  "data": [
    {
      "id": "e4495760-b6f8-4ded-bdf7-e56b70732744",
      "type": "APPOINTMENT",
      "title": "Appointment confirmed",
      "isRead": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `isRead` must be boolean if provided
  - `type` must be one of `SYSTEM`, `APPOINTMENT`, `PRESCRIPTION`, `MEDICATION`, `REMINDER`

### GET `/api/v1/notifications/:notificationId`

- Method: `GET`
- Route: `/api/v1/notifications/:notificationId`
- Description: Fetch a single notification for the current user.
- Who can access it: `Authenticated` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Notification fetched successfully.",
  "data": {
    "id": "e4495760-b6f8-4ded-bdf7-e56b70732744",
    "title": "Appointment confirmed",
    "body": "Your appointment has been confirmed for 9:00 AM."
  }
}
```

- Validation rules:
  - `notificationId` must be a UUID
  - notification must belong to the authenticated user

### PATCH `/api/v1/notifications/:notificationId/read`

- Method: `PATCH`
- Route: `/api/v1/notifications/:notificationId/read`
- Description: Mark a notification as read.
- Who can access it: `Authenticated` (`Own`)
- Request body:

```json
{
  "isRead": true
}
```

- Response example:

```json
{
  "success": true,
  "message": "Notification updated successfully.",
  "data": {
    "id": "e4495760-b6f8-4ded-bdf7-e56b70732744",
    "isRead": true
  }
}
```

- Validation rules:
  - `isRead` must be boolean
  - notification must belong to the authenticated user

### PATCH `/api/v1/notifications/read-all`

- Method: `PATCH`
- Route: `/api/v1/notifications/read-all`
- Description: Mark all current user's notifications as read.
- Who can access it: `Authenticated`
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "All notifications marked as read.",
  "data": {
    "updatedCount": 8
  }
}
```

- Validation rules:
  - valid bearer token is required

### POST `/api/v1/notifications/device-tokens`

- Method: `POST`
- Route: `/api/v1/notifications/device-tokens`
- Description: Register a device token for push notifications.
- Who can access it: `Authenticated`
- Request body:

```json
{
  "token": "fcm_device_token_here",
  "platform": "android",
  "deviceName": "Pixel 8 Pro"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Device token registered successfully.",
  "data": {
    "id": "3ef556de-c6dc-4488-9d5f-766ccde2c809",
    "platform": "android"
  }
}
```

- Validation rules:
  - `token` required, 20-512 chars
  - `platform` must be one of `ios`, `android`, `web`
  - duplicate active token registration for the same user should be idempotent

### DELETE `/api/v1/notifications/device-tokens/:tokenId`

- Method: `DELETE`
- Route: `/api/v1/notifications/device-tokens/:tokenId`
- Description: Remove a registered device token.
- Who can access it: `Authenticated` (`Own`)
- Request body: `None`
- Response example:

```json
{
  "success": true,
  "message": "Device token removed successfully.",
  "data": null
}
```

- Validation rules:
  - `tokenId` must be a UUID
  - token must belong to the authenticated user

---

## Admin Endpoints

### GET `/api/v1/admin/dashboard`

- Method: `GET`
- Route: `/api/v1/admin/dashboard`
- Description: Return top-level operational metrics for the admin panel.
- Who can access it: `ADMIN`
- Request body: `None`
- Query params:

```json
{
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-31"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Admin dashboard fetched successfully.",
  "data": {
    "totalUsers": 420,
    "totalDoctors": 38,
    "totalPatients": 382,
    "appointmentsToday": 26
  }
}
```

- Validation rules:
  - `dateFrom` and `dateTo` must be valid dates if provided

### GET `/api/v1/admin/users`

- Method: `GET`
- Route: `/api/v1/admin/users`
- Description: List users from the admin control panel with moderation filters.
- Who can access it: `ADMIN`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "role": "PATIENT",
  "status": "ACTIVE",
  "q": "amina"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Admin users fetched successfully.",
  "data": [
    {
      "id": "0db52db0-24ae-4ef8-a0db-4a3ddf4fc701",
      "email": "amina.okafor@example.com",
      "role": "PATIENT",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - same validation rules as `GET /api/v1/users`

### PATCH `/api/v1/admin/doctors/:doctorId/verification`

- Method: `PATCH`
- Route: `/api/v1/admin/doctors/:doctorId/verification`
- Description: Verify or reject a doctor's onboarding review.
- Who can access it: `ADMIN`
- Request body:

```json
{
  "isVerified": true,
  "notes": "License and registration validated."
}
```

- Response example:

```json
{
  "success": true,
  "message": "Doctor verification updated successfully.",
  "data": {
    "doctorId": "7f93fb79-9e18-4708-bc8a-f32b5f011296",
    "isVerified": true
  }
}
```

- Validation rules:
  - `doctorId` must be a UUID
  - `isVerified` must be boolean
  - `notes` max 1000 chars if provided

### GET `/api/v1/admin/audit-logs`

- Method: `GET`
- Route: `/api/v1/admin/audit-logs`
- Description: View admin and privileged activity logs.
- Who can access it: `ADMIN`
- Request body: `None`
- Query params:

```json
{
  "page": 1,
  "limit": 20,
  "actorUserId": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
  "action": "USER_STATUS_UPDATED"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Audit logs fetched successfully.",
  "data": [
    {
      "id": "4914c7e9-c599-4f53-b3af-a55d02d532c1",
      "action": "USER_STATUS_UPDATED",
      "actorUserId": "8448ce7a-bd07-4f60-b8e9-53a4c3afcf37",
      "createdAt": "2026-03-22T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

- Validation rules:
  - `actorUserId` must be a UUID if provided
  - `action` 2-100 chars if provided

### GET `/api/v1/admin/reports/appointments`

- Method: `GET`
- Route: `/api/v1/admin/reports/appointments`
- Description: Return appointment analytics for the admin panel.
- Who can access it: `ADMIN`
- Request body: `None`
- Query params:

```json
{
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-31",
  "groupBy": "day"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Appointment report fetched successfully.",
  "data": {
    "totals": {
      "booked": 150,
      "completed": 131,
      "cancelled": 11
    },
    "series": [
      {
        "label": "2026-03-22",
        "count": 12
      }
    ]
  }
}
```

- Validation rules:
  - `dateFrom` and `dateTo` are required and must be valid dates
  - `groupBy` must be one of `day`, `week`, `month`

### GET `/api/v1/admin/reports/clinical`

- Method: `GET`
- Route: `/api/v1/admin/reports/clinical`
- Description: Return platform-level prescription, medication, and reminder activity metrics.
- Who can access it: `ADMIN`
- Request body: `None`
- Query params:

```json
{
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-31"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Clinical activity report fetched successfully.",
  "data": {
    "prescriptionsIssued": 78,
    "activeMedications": 215,
    "remindersSent": 1840,
    "adherenceRate": 0.88
  }
}
```

- Validation rules:
  - `dateFrom` and `dateTo` are required and must be valid dates

### POST `/api/v1/admin/notifications/broadcast`

- Method: `POST`
- Route: `/api/v1/admin/notifications/broadcast`
- Description: Send a system-wide broadcast notification to targeted roles.
- Who can access it: `ADMIN`
- Request body:

```json
{
  "title": "Scheduled maintenance",
  "body": "The system will be unavailable from 1:00 AM to 1:30 AM UTC.",
  "targetRoles": ["DOCTOR", "PATIENT"],
  "channel": "PUSH"
}
```

- Response example:

```json
{
  "success": true,
  "message": "Broadcast notification queued successfully.",
  "data": {
    "jobId": "98f6ceaf-f36d-4a11-a959-0b8d59c6a31d",
    "targetCount": 420
  }
}
```

- Validation rules:
  - `title` required, 2-120 chars
  - `body` required, 2-1000 chars
  - `targetRoles` must contain one or more of `ADMIN`, `DOCTOR`, `PATIENT`
  - `channel` must be one of `PUSH`, `EMAIL`, `SMS`

---

## Implementation Notes

- All list endpoints should support pagination, filtering, and sorting.
- All sensitive write endpoints should create audit log entries.
- Clinical write endpoints should enforce doctor-patient relationship checks.
- Notifications and reminders should be queue-backed for reliability.
- File uploads should use presigned upload or provider SDK upload, then attach metadata through API.
- Validation should be enforced with Zod or Joi at the controller boundary.
- Repository layer should own SQL and transactional safety.
