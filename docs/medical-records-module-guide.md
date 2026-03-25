# Medical Records Module Guide

This phase adds secure medical record management to the backend.

## Implemented Capabilities

- Doctors can create patient medical records with notes, diagnosis, treatment plans, and structured test results.
- Doctors and admins can attach vital signs and uploaded file metadata to a record.
- Doctors and admins can manage patient allergy entries through the records module.
- Patients can only see their own records when `isVisibleToPatient` is `true`.
- Doctors can only access records for patients on an active care-team link.
- Only the authoring doctor or an admin can edit the main medical record body.

## Main Routes

- `POST /api/v1/records`
- `GET /api/v1/records`
- `GET /api/v1/records/:recordId`
- `PATCH /api/v1/records/:recordId`
- `POST /api/v1/records/:recordId/vitals`
- `POST /api/v1/records/:recordId/files`
- `GET /api/v1/records/patients/:patientId/allergies`
- `POST /api/v1/records/patients/:patientId/allergies`
- `PATCH /api/v1/records/allergies/:allergyId`

## Sample Record Create Request

```json
{
  "patientId": "8f9247bf-720c-4b2a-8eb0-e2f0a79f0e71",
  "appointmentId": "7d08be77-38cd-4f12-a258-2af3b6ee6482",
  "recordType": "CONSULTATION",
  "title": "Hypertension follow-up review",
  "summary": "Patient reviewed after elevated home blood pressure readings.",
  "clinicalNotes": "Continue amlodipine and monitor BP twice daily.",
  "diagnosis": "Stage 1 hypertension",
  "treatmentPlan": "Maintain medication adherence, low sodium diet, review in two weeks.",
  "source": "CareAxis Clinic",
  "followUpDate": "2026-04-06",
  "isVisibleToPatient": true,
  "testResults": [
    {
      "testName": "Fasting Blood Sugar",
      "resultValue": "96",
      "unit": "mg/dL",
      "referenceRange": "70-99",
      "status": "NORMAL",
      "notes": "Within expected range"
    }
  ]
}
```

## Sample File Attach Request

```json
{
  "fileName": "lab-report.pdf",
  "fileUrl": "https://cdn.careaxis.app/records/lab-report.pdf",
  "fileType": "application/pdf",
  "fileSizeBytes": 523001,
  "storageProvider": "S3",
  "providerAssetId": "records/lab-report.pdf",
  "isPatientVisible": true
}
```

## Access Rules

- `ADMIN`: full read/write access.
- `DOCTOR`: create and append records only for patients linked through an active `doctor_patient_links` row.
- `DOCTOR`: edit the core record only when the record belongs to that doctor, unless the actor is an admin.
- `PATIENT`: read-only access to own records and allergies; hidden records and hidden files are excluded.

## Database Changes

- `medical_records` now stores `clinical_notes`, `diagnosis`, `treatment_plan`, `follow_up_date`, `test_results`, `is_visible_to_patient`, and `last_updated_by_user_id`.
- `medical_record_files` now stores provider metadata and patient-visibility flags.
- `patient_vitals` now links back to `medical_records` through `medical_record_id`.
