const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { once } = require("node:events");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const { createApp } = require("../server");

const db = new Database(":memory:");
db.pragma("foreign_keys = ON");
db.exec(
    fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8")
);
const passwordHash = bcrypt.hashSync("student-password-123", 4);
db.prepare(
    `INSERT INTO students
     (student_id, name, email, password_hash, programme, department)
     VALUES (?, ?, ?, ?, ?, ?)`
).run(
    "NUS10001",
    "Ada Student",
    "ada@example.test",
    passwordHash,
    "Computer Science",
    "Computing"
);
const studentId = db.prepare("SELECT id FROM students WHERE student_id = ?").get(
    "NUS10001"
).id;
db.prepare(
    "INSERT INTO courses (code, name, credit_hours) VALUES (?, ?, ?)"
).run("CSC101", "Introduction to Computing", 3);
const courseId = db.prepare("SELECT id FROM courses WHERE code = ?").get(
    "CSC101"
).id;
db.prepare(
    `INSERT INTO students
     (student_id, name, email, password_hash, role)
     VALUES (?, ?, ?, ?, 'admin')`
).run(
    "NUSADMIN",
    "Portal Admin",
    "admin@example.test",
    bcrypt.hashSync("administrator-password", 4)
);

const app = createApp({ db, sessionSecret: "test-session-secret" });
let server;
let baseUrl;

class BrowserSession {
    cookie = "";

    async request(url, options = {}) {
        const headers = new Headers(options.headers || {});
        if (this.cookie) {
            headers.set("cookie", this.cookie);
        }
        const response = await fetch(`${baseUrl}${url}`, {
            ...options,
            headers,
            redirect: "manual"
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length) {
            this.cookie = cookies[0].split(";")[0];
        }
        return response;
    }
}

function getCsrfToken(html) {
    const match = html.match(/name="_csrf" value="([^"]+)"/);
    assert.ok(match, "expected the rendered page to include a CSRF token");
    return match[1];
}

async function login(browser, username, password = "student-password-123") {
    const page = await browser.request("/login");
    const token = getCsrfToken(await page.text());
    return browser.request("/login", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ _csrf: token, username, password })
    });
}

test.before(async () => {
    server = app.listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
    );
    db.close();
});

test("production requires an explicit session secret", () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousSecret = process.env.SESSION_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    try {
        assert.throws(
            () => createApp({ db }),
            /SESSION_SECRET must be set in production/
        );
    } finally {
        if (previousEnvironment === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = previousEnvironment;
        }
        if (previousSecret === undefined) {
            delete process.env.SESSION_SECRET;
        } else {
            process.env.SESSION_SECRET = previousSecret;
        }
    }
});

test("login page renders and anonymous dashboard redirects", async () => {
    const browser = new BrowserSession();
    const loginPage = await browser.request("/login");
    const html = await loginPage.text();
    assert.equal(loginPage.status, 200);
    assert.match(html, /Welcome back/);
    assert.match(html, /name="_csrf"/);
    assert.equal(loginPage.headers.get("x-powered-by"), null);
    assert.equal(loginPage.headers.get("x-content-type-options"), "nosniff");
    assert.equal(loginPage.headers.get("x-frame-options"), "DENY");

    const dashboard = await browser.request("/dashboard");
    assert.equal(dashboard.status, 302);
    assert.equal(dashboard.headers.get("location"), "/login");
});

test("login rejects missing CSRF tokens and invalid passwords", async () => {
    const browser = new BrowserSession();
    await browser.request("/login");
    const missingToken = await browser.request("/login", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            username: "NUS10001",
            password: "student-password-123"
        })
    });
    assert.equal(missingToken.status, 403);

    const bodylessPost = await browser.request("/login", { method: "POST" });
    assert.equal(bodylessPost.status, 403);

    const badLogin = await login(
        new BrowserSession(),
        "NUS10001",
        "not-the-password"
    );
    assert.equal(badLogin.status, 401);
    assert.match(await badLogin.text(), /incorrect/);
});

