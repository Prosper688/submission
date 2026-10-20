# Pioneer University of Science and Innovation — Developer Guide

## Architecture

This project is the Pioneer University of Science and Innovation's server-rendered Node.js portal. Express handles HTTP requests, EJS renders accessible pages, and SQLite stores student and lecturer accounts, courses, registrations, results, announcements, and sessions. Administrators assign courses; lecturers enter results only for registered students in their assigned courses. Browser-side JavaScript is only used for responsive navigation and confirmation prompts.

```text
Browser → Express → Route handlers → SQLite
                    ↕
                  EJS views
```

## Start and test

Use Node.js 22.x and npm 9.x:

```powershell
npm install
npm run db:init
npm start
```

Use `npm run dev` while developing and `npm test` to run the integration suite. The tests use a separate in-memory database.

## Main files

- `server.js` creates the Express app, configures request parsing, persistent SQLite-backed sessions, CSRF validation, static assets, and routes.
- `database/schema.sql` defines student and lecturer accounts, lecturer-assigned courses, registrations, results, and announcements.
- `database/db.js` opens the local database and applies non-destructive lecturer and course-assignment migrations.
- `database/session-store.js` stores expiring sessions in SQLite.
- `routes/auth.js` handles login and logout.
- `routes/student.js` serves the dashboard, profile, course catalogue, registrations, results, and announcements.
- `routes/admin.js` protects administrative pages and manages student/lecturer accounts, course assignments, courses, and announcements.
- `routes/lecturer.js` lets authenticated lecturers enter results only for their assigned courses and registered students.
- `views/` contains EJS pages; output interpolation uses EJS's escaped `<%=` form.
- `public/css/style.css` contains the responsive visual system; no external font or UI library is required.

## Accounts and roles

Student accounts are stored in `students`. Passwords are bcrypt hashes, never plaintext. New student accounts are created by an administrator and require a password of at least 12 characters. The first administrator can be bootstrapped by promoting an existing student account:

```powershell
$env:ADMIN_STUDENT_ID = "NUS12345"
npm run admin:create
Remove-Item Env:ADMIN_STUDENT_ID
```

If no account exists for that student number, also set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` for the command. The administrator password must be at least 12 characters.

Existing database files gain a lecturer account table and an optional course-to-lecturer assignment field in place. Existing student accounts, courses, and results are preserved.

## Security and deployment

- All state-changing forms use per-session CSRF tokens.
- Login regenerates the session identifier; cookies are HTTP-only and `SameSite=Strict`.
- Sessions are stored in SQLite and expire after eight hours.
- Student registration deletion is scoped to the signed-in student's own record.
- Administrative routes verify the current database role on each request.
- Database values are passed as prepared-statement parameters.
- Set `SESSION_SECRET` to a long, unique secret and `NODE_ENV=production` behind HTTPS. Production cookies require HTTPS.

The built-in server is intended for local development. A public deployment also needs HTTPS, deployment-specific monitoring and backups, and operational review of access policies.

## Database data

The schema is committed; `database/database.db` is local application data and is intentionally ignored. `npm run db:init` creates the schema without deleting data. Back up a production database before changing its schema.
