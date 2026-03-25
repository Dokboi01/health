# CareAxis Backend Phase 1 Setup

## Goal

Phase 1 sets up the backend foundation for the CareAxis medical platform using:

- `Node.js`
- `Express`
- `PostgreSQL`
- `TypeScript`
- `Zod` for request and environment validation

This phase covers:

- project initialization
- folder structure
- environment configuration
- Express app setup
- PostgreSQL connection
- middleware
- centralized error handling
- request validation foundation
- base route
- health check route

---

## Where The Backend Should Live

Place the backend in:

```text
backend/
```

Inside the main project, the structure should look like this:

```text
backend/
|-- .env.example
|-- package.json
|-- tsconfig.json
|-- db/
|   |-- production_schema.sql
|   `-- schema.sql
`-- src/
    |-- app.ts
    |-- server.ts
    |-- common/
    |   |-- constants/
    |   |-- errors/
    |   |-- middleware/
    |   |-- schemas/
    |   |-- types/
    |   |-- utils/
    |   `-- validators/
    |-- config/
    |-- modules/
    |   |-- admin/
    |   |-- appointments/
    |   |-- auth/
    |   |-- doctors/
    |   |-- health/
    |   |-- medications/
    |   |-- notifications/
    |   |-- patients/
    |   |-- prescriptions/
    |   |-- records/
    |   |-- search/
    |   `-- settings/
    `-- routes/
```

---

## File-By-File Setup

### Root backend files

#### `backend/package.json`

- Purpose:
  - defines the backend package
  - stores scripts and dependencies
- Current role in Phase 1:
  - project initialization
  - runtime and developer tooling
- Important scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run check`

#### `backend/tsconfig.json`

- Purpose:
  - configures TypeScript compilation
- Current role in Phase 1:
  - strict typing
  - `src` to `dist` build output

#### `backend/.env.example`

- Purpose:
  - documents all required environment variables
- Current role in Phase 1:
  - makes local setup predictable
  - provides secure configuration placeholders

#### `backend/db/schema.sql`

- Purpose:
  - contains the working PostgreSQL schema used by the app

#### `backend/db/production_schema.sql`

- Purpose:
  - contains the fuller production-grade schema design

---

## Application Entry Files

#### `backend/src/app.ts`

- Purpose:
  - creates the Express app
  - registers global middleware
  - mounts routes
  - attaches not-found and error handlers
- This file is where:
  - `cors` is configured
  - `helmet` is enabled
  - JSON/body parsing is added
  - the base route `/` is defined
  - versioned API routes are mounted

#### `backend/src/server.ts`

- Purpose:
  - bootstraps the app
  - verifies database connectivity
  - starts the HTTP server
- This file is where:
  - PostgreSQL startup health is checked with `SELECT 1`
  - the app listens on the configured port

---

## Config Files

All infrastructure configuration should live inside:

```text
backend/src/config/
```

#### `backend/src/config/env.ts`

- Purpose:
  - loads and validates environment variables using `Zod`
- This file ensures:
  - `DATABASE_URL` exists
  - JWT secrets are long enough
  - the port is valid
  - the API prefix is available

#### `backend/src/config/database.ts`

- Purpose:
  - creates the PostgreSQL connection pool
  - exposes query helpers
  - provides a transaction wrapper
- This file is where:
  - `pg` Pool is configured
  - SSL behavior is controlled for production
  - shared DB helpers are defined

#### `backend/src/config/logger.ts`

- Purpose:
  - centralizes application logging
- Current Phase 1 role:
  - simple structured logging wrapper for info, warn, and error messages

---

## Shared Foundation Files

All cross-cutting backend code should live inside:

```text
backend/src/common/
```

### Errors

#### `backend/src/common/errors/app-error.ts`

- Purpose:
  - defines a reusable application error class
- Use it for:
  - business rule failures
  - authorization failures
  - not-found errors
  - validation wrappers

