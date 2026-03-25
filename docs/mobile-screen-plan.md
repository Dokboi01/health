# CareAxis Mobile Screen Plan

## Overview

This document defines the complete mobile screen plan for the CareAxis health platform.
It is designed for a premium, modern, medically trustworthy experience for `Admin`, `Doctor`, and `Patient` users.

## Design Direction

### Visual language

- premium medical palette: layered whites, clean medical blues, subtle green highlights
- generous spacing with soft cards and crisp dividers
- rounded corners in the `16-24px` range for cards and panels
- strong typography hierarchy with calm, high-contrast text
- restrained gradients for hero sections, not flashy backgrounds
- charts, trend chips, and status badges used carefully for clarity
- polished empty states with helpful next actions

### Interaction style

- fast, low-friction flows for time-sensitive medical actions
- sticky primary CTAs on forms and detail screens
- segmented controls and filter chips for dense clinical lists
- timeline and card-based layouts for appointments, medications, and records
- trust-building UI patterns: verification badges, timestamps, doctor identity, record source

### Navigation model

- `Splash` decides auth state and entry route
- first-time users go through `Onboarding`
- authentication flow handles `Login`, `Register`, `Forgot Password`
- role-based post-login navigation:
  - `Doctor`: Home, Appointments, Patients, Records, More
  - `Patient`: Home, Appointments, Medications, Records, Profile
  - `Admin`: Dashboard, Users, Reports, Settings

---

## Entry And Authentication Screens

### Splash Screen

- Purpose:
  - initialize the app
  - validate token/session
  - route the user to onboarding, auth, or the correct dashboard
- Components on the screen:
  - centered CareAxis logo
  - soft blue-to-green medical gradient background
  - loading indicator
  - app version text at bottom
- Actions/buttons:
  - no manual actions in normal flow
  - optional hidden retry action if bootstrap fails
- Navigation flow:
  - `Splash -> Onboarding` for first launch
  - `Splash -> Login` if no session
  - `Splash -> Doctor Dashboard`
  - `Splash -> Patient Dashboard`
  - `Splash -> Admin Dashboard`
- UI design notes:
  - keep it calm and elegant
  - use subtle motion on the logo pulse
  - avoid busy text; trust and polish matter more than information density

### Onboarding

- Purpose:
  - introduce value proposition
  - explain the roles and core benefits
  - move the user toward login or registration
- Components on the screen:
  - 3-4 onboarding slides
  - illustration or abstract medical graphic per slide
  - headline, short supporting copy, slide indicator
  - role preview chips: `Admin`, `Doctor`, `Patient`
- Actions/buttons:
  - `Next`
  - `Skip`
  - `Get Started`
  - optional `Sign In`
- Navigation flow:
  - `Onboarding -> Login`
  - `Onboarding -> Register`
- UI design notes:
  - use large whitespace and premium editorial-style composition
  - illustrations should feel clinical and contemporary, not cartoonish
  - accent slides with blue highlights and subtle green confirmation tones

### Login

- Purpose:
  - authenticate returning users securely
- Components on the screen:
  - welcome panel with product message
  - email field
  - password field
  - role selector or role recognition badge
  - remember me toggle if needed
  - secure sign-in button
  - links to registration and password reset
- Actions/buttons:
  - `Sign In`
  - `Forgot Password`
  - `Create Account`
- Navigation flow:
  - `Login -> Role Dashboard`
  - `Login -> Forgot Password`
  - `Login -> Register`
- UI design notes:
  - split layout on tablet, centered card on mobile
  - strong input states and error feedback
  - use trust cues like “Secure clinical access”

### Register

- Purpose:
  - create a new account and capture the initial role-based profile
- Components on the screen:
  - segmented role choice: `Patient` and `Doctor`
  - full name fields
  - email and phone inputs
  - password and confirm password
  - role-specific fields:
    - patient: date of birth, gender
    - doctor: specialization, license number, clinic name
  - terms checkbox
- Actions/buttons:
  - `Create Account`
  - `Sign In Instead`
- Navigation flow:
  - `Register -> Verification/Success state`
  - `Register -> Login`
  - `Register -> Profile Completion` if partial onboarding is needed
- UI design notes:
  - multi-step card layout is better than a very long single form
  - use a clean progress header for step-based registration
  - doctor registration should feel more professional and credential-focused

### Forgot Password

