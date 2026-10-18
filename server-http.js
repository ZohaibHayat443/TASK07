// server-http.js - A tiny API using ONLY Node's built-in http module
// Run with:  node server-http.js      (then open http://localhost:3000)

const http = require("http");
const store = require("./studentStore");
const { getStatus } = require("./utils/grade");

const PORT = 3000;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer(async (req, res) => {
  // "/api/students/BSCS-001" -> ["api", "students", "BSCS-001"]
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && parts.length === 0) {
      return sendJson(res, 200, { message: "Student API (http module)" });
    }

    if (parts[0] === "api" && parts[1] === "students") {
      const students = await store.readAll();

      // GET /api/students
      if (req.method === "GET" && parts.length === 2) {
        return sendJson(res, 200, students);
      }

      // GET /api/students/:rollNumber
      if (req.method === "GET" && parts.length === 3) {
        const roll = parts[2].toUpperCase();
        const student = students.find((s) => s.rollNumber === roll);

        if (!student) {
          return sendJson(res, 404, { error: `Student ${roll} not found` });
        }
        return sendJson(res, 200,
          { ...student, status: getStatus(student.cgpa) });
      }
    }

    sendJson(res, 404, { error: "Route not found" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`http server running at http://localhost:${PORT}`);
});
