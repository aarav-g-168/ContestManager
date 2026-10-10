# 🏆 Contest Manager

A modern full-stack Competitive Programming Dashboard built with **Next.js**, **Firebase**, and **TypeScript** that helps programmers discover upcoming contests, bookmark them, receive automated email reminders, and add contests directly to Google Calendar.

> Never miss a coding contest again.

---

## 🚀 Live Demo

**🌐 Website:** `https://contest-manager.vercel.app`

---

# ✨ Features

### 📅 Upcoming Contests

* View upcoming coding contests from multiple platforms
* Clean and responsive card-based UI
* Contest countdown timer
* Contest duration
* Contest start time converted to IST

---

### 🔍 Search, Filter & Sort

* Search contests instantly
* Filter by platform
* Multi-select platform filtering
* Sort contests by:

  * Start Time
  * Duration
  * Platform

---

### 📌 Bookmark Contests

* Save favorite contests
* Stored securely in Firestore
* Separate Bookmarks page
* Accessible across devices after login

---

### 🔔 Contest Reminders

Users can schedule reminders for:

* 24 Hours Before
* 6 Hours Before
* 1 Hour Before

Reminders are stored in Firestore and processed automatically.

---

### 📧 Automated Email Notifications

The application automatically sends reminder emails before contests.

Features:

* GitHub Actions scheduler
* Firebase Admin SDK
* Resend Email API
* Automatic reminder deletion after sending
* Duplicate prevention

---

### 📅 Google Calendar Integration

Add contests directly to Google Calendar with a single click.

The calendar event automatically contains:

* Contest Name
* Start Time
* End Time
* Contest Link

---

### 🌙 Dark Mode

* Light/Dark theme
* Theme persistence
* Smooth transitions

---

### 👤 Authentication

Google Authentication using Firebase Authentication.

Users can:

* Sign In
* Sign Out
* Access personalized bookmarks
* Access reminders
* View profile page

---

### 👤 Profile Page

* Edit your display name, headline, short bio, location, and school or company
* Add a portfolio, GitHub, LinkedIn, and X profile
* Keep Codeforces, LeetCode, AtCoder, and CodeChef handles together
* Upload, crop, replace, or remove a profile photo
* See a live preview, inline validation, and clear save/discard states
* Get a warning before leaving with unsaved edits
* Access saved contests, reminders, and appearance settings

Profiles are personal account settings; they are not published as public pages.
The Google sign-in email remains read-only. Custom details are stored separately
from Google account metadata, so signing in again does not overwrite them.

Profile API requests verify a Firebase ID token and use its UID. A transaction
checks the saved revision to prevent another tab's changes from being overwritten.
Photos are validated on the server, stripped of metadata, and converted to small
WebP avatars. Private Cloud Storage is used when the configured bucket exists;
otherwise avatars are stored in separate `users/{uid}/profilePhotos` documents
(up to 192 KB each). Photo reads require authentication and responses are not
publicly cached. Replaced or removed images are cleaned up.

### Profile development checks

The profile integration suite uses the **demo-contest-manager** Firebase project
and local emulators. It does not modify production accounts or data. Install the
Firebase CLI and Java runtime, then run these in separate PowerShell terminals:

```powershell
firebase emulators:start --config firebase.test.json --project demo-contest-manager --only auth,firestore,storage
```

```powershell
$env:NEXT_PUBLIC_FIREBASE_EMULATORS='true'
npm run dev -- --port 3001 --hostname 127.0.0.1
```

```powershell
npm run test:profile
```

The suite checks authentication, persistence, field validation, photo processing,
account isolation, image cleanup, and competing saves. Test rules under
`tests/fixtures` are for these emulators only and should not be deployed as
production rules. The profile form is separate from its Firebase connection so
its layout and interactions can also be checked with local fixtures.

---

### 📱 Responsive Design

Optimized for:

* Desktop
* Tablet
* Mobile

