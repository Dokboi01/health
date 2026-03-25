# CareAxis Backend Architecture

## Overview

The backend is designed as a modular Node.js + Express + PostgreSQL service with clean separation between HTTP delivery, business logic, persistence, validation, and shared cross-cutting concerns.

### Core architectural principles

- `controllers` handle HTTP requests and shape HTTP responses
- `routes` define endpoint paths and attach middleware
- `services` hold business rules and orchestration logic
- `repositories` own direct database access
- `validators` define request validation with Zod
- `middlewares` enforce security, authentication, authorization, validation, and error handling
- `config` centralizes environment and infrastructure wiring
- `utils` contains reusable helpers with no business responsibility
- `common` contains cross-cutting building blocks used by every module
- `modules` isolate business domains so each feature can grow independently

## Full backend folder structure

```text
backend/
|-- .env.example
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- db/
|   |-- schema.sql
|   `-- production_schema.sql
`-- src/
    |-- app.ts
    |-- server.ts
    |-- common/
    |   |-- constants/
    |   |   |-- permissions.ts
    |   |   |-- relationship.ts
    |   |   `-- roles.ts
    |   |-- errors/
    |   |   `-- app-error.ts
    |   |-- middleware/
    |   |   |-- auth.middleware.ts
    |   |   |-- error-handler.ts
    |   |   |-- not-found.ts
    |   |   `-- validate.middleware.ts
    |   |-- schemas/
    |   |   `-- pagination.schemas.ts
    |   |-- types/
    |   |   |-- express.d.ts
    |   |   `-- pagination.ts
    |   |-- utils/
    |   |   |-- async-handler.ts
    |   |   `-- pagination.ts
    |   `-- validators/
    |       `-- README.md
    |-- config/
    |   |-- database.ts
    |   |-- env.ts
    |   `-- logger.ts
    |-- modules/
    |   |-- admin/
    |   |   `-- README.md
    |   |-- appointments/
    |   |   `-- README.md
    |   |-- auth/
    |   |   |-- auth.controller.ts
    |   |   |-- auth.repository.ts
    |   |   |-- auth.routes.ts
    |   |   |-- auth.schemas.ts
    |   |   |-- auth.service.ts
    |   |   `-- auth.types.ts
    |   |-- doctors/
    |   |   |-- doctors.controller.ts
    |   |   |-- doctors.repository.ts
    |   |   |-- doctors.routes.ts
    |   |   |-- doctors.schemas.ts
    |   |   |-- doctors.service.ts
    |   |   `-- doctors.types.ts
    |   |-- health/
    |   |   `-- health.routes.ts
    |   |-- medications/
    |   |   `-- README.md
    |   |-- notifications/
    |   |   `-- README.md
    |   |-- patients/
    |   |   |-- patients.controller.ts
    |   |   |-- patients.repository.ts
    |   |   |-- patients.routes.ts
    |   |   |-- patients.schemas.ts
    |   |   |-- patients.service.ts
    |   |   `-- patients.types.ts
    |   |-- prescriptions/
    |   |   `-- README.md
    |   |-- records/
    |   |   `-- README.md
    |   |-- search/
    |   |   |-- search.controller.ts
    |   |   `-- search.routes.ts
    |   `-- settings/
    |       `-- README.md
    `-- routes/
        `-- index.ts
```

## Purpose of each top-level backend folder

### `backend/`

Root folder for the API service. Contains runtime config, TypeScript config, SQL schema files, and the application source code.

### `backend/db/`

Database assets.

- `schema.sql`: current working application schema used by the existing implementation
- `production_schema.sql`: production-ready canonical schema design for the long-term architecture

### `backend/src/`

Application source code.

- `app.ts`: Express app composition, middleware registration, and API mounting
- `server.ts`: process bootstrap, database connectivity check, and HTTP server startup

## Purpose of each shared source folder

### `backend/src/common/`

Holds cross-cutting code shared across all modules.

### `backend/src/common/constants/`

Application enums and policy constants.

- `roles.ts`: user roles, statuses, and token types
- `relationship.ts`: doctor-patient relationship status constants
- `permissions.ts`: role-permission matrix and reusable permission helpers

