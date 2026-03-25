# Records Module

This module owns medical records, uploaded files, vital signs, and patient allergies.

Implemented files:

- `records.routes.ts`
- `records.controller.ts`
- `records.service.ts`
- `records.repository.ts`
- `records.schemas.ts`
- `records.types.ts`

Responsibilities:

- secure medical record create/list/detail/update flows
- row-level access control for admin, doctor, and patient roles
- file metadata coordination and generic asset registration
- vital sign capture linked to medical records
- patient allergy management
