const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databasePath = path.join(__dirname, "..", "database", "database.db");
const schemaPath = path.join(__dirname, "..", "database", "schema.sql");

const schema = fs.readFileSync(schemaPath, "utf8");

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");
db.exec(schema);

db.close();

console.log("Database initialized successfully.");
