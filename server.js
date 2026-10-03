const express = require("express");
const path = require("path");
const db = require("./database/db");

const app = express();
const PORT = 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/dashboard", (req, res) => {
    const student = db
        .prepare("SELECT * FROM students WHERE registration_number = ?")
        .get("TEST001");

    res.render("dashboard", { student });
});


// Start server
app.listen(PORT, () => {
    console.log(`NUST Portal running at http://localhost:${PORT}`);
});