test("students can register, view, and drop only their own courses", async () => {
    const browser = new BrowserSession();
    const signedIn = await login(browser, "NUS10001");
    assert.equal(signedIn.status, 302);

    const dashboard = await browser.request("/dashboard");
    assert.equal(dashboard.status, 200);
    assert.match(await dashboard.text(), /Ada Student/);

    const coursePage = await browser.request("/courses?semester=Semester+1&year=2026");
    const courseHtml = await coursePage.text();
    const token = getCsrfToken(courseHtml);
    const registration = await browser.request("/registration", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            courseId: String(courseId),
            semester: "Semester 1",
            year: "2026"
        })
    });
    assert.equal(registration.status, 302);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM registrations WHERE student_id = ?")
            .get(studentId).count,
        1
    );

    const registeredPage = await browser.request("/courses?semester=Semester+1&year=2026");
    const registeredHtml = await registeredPage.text();
    assert.match(registeredHtml, /Already registered/);
    const registrationId = db
        .prepare("SELECT id FROM registrations WHERE student_id = ?")
        .get(studentId).id;

    const otherStudent = db
        .prepare(
            `INSERT INTO students
             (student_id, name, password_hash) VALUES (?, ?, ?)`
        )
        .run("NUS10002", "Other Student", passwordHash);
    db.prepare(
        `INSERT INTO registrations
         (student_id, course_id, semester, year) VALUES (?, ?, ?, ?)`
    ).run(otherStudent.lastInsertRowid, courseId, "Semester 2", 2026);
    const otherRegistrationId = db
        .prepare("SELECT id FROM registrations WHERE student_id = ?")
        .get(otherStudent.lastInsertRowid).id;

    const dropOther = await browser.request(
        `/registration/${otherRegistrationId}/drop`,
        {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ _csrf: getCsrfToken(registeredHtml) })
        }
    );
    assert.equal(dropOther.status, 302);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM registrations WHERE id = ?")
            .get(otherRegistrationId).count,
        1
    );

    const dropOwn = await browser.request(`/registration/${registrationId}/drop`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ _csrf: getCsrfToken(registeredHtml) })
    });
    assert.equal(dropOwn.status, 302);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM registrations WHERE id = ?")
            .get(registrationId).count,
        0
    );
});

test("students cannot access administration", async () => {
    const browser = new BrowserSession();
    await login(browser, "NUS10001");
    const response = await browser.request("/admin");
    assert.equal(response.status, 403);
    assert.match(await response.text(), /Access denied/);
});

test("students can update their profile without changing their student number", async () => {
    const browser = new BrowserSession();
    await login(browser, "NUS10001");
    const profile = await browser.request("/profile");
    const profileHtml = await profile.text();
    assert.match(profileHtml, /Student number/);

    const response = await browser.request("/profile", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: getCsrfToken(profileHtml),
            name: "Ada Byron",
            email: "ada.byron@example.test",
            programme: "Computing",
            department: "Software Engineering"
        })
    });
    assert.equal(response.status, 302);
    const savedStudent = db
        .prepare("SELECT student_id, name, email, programme, department FROM students WHERE id = ?")
        .get(studentId);
    assert.deepEqual(savedStudent, {
        student_id: "NUS10001",
        name: "Ada Byron",
        email: "ada.byron@example.test",
        programme: "Computing",
        department: "Software Engineering"
    });

    const updatedProfile = await browser.request("/profile");
    const updatedHtml = await updatedProfile.text();
    const duplicateEmail = await browser.request("/profile", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: getCsrfToken(updatedHtml),
            name: "Ada Byron",
            email: "admin@example.test",
            programme: "Computing",
            department: "Software Engineering"
        })
    });
    assert.equal(duplicateEmail.status, 302);
    assert.equal(
        db.prepare("SELECT email FROM students WHERE id = ?").get(studentId).email,
        "ada.byron@example.test"
    );
});

test("sessions are stored in SQLite and removed on logout", async () => {
    const browser = new BrowserSession();
    await login(browser, "NUS10001");
    const signedCookie = decodeURIComponent(browser.cookie.split("=")[1]);
    const sessionId = signedCookie.slice(2).split(".")[0];
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM portal_sessions WHERE sid = ?")
            .get(sessionId).count,
        1
    );

    const page = await browser.request("/dashboard");
    const response = await browser.request("/logout", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ _csrf: getCsrfToken(await page.text()) })
    });
    assert.equal(response.status, 302);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM portal_sessions WHERE sid = ?")
            .get(sessionId).count,
        0
    );
    assert.equal((await browser.request("/dashboard")).status, 302);
});

