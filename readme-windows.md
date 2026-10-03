NUST Portal — Windows Setup Guide

This guide explains how to set up and run the NUST Portal project on a fresh Windows computer.

The project uses:

Node.js

npm

Express

EJS

SQLite

better-sqlite3

bcrypt

express-session

Git

No Python installation is required.

1. Project Requirements

The developer needs the following installed:

Software	Purpose
Node.js	Runs the backend
npm	Installs Node.js dependencies
Git	Downloads and manages the project
SQLite	Creates and manages the local database
VS Code	Recommended code editor

The project itself contains the Node.js dependencies in package.json.

The developer should not manually install Express, EJS, bcrypt, etc. one by one.

After Node.js is installed, running:

npm install


installs the project dependencies.

2. Install Node.js

Go to the official Node.js website:

https://nodejs.org/

Download the LTS version for Windows.

Use the Windows installer.

During installation, leave the default options enabled.

After installation, close and reopen PowerShell.

Verify:

node --version


Then:

npm --version


Both commands should return a version number.

For example:

v22.x.x
10.x.x


The exact version does not have to match the developer who created the project, provided it is a compatible modern Node.js LTS version.

3. Install Git

Download Git from the official Git website:

https://git-scm.com/download/win

Run the installer.

The default installation settings are normally sufficient.

After installation, open a new PowerShell window.

Verify:

git --version


Example:

git version 2.x.x

4. Install Visual Studio Code

Download VS Code from:

https://code.visualstudio.com/

Install it using the normal Windows installer.

Recommended extensions:

ESLint

EJS language support

SQLite viewer/browser

Extensions are optional. The project does not depend on them.

5. Install SQLite

SQLite is used by the project as the database.

Download the official SQLite command-line tools from:

https://sqlite.org/download.html

For normal 64-bit Windows, download the Windows x64 command-line tools ZIP.

The ZIP will contain files such as:

sqlite3.exe


Extract it to a permanent location.

For example:

C:\sqlite\


The folder should contain:

C:\sqlite\sqlite3.exe

6. Add SQLite to Windows PATH

Windows needs to know where sqlite3.exe is located.

Open the Start menu and search for:

Environment Variables


Open:

Edit the system environment variables


Click:

Environment Variables


Under either User variables or System variables, find:

Path


Select it and click:

Edit


Click:

New


Add:

C:\sqlite


Click OK on all dialogs.

Close PowerShell and open a new PowerShell window.

Test:

sqlite3 --version


You should get a SQLite version number.

If sqlite3 is not recognized, restart PowerShell and check that C:\sqlite was added correctly.

7. Get the Project

There are two ways to get the project.

Option A — Clone from Git

If the project has been uploaded to a Git repository:

git clone <REPOSITORY-URL>


Then enter the project:

cd nust-portal


Replace <REPOSITORY-URL> with the actual repository URL.

Option B — Copy the Project

If the project was given to you as a ZIP file:

Extract the ZIP.

Open the extracted project folder.

Open PowerShell in that folder.

The project root should contain:

package.json
package-lock.json
server.js
database\
routes\
views\
public\

8. Open the Project in VS Code

From PowerShell inside the project directory:

code .


If code is not recognized, open VS Code manually and select:

File → Open Folder


Then select the nust-portal folder.

9. Install Project Dependencies

This is an important step.

Do not install each dependency manually.

From the project root:

npm install


npm reads:

package.json


and:

package-lock.json


and installs the required packages into:

node_modules\


The project currently uses dependencies including:

express
ejs
better-sqlite3
bcrypt
express-session


Verify the installation:

npm ls --depth=0


You should see the project's dependencies.

10. Initialize the Database

The database schema is stored in:

database\schema.sql


The actual local SQLite database is:

database\database.db


If database.db does not exist, create it using:

sqlite3 database/database.db ".read database/schema.sql"


Alternatively:

sqlite3 database/database.db


Then inside SQLite:

.read database/schema.sql


Then:

.tables


You should see:

announcements
courses
registrations
results
students


Exit SQLite:

.quit

11. Important Windows SQLite Path Note

If this command:

sqlite3 database/database.db ".read database/schema.sql"


does not work because of path handling, use the interactive method.

From the project root:

sqlite3 database/database.db


Then:

.read database/schema.sql


Then:

.tables


Then:

.quit

12. Check the Database

Run:

sqlite3 database/database.db


Inside SQLite:

.tables


Then:

SELECT name FROM sqlite_master WHERE type='table';


You should see the five tables:

