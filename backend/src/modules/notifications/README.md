# Notifications Module

This module owns reminders, in-app notifications, push token registration, and reminder dispatch.

Implemented files:

- `notifications.routes.ts`
- `notifications.controller.ts`
- `notifications.service.ts`
- `notifications.repository.ts`
- `notifications.schemas.ts`
- `notifications.types.ts`
- `notifications.scheduler.ts`
- `fcm.provider.ts`

Responsibilities:

- in-app notification persistence
- Firebase Cloud Messaging integration structure
- push token registration and deactivation
- appointment and medication reminder dispatch
- event notifications for doctor bookings and prescription changes
- read tracking and reminder processing
