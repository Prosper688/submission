# Pioneer University of Science and Innovation Portal

A responsive, server-rendered university portal for Pioneer University of Science and Innovation, built with Node.js, Express, EJS, SQLite, and vanilla CSS/JavaScript.

## Requirements

- Node.js 22.x
- npm 9.x
- SQLite 3.x command-line tool (optional; the app uses the bundled `better-sqlite3` dependency)

## Setup

```powershell
npm install
npm run db:init
npm start
```

Open [http://localhost:3000](http://localhost:3000). The Pioneer University of Science and Innovation portal redirects to the sign-in screen.

Create the first administrator account from PowerShell by setting a student number. If that student already has an account, the command promotes it without changing its password:

```powershell
$env:ADMIN_STUDENT_ID = "NUS12345"
npm run admin:create
Remove-Item Env:ADMIN_STUDENT_ID
```

To create a new administrator instead, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` as environment variables for the command. The initial password must be at least 12 characters. Clear these variables afterward; passwords are hashed before being stored.

Administrators can create student and lecturer accounts, manage the course catalogue, assign courses to lecturers, and publish announcements at `/admin`. Assigned lecturers enter results for students registered in their courses at `/lecturer/results`. Students can update their profile, view their overview, register for and drop courses, review lecturer-published results, and read announcements.

## Development

```powershell
npm run dev
npm test
```

Tests use an isolated in-memory SQLite database and do not modify the local application data.

The application automatically adds lecturer accounts and course assignment support to an existing database while preserving student and course records. The database schema lives in `database/schema.sql`; the local database file is ignored by Git.

For deployments, set a unique, long `SESSION_SECRET` and `NODE_ENV=production` before starting the server. Production cookies are marked secure and require HTTPS.

## Project structure

- `server.js` — Express configuration, sessions, CSRF protection, and routes
- `database/` — SQLite connection, session store, and schema
- `routes/` — authentication, student, and administrator workflows
- `views/` — EJS pages and shared layout components
- `public/` — responsive styling and small progressive-enhancement scripts
- `scripts/admin-create.js` — initial administrator setup
- `tests/` — portal integration tests

Do not commit `node_modules/`, `database/database.db`, `.env`, or real credentials.