### `backend/src/common/errors/`

Application-specific error primitives.

- `app-error.ts`: strongly typed operational error object with status code, error code, and optional details

### `backend/src/common/middleware/`

Reusable Express middleware.

- `auth.middleware.ts`: JWT authentication, role-based authorization, and permission-aware authorization helpers
- `error-handler.ts`: centralized error serialization and safe API error responses
- `not-found.ts`: fallback route handler for undefined endpoints
- `validate.middleware.ts`: Zod-powered request validation for body, params, and query

### `backend/src/common/schemas/`

Shared validation schemas used across multiple modules.

- `pagination.schemas.ts`: pagination and query validation primitives

### `backend/src/common/types/`

Shared TypeScript types and Express augmentation.

- `express.d.ts`: extends `Express.Request` with authenticated user data
- `pagination.ts`: common pagination interfaces used by services and repositories

### `backend/src/common/utils/`

Generic helper functions with no business ownership.

- `async-handler.ts`: catches async controller errors and forwards them to Express error handling
- `pagination.ts`: shared pagination metadata builder

### `backend/src/common/validators/`

Shared validation helpers for reusable constraints such as UUID, date, phone, or pagination fragments. This complements module-specific `*.schemas.ts` files.

## Purpose of each infrastructure folder

### `backend/src/config/`

Infrastructure and runtime configuration.

- `env.ts`: environment variable parsing and validation
- `database.ts`: PostgreSQL pool and transaction helpers
- `logger.ts`: centralized logging abstraction

### `backend/src/routes/`

Entry point for versioned route mounting.

- `index.ts`: mounts all feature module routes under the API prefix

## Purpose of each module folder

Each business domain lives in `backend/src/modules/<module>`. The standard module pattern is:

- `<module>.routes.ts`: endpoint registration
- `<module>.controller.ts`: request-response handlers
- `<module>.service.ts`: business logic and orchestration
- `<module>.repository.ts`: SQL queries and persistence
- `<module>.schemas.ts`: request validation
- `<module>.types.ts`: module-specific DTOs and interfaces

### `auth/`

Authentication and session management.

- registration
- login
- refresh token rotation
- logout
- current-user profile retrieval

### `doctors/`

Doctor profile and doctor-patient care management.

- doctor profile retrieval and update
- patient linking
- paginated patient listing

### `patients/`

Patient profile and care-team management.

- patient profile retrieval and update
- primary doctor selection
- paginated doctor listing

### `search/`

Role-aware search endpoints that sit across domain boundaries.

### `health/`

Health check route for infrastructure monitoring and uptime checks.

### `admin/`

Planned home for:

- admin dashboard
- user moderation
- approvals
- audit and governance tooling
- operational reports

### `appointments/`

Planned home for:

- booking
- rescheduling
- cancellations
- availability matching
- appointment state transitions

### `prescriptions/`

Planned home for:

- prescription creation
- prescription items
- renewals and discontinuation

### `medications/`

Planned home for:

- medication plans
- medication schedules
- adherence logs
- reminder generation

### `records/`

Planned home for:

- medical records
- uploaded record files
- vital signs
- historical patient record access

### `notifications/`

Planned home for:

- in-app notifications
- push registration
- reminder delivery
- notification preference coordination

### `settings/`

Planned home for:

- profile preferences
- notification settings
- security settings
- locale and timezone settings

## Request lifecycle

1. `routes` receive the request and attach middleware.
2. `middleware` authenticates, authorizes, and validates the request.
3. `controller` translates the HTTP request into service input.
4. `service` enforces business rules and coordinates repository calls.
5. `repository` performs SQL operations against PostgreSQL.
6. `controller` returns a structured API response.
7. `error-handler` catches and formats all failures consistently.

## Why this structure scales well

- New modules can be added without bloating global files
- Controllers stay thin because business logic lives in services
- SQL stays isolated in repositories, making migrations and optimization easier
- Validation is explicit and reusable
- Authentication and authorization stay centralized
- Shared helpers reduce repetition without mixing business concerns
- The codebase is easy to test layer by layer
