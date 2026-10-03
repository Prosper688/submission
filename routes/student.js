const express = require("express");
const db = require("../database/db");

const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.session.studentId) {
        return res.redirect("/login");
    }

    next();
}

router.get("/dashboard", requireLogin, (req, res) => {
    const student = db
        .prepare("SELECT * FROM students WHERE id = ?")
        .get(req.session.studentId);

    if (!student) {
        req.session.destroy(() => {
            res.redirect("/login");
        });
        return;
    }

    res.render("dashboard", { student });
});

module.exports = router;