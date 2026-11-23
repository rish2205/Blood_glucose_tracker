Sweety — Blood Glucose Tracker

Sweety helps a user record blood glucose readings and see daily and monthly summaries. I built it with React (Vite), Express, and PostgreSQL.

What it does

Sign up and log in with an email and password. Passwords are hashed with bcrypt.

Add, view, edit, and delete readings. Each user can see only their own data.

Record up to four readings per day: Morning (fasting), After breakfast, After lunch, and After dinner.

View daily, month-to-date, and previous-month reports showing the highest, lowest, average, and number of readings. The daily report also lists the individual readings.

Move through readings using pagination.

The app checks for missing values, values outside 40–600 mg/dl, future dates, and duplicate slots. Errors appear on the page.

Set up locally

You need Node.js/npm and PostgreSQL.

Install dependencies in the project root, then in server and client:

npm install
cd server
npm install
cd ../client
npm install

In pgAdmin, create a PostgreSQL login and a database named sweety_db owned by that login. You can use another name if you set it in the next step.

Copy server/.env.example to server/.env. Set PGUSER, PGPASSWORD, and PGDATABASE for your database, and set a random JWT_SECRET of at least 32 characters. Keep .env private; it is ignored by Git.

From the server folder, create the tables:

npm run db:init

Run it

From the project root, run npm run dev. This starts the API and the React client. Open the Local URL printed by Vite (usually http://localhost:5173). The API runs on http://localhost:3001; its health check is /api/health.

You can also run npm run dev separately inside server and client in two terminals. Press Ctrl+C to stop them. If you change the API address, set VITE_API_URL for the client and update the allowed origin in server/src/app.js.

Demo account and tests

After npm run db:init, run npm run seed from server to create local sample data. Sign in with demo@sweety.local and Demo@12345. Running the seed script again resets this demo account's readings.

For backend tests, create a separate PostgreSQL database named sweety_db_test, set PGDATABASE_TEST in server/.env if you used a different name, and run these commands from server:

npm run db:init-test
npm test

Tests use the test database, so the development readings are kept separate. To check the frontend, run npm run lint and npm run build from client.

How it fits together

client/src/AuthForm.jsx sends sign-up and login requests to the Express API. The server stores a password hash and returns a signed token. The client sends that token when requesting readings or reports. On the server, authentication identifies the user, and the database queries use that user ID to keep accounts separate. server/db/schema.sql defines the tables and their constraints.

The main API routes are /api/auth/register, /api/auth/login, /api/readings, and /api/reports. Readings support adding, listing, editing, and deleting. The reports route accepts a selected date using ?date=YYYY-MM-DD.

Notes

Month-to-date starts on the first of the selected month and ends on the selected date. “Previous month” means the full calendar month before it.

The server uses its local date to reject future readings.

Once all four daily slots are filled, the four-per-day error appears before the duplicate-slot error.

The token expires after seven days and is stored in browser localStorage. With more time, I would improve session storage, add login rate limiting, and prepare the app for deployment.