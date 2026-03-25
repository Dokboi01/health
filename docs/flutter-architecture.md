# CareAxis Flutter Architecture

## Overview

The mobile app uses Flutter with Riverpod, clean architecture, and a feature-first folder structure. The goal is to keep domain logic isolated, UI reusable, and feature growth predictable as the app expands from authentication into appointments, prescriptions, medications, records, notifications, search, settings, and admin workflows.

### Architectural principles

- `feature-first`: every business domain owns its own data, domain, and presentation layers
- `clean architecture`: UI depends on state and use-case style logic, not directly on transport details
- `Riverpod`: dependency injection and state management live together through providers
- `reusable widgets`: shared UI components live in `core/widgets`
- `API service layer`: networking is centralized in `core/network`
- `form validation`: reusable validators live in `core/forms/validators`
- `routing`: app-wide navigation is centralized in `app/router`
- `theme`: visual system is centralized in `app/theme`

## Full Flutter folder structure

```text
mobile/
|-- analysis_options.yaml
|-- pubspec.yaml
`-- lib/
    |-- bootstrap.dart
    |-- main.dart
    |-- app/
    |   |-- app.dart
    |   |-- router/
    |   |   |-- app_router.dart
    |   |   `-- route_names.dart
    |   `-- theme/
    |       |-- app_colors.dart
    |       `-- app_theme.dart
    |-- core/
    |   |-- constants/
    |   |   `-- app_constants.dart
    |   |-- forms/
    |   |   `-- validators/
    |   |       `-- field_validators.dart
    |   |-- models/
    |   |   `-- app_role.dart
    |   |-- network/
    |   |   |-- api_client.dart
    |   |   `-- api_exception.dart
    |   |-- repositories/
    |   |   `-- README.md
    |   |-- services/
    |   |   `-- README.md
    |   |-- storage/
    |   `-- widgets/
    |       |-- dashboard_scaffold.dart
    |       |-- detail_info_row.dart
    |       |-- empty_state_card.dart
    |       |-- metric_card.dart
    |       |-- mini_trend_chart.dart
    |       |-- section_card.dart
    |       `-- status_chip.dart
    `-- features/
        |-- splash/
        |   `-- presentation/
        |       `-- screens/
        |           `-- splash_screen.dart
        |-- auth/
        |   |-- data/
        |   |   `-- auth_repository.dart
        |   |-- domain/
        |   |   `-- entities/
        |   |       `-- auth_session.dart
        |   `-- presentation/
        |       |-- providers/
        |       |   `-- auth_controller.dart
        |       `-- screens/
        |           `-- login_screen.dart
        |-- dashboard/
        |   `-- presentation/
        |       `-- screens/
        |           |-- admin_dashboard_screen.dart
        |           |-- doctor_dashboard_screen.dart
        |           `-- patient_dashboard_screen.dart
        |-- doctors/
        |   |-- data/
        |   |   `-- doctors_repository.dart
        |   |-- domain/
        |   |   `-- entities/
        |   |       |-- doctor_patient_summary.dart
        |   |       `-- doctor_profile.dart
        |   `-- presentation/
        |       |-- providers/
        |       |   `-- doctors_providers.dart
        |       `-- screens/
        |           |-- doctor_patients_screen.dart
        |           `-- doctor_profile_screen.dart
        |-- patients/
        |   |-- data/
        |   |   `-- patients_repository.dart
        |   |-- domain/
        |   |   `-- entities/
        |   |       |-- patient_doctor_summary.dart
        |   |       `-- patient_profile.dart
        |   `-- presentation/
        |       |-- providers/
        |       |   `-- patients_providers.dart
        |       `-- screens/
        |           |-- patient_doctors_screen.dart
        |           `-- patient_profile_screen.dart
        |-- appointments/
        |   |-- data/
        |   |   `-- README.md
        |   |-- domain/
        |   |   `-- README.md
        |   `-- presentation/
        |       `-- README.md
        |-- prescriptions/
        |   |-- data/
        |   |   `-- README.md
        |   |-- domain/
        |   |   `-- README.md
        |   `-- presentation/
        |       `-- README.md
        |-- medications/
        |   |-- data/
        |   |   `-- README.md
        |   |-- domain/
        |   |   `-- README.md
        |   `-- presentation/
        |       `-- README.md
        |-- records/
        |   |-- data/
        |   |   `-- README.md
        |   |-- domain/
        |   |   `-- README.md
        |   `-- presentation/
        |       `-- README.md
        |-- notifications/
        |   |-- data/
        |   |   `-- README.md
        |   |-- domain/
        |   |   `-- README.md
        |   `-- presentation/
        |       `-- README.md
        |-- search/
        |   |-- data/
        |   |   `-- README.md
        |   |-- domain/
        |   |   `-- README.md
        |   `-- presentation/
        |       `-- README.md
        `-- settings/
            |-- data/
            |   `-- README.md
            |-- domain/
            |   `-- README.md
            `-- presentation/
                `-- README.md
```

