# CareAxis Health Platform

CareAxis is a production-style medical health platform for admins, doctors, and patients. This repository is organized as a monorepo with a Node.js + Express backend and a Flutter mobile frontend, designed around clean architecture, modular boundaries, and security-first defaults.

## What is included now

- Phase 0 blueprint: product requirements, role capabilities, API plan, screen inventory, and delivery roadmap
- Complete PostgreSQL database schema for authentication, doctor-patient management, appointments, prescriptions, medications, records, reminders, notifications, and admin auditing
- Phase 1 backend foundation: secure Express API setup, environment management, PostgreSQL connection layer, validation, error handling, JWT auth, refresh token rotation, and RBAC middleware
- Phase 1 Flutter foundation: premium theme, app shell, routing, Riverpod state management, login flow, and role-based starter dashboards

## Repository structure

```text
.
|-- backend
|   |-- db
|   |   `-- schema.sql
|   `-- src
|       |-- common
|       |-- config
|       |-- modules
|       `-- routes
|-- docs
|   `-- product-blueprint.md
`-- mobile
    |-- lib
    `-- pubspec.yaml
```

## Getting started

### Backend

1. Copy `backend/.env.example` to `backend/.env`
2. Create a PostgreSQL database
3. Run the schema in `backend/db/schema.sql`
4. Install dependencies with `npm.cmd install`
5. Start the API with `npm.cmd run dev`

### Mobile

1. Ensure Flutter is installed and available on your PATH
2. From `mobile`, run `flutter pub get`
3. Run the app with `flutter run`

## Current delivery roadmap

- Phase 0: product architecture and data model
- Phase 1: platform foundation and authentication
- Phase 2: doctor-patient management
- Phase 3: appointments and scheduling
- Phase 4: prescriptions and medication tracking
- Phase 5: medical records and file handling
- Phase 6: notifications, reminders, analytics, and admin controls

## Workspace note

The Flutter CLI is not currently available in this shell environment, so the Flutter app has been scaffolded manually with a real-world folder structure and starter code. Once Flutter is installed locally, the project is ready for `flutter pub get` and the standard platform bootstrapping workflow.

