const session = require("express-session");

class SqliteSessionStore extends session.Store {
    constructor(db) {
        super();
        db.exec(`
            CREATE TABLE IF NOT EXISTS portal_sessions (
                sid TEXT PRIMARY KEY,
                sess TEXT NOT NULL,
                expires INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS portal_sessions_expires
            ON portal_sessions(expires);
        `);
        this.getSession = db.prepare(
            "SELECT sess, expires FROM portal_sessions WHERE sid = ?"
        );
        this.saveSession = db.prepare(
            `INSERT INTO portal_sessions (sid, sess, expires)
             VALUES (?, ?, ?)
             ON CONFLICT(sid) DO UPDATE SET
                sess = excluded.sess,
                expires = excluded.expires`
        );
        this.deleteSession = db.prepare(
            "DELETE FROM portal_sessions WHERE sid = ?"
        );
        this.deleteExpired = db.prepare(
            "DELETE FROM portal_sessions WHERE expires <= ?"
        );

        this.cleanupTimer = setInterval(() => {
            try {
                this.deleteExpired.run(Date.now());
            } catch (error) {
                console.error("Could not clean expired sessions:", error);
            }
        }, 15 * 60 * 1000);
        this.cleanupTimer.unref();
    }

    get(sid, callback) {
        try {
            const row = this.getSession.get(sid);
            if (!row || row.expires <= Date.now()) {
                if (row) {
                    this.deleteSession.run(sid);
                }
                return callback(null, null);
            }
            callback(null, JSON.parse(row.sess));
        } catch (error) {
            callback(error);
        }
    }

    set(sid, sessionData, callback = () => {}) {
        try {
            const cookieExpiry = sessionData.cookie?.expires
                ? new Date(sessionData.cookie.expires).getTime()
                : Date.now() + (sessionData.cookie?.maxAge || 8 * 60 * 60 * 1000);
            this.saveSession.run(sid, JSON.stringify(sessionData), cookieExpiry);
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    touch(sid, sessionData, callback = () => {}) {
        try {
            const cookieExpiry = sessionData.cookie?.expires
                ? new Date(sessionData.cookie.expires).getTime()
                : Date.now() + (sessionData.cookie?.maxAge || 8 * 60 * 60 * 1000);
            this.saveSession.run(sid, JSON.stringify(sessionData), cookieExpiry);
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    destroy(sid, callback = () => {}) {
        try {
            this.deleteSession.run(sid);
            callback(null);
        } catch (error) {
            callback(error);
        }
    }
}

module.exports = SqliteSessionStore;
