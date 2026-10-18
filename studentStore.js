// studentStore.js - the "data layer": reads and writes students.json
// Routes never touch the file directly; they use these two functions.

const fs = require("fs/promises");
const path = require("path");

const FILE = path.join(__dirname, "data", "students.json");

async function readAll() {
  try {
    const text = await fs.readFile(FILE, "utf-8");
    return JSON.parse(text);
  } catch (error) {
    // If the file does not exist yet, start with an empty list
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeAll(students) {
  await fs.writeFile(FILE, JSON.stringify(students, null, 2));
}

module.exports = { readAll, writeAll };
