import express from "express";
import sqlite3pkg from "sqlite3";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const sqlite3 = sqlite3pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATABASES_DIR = path.join(__dirname, "databases");
const QUESTIONS_FILE = path.join(__dirname, "questions.json");

const databaseNames = {
  "db1.sqlite": "Beginner  Users & Orders",
  "db2.sqlite": "Beginner Products & Categories",
  "db3.sqlite": "Medium Employees & Projects",
  "db4.sqlite": "Medium  Movies & Actors",
  "db5.sqlite": "Hard Sales & Customers"
};

// Get list of databases with friendly names
app.get("/api/databases", (req, res) => {
  try {
    const dbFiles = fs.readdirSync(DATABASES_DIR).filter(file => file.endsWith(".sqlite"));
    const dbList = dbFiles.map(file => ({
      file,
      name: databaseNames[file] || file
    }));
    res.json(dbList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get questions for a specific database
app.get("/api/questions/:dbFile", (req, res) => {
  try {
    const { dbFile } = req.params;
    const questionsData = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf-8"));
    const dbQuestions = questionsData[dbFile] || [];
    res.json(dbQuestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tables & sample data for a given DB
app.get("/api/db-tables/:dbFile", (req, res) => {
  const { dbFile } = req.params;
  const dbPath = path.join(DATABASES_DIR, dbFile);

  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "Database not found" });
  }

  const db = new sqlite3.Database(dbPath);
  db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`, [], (err, tables) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const result = {};
    let remaining = tables.length;

    if (remaining === 0) {
      db.close();
      return res.json(result);
    }

    tables.forEach(({ name }) => {
      db.all(`SELECT * FROM ${name} LIMIT 5`, [], (err2, rows) => {
        result[name] = err2 ? [] : rows;
        remaining--;
        if (remaining === 0) {
          db.close();
          res.json(result);
        }
      });
    });
  });
});

// Check user's SQL answer
app.post("/api/check", (req, res) => {
  const { dbName, questionId, userQuery } = req.body;

  try {
    const questionsData = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf-8"));
    const question = (questionsData[dbName] || []).find(q => q.id === questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const dbPath = path.join(DATABASES_DIR, dbName);
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: "Database not found" });
    }

    const db = new sqlite3.Database(dbPath);

    db.all(question.solution, [], (err, expectedRows) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: `Error in solution SQL: ${err.message}` });
      }

      db.all(userQuery, [], (err2, receivedRows) => {
        db.close();

        if (err2) {
          return res.status(200).json({
            correct: false,
            error: err2.message,
            expected: expectedRows,
            received: []
          });
        }

        const isCorrect = JSON.stringify(expectedRows) === JSON.stringify(receivedRows);

        res.json({
          correct: isCorrect,
          expected: expectedRows,
          received: receivedRows
        });
      });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
