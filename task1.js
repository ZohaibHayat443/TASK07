// task1.js - Command-line tool (Task 1)
// Run with:  node task1.js <command> <value>
// The logic lives in the utils modules; this file only reads the command
// and prints the result.

const os = require("os");
const { capitalizeWords, slugify, countWords } = require("./utils/stringUtils");
const { getStatus, letterGrade, calculateGPA } = require("./utils/gradeUtils");

const COMMANDS = ["slug", "capitalize", "words", "status", "grade", "gpa", "info"];

function fail(message) {
  if (message) console.error(`Error: ${message}`);
  console.error("Usage: node task1.js <command> <value>");
  console.error(`Commands: ${COMMANDS.join(", ")}`);
  process.exit(1);
}

// Turns "4.0:3" into { points: 4, credits: 3 } or returns null if invalid
function parsePair(text) {
  const parts = text.split(":");
  if (parts.length !== 2 || parts[0].trim() === "" || parts[1].trim() === "") {
    return null;
  }
  const points = Number(parts[0]);
  const credits = Number(parts[1]);
  const valid =
    Number.isFinite(points) && points >= 0 && points <= 4 &&
    Number.isInteger(credits) && credits > 0;
  return valid ? { points, credits } : null;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command) fail("no command given.");
  if (!COMMANDS.includes(command)) fail(`unknown command "${command}".`);

  const text = rest.join(" ");

  try {
    switch (command) {
      case "slug":
      case "capitalize":
      case "words": {
        if (text.trim() === "") fail(`"${command}" needs some text.`);
        if (command === "slug") console.log(slugify(text));
        if (command === "capitalize") console.log(capitalizeWords(text));
        if (command === "words") console.log(`Word count: ${countWords(text)}`);
        break;
      }

      case "status": {
        const cgpa = Number(text);
        if (text.trim() === "" || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 4) {
          fail("CGPA must be a number between 0 and 4.");
        }
        console.log(`CGPA ${cgpa} -> ${getStatus(cgpa)}`);
        break;
      }

      case "grade": {
        const marks = Number(text);
        if (text.trim() === "" || Number.isNaN(marks) || marks < 0 || marks > 100) {
          fail("marks must be a number between 0 and 100.");
        }
        console.log(`Marks ${marks} -> Grade ${letterGrade(marks)}`);
        break;
      }

      case "gpa": {
        if (rest.length === 0) fail('give pairs like 4.0:3 3.5:3 2.7:4.');
        const courses = rest.map(parsePair);
        if (courses.includes(null)) {
          fail("each course must be points:credits (points 0-4, credits a whole number > 0).");
        }
        const credits = courses.reduce((sum, c) => sum + c.credits, 0);
        console.log(`Credit hours: ${credits}`);
        console.log(`GPA: ${calculateGPA(courses).toFixed(2)}`);
        break;
      }

      case "info": {
        const freeMb = Math.round(os.freemem() / 1024 / 1024);
        console.log(
          `Platform: ${os.platform()} | CPU cores: ${os.cpus().length} | Free memory: ${freeMb} MB`
        );
        break;
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error.message);
    process.exit(1);
  }
}

main();