### Middleware

#### `backend/src/common/middleware/error-handler.ts`

- Purpose:
  - handles errors in one central place
- This file currently handles:
  - custom `AppError`
  - `Zod` validation errors
  - JWT/token errors
  - PostgreSQL duplicate key errors
  - fallback internal server errors

#### `backend/src/common/middleware/not-found.ts`

- Purpose:
  - catches unknown routes after all route registration

#### `backend/src/common/middleware/validate.middleware.ts`

- Purpose:
  - validates request `body`, `params`, and `query`
- Why it matters:
  - keeps controllers clean
  - makes request validation reusable across modules

#### `backend/src/common/middleware/auth.middleware.ts`

- Purpose:
  - authentication and authorization middleware
- Note:
  - this is already present because the backend foundation grew beyond bare Phase 1

### Schemas

#### `backend/src/common/schemas/pagination.schemas.ts`

- Purpose:
  - reusable validation for list endpoint pagination and filtering defaults

### Types

#### `backend/src/common/types/express.d.ts`

- Purpose:
  - extends Express request typing

#### `backend/src/common/types/pagination.ts`

- Purpose:
  - shared pagination type definitions

### Utils

#### `backend/src/common/utils/async-handler.ts`

- Purpose:
  - wraps async controllers safely if needed across modules

#### `backend/src/common/utils/pagination.ts`

- Purpose:
  - shared pagination helpers for repositories and services

---

## Routing Layer

Routing should live in:

```text
backend/src/routes/
backend/src/modules/<feature>/
```

#### `backend/src/routes/index.ts`

- Purpose:
  - mounts all versioned API modules under the shared API router
- In Phase 1:
  - it includes the health check route
  - it exposes the base feature route structure

#### `backend/src/modules/health/health.routes.ts`

- Purpose:
  - provides the health check endpoint
- Route:

```text
GET /api/v1/health
```

- Why it matters:
  - confirms the API is alive
  - useful for monitoring, deployment checks, and uptime probes

---

## Feature Modules

Business features should live inside:

```text
backend/src/modules/
```

Each module can scale like this:

```text
backend/src/modules/<feature>/
|-- <feature>.routes.ts
|-- <feature>.controller.ts
|-- <feature>.service.ts
|-- <feature>.repository.ts
|-- <feature>.schemas.ts
`-- <feature>.types.ts
```

Already implemented in the project:

- `auth/`
- `doctors/`
- `patients/`
- `search/`
- `health/`

Reserved and scaffolded for future phases:

- `appointments/`
- `prescriptions/`
- `medications/`
- `records/`
- `notifications/`
- `settings/`
- `admin/`

---

## Base Route And Health Route

### Base route

Defined in:

```text
backend/src/app.ts
```

Route:

```text
GET /
```

Purpose:

- returns a simple API-running response
- useful as a basic server sanity check

### Health check route

Defined in:

```text
backend/src/modules/health/health.routes.ts
```

Route:

```text
GET /api/v1/health
```

Purpose:

- returns service health metadata
- useful for CI/CD, load balancers, and uptime monitoring

---

## Environment Variables To Configure

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Important variables:

- `NODE_ENV`
- `PORT`
- `API_PREFIX`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`

---

## Local Run Commands

Run these inside:

```text
backend/
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run type-check:

```bash
npm run check
```

Build production output:

```bash
npm run build
```

---

## Phase 1 Completion Checklist

Phase 1 is complete when these are in place:

- `package.json` initialized
- `tsconfig.json` added
- `.env.example` added
- Express app created in `src/app.ts`
- server bootstrap created in `src/server.ts`
- PostgreSQL pool created in `src/config/database.ts`
- environment validation created in `src/config/env.ts`
- middleware added in `src/common/middleware/`
- centralized error handling added
- request validation middleware added
- base route `/` added
- health route `/api/v1/health` added

This project already has those pieces implemented.
