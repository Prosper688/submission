const express = require("express");

function createLecturerRouter(db) {
    const router = express.Router();

    router.use("/lecturer", (req, res, next) => {
        if (!req.session.lecturerId) {
            return res.redirect("/login");
        }

        const lecturer = db
            .prepare(
                `SELECT id, lecturer_id, name, email, department
                 FROM lecturers WHERE id = ?`
            )
            .get(req.session.lecturerId);
        if (!lecturer) {
            return req.session.destroy(() => res.redirect("/login"));
        }

        req.lecturer = lecturer;
        res.locals.student = {
            ...lecturer,
            student_id: lecturer.lecturer_id,
            role: "lecturer"
        };
        next();
    });

    router.get("/lecturer/results", (req, res) => {
        const courses = db
            .prepare(
                `SELECT id, code, name, credit_hours
                 FROM courses WHERE lecturer_id = ? ORDER BY code`
            )
            .all(req.lecturer.id);
        const selectedCourseId = Number(req.query.courseId);
        const selectedCourse = courses.find(
            (course) => course.id === selectedCourseId
        );
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

        const students = selectedCourse
            ? db
                  .prepare(
                      `SELECT s.id, s.student_id, s.name, r.marks, r.grade
                       FROM registrations registration
                       JOIN students s ON s.id = registration.student_id
                       LEFT JOIN results r
                         ON r.student_id = registration.student_id
                        AND r.course_id = registration.course_id
                        AND r.semester = registration.semester
                        AND r.year = registration.year
                       WHERE registration.course_id = ?
                         AND registration.semester = ?
                         AND registration.year = ?
                       ORDER BY s.name`
                  )
                  .all(selectedCourse.id, semester, year)
            : [];

        res.render("lecturer-results", {
            courses,
            selectedCourse,
            students,
            semester,
            year
        });
    });

    router.post("/lecturer/results", (req, res, next) => {
        const courseId = Number(req.body.courseId);
        const studentId = Number(req.body.studentId);
        const semester =
            typeof req.body.semester === "string" ? req.body.semester : "";
        const year = Number(req.body.year);
        const markInput =
            typeof req.body.marks === "string" ? req.body.marks.trim() : "";
        const marks = markInput === "" ? null : Number(markInput);
        const grade =
            typeof req.body.grade === "string"
                ? req.body.grade.trim().toUpperCase()
                : "";

        if (
            !Number.isSafeInteger(courseId) ||
            !Number.isSafeInteger(studentId) ||
            !["Semester 1", "Semester 2", "Summer"].includes(semester) ||
            !Number.isInteger(year) ||
            year < 2000 ||
            year > 2100 ||
            (marks !== null &&
                (!Number.isFinite(marks) || marks < 0 || marks > 100)) ||
            !["", "A", "B", "C", "D", "E", "F"].includes(grade) ||
            (marks === null && !grade)
        ) {
            req.session.flash = {
                type: "error",
                message: "Enter a valid mark or grade for a registered student."
            };
            return res.redirect("/lecturer/results");
        }

        try {
            const registration = db
                .prepare(
                    `SELECT 1
                     FROM registrations registration
                     JOIN courses c ON c.id = registration.course_id
                     JOIN students s ON s.id = registration.student_id
                     WHERE registration.course_id = ?
                       AND registration.student_id = ?
                       AND registration.semester = ?
                       AND registration.year = ?
                       AND c.lecturer_id = ?
                       AND s.role = 'student'`
                )
                .get(
                    courseId,
                    studentId,
                    semester,
                    year,
                    req.lecturer.id
                );
            if (!registration) {
                req.session.flash = {
                    type: "error",
                    message:
                        "You can only enter results for students registered in your assigned course."
                };
                return res.redirect(
                    `/lecturer/results?courseId=${courseId}&semester=${encodeURIComponent(semester)}&year=${year}`
                );
            }

            db.prepare(
                `INSERT INTO results
                 (student_id, course_id, semester, year, marks, grade)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(student_id, course_id, semester, year)
                 DO UPDATE SET marks = excluded.marks, grade = excluded.grade`
            ).run(studentId, courseId, semester, year, marks, grade || null);
            req.session.flash = {
                type: "success",
                message: "Student result saved successfully."
            };
            res.redirect(
                `/lecturer/results?courseId=${courseId}&semester=${encodeURIComponent(semester)}&year=${year}`
            );
        } catch (error) {
            next(error);
        }
    });

    return router;
}

module.exports = createLecturerRouter;
