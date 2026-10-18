# Lab 07 - Node.js, REST APIs and Postman (CS-301L)

Student: Zohaib Hayat (242737)

## Setup

```
cd lab07
npm install
```

## Task 1 - Command-line tool

```
node task1.js slug "  Full Stack   Web Development "
node task1.js capitalize "artificial intelligence lab"
node task1.js words "Node.js runs JavaScript on the server"
node task1.js status 2.45
node task1.js grade 78
node task1.js gpa 4.0:3 3.5:3 2.7:4
node task1.js info
```

Wrong input prints an error and a usage message, then exits with code 1.

## Task 2 - Student report generator

```
node task2.js
node task2.js --dept "Data Science"
```

Creates `reports/report.txt` and `reports/students.csv` and appends one line to
`reports/activity.log` on every run (errors are logged too).

## Servers

Both servers use port 3000 by default, so run **one at a time**
(or set another port, e.g. `PORT=4000 npm run start:courses`).

| Command | File | What it is |
|---|---|---|
| `npm start` | `server.js` | Student API (from the manual) |
| `npm run start:http` | `server-http.js` | Student API with the built-in `http` module |
| `npm run start:courses` | `courses-server.js` | **Task 3** - Course API |

Course API endpoints:

```
GET    /api/courses?department=&search=&sort=creditHours&order=asc|desc
GET    /api/courses/stats
GET    /api/courses/:code
POST   /api/courses
PUT    /api/courses/:code
PATCH  /api/courses/:code
DELETE /api/courses/:code
```

Every request is logged to `logs/requests.log`.

## Task 4 - Postman

1. Start the Course API: `npm run start:courses`
2. In Postman choose Import and select `postman/Lab07_Courses_API.postman_collection.json`
3. Right-click the collection, choose Run collection, press Run (run it twice).

Keep `data/courses.json` at the original six courses before the first run.
The runner screenshot is in `screenshots/`.
