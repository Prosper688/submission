NUST Portal — Developer Handoff
1. Purpose

This project is a simplified student portal designed to provide a foundation that another developer can continue building.

The goal is to eventually provide functionality similar to a university student portal, including:

Student authentication

Student dashboard

Course registration

Course information

Results

Announcements

Student profile

Administrative functionality

The current implementation is intentionally simple.

2. Architecture

The application uses a traditional server-rendered architecture:

Browser
   │
   ▼
Express.js
   │
   ├── Routes
   │     ├── auth.js
   │     ├── student.js
   │     └── admin.js
   │
   ├── EJS Views
   │     ├── login.ejs
   │     └── dashboard.ejs
   │
   ├── Static Files
   │     ├── CSS
   │     ├── JavaScript
   │     └── Images
   │
   ▼
SQLite
   │
   └── database/database.db


There is no React, Vue, Angular or other frontend framework.

The frontend is standard HTML/CSS/JavaScript rendered using EJS.

3. Project Structure
nust-portal/
│
├── server.js
│
├── package.json
├── package-lock.json
├── .gitignore
│
├── database/
│   ├── db.js
│   ├── database.db
│   └── schema.sql
│
├── routes/
│   ├── auth.js
│   ├── student.js
│   └── admin.js
│
├── views/
│   ├── login.ejs
│   ├── dashboard.ejs
│   └── partials/
│
└── public/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    └── images/

4. Server

The main server file is:

server.js


It is responsible for:

Creating the Express application

Configuring EJS

Configuring middleware

Serving static files

Registering routes

Starting the HTTP server

The application currently runs on:

http://localhost:3000

5. Database

SQLite is used because this project does not need a complicated database server.

The Node.js application connects through:

database/db.js


The connection uses:

better-sqlite3


The database schema is stored separately in:

database/schema.sql


This is important because the schema should be treated as the source definition of the database.

6. Database Tables

The current schema contains five main tables.

students

Stores student accounts.

Important fields include:

id
registration_number
name
email
password_hash
programme
department
created_at


registration_number is intended to be the student's login username.

The registration number should support letters and numbers.

Example:

23I-1234
22CS45
FA21-BSE-001


The exact format should be decided by the developer who continues the project.

courses

Stores courses.

Fields:

id
code
name
credit_hours


Example:

CS101
Programming Fundamentals
3

registrations

Connects students to courses.

Fields include:

student_id
course_id
semester
year


Foreign keys connect this table to:

students
courses

results

Stores student results.

Fields include:

student_id
course_id
semester
year
marks
grade

announcements

Stores portal announcements.

Fields:

id
title
content
created_at

7. Authentication

Authentication is handled using:

bcrypt
express-session


Passwords should never be stored as plaintext.

The database should contain:

password_hash


rather than the actual password.

The login username is the student's:

registration_number


The login form currently sends:

username
password


The backend should use the username to find the corresponding student record.

Conceptually:

User enters registration number
        │
        ▼
Find student by registration_number
        │
        ▼
Compare entered password
with password_hash using bcrypt
        │
        ▼
Create session
        │
        ▼
Redirect to dashboard

8. Sessions

express-session is used to keep track of logged-in students.

A future implementation should store something similar to:

req.session.studentId


after successful login.

Protected pages should check whether this value exists.

For example:

GET /dashboard
       │
       ▼
Is student logged in?
       │
   ┌───┴───┐
   │       │
  YES      NO
   │       │
   ▼       ▼
Dashboard Login

9. Routes

Routes are separated into files so the project does not become one large server.js.

auth.js

Should contain authentication-related routes such as:

POST /login
POST /logout


Potential future routes:

GET /login
POST /login
POST /logout

student.js

Should contain student functionality.

Potential routes:

GET /dashboard
GET /profile
GET /courses
GET /results
GET /registrations


Future POST routes could include:

POST /registrations
POST /profile

admin.js

Should contain administrative functionality.

Potential routes:

GET /admin
GET /admin/students
GET /admin/courses
GET /admin/results
GET /admin/announcements


Admin authentication/authorization still needs to be properly implemented.

10. Views

The project uses EJS.

Current views include:

views/login.ejs
views/dashboard.ejs


EJS allows server-side data to be inserted into HTML.

For example:

<h1>Welcome, <%= student.name %></h1>


The backend can render:

res.render("dashboard", {
    student: student
});


This allows the dashboard to display information from SQLite.

11. Frontend

The frontend uses:

HTML
CSS
JavaScript


CSS is located in:

public/css/style.css


Client-side JavaScript is located in:

public/js/app.js


Images should go into:

public/images/


Avoid introducing a frontend framework unless there is a specific reason to do so.