- Purpose:
  - help users recover account access
- Components on the screen:
  - email field
  - helper text about reset instructions
  - success confirmation state
  - optional resend state
- Actions/buttons:
  - `Send Reset Link`
  - `Back To Login`
  - `Resend`
- Navigation flow:
  - `Forgot Password -> Login`
  - `Forgot Password -> Reset Password` through deep link or token flow
- UI design notes:
  - keep this screen minimal and reassuring
  - success state should clearly confirm the next step without exposing whether the email exists

---

## Doctor Experience Screens

### Doctor Dashboard

- Purpose:
  - give the doctor a high-level operational and clinical snapshot
- Components on the screen:
  - personalized greeting and verification badge
  - KPI cards:
    - total active patients
    - today’s appointments
    - pending follow-ups
    - unread notifications
  - mini trend chart for appointments or adherence
  - upcoming appointments list
  - priority patient alerts
  - quick actions row
- Actions/buttons:
  - `View Patients`
  - `Add Prescription`
  - `Open Appointments`
  - `Review Records`
  - `See All Notifications`
- Navigation flow:
  - `Doctor Dashboard -> Appointments`
  - `Doctor Dashboard -> Patient Detail/Profile`
  - `Doctor Dashboard -> Prescription Detail/Create`
  - `Doctor Dashboard -> Notifications`
- UI design notes:
  - this should feel like a premium clinical command center
  - use crisp cards, controlled color accents, and dense but readable data blocks
  - priority alerts should use restrained green/amber/red indicators

### Doctor Profile

- Purpose:
  - manage professional identity and practice information
- Components on the screen:
  - profile hero with avatar, name, specialization, verification
  - clinic info card
  - bio/about section
  - license and credential summary
  - contact and availability sections
- Actions/buttons:
  - `Edit Profile`
  - `Update Availability`
  - `Upload Credential`
- Navigation flow:
  - `Doctor Profile -> Edit Profile`
  - `Doctor Profile -> Availability Management`
  - `Doctor Profile -> Settings`
- UI design notes:
  - emphasize trust and professionalism
  - use clean labeled data rows with verification icons

### Doctor Patients List

- Purpose:
  - help doctors browse, search, and filter their patients quickly
- Components on the screen:
  - search bar
  - filter chips: status, last visit, risk level
  - patient list cards with avatar, age, condition summary, next appointment
  - sort selector
  - pagination or lazy loading
- Actions/buttons:
  - `Search`
  - `Filter`
  - `Add Patient`
  - `Open Patient`
- Navigation flow:
  - `Doctor Patients List -> Patient Profile`
  - `Doctor Patients List -> Add Patient Assignment`
- UI design notes:
  - cards should expose just enough clinical context
  - use quick visual markers for follow-up urgency

### Appointment List And Calendar

- Purpose:
  - let doctors see and manage their schedule
- Components on the screen:
  - calendar strip or day/week switcher
  - date selector
  - segmented tabs: upcoming, completed, cancelled
  - appointment cards with patient name, type, time, location
  - status chips
- Actions/buttons:
  - `Filter`
  - `Confirm`
  - `Reschedule`
  - `Cancel`
  - `Open Details`
- Navigation flow:
  - `Doctor Dashboard -> Appointment List`
  - `Appointment List -> Appointment Detail`
  - `Appointment List -> Booking/Reschedule`
- UI design notes:
  - use clean calendar interaction with a luxury scheduling feel
  - status colors must be subtle and clinical, not loud

### Appointment Detail

- Purpose:
  - provide the full context for one appointment
- Components on the screen:
  - appointment summary hero
  - patient mini-profile
  - reason for visit
  - visit notes area
  - attached medical record or prescription shortcuts
  - reminder and communication section
- Actions/buttons:
  - `Confirm Appointment`
  - `Reschedule`
  - `Cancel`
  - `Create Record`
  - `Issue Prescription`
- Navigation flow:
  - `Appointment Detail -> Medical Record Create/View`
  - `Appointment Detail -> Prescription Create/View`
  - `Appointment Detail -> Patient Profile`
- UI design notes:
  - combine administrative and clinical context in one refined layout
  - important actions should live in a sticky footer or floating action area

### Prescription Create And Detail

- Purpose:
  - allow doctors to create and review prescriptions
