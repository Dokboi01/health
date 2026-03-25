# Appointment Module Guide

## Database Updates

No structural database changes were needed for this phase.

The existing schema already supports appointment booking, status tracking, doctor availability, and reminders through:

- `doctor_availability`
- `appointments`
- `reminders`
- `appointment_status` enum

Relevant schema references:

- `backend/db/schema.sql`
- `doctor_availability`
- `appointments`
- `reminders`

## Implemented Features

- Patient books appointment
- Doctor accepts appointment
- Doctor rejects appointment
- Doctor reschedules appointment
- Doctor views all scoped appointments
- Patient views appointment history
- Appointment status tracking
- Appointment reminders

## Main Routes

### Availability

- `GET /api/v1/appointments/availability/me`
- `PUT /api/v1/appointments/availability/me`
- `GET /api/v1/appointments/availability/slots`

### Core Appointment Routes

- `POST /api/v1/appointments`
- `GET /api/v1/appointments`
- `GET /api/v1/appointments/:appointmentId`
- `PATCH /api/v1/appointments/:appointmentId`
- `PATCH /api/v1/appointments/:appointmentId/status`

### Doctor Decision Routes

- `POST /api/v1/appointments/:appointmentId/accept`
- `POST /api/v1/appointments/:appointmentId/reject`
- `POST /api/v1/appointments/:appointmentId/reschedule`

## Validation Summary

### Create appointment

- `doctorId` must be a UUID
- `patientId` must be a UUID
- `appointmentType` must be one of `IN_PERSON`, `VIRTUAL`, `FOLLOW_UP`
- `scheduledStart` and `scheduledEnd` must be ISO datetime strings with timezone
- `scheduledEnd` must be after `scheduledStart`

### Update appointment

- At least one field is required
- If both `scheduledStart` and `scheduledEnd` are supplied, end must be after start

### Update appointment status

- `status` must be one of `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `RESCHEDULED`
- `cancellationReason` is required when cancelling

### Reject appointment

- `cancellationReason` is required
- Minimum length: `5`

### Reschedule appointment

- `scheduledStart` and `scheduledEnd` are required
- `scheduledEnd` must be after `scheduledStart`

## Business Logic Notes

- Patients can only book appointments for themselves.
- Doctors can only book appointments on their own schedule.
- Appointments require an active doctor-patient relationship.
- Appointments must fall inside doctor availability.
- Conflicting bookings are rejected.
- Patients can only cancel their own appointments.
- Doctors and admins can accept, reject, reschedule, and otherwise manage appointment lifecycle changes.
- Completed, cancelled, and no-show appointments are treated as locked.
- Reminder entries are automatically regenerated whenever an appointment is created, accepted, rescheduled, cancelled, or otherwise updated.

## Example Requests And Responses

### 1. Patient books appointment

- Method: `POST`
- URL: `/api/v1/appointments`

Request:

```json
{
  "doctorId": "51b29ca3-4d75-49a1-b0a4-5d4a0ee6cf16",
  "patientId": "ec06e248-f663-4c42-8fe8-1afba70695f3",
  "appointmentType": "IN_PERSON",
  "scheduledStart": "2026-04-10T09:00:00.000Z",
  "scheduledEnd": "2026-04-10T09:30:00.000Z",
  "reason": "Routine blood pressure review",
  "notes": "Patient reports occasional dizziness.",
  "location": "CareAxis Clinic, Lekki"
}
```

Response:

```json
{
  "success": true,
  "message": "Appointment created successfully.",
  "data": {
    "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
    "doctorId": "51b29ca3-4d75-49a1-b0a4-5d4a0ee6cf16",
    "patientId": "ec06e248-f663-4c42-8fe8-1afba70695f3",
    "appointmentType": "IN_PERSON",
    "status": "SCHEDULED",
    "scheduledStart": "2026-04-10T09:00:00.000Z",
    "scheduledEnd": "2026-04-10T09:30:00.000Z"
  }
}
```

### 2. Doctor views appointments

- Method: `GET`
- URL: `/api/v1/appointments?page=1&limit=20&status=SCHEDULED`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
        "status": "SCHEDULED",
        "scheduledStart": "2026-04-10T09:00:00.000Z",
        "scheduledEnd": "2026-04-10T09:30:00.000Z",
        "doctor": {
          "firstName": "Tunde",
          "lastName": "Adebayo"
        },
        "patient": {
          "firstName": "Ada",
          "lastName": "Okoro"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 3. Doctor accepts appointment

- Method: `POST`
- URL: `/api/v1/appointments/40cb4ac9-5d86-42fb-a609-dc26f172e5c7/accept`

Response:

```json
{
  "success": true,
  "message": "Appointment accepted successfully.",
  "data": {
    "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
    "status": "CONFIRMED"
  }
}
```

### 4. Doctor rejects appointment

- Method: `POST`
- URL: `/api/v1/appointments/40cb4ac9-5d86-42fb-a609-dc26f172e5c7/reject`

Request:

```json
{
  "cancellationReason": "Doctor is unavailable for the selected time slot."
}
```

Response:

```json
{
  "success": true,
  "message": "Appointment rejected successfully.",
  "data": {
    "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
    "status": "CANCELLED",
    "cancellationReason": "Doctor is unavailable for the selected time slot."
  }
}
```

### 5. Doctor reschedules appointment

- Method: `POST`
- URL: `/api/v1/appointments/40cb4ac9-5d86-42fb-a609-dc26f172e5c7/reschedule`

Request:

```json
{
  "scheduledStart": "2026-04-10T10:00:00.000Z",
  "scheduledEnd": "2026-04-10T10:30:00.000Z",
  "notes": "Moved forward by one hour after clinic schedule change."
}
```

Response:

```json
{
  "success": true,
  "message": "Appointment rescheduled successfully.",
  "data": {
    "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
    "status": "RESCHEDULED",
    "scheduledStart": "2026-04-10T10:00:00.000Z",
    "scheduledEnd": "2026-04-10T10:30:00.000Z"
  }
}
```

### 6. Patient views appointment history

- Method: `GET`
- URL: `/api/v1/appointments?page=1&limit=20&dateFrom=2026-01-01&dateTo=2026-12-31`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
        "status": "RESCHEDULED",
        "scheduledStart": "2026-04-10T10:00:00.000Z",
        "scheduledEnd": "2026-04-10T10:30:00.000Z"
      },
      {
        "id": "d6e16cbc-458d-4bb4-9ea6-5081e57e78c9",
        "status": "COMPLETED",
        "scheduledStart": "2026-03-04T11:00:00.000Z",
        "scheduledEnd": "2026-03-04T11:30:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

### 7. Patient cancels appointment

- Method: `PATCH`
- URL: `/api/v1/appointments/40cb4ac9-5d86-42fb-a609-dc26f172e5c7/status`

Request:

```json
{
  "status": "CANCELLED",
  "cancellationReason": "Patient is not available anymore."
}
```

Response:

```json
{
  "success": true,
  "message": "Appointment status updated successfully.",
  "data": {
    "id": "40cb4ac9-5d86-42fb-a609-dc26f172e5c7",
    "status": "CANCELLED"
  }
}
```
