# Auth Postman Examples

Base URL:

```text
http://localhost:4000/api/v1
```

Notes:

- Public self-registration is enabled for `Patient` and `Doctor`.
- `Admin` users should be provisioned internally or seeded through secure back-office tooling.
- `forgot-password` always returns a generic success message.
- In non-production environments, `forgot-password` also returns `resetTokenPreview` so you can test `reset-password` without email delivery.

## 1. Register Patient

- Method: `POST`
- URL: `{{baseUrl}}/auth/register/patient`
- Headers:

```json
{
  "Content-Type": "application/json",
  "x-device-name": "Postman Desktop"
}
```

- Body:

```json
{
  "email": "patient@example.com",
  "password": "SecurePass123",
  "firstName": "Ada",
  "lastName": "Okoro",
  "phone": "+2348012345678",
  "gender": "FEMALE",
  "dateOfBirth": "1994-06-12",
  "bloodGroup": "O+",
  "genotype": "AA",
  "emergencyContactName": "Chinedu Okoro",
  "emergencyContactPhone": "+2348098765432"
}
```

## 2. Register Doctor

- Method: `POST`
- URL: `{{baseUrl}}/auth/register/doctor`
- Headers:

```json
{
  "Content-Type": "application/json",
  "x-device-name": "Postman Desktop"
}
```

- Body:

```json
{
  "email": "doctor@example.com",
  "password": "SecurePass123",
  "firstName": "Tunde",
  "lastName": "Adebayo",
  "phone": "+2348011112222",
  "gender": "MALE",
  "dateOfBirth": "1986-01-20",
  "licenseNumber": "MDCN-445566",
  "specialty": "Cardiology",
  "clinicName": "CareAxis Heart Center",
  "yearsExperience": 11,
  "bio": "Consultant cardiologist focused on preventive care."
}
```

## 3. Login

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Headers:

```json
{
  "Content-Type": "application/json",
  "x-device-name": "Postman Desktop"
}
```

- Body:

```json
{
  "email": "patient@example.com",
  "password": "SecurePass123"
}
```

- Save from response:
  - `data.tokens.accessToken`
  - `data.tokens.refreshToken`

## 4. Refresh Token

- Method: `POST`
- URL: `{{baseUrl}}/auth/refresh`
- Headers:

```json
{
  "Content-Type": "application/json",
  "x-device-name": "Postman Desktop"
}
```

- Body:

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

## 5. Logout

- Method: `POST`
- URL: `{{baseUrl}}/auth/logout`
- Headers:

```json
{
  "Content-Type": "application/json"
}
```

- Body:

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

## 6. Forgot Password

- Method: `POST`
- URL: `{{baseUrl}}/auth/forgot-password`
- Headers:

```json
{
  "Content-Type": "application/json"
}
```

- Body:

```json
{
  "email": "patient@example.com"
}
```

- Expected non-production testing behavior:
  - Response may include `data.resetTokenPreview`
  - Use that token in the reset password request below

## 7. Reset Password

- Method: `POST`
- URL: `{{baseUrl}}/auth/reset-password`
- Headers:

```json
{
  "Content-Type": "application/json"
}
```

- Body:

```json
{
  "token": "{{resetTokenPreview}}",
  "password": "NewSecurePass123"
}
```

## 8. Protected Route: Current User

- Method: `GET`
- URL: `{{baseUrl}}/auth/me`
- Headers:

```json
{
  "Authorization": "Bearer {{accessToken}}"
}
```

## Sample Success Response Shape

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "5d80b9f6-7d36-4f43-8a25-8f61ec8f6e48",
      "email": "patient@example.com",
      "role": "PATIENT",
      "status": "ACTIVE",
      "firstName": "Ada",
      "lastName": "Okoro",
      "phone": "+2348012345678",
      "avatarUrl": null,
      "profile": {
        "bloodGroup": "O+",
        "genotype": "AA",
        "primaryDoctorId": null,
        "emergencyContactName": "Chinedu Okoro",
        "emergencyContactPhone": "+2348098765432"
      }
    },
    "tokens": {
      "accessToken": "<jwt-access-token>",
      "refreshToken": "<jwt-refresh-token>",
      "accessTokenExpiresIn": "15m",
      "refreshTokenExpiresIn": "7d"
    }
  }
}
```

## Suggested Postman Variables

```text
baseUrl = http://localhost:4000/api/v1
accessToken = copied from login response
refreshToken = copied from login response
resetTokenPreview = copied from forgot-password response in development
```
