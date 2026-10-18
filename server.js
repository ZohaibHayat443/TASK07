// server.js - Student REST API built with Express (from the Lab 07 Manual)
// Run with:  npm start      (then open http://localhost:3000)

const express = require("express");
const store = require("./studentStore");
const { getStatus } = require("./utils/grade");

const app = express();
const PORT = process.env.PORT || 3000;

const DEPARTMENTS = [
  "Computer Science", "Software Engineering", "Data Science"
];

/* ---------- Middleware ---------- */

// Reads a JSON request body and puts it in req.body
app.use(express.json());

// Logs every request: method, URL and how long it took
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} ` +
      `(${Date.now() - start} ms)`
    );
  });
  next();
});

/* ---------- Helpers ---------- */

// Express 4 does not catch errors from async functions by itself.
// This wrapper sends them to the error handler at the bottom.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const withStatus = (student) =>
  ({ ...student, status: getStatus(student.cgpa) });

const sameRoll = (a, b) => a.toUpperCase() === b.toUpperCase();

// Returns an array of error messages (empty array = valid).
// partial = true is used by PATCH: only the fields sent are checked.
function validateStudent(body, partial = false) {
  const errors = [];
  const rules = {
    name: (v) => typeof v === "string" && v.trim().length >= 3
      ? null : "name must be at least 3 characters",
    rollNumber: (v) => typeof v === "string" && /^BSCS-\d{3}$/.test(v)
      ? null : "rollNumber must look like BSCS-001",
    email: (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? null : "email must be a valid email address",
    department: (v) => DEPARTMENTS.includes(v)
      ? null : `department must be one of: ${DEPARTMENTS.join(", ")}`,
    semester: (v) => Number.isInteger(v) && v >= 1 && v <= 8
      ? null : "semester must be a whole number from 1 to 8",
    cgpa: (v) => typeof v === "number" && v >= 0 && v <= 4
      ? null : "cgpa must be a number from 0 to 4"
  };

  for (const [field, check] of Object.entries(rules)) {
    if (body[field] === undefined) {
      if (!partial) errors.push(`${field} is required`);
      continue;
    }
    const message = check(body[field]);
    if (message) errors.push(message);
  }
  return errors;
}

/* ---------- Routes ---------- */

app.get("/", (req, res) => {
  res.json({
    message: "Student API",
    endpoints: [
      "GET    /api/students",
      "GET    /api/students/stats",
      "GET    /api/students/:rollNumber",
      "POST   /api/students",
      "PUT    /api/students/:rollNumber",
      "PATCH  /api/students/:rollNumber",
      "DELETE /api/students/:rollNumber"
    ]
  });
});

// GET /api/students?search=sara&department=Data Science&sort=cgpa&order=desc
app.get("/api/students", asyncHandler(async (req, res) => {
  const { search, department, sort, order } = req.query;
  let students = await store.readAll();

  if (search) {
    const text = search.toLowerCase();
    students = students.filter((s) =>
      s.name.toLowerCase().includes(text) ||
      s.rollNumber.toLowerCase().includes(text));
  }
  if (department) {
    students = students.filter((s) => s.department === department);
  }
  if (sort === "cgpa") {
    students.sort((a, b) =>
      order === "asc" ? a.cgpa - b.cgpa : b.cgpa - a.cgpa);
  }
  res.json(students.map(withStatus));
}));

// IMPORTANT: this route must come BEFORE "/api/students/:rollNumber",
// otherwise Express would treat the word "stats" as a roll number.
app.get("/api/students/stats", asyncHandler(async (req, res) => {
  const students = await store.readAll();
  const total = students.length;
  const sum = students.reduce((result, s) => result + s.cgpa, 0);
  const top = students.reduce(
    (best, s) => (best === null || s.cgpa > best.cgpa ? s : best), null);

  res.json({
    totalStudents: total,
    averageCgpa: total ? Number((sum / total).toFixed(2)) : 0,
    highest: top ? { name: top.name, cgpa: top.cgpa } : null,
    academicWarnings: students.filter((s) => s.cgpa < 2.0).length
  });
}));

// GET one student
app.get("/api/students/:rollNumber", asyncHandler(async (req, res) => {
  const students = await store.readAll();
  const student = students.find((s) =>
    sameRoll(s.rollNumber, req.params.rollNumber));

  if (!student) {
    return res.status(404).json({
      error: `Student ${req.params.rollNumber} not found`
    });
  }
  res.json(withStatus(student));
}));

// POST: create a student
app.post("/api/students", asyncHandler(async (req, res) => {
  const errors = validateStudent(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const students = await store.readAll();
  if (students.some((s) => sameRoll(s.rollNumber, req.body.rollNumber))) {
    return res.status(409).json({
      error: `Roll number ${req.body.rollNumber} already exists`
    });
  }

  const { name, rollNumber, email, department, semester, cgpa } = req.body;
  const student = {
    name: name.trim(), rollNumber, email, department, semester, cgpa
  };
  students.push(student);
  await store.writeAll(students);

  res.status(201)
    .location(`/api/students/${student.rollNumber}`)
    .json(withStatus(student));
}));

// PUT: replace a student completely (all fields required)
app.put("/api/students/:rollNumber", asyncHandler(async (req, res) => {
  const students = await store.readAll();
  const index = students.findIndex((s) =>
    sameRoll(s.rollNumber, req.params.rollNumber));

  if (index === -1) {
    return res.status(404).json({
      error: `Student ${req.params.rollNumber} not found`
    });
  }

  // The roll number is the ID, so it always comes from the URL
  const body = { ...req.body, rollNumber: students[index].rollNumber };
  const errors = validateStudent(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const { name, rollNumber, email, department, semester, cgpa } = body;
  students[index] = {
    name: name.trim(), rollNumber, email, department, semester, cgpa
  };
  await store.writeAll(students);

  res.json(withStatus(students[index]));
}));

// PATCH: change only some fields (for example only the CGPA)
app.patch("/api/students/:rollNumber", asyncHandler(async (req, res) => {
  const students = await store.readAll();
  const index = students.findIndex((s) =>
    sameRoll(s.rollNumber, req.params.rollNumber));

  if (index === -1) {
    return res.status(404).json({
      error: `Student ${req.params.rollNumber} not found`
    });
  }

  // The roll number cannot be changed
  const { rollNumber, ...changes } = req.body;
  const errors = validateStudent(changes, true);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  students[index] = { ...students[index], ...changes };
  await store.writeAll(students);

  res.json(withStatus(students[index]));
}));

// DELETE: remove a student
app.delete("/api/students/:rollNumber", asyncHandler(async (req, res) => {
  const students = await store.readAll();
  const index = students.findIndex((s) =>
    sameRoll(s.rollNumber, req.params.rollNumber));

  if (index === -1) {
    return res.status(404).json({
      error: `Student ${req.params.rollNumber} not found`
    });
  }

  students.splice(index, 1);
  await store.writeAll(students);

  res.sendStatus(204);   // 204 No Content: success, nothing to send back
}));

/* ---------- 404 and error handling ---------- */

// Runs when no route above matched
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error handler: Express recognises it by its FOUR parameters
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
