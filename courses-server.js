// courses-server.js - Course REST API built with Express (Task 3)
// Run with:  npm run start:courses      (then open http://localhost:3000)

const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const store = require("./courseStore");

const app = express();
const PORT = process.env.PORT || 3000;

const DEPARTMENTS = ["Computer Science", "Software Engineering", "Data Science"];
const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "requests.log");

/* ---------- Middleware ---------- */

// Logging middleware: appends one line per request to logs/requests.log.
// It comes FIRST so that every request is logged, even one with broken JSON.
app.use((req, res, next) => {
  res.on("finish", async () => {
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode}\n`;
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
      await fs.appendFile(LOG_FILE, line);
    } catch (error) {
      console.error("Could not write log:", error.message);
    }
  });
  next();
});

// Reads a JSON request body and puts it in req.body
app.use(express.json());

/* ---------- Helpers ---------- */

// Express 4 does not catch errors from async functions by itself
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const sameCode = (a, b) => a.toUpperCase() === b.toUpperCase();

const isText = (v) => typeof v === "string" && v.trim().length >= 3;

// Returns an array with ALL error messages (empty array = valid).
// partial = true is used by PATCH: only the fields that were sent are checked.
function validateCourse(body, partial = false) {
  const errors = [];
  const rules = {
    code: (v) =>
      typeof v === "string" && /^CS-\d{3}L?$/.test(v)
        ? null : "code must look like CS-301 or CS-301L",
    title: (v) =>
      isText(v) ? null : "title must be at least 3 characters",
    creditHours: (v) =>
      Number.isInteger(v) && v >= 1 && v <= 4
        ? null : "creditHours must be a whole number from 1 to 4",
    instructor: (v) =>
      isText(v) ? null : "instructor must be at least 3 characters",
    department: (v) =>
      DEPARTMENTS.includes(v)
        ? null : `department must be one of: ${DEPARTMENTS.join(", ")}`
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

// Keeps only the five known fields (ignores anything extra)
const cleanCourse = (c) => ({
  code: c.code,
  title: c.title.trim(),
  creditHours: c.creditHours,
  instructor: c.instructor.trim(),
  department: c.department
});

const notFound = (res, code) =>
  res.status(404).json({ error: `Course ${code} not found` });

/* ---------- Routes ---------- */

app.get("/", (req, res) => {
  res.json({
    message: "Course API",
    endpoints: [
      "GET    /api/courses",
      "GET    /api/courses/stats",
      "GET    /api/courses/:code",
      "POST   /api/courses",
      "PUT    /api/courses/:code",
      "PATCH  /api/courses/:code",
      "DELETE /api/courses/:code"
    ]
  });
});

// GET /api/courses?department=Data Science&search=data&sort=creditHours&order=desc
// All options work together.
app.get("/api/courses", asyncHandler(async (req, res) => {
  const { department, search, sort, order } = req.query;
  let courses = await store.readAll();

  if (department) {
    courses = courses.filter((c) => c.department === department);
  }
  if (search) {
    const text = String(search).toLowerCase();
    courses = courses.filter((c) =>
      c.title.toLowerCase().includes(text) ||
      c.code.toLowerCase().includes(text));
  }
  if (sort === "creditHours") {
    courses.sort((a, b) =>
      order === "asc" ? a.creditHours - b.creditHours : b.creditHours - a.creditHours);
  }
  res.json(courses);
}));

// IMPORTANT: this route must come BEFORE "/api/courses/:code"
app.get("/api/courses/stats", asyncHandler(async (req, res) => {
  const courses = await store.readAll();
  const totalCourses = courses.length;
  const totalCreditHours = courses.reduce((sum, c) => sum + c.creditHours, 0);
  const most = courses.reduce(
    (best, c) => (best === null || c.creditHours > best.creditHours ? c : best), null);

  res.json({
    totalCourses,
    totalCreditHours,
    averageCreditHours: totalCourses
      ? Number((totalCreditHours / totalCourses).toFixed(2)) : 0,
    mostCredits: most ? { code: most.code, title: most.title } : null
  });
}));

// GET one course
app.get("/api/courses/:code", asyncHandler(async (req, res) => {
  const courses = await store.readAll();
  const course = courses.find((c) => sameCode(c.code, req.params.code));
  if (!course) return notFound(res, req.params.code);
  res.json(course);
}));

// POST: create a course
app.post("/api/courses", asyncHandler(async (req, res) => {
  const errors = validateCourse(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const courses = await store.readAll();
  if (courses.some((c) => sameCode(c.code, req.body.code))) {
    return res.status(409).json({ error: `Course ${req.body.code} already exists` });
  }

  const course = cleanCourse(req.body);
  courses.push(course);
  await store.writeAll(courses);

  res.status(201).location(`/api/courses/${course.code}`).json(course);
}));

// PUT: replace a course completely (all fields required)
app.put("/api/courses/:code", asyncHandler(async (req, res) => {
  const courses = await store.readAll();
  const index = courses.findIndex((c) => sameCode(c.code, req.params.code));
  if (index === -1) return notFound(res, req.params.code);

  // The code is the ID, so it always comes from the URL
  const body = { ...(req.body || {}), code: courses[index].code };
  const errors = validateCourse(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  courses[index] = cleanCourse(body);
  await store.writeAll(courses);
  res.json(courses[index]);
}));

// PATCH: change only some fields
app.patch("/api/courses/:code", asyncHandler(async (req, res) => {
  const courses = await store.readAll();
  const index = courses.findIndex((c) => sameCode(c.code, req.params.code));
  if (index === -1) return notFound(res, req.params.code);

  // The code cannot be changed
  const { code, ...changes } = req.body || {};
  if (Object.keys(changes).length === 0) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["send at least one field to update"]
    });
  }
  const errors = validateCourse(changes, true);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  courses[index] = cleanCourse({ ...courses[index], ...changes });
  await store.writeAll(courses);
  res.json(courses[index]);
}));

// DELETE: remove a course
app.delete("/api/courses/:code", asyncHandler(async (req, res) => {
  const courses = await store.readAll();
  const index = courses.findIndex((c) => sameCode(c.code, req.params.code));
  if (index === -1) return notFound(res, req.params.code);

  courses.splice(index, 1);
  await store.writeAll(courses);
  res.sendStatus(204);
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
  console.log(`Course API running at http://localhost:${PORT}`);
});