## Purpose of each top-level Flutter folder

### `mobile/lib/app/`

App-wide composition and configuration.

- `app.dart`: top-level `MaterialApp.router` composition
- `router/`: all navigation definitions and route constants
- `theme/`: colors, typography, input styles, button styles, and design tokens

### `mobile/lib/core/`

Cross-feature code that can be reused anywhere in the app.

#### `constants/`

Global app constants such as API base URLs and feature flags.

#### `forms/validators/`

Reusable form validation rules for:

- email fields
- password fields
- required fields
- phone numbers
- date checks

This keeps form validation consistent across multiple screens.

#### `models/`

App-wide models that are not feature-specific, such as `AppRole`.

#### `network/`

API service layer.

- `api_client.dart`: central Dio client configuration
- `api_exception.dart`: normalized error mapping for API failures

This is where interceptors, auth headers, token refresh, and retry logic can grow later.

#### `repositories/`

Reserved for cross-feature repository abstractions when a repository must be shared between multiple modules.

#### `services/`

Reserved for app-wide services such as push notification setup, analytics, secure storage orchestration, or file upload coordination.

#### `storage/`

Reserved for local persistence concerns such as secure token storage, app preferences, and offline caching.

#### `widgets/`

Reusable UI building blocks shared across features.

Examples already in the project:

- dashboard layout shells
- metric cards
- section cards
- empty states
- status chips
- detail rows

### `mobile/lib/features/`

All business functionality lives here. Each feature owns its own boundaries and can evolve independently.

## Standard feature module structure

Every feature should follow this pattern:

### `data/`

Implementation details for external data access.

Typical contents:

- repositories
- remote data source adapters
- DTO mappers
- API integration code

### `domain/`

Business-facing models and rules.

Typical contents:

- entities
- value objects
- use cases if the feature becomes more complex

### `presentation/`

UI and state layer.

Typical contents:

- `screens/`
- `providers/`
- feature widgets
- form controllers

## Current implemented features

### `splash/`

Handles initial entry flow and first-route decision.

### `auth/`

Handles login state, auth session modeling, and role-based sign-in flow.

### `dashboard/`

Contains role-specific home dashboards.

### `doctors/`

Contains doctor profile and doctor-patient management screens plus providers and repositories.

### `patients/`

Contains patient profile and patient care-team screens plus providers and repositories.

## Planned features

### `appointments/`

Will own booking, availability, appointment detail views, and rescheduling.

### `prescriptions/`

Will own prescription list, details, creation, and renewal UI.

### `medications/`

Will own medication tracking, schedules, reminders, and adherence logs.

### `records/`

Will own medical record timelines, upload access, and vital sign views.

### `notifications/`

Will own inbox, reminders, read state, and delivery preference flows.

### `search/`

Will own global search, filters, and result views for doctors and patients.

### `settings/`

Will own profile settings, preferences, security, and app configuration views.

## Riverpod architecture

Riverpod is used for both state management and dependency injection.

### Provider layers

- low-level providers expose infrastructure such as Dio
- repository providers expose feature repositories
- state providers and notifier providers expose UI-facing state
- future providers expose simple async read models

### Current examples

- `goRouterProvider` creates the app router
- `authControllerProvider` manages authentication state
- feature-specific future providers load doctor and patient profile data

## Routing architecture

Routing is centralized in `app/router`.

- `app_router.dart` defines all route registrations
- `route_names.dart` defines reusable route path constants

This keeps navigation consistent and avoids string duplication across widgets.

## Theme architecture

Theme configuration lives in `app/theme`.

- `app_colors.dart` contains design tokens
- `app_theme.dart` builds the app theme

This keeps the premium health-tech visual identity consistent across screens.

## Form validation architecture

Form validation should combine:

- reusable validators from `core/forms/validators`
- widget-level `Form` and `TextFormField` validation
- optional feature-specific validation rules inside each feature when needed

This structure avoids repeating email, password, phone, and required-field logic.

## Recommended request flow

1. A screen reads a Riverpod provider.
2. The provider calls a feature repository.
3. The repository uses the shared API client.
4. DTOs are converted into domain entities.
5. The UI rebuilds from provider state.

## Why this structure scales well

- new features can be added without bloating shared folders
- state management stays consistent through Riverpod
- network logic stays centralized
- shared widgets and validators reduce duplication
- domain entities remain independent of UI widgets
- routing and theming remain globally organized
