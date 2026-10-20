const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "database.db");
const db = new Database(databasePath);

db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

const studentColumns = db.prepare("PRAGMA table_info(students)").all();
if (!studentColumns.some((column) => column.name === "role")) {
    db.exec(
        "ALTER TABLE students ADD COLUMN role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin'))"
    );
}

    db.exec(`
        CREATE TABLE IF NOT EXISTS lecturers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lecturer_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            department TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const courseColumns = db.prepare("PRAGMA table_info(courses)").all();
    if (!courseColumns.some((column) => column.name === "lecturer_id")) {
        db.exec(
            "ALTER TABLE courses ADD COLUMN lecturer_id INTEGER REFERENCES lecturers(id) ON DELETE SET NULL"
        );
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS courses_lecturer
        ON courses(lecturer_id);
        CREATE INDEX IF NOT EXISTS lecturers_email
        ON lecturers(email);
        CREATE INDEX IF NOT EXISTS registrations_student_term
    ON registrations(student_id, year, semester);
    CREATE INDEX IF NOT EXISTS results_student_term
    ON results(student_id, year, semester);
    CREATE INDEX IF NOT EXISTS announcements_created
    ON announcements(created_at DESC);
`);

module.exports = db;