- Components on the screen:
  - patient summary header
  - diagnosis and notes fields
  - medication item builder
  - dosage/frequency/duration controls
  - medication cards for each prescribed item
  - issue status panel
- Actions/buttons:
  - `Add Medication`
  - `Save Draft`
  - `Issue Prescription`
  - `Discontinue`
- Navigation flow:
  - `Doctor Dashboard -> Prescription Create`
  - `Appointment Detail -> Prescription Create`
  - `Prescription Detail -> Medication Tracker`
- UI design notes:
  - forms should be structured and beginner-friendly
  - use section cards and compact repeatable item builders

### Medical Record Create/View

- Purpose:
  - create and read consultation notes, findings, and uploaded records
- Components on the screen:
  - patient and appointment context header
  - record type selector
  - summary, diagnosis, and notes areas
  - vitals section
  - file attachment list
  - record timeline metadata
- Actions/buttons:
  - `Save Draft`
  - `Attach File`
  - `Add Vitals`
  - `Finalize Record`
- Navigation flow:
  - `Doctor Dashboard -> Records`
  - `Appointment Detail -> Record Create`
  - `Medical Record View -> File Preview`
- UI design notes:
  - keep the screen professional and document-centric
  - use timeline cues and source metadata to build confidence

---

## Patient Experience Screens

### Patient Dashboard

- Purpose:
  - give patients a calm overview of appointments, medications, reminders, and records
- Components on the screen:
  - welcome header
  - primary doctor summary card
  - next appointment hero card
  - medication adherence progress ring or chart
  - reminders list
  - quick actions row
  - recent records snapshot
- Actions/buttons:
  - `Book Appointment`
  - `View Medications`
  - `Open Reminders`
  - `View Records`
  - `Contact Care Team`
- Navigation flow:
  - `Patient Dashboard -> Appointment Booking`
  - `Patient Dashboard -> Medication Tracker`
  - `Patient Dashboard -> Medical Record View`
  - `Patient Dashboard -> Notifications`
- UI design notes:
  - this screen should feel reassuring and easy to scan
  - use softer tones and more breathing room than the doctor dashboard
  - highlight next important action, not every possible action

### Patient Profile

- Purpose:
  - show and update personal health and account information
- Components on the screen:
  - profile header with avatar and account badge
  - personal details card
  - emergency contact card
  - health summary card:
    - blood group
    - allergies
    - chronic conditions
  - linked doctors section
- Actions/buttons:
  - `Edit Profile`
  - `Manage Emergency Contact`
  - `Set Primary Doctor`
- Navigation flow:
  - `Patient Profile -> Edit Profile`
  - `Patient Profile -> Doctor Profile`
  - `Patient Profile -> Settings`
- UI design notes:
  - display medical summary clearly without making it feel cold or sterile
  - use compact clinical badges for allergies and conditions

### Doctor Profile View For Patients

- Purpose:
  - let patients review doctor information before booking or setting a primary doctor
- Components on the screen:
  - doctor identity hero
  - specialization and verification
  - clinic details
  - availability preview
  - patient-friendly biography
- Actions/buttons:
  - `Book Appointment`
  - `Set As Primary Doctor`
  - `View Availability`
- Navigation flow:
  - `Patient Dashboard -> Doctor Profile`
  - `Search Doctors -> Doctor Profile`
  - `Doctor Profile -> Appointment Booking`
- UI design notes:
  - strong trust presentation is key
  - credentials should feel prominent but not overwhelming

---

## Shared Clinical Workflow Screens

### Appointment Booking

- Purpose:
  - allow patients and admins to book appointments, and doctors to create scheduled visits
- Components on the screen:
  - doctor selector
  - date picker
  - available slot grid
  - appointment type selector
  - reason input
  - location type selector
  - confirmation summary panel
- Actions/buttons:
  - `Select Time`
  - `Continue`
  - `Confirm Booking`
- Navigation flow:
  - `Patient Dashboard -> Appointment Booking`
  - `Doctor Profile -> Appointment Booking`
  - `Appointment Booking -> Appointment Detail`
- UI design notes:
  - slot grid should feel premium, not like a generic booking form
  - use spacious chip-style time selectors and strong confirmation feedback

### Appointment History / My Appointments

- Purpose:
  - provide a complete view of past and upcoming appointments
- Components on the screen:
  - tab filter: upcoming, past, cancelled
  - date range filter
  - search field
  - appointment cards
