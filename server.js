const crypto = require("crypto");
const express = require("express");
const path = require("path");
const session = require("express-session");
const SqliteSessionStore = require("./database/session-store");
const createAdminRouter = require("./routes/admin");
const createAuthRouter = require("./routes/auth");
const createLecturerRouter = require("./routes/lecturer");
const createStudentRouter = require("./routes/student");

function createApp(options = {}) {
    const app = express();
    const database = options.db || require("./database/db");
    if (
        process.env.NODE_ENV === "production" &&
        !options.sessionSecret &&
        !process.env.SESSION_SECRET
    ) {
        throw new Error("SESSION_SECRET must be set in production.");
    }
    const sessionSecret =
        options.sessionSecret ||
        process.env.SESSION_SECRET ||
        crypto.randomBytes(32).toString("hex");

    app.disable("x-powered-by");
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
    app.use(express.urlencoded({ extended: false, limit: "10kb" }));
    app.use(express.json({ limit: "10kb" }));
    app.use((req, res, next) => {
        res.set({
            "Content-Security-Policy":
                "default-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
        });
        next();
    });
    app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));
    app.use(
        session({
            name: "pusi.sid",
            secret: sessionSecret,
            store: new SqliteSessionStore(database),
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production",
                maxAge: 8 * 60 * 60 * 1000
            }
        })
    );

    app.use((req, res, next) => {
        if (!req.session.csrfToken) {
            req.session.csrfToken = crypto.randomBytes(32).toString("hex");
        }
        res.locals.csrfToken = req.session.csrfToken;
        res.locals.currentPath = req.path;
        res.locals.flash = req.session.flash || null;
        delete req.session.flash;

        if (req.method === "POST") {
            const submitted = req.body && req.body._csrf;
            const expected = req.session.csrfToken;
            if (
                typeof submitted !== "string" ||
                submitted.length !== expected.length ||
                !crypto.timingSafeEqual(
                    Buffer.from(submitted),
                    Buffer.from(expected)
                )
            ) {
                return res.status(403).render("error", {
                    title: "Request expired",
                    message: "Refresh the page and try submitting the form again."
                });
            }
        }
        next();
    });

    app.get("/", (req, res) => res.redirect("/login"));
    app.use("/", createAuthRouter(database));
    app.use("/", createLecturerRouter(database));
    app.use("/", createStudentRouter(database));
    app.use("/", createAdminRouter(database));

    app.use((req, res) => {
        res.status(404).render("error", {
            title: "Page not found",
            message: "We could not find the page you were looking for."
        });
    });

    app.use((error, req, res, next) => {
        console.error("Request failed:", error);
        if (res.headersSent) {
            return next(error);
        }
        const status =
            Number.isInteger(error.status) && error.status >= 400 && error.status < 600
                ? error.status
                : 500;
        res.status(status).render("error", {
            title: status === 500 ? "Something went wrong" : "Request could not be processed",
            message:
                status === 500
                    ? "The request could not be completed. Please try again."
                    : "The request was invalid or too large. Check the form and try again."
        });
    });

    return app;
}

if (require.main === module) {
    const app = createApp();
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
        console.log(`Pioneer University Portal running at http://localhost:${port}`);
    });
}

module.exports = { createApp };
