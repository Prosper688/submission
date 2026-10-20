const express = require("express");
const bcrypt = require("bcrypt");

function createAdminRouter(db) {
    const router = express.Router();

    router.use((req, res, next) => {
        if (!req.session.studentId) {
            return res.redirect("/login");
        }

        const student = db
            .prepare(
                `SELECT id, student_id, name, email, programme, department, role
                 FROM students WHERE id = ?`
            )
            .get(req.session.studentId);

        if (!student) {
            return req.session.destroy(() => res.redirect("/login"));
        }
        if (student.role !== "admin") {
            return res.status(403).render("error", {
                title: "Access denied",
                message: "You do not have permission to access administration."
            });
        }

        req.student = student;
        res.locals.student = student;
        next();
    });

    router.get("/admin", (req, res) => {
        const students = db
            .prepare(
                `SELECT id, student_id, name, email, programme, department
                 FROM students WHERE role = 'student' ORDER BY name`
            )
            .all();
        const courses = db
            .prepare(
                `SELECT c.id, c.code, c.name, c.credit_hours, c.lecturer_id,
                        l.lecturer_id AS assigned_lecturer_id,
                        l.name AS lecturer_name
                 FROM courses c
                 LEFT JOIN lecturers l ON l.id = c.lecturer_id
                 ORDER BY c.code`
            )
            .all();
        const lecturers = db
            .prepare(
                "SELECT id, lecturer_id, name, department FROM lecturers ORDER BY name"
            )
            .all();
        const announcements = db
            .prepare(
                "SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10"
            )
            .all();
        const stats = {
            students: students.length,
            courses: courses.length,
            announcements: db
                .prepare("SELECT COUNT(*) AS count FROM announcements")
                .get().count
        };
        res.render("admin", { students, courses, lecturers, announcements, stats });
    });

    router.post("/admin/courses", (req, res, next) => {
        const code =
            typeof req.body.code === "string"
                ? req.body.code.trim().toUpperCase()
                : "";
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        const creditHours = Number(req.body.creditHours);
        const lecturerIdInput =
            typeof req.body.lecturerId === "string" ? req.body.lecturerId : "";
        const lecturerId =
            lecturerIdInput === "" ? null : Number(lecturerIdInput);

        if (
            !/^[A-Z0-9-]{2,20}$/.test(code) ||
            name.length < 2 ||
            name.length > 120 ||
            !Number.isInteger(creditHours) ||
            creditHours < 1 ||
            creditHours > 60 ||
            (lecturerId !== null && !Number.isSafeInteger(lecturerId)) ||
            (lecturerId !== null &&
                !db.prepare("SELECT id FROM lecturers WHERE id = ?").get(lecturerId))
        ) {
            req.session.flash = {
                type: "error",
                message: "Enter a valid course code, name, and credit-hour value."
            };
            return res.redirect("/admin");
        }

        try {
            db.prepare(
                `INSERT INTO courses (code, name, credit_hours, lecturer_id)
                 VALUES (?, ?, ?, ?)`
            ).run(code, name, creditHours, lecturerId);
            req.session.flash = {
                type: "success",
                message: `Course ${code} has been added.`
            };
            res.redirect("/admin");
        } catch (error) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                req.session.flash = {
                    type: "error",
                    message: "A course with that code already exists."
                };
                return res.redirect("/admin");
            }
            next(error);
        }
    });

    router.post("/admin/lecturers", async (req, res, next) => {
        const lecturerId =
            typeof req.body.lecturerId === "string"
                ? req.body.lecturerId.trim()
                : "";
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        const email =
            typeof req.body.email === "string" ? req.body.email.trim() : "";
        const department =
            typeof req.body.department === "string"
                ? req.body.department.trim()
                : "";
        const password =
            typeof req.body.password === "string" ? req.body.password : "";

        if (
            !/^[A-Za-z0-9-]{3,80}$/.test(lecturerId) ||
            name.length < 2 ||
            name.length > 120 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            email.length > 254 ||
            department.length > 120 ||
            password.length < 12 ||
            password.length > 1024
        ) {
            req.session.flash = {
                type: "error",
                message:
                    "Enter valid lecturer details and a password with at least 12 characters."
            };
            return res.redirect("/admin");
        }

        try {
            const existingAccount = db
                .prepare(
                    `SELECT 1 FROM students WHERE student_id = ?
                     UNION ALL
                     SELECT 1 FROM lecturers WHERE lecturer_id = ?
                     LIMIT 1`
                )
                .get(lecturerId, lecturerId);
            const existingEmail = db
                .prepare("SELECT 1 FROM students WHERE email = ?")
                .get(email);
            if (existingAccount || existingEmail) {
                req.session.flash = {
                    type: "error",
                    message: "That account number or email address is already in use."
                };
                return res.redirect("/admin");
            }

            const passwordHash = await bcrypt.hash(password, 12);
            db.prepare(
                `INSERT INTO lecturers
                 (lecturer_id, name, email, password_hash, department)
                 VALUES (?, ?, ?, ?, ?)`
            ).run(lecturerId, name, email, passwordHash, department || null);
            req.session.flash = {
                type: "success",
                message: `Lecturer account ${lecturerId} has been created.`
            };
            res.redirect("/admin");
        } catch (error) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                req.session.flash = {
                    type: "error",
                    message: "That lecturer number or email address is already in use."
                };
                return res.redirect("/admin");
            }
            next(error);
        }
    });

    router.post("/admin/courses/:id/lecturer", (req, res, next) => {
        const courseId = Number(req.params.id);
        const lecturerInput =
            typeof req.body.lecturerId === "string" ? req.body.lecturerId : "";
        const lecturerId = lecturerInput === "" ? null : Number(lecturerInput);

        if (
            !Number.isSafeInteger(courseId) ||
            (lecturerId !== null && !Number.isSafeInteger(lecturerId)) ||
            (lecturerId !== null &&
                !db.prepare("SELECT id FROM lecturers WHERE id = ?").get(lecturerId))
        ) {
            req.session.flash = {
                type: "error",
                message: "Choose a valid course and lecturer."
            };
            return res.redirect("/admin");
        }

        try {
            const result = db
                .prepare("UPDATE courses SET lecturer_id = ? WHERE id = ?")
                .run(lecturerId, courseId);
            req.session.flash = result.changes
                ? {
                      type: "success",
                      message: lecturerId
                          ? "Course lecturer assignment updated."
                          : "Lecturer assignment removed."
                  }
                : { type: "error", message: "That course could not be found." };
            res.redirect("/admin");
        } catch (error) {
            next(error);
        }
    });

    router.post("/admin/students", async (req, res, next) => {
        const studentId =
            typeof req.body.studentId === "string"
                ? req.body.studentId.trim()
                : "";
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        const email =
            typeof req.body.email === "string" ? req.body.email.trim() : "";
        const programme =
            typeof req.body.programme === "string"
                ? req.body.programme.trim()
                : "";
        const department =
            typeof req.body.department === "string"
                ? req.body.department.trim()
                : "";
        const password =
            typeof req.body.password === "string" ? req.body.password : "";

        if (
            !/^[A-Za-z0-9-]{3,80}$/.test(studentId) ||
            name.length < 2 ||
            name.length > 120 ||
            (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
            programme.length > 120 ||
            department.length > 120 ||
            password.length < 12 ||
            password.length > 1024
        ) {
            req.session.flash = {
                type: "error",
                message:
                    "Enter a valid student number, name, email, and programme. Passwords must be at least 12 characters."
            };
            return res.redirect("/admin");
        }

        try {
            const lecturerAccount = db
                .prepare(
                    `SELECT 1 FROM lecturers
                     WHERE lecturer_id = ? OR (? <> '' AND email = ?)`
                )
                .get(studentId, email, email);
            if (lecturerAccount) {
                req.session.flash = {
                    type: "error",
                    message: "That account number or email address is already in use."
                };
                return res.redirect("/admin");
            }

            const passwordHash = await bcrypt.hash(password, 12);
            db.prepare(
                `INSERT INTO students
                 (student_id, name, email, password_hash, programme, department)
                 VALUES (?, ?, ?, ?, ?, ?)`
            ).run(
                studentId,
                name,
                email || null,
                passwordHash,
                programme || null,
                department || null
            );
            req.session.flash = {
                type: "success",
                message: `Student account ${studentId} has been created.`
            };
            res.redirect("/admin");
        } catch (error) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                req.session.flash = {
                    type: "error",
                    message: "That student number or email is already in use."
                };
                return res.redirect("/admin");
            }
            next(error);
        }
    });

    router.post("/admin/announcements", (req, res, next) => {
        const title =
            typeof req.body.title === "string" ? req.body.title.trim() : "";
        const content =
            typeof req.body.content === "string" ? req.body.content.trim() : "";
        if (
            title.length < 3 ||
            title.length > 120 ||
            content.length < 5 ||
            content.length > 5000
        ) {
            req.session.flash = {
                type: "error",
                message: "Enter an announcement title and message within the limits."
            };
            return res.redirect("/admin");
        }

        try {
            db.prepare(
                "INSERT INTO announcements (title, content) VALUES (?, ?)"
            ).run(title, content);
            req.session.flash = {
                type: "success",
                message: "Announcement published."
            };
            res.redirect("/admin");
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = createAdminRouter;
