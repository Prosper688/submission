const express = require("express");
const path = require("path");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");

const app = express();
const PORT = 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: "change-this-secret-later",
        resave: false,
        saveUninitialized: false
    })
);

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.use("/", authRoutes);
app.use("/", studentRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`NUST Portal running at http://localhost:${PORT}`);
});