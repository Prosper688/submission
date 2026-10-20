const express = require("express");

function createStudentRouter(db) {
    const router = express.Router();

    function requireLogin(req, res, next) {
        if (!req.session.studentId) {
            return res.redirect("/login");
        }
        next();
    }

    function loadStudent(req, res, next) {
        const student = db
            .prepare(
                `SELECT id, student_id, name, email, programme, department, role
                 FROM students WHERE id = ?`
            )
            .get(req.session.studentId);

        if (!student) {
            return req.session.destroy(() => res.redirect("/login"));
        }

        req.student = student;
        res.locals.student = student;
        next();
    }

    router.use(requireLogin, loadStudent);

    router.get("/dashboard", (req, res) => {
        const studentId = req.student.id;
        const registrations = db
            .prepare(
                `SELECT c.code, c.name, c.credit_hours, r.semester, r.year
                 FROM registrations r
                 JOIN courses c ON c.id = r.course_id
                 WHERE r.student_id = ?
                 ORDER BY r.year DESC, r.semester DESC, c.code
                 LIMIT 4`
            )
            .all(studentId);
        const results = db
            .prepare(
                `SELECT c.code, c.name, r.marks, r.grade, r.semester, r.year
                 FROM results r
                 JOIN courses c ON c.id = r.course_id
                 WHERE r.student_id = ?
                 ORDER BY r.year DESC, r.semester DESC, c.code
                 LIMIT 4`
            )
            .all(studentId);
        const stats = {
            courses: db
                .prepare(
                    "SELECT COUNT(*) AS count FROM registrations WHERE student_id = ?"
                )
                .get(studentId).count,
            results: db
                .prepare(
                    "SELECT COUNT(*) AS count FROM results WHERE student_id = ?"
                )
                .get(studentId).count,
            announcements: db
                .prepare("SELECT COUNT(*) AS count FROM announcements")
                .get().count
        };
        const announcements = db
            .prepare(
                "SELECT title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 3"
            )
            .all();

        res.render("dashboard", {
            registrations,
            results,
            stats,
            announcements
        });
    });

    router.get("/courses", (req, res) => {
        const search =
            typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
        const semester = ["Semester 1", "Semester 2", "Summer"].includes(
            req.query.semester
        )
            ? req.query.semester
            : "Semester 1";
        const parsedYear = Number(req.query.year);
        const year =
            Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
                ? parsedYear
                : new Date().getFullYear();
        const courses = db
            .prepare(
                `SELECT c.id, c.code, c.name, c.credit_hours,
                        EXISTS (
                            SELECT 1 FROM registrations r
                            WHERE r.course_id = c.id AND r.student_id = ?
                              AND r.semester = ? AND r.year = ?
                        ) AS registered
                 FROM courses c
                 WHERE (? = '' OR c.code LIKE ? OR c.name LIKE ?)
                 ORDER BY c.code`
            )
            .all(
                req.student.id,
                semester,
                year,
                search,
                `%${search}%`,
                `%${search}%`
            );
        const registrations = db
            .prepare(
                `SELECT r.id AS registration_id, c.code, c.name,
                        c.credit_hours, r.semester, r.year
                 FROM registrations r
                 JOIN courses c ON c.id = r.course_id
                 WHERE r.student_id = ?
                 ORDER BY r.year DESC, r.semester, c.code`
            )
            .all(req.student.id);

        res.render("courses", { courses, search, semester, year, registrations });
    });

    router.post("/registration", (req, res, next) => {
        const courseId = Number(req.body.courseId);
        const semester =
            typeof req.body.semester === "string" ? req.body.semester : "";
        const year = Number(req.body.year);

        if (
            !Number.isSafeInteger(courseId) ||
            !["Semester 1", "Semester 2", "Summer"].includes(semester) ||
            !Number.isInteger(year) ||
            year < 2000 ||
            year > 2100
        ) {
            req.session.flash = {
                type: "error",
                message: "Choose a valid course, semester, and academic year."
            };
            return res.redirect("/courses");
        }

        try {
            const course = db
                .prepare("SELECT id FROM courses WHERE id = ?")
                .get(courseId);
            if (!course) {
                req.session.flash = {
                    type: "error",
                    message: "That course is no longer available."
                };
                return res.redirect("/courses");
            }

            const registration = db
                .prepare(
                    `INSERT OR IGNORE INTO registrations
                     (student_id, course_id, semester, year)
                     VALUES (?, ?, ?, ?)`
                )
                .run(req.student.id, courseId, semester, year);
            req.session.flash = {
                type: registration.changes ? "success" : "error",
                message: registration.changes
                    ? "Course registered successfully."
                    : "You are already registered for this course in that term."
            };
            res.redirect(
                `/courses?semester=${encodeURIComponent(semester)}&year=${year}`
            );
        } catch (error) {
            next(error);
        }
    });

    router.post("/registration/:id/drop", (req, res, next) => {
        const registrationId = Number(req.params.id);
        if (!Number.isSafeInteger(registrationId)) {
            req.session.flash = {
                type: "error",
                message: "The selected registration is invalid."
            };
            return res.redirect("/courses");
        }

        try {
            const result = db
                .prepare(
                    "DELETE FROM registrations WHERE id = ? AND student_id = ?"
                )
                .run(registrationId, req.student.id);
            req.session.flash = result.changes
                ? { type: "success", message: "Course registration removed." }
                : { type: "error", message: "That registration could not be found." };
            res.redirect("/courses");
        } catch (error) {
            next(error);
        }
    });

    router.get("/results", (req, res) => {
        const results = db
            .prepare(
                `SELECT c.code, c.name, c.credit_hours, r.semester, r.year,
                        r.marks, r.grade
                 FROM results r
                 JOIN courses c ON c.id = r.course_id
                 WHERE r.student_id = ?
                 ORDER BY r.year DESC, r.semester DESC, c.code`
            )
            .all(req.student.id);
        res.render("results", { results });
    });

    router.get("/announcements", (req, res) => {
        const announcements = db
            .prepare(
                "SELECT title, content, created_at FROM announcements ORDER BY created_at DESC"
            )
            .all();
        res.render("announcements", { announcements });
    });

    router.get("/profile", (req, res) => {
        res.render("profile");
    });

    router.post("/profile", (req, res, next) => {
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

        if (
            name.length < 2 ||
            name.length > 120 ||
            (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
            programme.length > 120 ||
            department.length > 120
        ) {
            req.session.flash = {
                type: "error",
                message: "Enter a valid name, email address, programme, and department."
            };
            return res.redirect("/profile");
        }

        try {
            db.prepare(
                `UPDATE students
                 SET name = ?, email = ?, programme = ?, department = ?
                 WHERE id = ?`
            ).run(name, email || null, programme || null, department || null, req.student.id);
            req.session.flash = {
                type: "success",
                message: "Your profile has been updated."
            };
            res.redirect("/profile");
        } catch (error) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                req.session.flash = {
                    type: "error",
                    message: "That email address is already in use."
                };
                return res.redirect("/profile");
            }
            next(error);
        }
    });

    return router;
}

module.exports = createStudentRouter;