Mobile navbar includes:

* Contest Manager Logo
* Theme Toggle
* Profile Menu
* Mobile Navigation Drawer

---

# 🛠 Tech Stack

## Frontend

* Next.js 16 (App Router)
* React
* TypeScript
* Tailwind CSS

---

## Backend

* Next.js API Routes
* Firebase Admin SDK

---

## Database

Firestore

Collections:

```text
users
 └── {userId}
      ├── bookmarks
      └── reminders
```

---

## Authentication

Firebase Authentication

* Google Sign In

---

## APIs

### CLIST API

Used for fetching competitive programming contests.

Supports platforms like:

* Codeforces
* CodeChef
* LeetCode
* AtCoder
* HackerRank
* HackerEarth
* TopCoder
* GeeksforGeeks

---

### Resend API

Used for sending reminder emails.

---

## Scheduler

GitHub Actions

Runs automatically every 15 minutes and:

1. Reads Firestore reminders
2. Calculates reminder windows
3. Sends emails
4. Removes processed reminders

---

# 📂 Project Structure

```text
src
│
├── app
│   ├── api
│   │   └── reminders
│   ├── bookmarks
│   ├── contests
│   ├── profile
│   ├── reminders
│   └── page.tsx
│
├── components
│   ├── AuthButton.tsx
│   ├── ContestCard.tsx
│   ├── ContestClientComponent.tsx
│   ├── Navbar.tsx
│   └── ThemeToggle.tsx
│
├── hooks
│   └── useReminders.ts
│
├── lib
│   ├── firebase.ts
│   ├── firebaseAdmin.ts
│   ├── email.ts
│   └── contestUtils.ts
│
└── types
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/yourusername/contest-manager.git
```

Move inside the project

```bash
cd contest-manager
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

---

# 🔐 Environment Variables

Create a `.env.local` file.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=

NEXT_PUBLIC_FIREBASE_PROJECT_ID=

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=

NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_CLIENT_EMAIL=

FIREBASE_PRIVATE_KEY=

RESEND_API_KEY=

CLIST_USERNAME=

CLIST_API_KEY=
```

---

# 📧 Email Reminder Workflow

```text
User Sets Reminder
          │
          ▼
Firestore
          │
          ▼
GitHub Actions
(Every 15 Minutes)
          │
          ▼
Next.js API Route
          │
          ▼
Firebase Admin SDK
          │
          ▼
Reminder Window Check
          │
          ▼
Resend API
          │
          ▼
Email Delivered
          │
          ▼
Reminder Deleted
```

---

# 🔒 Firestore Security

Each user can only access their own data.

Protected Collections:

* Profile
* Bookmarks
* Reminders

---

# 🎯 Performance Optimizations

* Server-side caching
* Static data fetching
* Optimized API calls
* Responsive UI
* Lazy client-side filtering
* Firestore structured collections

---

# 🚀 Deployment

Frontend:

* Vercel

Scheduler:

* GitHub Actions

Database:

* Firebase Firestore

Authentication:

* Firebase Auth

Email Service:

* Resend

---

# 🧠 Challenges Solved

* Firebase Authentication integration
* Firestore Security Rules
* Firebase Admin SDK setup
* Automated scheduled jobs without Vercel Cron
* GitHub Actions scheduling
* Time-based reminder calculations
* Responsive navbar
* Google Calendar event generation
* Email reminder workflow
* Firestore data modeling

---

# 🔮 Future Improvements

* Push Notifications
* Contest Analytics Dashboard
* User Preferences
* Platform-wise Statistics
* Calendar Sync
* AI-based Contest Recommendations
* PWA Support
* Offline Mode

---


# 👨‍💻 Author

**Aarav Gupta**

GitHub: https://github.com/aarav-g-168

LinkedIn: https://linkedin.com/in/aaravgupta168

---

## ⭐ If you like this project, consider giving it a star!