students
courses
registrations
results
announcements


Exit:

.quit

13. Start the Application

From the project root:

node server.js


You should see something similar to:

NUST Portal running at http://localhost:3000


Open a browser and go to:

http://localhost:3000


The application should open.

14. Stopping the Server

In the PowerShell window running the server, press:

Ctrl + C


This stops the Node.js server.

15. Starting the Project Again Later

After the initial setup, you normally only need:

cd path\to\nust-portal
node server.js


Then open:

http://localhost:3000


You do not need to run npm install every time.

Only run npm install when dependencies have changed or after setting up the project on a new computer.

16. Development Workflow

Open the project:

cd path\to\nust-portal
code .


Start the server:

node server.js


Make changes in VS Code.

After backend changes, stop and restart the server:

Ctrl + C


then:

node server.js

17. Git Workflow

Check the repository:

git status


After making changes:

git add .


Review what will be committed:

git status


Then commit:

git commit -m "Describe the change"


For example:

git commit -m "Add student results page"

18. Pulling Changes From the Repository

If another developer has pushed changes:

git pull


If dependencies have changed, run:

npm install


Then restart the application:

node server.js

19. Important Files

The main files are:

nust-portal/
│
├── package.json
├── package-lock.json
├── server.js
│
├── database/
│   ├── db.js
│   ├── schema.sql
│   └── database.db
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
    ├── js/
    └── images/

20. Do Not Commit These Files

The following should not normally be committed:

node_modules/
database/database.db
.env


They should be included in .gitignore.

The important files that should be committed include:

package.json
package-lock.json
server.js
database/schema.sql
database/db.js
routes/
views/
public/
.gitignore
README.md
DEVELOPMENT.md

21. Recreating the Database

If the local database becomes corrupted or needs to be recreated:

WARNING: This deletes the local database and all data inside it.

PowerShell:

Remove-Item database\database.db


Then recreate it:

sqlite3 database/database.db


Inside SQLite:

.read database/schema.sql
.tables
.quit


The database is now recreated from the schema.

22. Troubleshooting
node is not recognized

Close PowerShell and open it again.

Then:

node --version


If it still does not work, reinstall Node.js and make sure the installer adds Node.js to PATH.

npm is not recognized

Restart PowerShell after installing Node.js.

Then:

npm --version

git is not recognized

Restart PowerShell after installing Git.

Then:

git --version

sqlite3 is not recognized

Check that:

C:\sqlite\sqlite3.exe


exists.

Then make sure:

C:\sqlite


has been added to the Windows PATH.

Restart PowerShell.

Test:

sqlite3 --version

npm install fails with better-sqlite3

Make sure you are using a supported modern Node.js LTS release and that you are running a 64-bit version of Windows/Node where appropriate.

First try:

npm install


If the project has already been installed incorrectly, remove the generated dependency directory and reinstall:

Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install


Only remove package-lock.json as a troubleshooting step. Normally it should be kept and committed.

Port 3000 is already in use

The application uses:

http://localhost:3000


If another program is using port 3000, either stop that program or change the port in:

server.js


For example:

const PORT = 3001;


Then use:

http://localhost:3001

23. First-Time Setup Checklist

A developer setting up the project from scratch should be able to follow this checklist:

[ ] Install Node.js LTS
[ ] Verify node --version
[ ] Verify npm --version

[ ] Install Git
[ ] Verify git --version

[ ] Install SQLite
[ ] Add SQLite to PATH
[ ] Verify sqlite3 --version

[ ] Install VS Code

[ ] Clone/copy the project
[ ] Open project in VS Code
[ ] Open PowerShell in project directory

[ ] Run npm install

[ ] Create database/database.db
[ ] Load database/schema.sql
[ ] Run .tables
[ ] Confirm database tables exist

[ ] Run node server.js
[ ] Open http://localhost:3000

[ ] Confirm login page loads
[ ] Confirm application works

[ ] Run git status


If all of the above works, the development environment is ready.

24. Project Continuation

After setup, read:

DEVELOPMENT.md


That document explains:

How the application is structured

How authentication works

How the database works

What the existing routes are for

What remains to be implemented

Recommended development order

Security considerations

Git workflow

The developer should read DEVELOPMENT.md before significantly changing the project architecture.

25. Keep the Stack Simple

The project intentionally uses:

HTML
CSS
JavaScript
Node.js
Express
EJS
SQLite


Avoid adding large frameworks or services unless there is a concrete requirement.

The purpose of this foundation is to allow another developer to continue the project without having to learn a complicated stack first.