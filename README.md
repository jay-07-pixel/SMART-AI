# SmartOps Student Portal UI

A static, responsive front-end prototype for a student portal experience.  
The project includes a login screen, a dashboard overview, and an attendance module built with HTML, CSS, and Bootstrap utilities/icons.

## Project Overview

This repository is a UI-only implementation of a student portal flow:

- `index.html` - Login page
- `dashboard.html` - Student dashboard with performance highlights and assignments
- `attendance.html` - Attendance hub with face/QR scan actions and subject-wise statistics

The pages are connected with standard links/forms and are designed for mobile-first layouts.

## Tech Stack

- HTML5
- CSS3
- [Vite](https://vitejs.dev/) (dev server and build; Firebase uses ES modules)
- [Firebase](https://firebase.google.com/) JavaScript SDK (Firestore + anonymous auth for the dashboard test)
- [Bootstrap 5.3.3](https://getbootstrap.com/) (via CDN)
- [Bootstrap Icons 1.11.3](https://icons.getbootstrap.com/) (via CDN)

## File Structure

```text
AI-SMART/
|- index.html, dashboard.html, … (HTML pages)
|- *.css
|- src/
|  |- entry-dashboard.js
|  `- firebase/        (init, demo-student.js, ping write, Students upsert)
|- firebase/
|  `- firestore.rules.example
|- package.json, vite.config.js
|- .env.example         (copy to .env.local; not committed)
|- README.md
```

## How to Run

### With Firebase (recommended for backend tests)

The dashboard includes a **Firestore test** button. Configuration comes from `.env.local` (see `.env.example`).

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set your `VITE_FIREBASE_*` values from Firebase Console (Project settings → Your apps → Web app).
3. In Firebase Console: enable **Firestore**; under **Authentication → Sign-in method**, enable **Anonymous** (for the ping test) and **Email/Password** (for the **Students** demo). Add **localhost** (and your production domain) under **Authentication → Settings → Authorized domains**.
4. Allow writes: either use Firestore **test mode** while learning, or deploy rules based on `firebase/firestore.rules.example` (includes `Students` and `smartops_ping`).
5. Run `npm run dev`, open the printed local URL, go to **Dashboard** — use **Write test record** and/or **Save demo student** (writes `Students/{uid}` with email, department, year; password is handled by Auth only).

For production: run `npm run build` with the same `VITE_*` variables in the environment, then deploy the `dist/` folder. Use `npm run preview` to verify the build locally.

### Authentication

- **Login** (`index.html`) uses Firebase **Email/Password** only: wrong credentials stay on the login page with an error; only registered users can sign in. If you still have a Firebase session, the home page shows **Already signed in** (Continue / Sign out) instead of skipping straight to the dashboard.
- **App pages** (dashboard, attendance, assignments, quizzes, etc.) require a session; unauthenticated visitors are sent back to `index.html`.
- Use **Sign out** (dashboard header) to return to the login screen.

### Demo student account

Defaults live in `src/firebase/demo-student.js` (change email/password there if you need a different demo user).

| Field | Value |
| --- | --- |
| Email | `demo.student@smartops.edu` |
| Password | `SmartOps2026!` |

**First time:** on the login page, click **Create demo account in Firebase** (registers Auth + `Students` profile), or use **Save demo student** on the dashboard after signing in with an account that already exists. After that, sign in with **Login** using the table above, or **Fill email & password** then **Login**.

### Face Scan (dashboard)

This web app uses **TensorFlow.js MediaPipe Face Mesh** (geometry + heuristics), **not** on-device ML Kit. The **same weighted rules and thresholds** as your Android spec are implemented in `src/face/` (`constants.js`, `comparisonEngine.js`, `lighting.js`).

1. Open **Dashboard → Face Scan**, allow the camera.
2. **Save reference photo** — uploads `faces/<uid>.jpg` to Storage and sets `faceImageUrl` on `Students/{uid}`.
3. **Security rules (required)** — Deploy **both**:
   - **Storage** → **Rules**: paste `firebase/storage.rules` → **Publish** (fixes `storage/unauthorized`).
   - **Firestore** → **Rules**: paste `firebase/firestore.rules` → **Publish** (fixes “Missing or insufficient permissions” when saving `Students/{uid}` after upload — this is separate from Storage).

   CLI: `firebase deploy --only firestore,storage` (see root `firebase.json`).
4. **Verify attendance** — compares the live frame to the stored reference; on **pass**, writes **`faceScanAttendance`** (`{uid}_YYYY-MM-DD`). On **fail**, an alert explains why (heuristic limits apply).

You can also upload `faces/<uid>.jpg` manually in the Firebase Console; the in-app **Save reference photo** step does the same automatically.

### Without npm (UI only)

Open `index.html` in a browser or use any static file server. Firebase scripts expect `npm run dev` or a built `dist/`.

Use the UI flow:

- Login → `dashboard.html`
- Attendance tab → `attendance.html`

## Features

- Clean mobile-style authentication screen
- Dashboard with:
  - semester attendance score
  - quick actions (Face Scan / QR Scan)
  - optional Firestore **Write test record** and **Save demo student** → `Students` collection (when using `npm run dev` / built `dist/`)
  - recent assignments cards
- Attendance page with:
  - overall attendance summary
  - scan action cards
  - subject-wise attendance list
  - low-attendance highlighting (below 75%) via small inline JavaScript
- Consistent bottom navigation between key pages

## Notes

- **Write test record** stores a document in `smartops_ping`. **Save demo student** creates an Email/Password user (if needed) and stores profile fields in `Students` (document id = user uid). Passwords are **not** stored in Firestore.
- Form submission and most buttons remain demo interactions except that Firestore test.
- Data shown on dashboard and attendance pages is sample content unless you connect more reads.

## Customization Ideas

- Connect login and attendance data to a backend service
- Replace mock values with real student records
- Add validation and authentication flows
- Improve accessibility (keyboard states, ARIA enhancements, contrast tuning)
- Add dark mode or theme switching

## License

Use this project freely for learning and personal portfolio work.  
Add your preferred open-source license if you plan to distribute it publicly.