- Actions/buttons:
  - `Reschedule`
  - `Cancel`
  - `Open Details`
  - `Book New Appointment`
- Navigation flow:
  - `Dashboard -> My Appointments`
  - `My Appointments -> Appointment Detail`
- UI design notes:
  - use timeline grouping by date
  - cards should include human-friendly time and doctor/patient identity

### Medication Tracker

- Purpose:
  - track active medications, schedules, and adherence
- Components on the screen:
  - adherence summary card
  - medication list
  - status chips: active, paused, completed
  - next dose card
  - daily schedule timeline
- Actions/buttons:
  - `Log Dose`
  - `View Schedule`
  - `Open Medication`
  - `Filter`
- Navigation flow:
  - `Patient Dashboard -> Medication Tracker`
  - `Medication Tracker -> Medication Detail`
  - `Medication Detail -> Reminders`
- UI design notes:
  - this should feel precise and motivating
  - subtle progress visuals are better than gamified UI

### Medication Detail

- Purpose:
  - show all details for one medication and support dose logging
- Components on the screen:
  - medication header
  - dosage and instructions card
  - schedule section
  - adherence history chart
  - log timeline
  - linked prescription summary
- Actions/buttons:
  - `Mark As Taken`
  - `Skip Dose`
  - `View Prescription`
  - `Edit Reminder`
- Navigation flow:
  - `Medication Tracker -> Medication Detail`
  - `Medication Detail -> Prescription Detail`
  - `Medication Detail -> Reminder Detail`
- UI design notes:
  - use a clean timeline and strong hierarchy for the next expected dose

### Prescription List / Detail

- Purpose:
  - help patients review issued prescriptions and doctors review their clinical orders
- Components on the screen:
  - prescription list or detail header
  - issue date, status, and prescribing doctor
  - diagnosis summary
  - medication items with dosage/frequency
  - care instructions panel
- Actions/buttons:
  - `View Medications`
  - `Download PDF` if supported later
  - `Contact Doctor`
- Navigation flow:
  - `Dashboard -> Prescriptions`
  - `Prescription Detail -> Medication Tracker`
  - `Prescription Detail -> Doctor Profile`
- UI design notes:
  - maintain a document-like layout with modern card sections
  - make the prescribing source and date highly visible

### Reminders

- Purpose:
  - surface appointment and medication reminders clearly
- Components on the screen:
  - reminders grouped by today, upcoming, completed
  - reminder type icons
  - snooze state and scheduled time
  - quick status filters
- Actions/buttons:
  - `Mark Done`
  - `Snooze`
  - `Edit`
  - `Open Related Item`
- Navigation flow:
  - `Dashboard -> Reminders`
  - `Reminder -> Appointment Detail`
  - `Reminder -> Medication Detail`
- UI design notes:
  - emphasize calm clarity
  - use time-based grouping and subtle status color coding

### Medical Record List

- Purpose:
  - let patients and doctors browse medical history
- Components on the screen:
  - filter row: type, date, doctor
  - search bar
  - record timeline cards
  - upload/file indicators
- Actions/buttons:
  - `Open Record`
  - `Filter`
  - `Download Attachment`
- Navigation flow:
  - `Dashboard -> Records`
  - `Medical Record List -> Medical Record View`
- UI design notes:
  - timeline layout works well here
  - metadata such as record source and date should feel highly legible

### Medical Record View

- Purpose:
  - display one medical record in a readable clinical format
- Components on the screen:
  - record title and type badge
  - author and date metadata
  - diagnosis and summary sections
  - vitals panel
  - attachments list
  - linked appointment or prescription references
- Actions/buttons:
  - `View Attachment`
  - `Share` if patient permissions allow
  - `Back To Records`
- Navigation flow:
  - `Medical Record List -> Medical Record View`
  - `Medical Record View -> File Preview`
- UI design notes:
  - design should feel like premium digital charting
  - use clean typography and subtle separators to avoid information overload

### Notifications

- Purpose:
  - show system, appointment, prescription, and reminder notifications
- Components on the screen:
  - notifications grouped by unread and earlier
  - type icons and priority indicators
  - brief message preview
  - mark-as-read state
- Actions/buttons:
  - `Open`
  - `Mark As Read`
  - `Mark All As Read`
  - `Notification Settings`
- Navigation flow:
  - `Any Screen -> Notifications`
  - `Notifications -> Related Detail Screen`
  - `Notifications -> Settings`
