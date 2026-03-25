# Prescriptions And Medication Tracking Guide

## Scope

This phase covers:

- doctor creates prescription
- patient views prescriptions
- medication list
- dosage details
- medication schedule
- reminder times
- mark medication as taken
- medication adherence tracking

## Database Updates

This phase extends the existing medication model with recurring schedule support.

Added to `backend/db/schema.sql`:

- `medication_schedules` table
- `medication_logs.medication_schedule_id`
- schedule and log indexes
- `medication_schedules_set_updated_at` trigger

## Main Endpoints

### Prescriptions

- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:prescriptionId`
- `PATCH /api/v1/prescriptions/:prescriptionId`
- `PATCH /api/v1/prescriptions/:prescriptionId/status`

### Medications

- `POST /api/v1/medications`
- `GET /api/v1/medications`
- `GET /api/v1/medications/:medicationId`
- `PATCH /api/v1/medications/:medicationId`

### Medication Schedules

- `GET /api/v1/medications/:medicationId/schedules`
- `PUT /api/v1/medications/:medicationId/schedules`

### Medication Logs And Adherence

- `POST /api/v1/medications/:medicationId/logs`
- `POST /api/v1/medications/:medicationId/mark-taken`
- `GET /api/v1/medications/:medicationId/logs`
- `GET /api/v1/medications/:medicationId/adherence`

## Logic Summary

- Prescription creation remains doctor/admin controlled.
- Patient prescription access remains row-level scoped to the patient.
- Medication detail now includes schedule entries.
- Medication schedules are modeled as explicit recurring times, optionally scoped to specific weekdays.
- Updating schedules rebuilds future scheduled medication log rows.
- Reminder syncing now prefers explicit schedule reminder times.
- If a medication has no stored schedules yet, reminder generation falls back to frequency-based heuristics.
- Marking a dose as taken updates an existing scheduled log when possible, or creates a new taken log when needed.
- Adherence is calculated from medication logs using taken, skipped, missed, and pending dose counts.

## Example Requests And Responses

### 1. Doctor creates prescription

- Method: `POST`
- URL: `/api/v1/prescriptions`

Request:

```json
{
  "patientId": "ec06e248-f663-4c42-8fe8-1afba70695f3",
  "appointmentId": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
  "diagnosis": "Essential hypertension",
  "instructions": "Continue medication and reduce sodium intake.",
  "startDate": "2026-04-10",
  "items": [
    {
      "medicationName": "Amlodipine",
      "strength": "5 mg",
      "dosage": "1 tablet",
      "frequency": "Twice daily",
      "route": "ORAL",
      "durationDays": 30,
      "notes": "Take after meals."
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "Prescription created successfully.",
  "data": {
    "id": "88d39b91-1ab5-4124-a915-0468ac0d0d47",
    "status": "ACTIVE",
    "patientId": "ec06e248-f663-4c42-8fe8-1afba70695f3",
    "items": [
      {
        "medicationName": "Amlodipine",
        "dosage": "1 tablet",
        "frequency": "Twice daily"
      }
    ]
  }
}
```

### 2. Patient views prescriptions

- Method: `GET`
- URL: `/api/v1/prescriptions?page=1&limit=10`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "88d39b91-1ab5-4124-a915-0468ac0d0d47",
        "status": "ACTIVE",
        "diagnosis": "Essential hypertension",
        "startDate": "2026-04-10"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 3. Doctor creates medication with explicit schedule

- Method: `POST`
- URL: `/api/v1/medications`

Request:

```json
{
  "patientId": "ec06e248-f663-4c42-8fe8-1afba70695f3",
  "prescriptionId": "88d39b91-1ab5-4124-a915-0468ac0d0d47",
  "name": "Amlodipine",
  "strength": "5 mg",
  "dosageInstructions": "Take 1 tablet after meals.",
  "frequency": "Twice daily",
  "route": "ORAL",
  "startDate": "2026-04-10",
  "endDate": "2026-05-09",
  "reminderEnabled": true,
  "schedules": [
    {
      "scheduledTime": "08:00",
      "reminderTime": "07:45",
      "timezone": "Africa/Lagos",
      "label": "Morning dose"
    },
    {
      "scheduledTime": "20:00",
      "reminderTime": "19:45",
      "timezone": "Africa/Lagos",
      "label": "Evening dose"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "Medication created successfully.",
  "data": {
    "id": "2cc0866f-b157-4b53-a8d7-ecabf1639f43",
    "name": "Amlodipine",
    "status": "ACTIVE",
    "schedules": [
      {
        "scheduledTime": "08:00",
        "reminderTime": "07:45"
      },
      {
        "scheduledTime": "20:00",
        "reminderTime": "19:45"
      }
    ]
  }
}
```

### 4. Replace medication schedules

- Method: `PUT`
- URL: `/api/v1/medications/2cc0866f-b157-4b53-a8d7-ecabf1639f43/schedules`

Request:

```json
{
  "schedules": [
    {
      "scheduledTime": "08:00",
      "reminderTime": "07:45",
      "timezone": "Africa/Lagos",
      "label": "Morning dose",
      "daysOfWeek": [1, 2, 3, 4, 5]
    },
    {
      "scheduledTime": "09:00",
      "reminderTime": "08:45",
      "timezone": "Africa/Lagos",
      "label": "Weekend dose",
      "daysOfWeek": [0, 6]
    }
  ]
}
```

### 5. Patient fetches medication detail

- Method: `GET`
- URL: `/api/v1/medications/2cc0866f-b157-4b53-a8d7-ecabf1639f43`

Response:

```json
{
  "success": true,
  "data": {
    "id": "2cc0866f-b157-4b53-a8d7-ecabf1639f43",
    "name": "Amlodipine",
    "strength": "5 mg",
    "dosageInstructions": "Take 1 tablet after meals.",
    "frequency": "Twice daily",
    "schedules": [
      {
        "id": "f1d3cbd0-7d1d-4d9a-a764-ef9fd232f605",
        "dayOfWeek": null,
        "scheduledTime": "08:00",
        "reminderTime": "07:45",
        "timezone": "Africa/Lagos"
      }
    ]
  }
}
```

### 6. Patient marks medication as taken

- Method: `POST`
- URL: `/api/v1/medications/2cc0866f-b157-4b53-a8d7-ecabf1639f43/mark-taken`

Request:

```json
{
  "scheduleId": "f1d3cbd0-7d1d-4d9a-a764-ef9fd232f605",
  "scheduledFor": "2026-04-11T08:00:00.000Z",
  "takenAt": "2026-04-11T08:06:00.000Z",
  "note": "Taken after breakfast."
}
```

Response:

```json
{
  "success": true,
  "message": "Medication marked as taken successfully.",
  "data": {
    "id": "9d7f5d24-6037-470d-9b84-e7e7b503f2ab",
    "status": "TAKEN",
    "scheduledFor": "2026-04-11T08:00:00.000Z",
    "takenAt": "2026-04-11T08:06:00.000Z"
  }
}
```

### 7. Patient views adherence summary

- Method: `GET`
- URL: `/api/v1/medications/2cc0866f-b157-4b53-a8d7-ecabf1639f43/adherence?dateFrom=2026-04-01&dateTo=2026-04-30`

Response:

```json
{
  "success": true,
  "data": {
    "medicationId": "2cc0866f-b157-4b53-a8d7-ecabf1639f43",
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-30",
    "totalDoses": 28,
    "takenDoses": 24,
    "skippedDoses": 2,
    "missedDoses": 1,
    "pendingDoses": 1,
    "adherenceRate": 0.8889
  }
}
```