test("administrators manage accounts and courses while lecturers enter results", async () => {
    const browser = new BrowserSession();
    const signedIn = await login(
        browser,
        "NUSADMIN",
        "administrator-password"
    );
    assert.equal(signedIn.status, 302);

    const adminPage = await browser.request("/admin");
    const adminHtml = await adminPage.text();
    assert.equal(adminPage.status, 200);
    assert.match(adminHtml, /Create a student account/);
    assert.match(adminHtml, /Create a lecturer account/);
    assert.doesNotMatch(adminHtml, /Record a result/);
    const token = getCsrfToken(adminHtml);

    let response = await browser.request("/admin/students", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            studentId: "NUS20001",
            name: "New Student",
            email: "new@example.test",
            programme: "Software Engineering",
            department: "Computing",
            password: "secure-student-password"
        })
    });
    assert.equal(response.status, 302);

    const student = db
        .prepare("SELECT id FROM students WHERE student_id = ?")
        .get("NUS20001");
    assert.ok(student);

    response = await browser.request("/admin/lecturers", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            lecturerId: "LEC20001",
            name: "Lecturer One",
            email: "lecturer@example.test",
            department: "Computing",
            password: "secure-lecturer-password"
        })
    });
    assert.equal(response.status, 302);
    const lecturer = db
        .prepare("SELECT id FROM lecturers WHERE lecturer_id = ?")
        .get("LEC20001");
    assert.ok(lecturer);

    response = await browser.request("/admin/courses", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            code: "MAT202",
            name: "Applied Mathematics",
            creditHours: "4",
            lecturerId: String(lecturer.id)
        })
    });
    assert.equal(response.status, 302);

    const newCourse = db.prepare("SELECT id FROM courses WHERE code = ?").get(
        "MAT202"
    );
    assert.ok(newCourse);
    db.prepare(
        `INSERT INTO registrations (student_id, course_id, semester, year)
         VALUES (?, ?, ?, ?)`
    ).run(student.id, newCourse.id, "Semester 1", 2026);

    response = await browser.request("/admin/results", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            studentId: String(student.id),
            courseId: String(newCourse.id),
            semester: "Semester 1",
            year: "2026",
            marks: "84.5",
            grade: "A"
        })
    });
    assert.equal(response.status, 404);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM results WHERE student_id = ?")
            .get(student.id).count,
        0
    );

    const lecturerBrowser = new BrowserSession();
    const lecturerLogin = await login(
        lecturerBrowser,
        "LEC20001",
        "secure-lecturer-password"
    );
    assert.equal(lecturerLogin.status, 302);
    assert.equal(lecturerLogin.headers.get("location"), "/lecturer/results");
    const lecturerPage = await lecturerBrowser.request(
        `/lecturer/results?courseId=${newCourse.id}&semester=Semester+1&year=2026`
    );
    const lecturerHtml = await lecturerPage.text();
    assert.equal(lecturerPage.status, 200);
    assert.match(lecturerHtml, /New Student/);
    assert.match(lecturerHtml, /Applied Mathematics/);

    response = await lecturerBrowser.request("/lecturer/results", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: getCsrfToken(lecturerHtml),
            studentId: String(student.id),
            courseId: String(newCourse.id),
            semester: "Semester 1",
            year: "2026",
            marks: "84.5",
            grade: "A"
        })
    });
    assert.equal(response.status, 302);
    assert.equal(
        db.prepare("SELECT marks, grade FROM results WHERE student_id = ?").get(
            student.id
        ).grade,
        "A"
    );

    const unassignedCourseId = db
        .prepare("INSERT INTO courses (code, name, credit_hours) VALUES (?, ?, ?)")
        .run("BIO303", "Unassigned Biology", 3).lastInsertRowid;
    db.prepare(
        `INSERT INTO registrations (student_id, course_id, semester, year)
         VALUES (?, ?, ?, ?)`
    ).run(student.id, unassignedCourseId, "Semester 1", 2026);
    response = await lecturerBrowser.request("/lecturer/results", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: getCsrfToken(lecturerHtml),
            studentId: String(student.id),
            courseId: String(unassignedCourseId),
            semester: "Semester 1",
            year: "2026",
            marks: "95",
            grade: "A"
        })
    });
    assert.equal(response.status, 302);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM results WHERE course_id = ?")
            .get(unassignedCourseId).count,
        0
    );

    response = await browser.request("/lecturer/results", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            studentId: String(student.id),
            courseId: String(newCourse.id),
            semester: "Semester 1",
            year: "2026",
            marks: "99",
            grade: "A"
        })
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/login");
    assert.equal(
        db.prepare("SELECT marks FROM results WHERE student_id = ?").get(
            student.id
        ).marks,
        84.5
    );

    response = await browser.request("/admin/announcements", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            _csrf: token,
            title: "Registration opens",
            content: "Registration for the new semester is now open."
        })
    });
    assert.equal(response.status, 302);
    assert.equal(
        db.prepare("SELECT COUNT(*) AS count FROM announcements").get().count,
        1
    );
    const announcementsPage = await browser.request("/announcements");
    assert.match(await announcementsPage.text(), /Registration opens/);

    const newStudentBrowser = new BrowserSession();
    const studentLogin = await login(
        newStudentBrowser,
        "NUS20001",
        "secure-student-password"
    );
    assert.equal(studentLogin.status, 302);
    const resultsPage = await newStudentBrowser.request("/results");
    assert.match(await resultsPage.text(), /Applied Mathematics/);

    const studentLecturerPage = await newStudentBrowser.request(
        "/lecturer/results"
    );
    assert.equal(studentLecturerPage.status, 302);
    assert.equal(studentLecturerPage.headers.get("location"), "/login");
});
