const bcrypt = require("bcrypt");
const db = require("../database/db");

async function main() {
    const studentId = (process.env.ADMIN_STUDENT_ID || "").trim();
    if (!/^[A-Za-z0-9-]{3,80}$/.test(studentId)) {
        throw new Error(
            "Set ADMIN_STUDENT_ID to the student number of an existing account or the new administrator."
        );
    }

    const existing = db
        .prepare("SELECT id, role FROM students WHERE student_id = ?")
        .get(studentId);
    if (existing) {
        if (existing.role === "admin") {
            console.log(`Account ${studentId} is already an administrator.`);
            return;
        }
        db.prepare("UPDATE students SET role = 'admin' WHERE id = ?").run(
            existing.id
        );
        console.log(`Existing account ${studentId} promoted to administrator.`);
        return;
    }

    const name = (process.env.ADMIN_NAME || "").trim();
    const email = (process.env.ADMIN_EMAIL || "").trim();
    const password = process.env.ADMIN_PASSWORD || "";
    if (
        name.length < 2 ||
        name.length > 120 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        password.length < 12 ||
        password.length > 1024
    ) {
        throw new Error(
            "For a new administrator, set ADMIN_NAME, ADMIN_EMAIL, and a 12-character minimum ADMIN_PASSWORD."
        );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare(
        `INSERT INTO students
         (student_id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'admin')`
    ).run(studentId, name, email, passwordHash);
    console.log(`Administrator account ${studentId} created.`);
}

main().catch((error) => {
    console.error("Could not create administrator:", error.message);
    process.exitCode = 1;
});
