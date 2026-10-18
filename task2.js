// task2.js - Student report generator (Task 2)
// Run with:  node task2.js
//            node task2.js --dept "Data Science"

const fs = require("fs/promises");
const path = require("path");
const { getStatus } = require("./utils/gradeUtils");

const DATA_FILE = path.join(__dirname, "data", "students.json");
const REPORTS_DIR = path.join(__dirname, "reports");
const REPORT_FILE = path.join(REPORTS_DIR, "report.txt");
const CSV_FILE = path.join(REPORTS_DIR, "students.csv");
const LOG_FILE = path.join(REPORTS_DIR, "activity.log");

// ---------- helpers ----------

// Reads "--dept <name>" from the command line (null if not given)
function getDepartmentOption() {
  const index = process.argv.indexOf("--dept");
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error('--dept needs a department name, e.g. --dept "Data Science".');
  }
  return value;
}

// Appends ONE line to activity.log (the log only grows, never replaced)
async function writeLog(message) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.appendFile(LOG_FILE, `${new Date().toISOString()} | ${message}\n`);
}

// "2026-10-17 19:50" (local time)
function formatNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// Wraps a CSV field in quotes if it contains a comma or a quote
const csvField = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// ---------- report builders ----------

function buildReport(students) {
  const width = (key) => Math.max(...students.map((s) => String(s[key]).length));
  const wName = width("name");
  const wRoll = width("rollNumber");
  const wDept = width("department");
  const line = "=".repeat(wName + wRoll + wDept + 37);

  const total = students.length;
  const sum = students.reduce((result, s) => result + s.cgpa, 0);
  const top = students.reduce((best, s) => (s.cgpa > best.cgpa ? s : best));
  const warnings = students.filter((s) => getStatus(s.cgpa) === "Academic Warning").length;

  const rows = students.map(
    (s) =>
      `${s.name.padEnd(wName)} | ${s.rollNumber.padEnd(wRoll)} | ` +
      `${s.department.padEnd(wDept)} | ${s.cgpa.toFixed(2)} | ${getStatus(s.cgpa)}`
  );

  return [
    "STUDENT REPORT",
    `Generated: ${formatNow()}`,
    line,
    ...rows,
    line,
    `Total Students:   ${total}`,
    `Average CGPA:     ${(sum / total).toFixed(2)}`,
    `Highest CGPA:     ${top.cgpa.toFixed(2)} (${top.name})`,
    `Academic Warning: ${warnings}`,
    ""
  ].join("\n");
}

function buildCsv(students) {
  const header = "name,rollNumber,department,semester,cgpa";
  const rows = students.map((s) =>
    [s.name, s.rollNumber, s.department, s.semester, s.cgpa].map(csvField).join(",")
  );
  return [header, ...rows].join("\n") + "\n";
}

// ---------- main ----------

async function main() {
  const department = getDepartmentOption();

  // 1. Read and parse the data file
  let all;
  try {
    const text = await fs.readFile(DATA_FILE, "utf-8");
    all = JSON.parse(text);
    if (!Array.isArray(all)) throw new SyntaxError("not a list");
  } catch (error) {
    const message =
      error.code === "ENOENT" ? "students.json not found." : "students.json contains invalid JSON.";
    console.log(`Error: ${message}`);
    await writeLog(`ERROR: ${message.replace(/\.$/, "")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Read ${all.length} students.`);

  // 2. Optional department filter
  const students = department ? all.filter((s) => s.department === department) : all;
  const suffix = department ? ` (${department})` : "";

  if (students.length === 0) {
    console.log(`No students found${suffix}. Nothing to report.`);
    await writeLog(`processed 0 students${suffix}`);
    return;
  }
  if (department) console.log(`Filtered to ${students.length} students${suffix}.`);

  // 3. Create the reports folder (no error if it already exists)
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  // 4. Write the text report and the CSV file
  await fs.writeFile(REPORT_FILE, buildReport(students));
  console.log("Created reports/report.txt");
  await fs.writeFile(CSV_FILE, buildCsv(students));
  console.log("Created reports/students.csv");

  // 5. Append one line to the activity log
  await writeLog(`processed ${students.length} students${suffix}`);
  console.log("Logged run in reports/activity.log");
}

main().catch(async (error) => {
  console.log(`Error: ${error.message}`);
  try {
    await writeLog(`ERROR: ${error.message}`);
  } catch (logError) {
    // nothing else we can do
  }
  process.exitCode = 1;
});
