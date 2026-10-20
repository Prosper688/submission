const express = require("express");
const bcrypt = require("bcrypt");

function createAuthRouter(db) {
    const router = express.Router();

    router.get("/login", (req, res) => {
        if (req.session.lecturerId) {
            return res.redirect("/lecturer/results");
        }
        if (req.session.studentId) {
            return res.redirect("/dashboard");
        }

        res.render("login", { error: null });
    });

    router.post("/login", async (req, res, next) => {
        try {
            const studentId =
                typeof req.body.username === "string"
                    ? req.body.username.trim()
                    : "";
            const password =
                typeof req.body.password === "string" ? req.body.password : "";

            if (!studentId || !password || password.length > 1024) {
                return res.status(400).render("login", {
                    error: "Enter your account number and password."
                });
            }

            const student = db
                .prepare(
                    `SELECT id, student_id, name, password_hash, role
                     FROM students
                     WHERE student_id = ?`
                )
                .get(studentId);

            const lecturer = student
                ? null
                : db
                      .prepare(
                          `SELECT id, lecturer_id, name, email, password_hash, department
                           FROM lecturers WHERE lecturer_id = ?`
                      )
                      .get(studentId);
            const account = student || lecturer;
            const passwordMatch = account
                ? await bcrypt.compare(password, account.password_hash)
                : false;

            if (!passwordMatch) {
                return res.status(401).render("login", {
                    error: "The account number or password is incorrect."
                });
            }

            req.session.regenerate((error) => {
                if (error) {
                    return next(error);
                }

                if (lecturer) {
                    req.session.lecturerId = lecturer.id;
                } else {
                    req.session.studentId = student.id;
                }
                req.session.save((saveError) => {
                    if (saveError) {
                        return next(saveError);
                    }
                    res.redirect(lecturer ? "/lecturer/results" : "/dashboard");
                });
            });
        } catch (error) {
            next(error);
        }
    });

    router.post("/logout", (req, res, next) => {
        req.session.destroy((error) => {
            if (error) {
                return next(error);
            }
            res.clearCookie("pusi.sid");
            res.redirect("/login");
        });
    });

    return router;
}

module.exports = createAuthRouter;
