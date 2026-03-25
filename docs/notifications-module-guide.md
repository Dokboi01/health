# Notifications Module Guide

Phase 7 adds notification delivery, reminder processing, device registration, and Firebase Cloud Messaging structure.

## Implemented Features

- Appointment reminders are already created from the appointments module and are now dispatched into the notifications inbox.
- Medication reminders are already created from the medications module and are now dispatched into the notifications inbox.
- Doctors receive a notification when a new appointment is booked for them.
- Patients receive a notification when a prescription is created, updated, or has its status changed.
- Device tokens can be registered for `ANDROID`, `IOS`, and `WEB`.
- FCM HTTP v1 provider structure is included and activated only when the required environment variables are set.
- An interval-based reminder scheduler can run automatically on the API server when enabled.

## Main Routes

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/:notificationId`
- `PATCH /api/v1/notifications/:notificationId/read`
- `PATCH /api/v1/notifications/read-all`
- `GET /api/v1/notifications/reminders`
- `POST /api/v1/notifications/reminders/process`
- `GET /api/v1/notifications/device-tokens`
- `POST /api/v1/notifications/device-tokens`
- `DELETE /api/v1/notifications/device-tokens/:deviceTokenId`

## Example Requests

### Register Device Token

```json
{
  "token": "fcm-device-token-from-mobile-client",
  "platform": "ANDROID"
}
```

### Manually Process Due Reminders

```json
{
  "limit": 50
}
```

## Scheduler Environment Variables

```env
FCM_ENABLED=false
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
REMINDER_DISPATCH_ENABLED=false
REMINDER_DISPATCH_INTERVAL_MS=60000
REMINDER_DISPATCH_BATCH_SIZE=50
```

## Notes

- When `REMINDER_DISPATCH_ENABLED=true`, the server starts an interval worker on boot.
- When `FCM_ENABLED=false`, reminders and event notifications still create in-app notification rows.
- Push delivery failures do not block in-app notification creation.
- Invalid push tokens are automatically deactivated when FCM reports them as unregistered.
