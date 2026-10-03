const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/db");

const router = express.Router();

// Login page
router.get("/login", (req, res) => {
    res.render("login");
});

// Login form
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const student = db
        .prepare("SELECT * FROM students WHERE student_id = ?")
        .get(username);

    if (!student) {
        return res.render("login", {
            error: "Invalid student ID or password."
        });
    }

    const passwordMatch = await bcrypt.compare(
        password,
        student.password_hash
    );

    if (!passwordMatch) {
        return res.render("login", {
            error: "Invalid student ID or password."
        });
    }

    req.session.studentId = student.id;

    res.redirect("/dashboard");
});

// Logout
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

module.exports = router;