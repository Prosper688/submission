Pioneer University of Science and Innovation Portal — Project Handoff
1. Extract the project

Download the ZIP I sent and extract it somewhere on your computer.

Open the extracted `pioneer-university-portal` folder in VS Code. If you already have the project extracted in its existing folder, use that folder.

The project should contain folders/files similar to:

pioneer-university-portal/
├── database/
├── node_modules/
├── public/
├── routes/
├── views/
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md

2. Install the required software

Make sure these are installed:

Node.js

npm

SQLite3

Git

VS Code

Open the VS Code terminal inside the project folder and check:

node --version
npm --version
sqlite3 --version
git --version

3. Install project dependencies

Even though node_modules is included, run:

npm install


This makes sure the dependencies match package.json and package-lock.json.

4. Check the database

The project already includes the SQLite database.

You can check it with:

sqlite3 database/database.db


Then:

.tables


You should see the project tables.

Exit SQLite with:

.quit


If the database is missing or needs to be recreated, run:

sqlite3 database/database.db < database/schema.sql

5. Start the website

From the project directory:

node server.js


You should see:

Pioneer University Portal running at http://localhost:3000


Open this in your browser:

http://localhost:3000

6. Create the GitHub repository

After confirming that the project works:

Log into GitHub.

Create a new repository called `pioneer-university-portal`.

Make the repository empty — don't create another README or .gitignore.

In the VS Code terminal, inside the project:

git init
git branch -M main
git add .
git commit -m "Initial project handoff"


Then connect it to the GitHub repository:

git remote add origin https://github.com/YOUR-USERNAME/pioneer-university-portal.git


Replace YOUR-USERNAME with the GitHub username.

Then:

git push -u origin main

7. Future development

Before starting work:

git pull


After making changes:

git add .
git commit -m "Describe your changes"
git push


This keeps the GitHub repository updated.

Current project structure

The main parts of the project are:

server.js — starts the Express server and connects the application together.

database/db.js — opens the SQLite database.

database/schema.sql — defines the database tables.

database/database.db — local SQLite database.

routes/ — application routes.

views/ — EJS pages.

public/css/ — website styling.

public/js/ — client-side JavaScript.

public/images/ — images/assets.

package.json — project dependencies and scripts.

package-lock.json — locked dependency versions.

Current functionality and future work

The portal now includes:

Student sign-in and sign-out, with bcrypt password hashes and persistent sessions.

A responsive student dashboard with account details, registrations, results, and campus updates.

A course catalogue with search, term-based course registration, and registration removal.

Student profile editing, published results, and announcements.

Role-protected administration for student and lecturer accounts, course assignments, and announcements.

Lecturer sign-in and a results workspace limited to their assigned courses and students registered in the selected term. Lecturers enter and update results; students can view the published results.

CSRF protection, input validation, security headers, and automated integration tests.

Administrators create lecturer accounts and assign courses in Administration. Lecturers use their lecturer number to sign in and enter results from the "Enter results" workspace. Existing student, course, and result records are retained when the database is upgraded.

Before using this project beyond local development, confirm the institution's registration rules and grading policies, establish course drop deadlines, configure a production SESSION_SECRET and HTTPS, and arrange database backups. The local database is not committed and does not include production records.

Continue to understand the current code before making large structural changes.

please upload to github so everyone can clone to their GitHub repository. 

NB One thing I'd still recommend: don't rely on the copied node_modules long-term. It's okay to send it for convenience, but package.json + package-lock.json are the actual dependency definition. The recipient should still run npm install once after extracting.
