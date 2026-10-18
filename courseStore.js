// courseStore.js - data layer for courses (same idea as studentStore.js)

const fs = require("fs/promises");
const path = require("path");

const FILE = path.join(__dirname, "data", "courses.json");

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

async function writeAll(courses) {
  await fs.writeFile(FILE, JSON.stringify(courses, null, 2));
}

module.exports = { readAll, writeAll };