- UI design notes:
  - use subtle unread highlighting, not aggressive color blocks
  - notification cells should feel lightweight and premium

### Settings

- Purpose:
  - centralize account, app, privacy, and notification preferences
- Components on the screen:
  - grouped settings sections:
    - account
    - notifications
    - privacy and security
    - appearance
    - support
  - toggles and list rows
  - logout section
- Actions/buttons:
  - `Edit Preferences`
  - `Change Password`
  - `Manage Notifications`
  - `Log Out`
- Navigation flow:
  - `Dashboard/Profile -> Settings`
  - `Settings -> Notification Preferences`
  - `Settings -> Security`
- UI design notes:
  - use high-end settings organization with strong spacing and clean icons
  - keep destructive actions separated visually

---

## Admin Mobile Screens

### Admin Dashboard

- Purpose:
  - give admins a mobile snapshot of platform performance and governance
- Components on the screen:
  - KPI cards:
    - total users
    - active doctors
    - appointment volume
    - alerts
  - trend chart
  - recent admin events
  - quick moderation actions
- Actions/buttons:
  - `View Users`
  - `Open Reports`
  - `Review Logs`
- Navigation flow:
  - `Admin Dashboard -> User Management`
  - `Admin Dashboard -> Reports`
  - `Admin Dashboard -> Audit Logs`
- UI design notes:
  - mobile admin should be concise, insight-driven, and executive
  - cards should look premium and analytics-forward

### User Management

- Purpose:
  - allow admins to search, filter, and review users
- Components on the screen:
  - search bar
  - role and status filters
  - user list rows
  - verification and moderation badges
- Actions/buttons:
  - `Open User`
  - `Suspend`
  - `Activate`
  - `Filter`
- Navigation flow:
  - `Admin Dashboard -> User Management`
  - `User Management -> User Detail`
- UI design notes:
  - make operational controls clear but not visually harsh
  - use concise metadata and status chips

### Admin Reports

- Purpose:
  - let admins review business and clinical platform analytics
- Components on the screen:
  - date range selector
  - tab switcher: users, appointments, prescriptions, reminders
  - summary cards
  - line/bar charts
  - export placeholder section
- Actions/buttons:
  - `Apply Filters`
  - `View Details`
  - `Export` if later enabled
- Navigation flow:
  - `Admin Dashboard -> Reports`
  - `Reports -> Detailed Metric Screen`
- UI design notes:
  - charts should feel high-end and boardroom-ready
  - use medical blue as the base visualization color with green success overlays

### Audit Logs

- Purpose:
  - review sensitive admin activity and governance events
- Components on the screen:
  - searchable log list
  - action type chips
  - timestamp and actor metadata
  - detail drawer or detail page
- Actions/buttons:
  - `Filter`
  - `Open Log`
- Navigation flow:
  - `Admin Dashboard -> Audit Logs`
  - `Audit Logs -> Log Detail`
- UI design notes:
  - prioritize clarity and chronological readability
  - keep this screen data-dense but visually disciplined

---

## Recommended MVP Screen Release Order

### Phase 1

- Splash
- Onboarding
- Login
- Register
- Forgot Password
- Doctor Dashboard
- Patient Dashboard

### Phase 2

- Doctor Profile
- Patient Profile
- Doctor Patients List
- Doctor Profile View For Patients
- Notifications
- Settings

### Phase 3

- Appointment Booking
- Appointment History / My Appointments
- Appointment Detail
- Reminders

### Phase 4

- Prescription List / Detail
- Prescription Create And Detail
- Medication Tracker
- Medication Detail

### Phase 5

- Medical Record List
- Medical Record View
- Medical Record Create/View

### Phase 6

- Admin Dashboard
- User Management
- Admin Reports
- Audit Logs

---

## Premium UI Guidelines To Maintain Across All Screens

- every screen should have one clear focal area, not multiple competing hero sections
- use cards with meaningful elevation and soft borders rather than heavy shadows
- reserve green for success, adherence, and reassurance states
- use blue for primary actions, navigation highlights, and trust cues
- show timestamps, author/source, and status consistently across clinical screens
- avoid clutter by progressive disclosure: summary first, detail on tap
- keep forms elegant with grouped sections, sticky CTAs, and plain-language labels
- empty states should always include a useful next step