12. Recommended Development Order

The next developer should build the remaining functionality in roughly this order.

Step 1 — Finish authentication

Make sure:

Login works

Registration number is the username

Passwords are hashed

Sessions are created

Dashboard requires authentication

Logout destroys the session

Unauthenticated users are redirected to /login

Step 2 — Student dashboard

Connect the dashboard to SQLite.

Display information such as:

Student Name
Registration Number
Programme
Department
Current Semester


Do not hard-code these values.

They should come from the database.

Step 3 — Courses

Create a page showing available courses.

For example:

Course Code | Course Name | Credit Hours
-----------------------------------------
CS101       | Programming | 3
CS102       | Databases   | 3

Step 4 — Course registration

Allow a logged-in student to register for courses.

The registration should create a row in:

registrations


The backend should validate:

Student exists

Course exists

Student is logged in

Student has not already registered for the same course/semester/year

The database already has a unique constraint to help prevent duplicate registrations.

Step 5 — Results

Create a results page.

Example:

Course       Marks    Grade
---------------------------
Programming  85       A
Databases    78       B+


Results should be retrieved using the logged-in student's ID.

A student must never be able to request another student's results simply by changing an ID in the URL.

Step 6 — Announcements

Create an announcements page.

Display:

Title
Date
Content


Announcements can initially be managed directly through SQLite.

Later, an admin interface can be added.

Step 7 — Admin area

Build the admin functionality after the student side is stable.

The admin should eventually be able to:

Create students

Edit students

Create courses

Edit courses

Enter results

Publish announcements

View registrations

Admin authorization must be implemented before exposing these operations.

13. Security Considerations

This is currently a development project and should not be treated as production-ready.

Before deployment, address at least:

Secure session configuration

Production session storage

Strong session secret

HTTPS

Input validation

Authentication middleware

Authorization middleware

CSRF protection where appropriate

Rate limiting for login

Secure cookies

Password policy

Error handling

SQL injection protection

Access control for student records

SQL queries should use parameterized statements rather than constructing SQL strings from user input.

For example, prefer:

db.prepare(
    "SELECT * FROM students WHERE registration_number = ?"
).get(registrationNumber);


rather than concatenating user input into SQL.

14. Database Development

When modifying the schema, update:

database/schema.sql


Do not simply modify the local database.db and forget to update the schema.

For development, the database can be recreated with:

rm database/database.db
sqlite3 database/database.db < database/schema.sql


Then verify:

sqlite3 database/database.db


Inside SQLite:

.tables


and:

.schema

15. Git Workflow

Before making changes:

git status


After implementing a feature:

git add .
git commit -m "Add student dashboard"


Use commits that describe what changed.

Examples:

Add authentication middleware
Add student dashboard
Add course listing
Add course registration
Add results page
Add admin course management


Avoid committing:

node_modules/
database/database.db
.env

16. Environment Variables

If secrets are introduced later, use a .env file.

For example:

SESSION_SECRET=replace-this


The .env file should not be committed.

Add:

.env


to .gitignore.

A safe example configuration should be documented separately, such as:

.env.example


without real secrets.

17. What Has Already Been Done

The foundation currently includes:

Node.js project

npm configuration

Express

EJS

SQLite

better-sqlite3

bcrypt

express-session

Database connection

Database schema

Login page

Dashboard page

Route structure

Static CSS/JS directories

Git repository

.gitignore

Dependency lockfile

The database schema already contains:

students
courses
registrations
results
announcements

18. What Still Needs to Be Done

The main remaining work is:

[ ] Finish authentication middleware
[ ] Finish session handling
[ ] Finish logout
[ ] Protect dashboard
[ ] Connect dashboard to SQLite
[ ] Build student profile
[ ] Build course listing
[ ] Build course registration
[ ] Build results page
[ ] Build announcements page
[ ] Build admin authentication
[ ] Build admin dashboard
[ ] Build student management
[ ] Build course management
[ ] Build results management
[ ] Build announcement management
[ ] Improve frontend styling
[ ] Add validation
[ ] Add error handling
[ ] Add security protections
[ ] Test all routes
[ ] Prepare production deployment

19. Important Handoff Notes

The project intentionally uses a simple stack.

Do not unnecessarily replace the architecture with:

React

Next.js

MongoDB

PostgreSQL

TypeScript

Docker

Redis

unless the requirements genuinely justify them.

The current stack is sufficient for continuing the project:

HTML
CSS
JavaScript
        +
Node.js
Express
EJS
        +
SQLite


The next developer should first understand the existing authentication, routing and database structure before adding new dependencies.

The objective is to build the portal incrementally rather than rewrite the foundation.