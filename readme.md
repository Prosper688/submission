NUST Portal

A simple student portal project built with Node.js, Express, EJS, SQLite, HTML, CSS and JavaScript.

The project is intended as a foundation for a NUST-style student portal. It is deliberately kept simple so another developer can continue building the remaining functionality.

Tech Stack

Node.js — server-side JavaScript runtime

Express.js — web server and routing

EJS — HTML templating

SQLite — database

better-sqlite3 — Node.js SQLite driver

bcrypt — password hashing

express-session — login/session management

HTML/CSS/JavaScript — frontend

Requirements

The project was developed on Ubuntu 26.04 LTS.

Required software:

node --version
npm --version
sqlite3 --version
git --version


The project currently uses:

Node.js 22.x

npm 9.x

SQLite 3.x

The exact Node package versions are recorded in package-lock.json.

Installation

Clone or copy the project and enter the directory:

cd nust-portal


Install the Node dependencies:

npm install


Do not commit node_modules.

It is already excluded through .gitignore.

Database

The SQLite database is located at:

database/database.db


The database structure is defined in:

database/schema.sql


If the database needs to be recreated:

rm database/database.db
sqlite3 database/database.db < database/schema.sql


Check the tables:

sqlite3 database/database.db


Then:

.tables


Exit SQLite with:

.quit

Running the Application

Start the server:

node server.js


Then open:

http://localhost:3000


The application currently redirects / to /login.

Development

While developing, restart the Node server after backend changes:

node server.js


The project does not currently use a development server such as nodemon, keeping the setup intentionally simple.

Git

Check the current state:

git status


After making changes:

git add .
git commit -m "Describe the change"


The project currently uses the master branch. If the project is moved to a shared repository, the branch can be renamed to main if desired.

Important

Do not commit:

node_modules/
database/database.db
.env


The database schema and source code should be committed, but the local SQLite database should generally be generated locally.

Current Status

The project currently has:

Basic Express server

EJS views

Static CSS/JavaScript support

SQLite database

Student table

Course table

Registration table

Results table

Announcements table

Login page

Student login/session foundation

Dashboard foundation

Password hashing with bcrypt

Basic route structure

The application is a foundation, not a finished portal.

See DEVELOPMENT.md for the detailed handoff documentation.