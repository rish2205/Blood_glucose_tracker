# Sweety – Blood Glucose Tracker

Sweety lets a user record up to four blood glucose readings per day and view daily, month-to-date, and previous-month reports.

- Frontend: React and Vite (`client/`)
- Backend: Node.js and Express (`server/`)
- Database: PostgreSQL
- Authentication: bcrypt password hashes and JWTs

## Prerequisites

Install Node.js, npm, and PostgreSQL. Create a PostgreSQL login that can access the Sweety databases.

## Installation and database setup

From the project root, install dependencies:

```sh
npm install
cd server
npm install
cd ../client
npm install
```

Copy `server/.env.example` to `server/.env`. On Windows Command Prompt, from the project root:

```cmd
copy server\.env.example server\.env
```

Edit `server/.env` with your local PostgreSQL username and password and a random `JWT_SECRET` of at least 32 characters. Never commit `.env`.

In pgAdmin, create two databases owned by the configured PostgreSQL user:

- `sweety_db` for the app
- `sweety_db_test` for integration tests

If you use different names, update `PGDATABASE` and `PGDATABASE_TEST` in `server/.env`. Initialize the development database:

```sh
cd server
npm run db:init
```

## Run the app

From the project root, start the API and UI together:

```sh
npm run dev
```

Alternatively, use two terminals. In the first:

```sh
cd server
npm run dev
```

In the second:

```sh
cd client
npm run dev
```

Open the **Local** URL printed by Vite, usually `http://localhost:5173/`. If that port is in use, Vite may choose another port. The API health check is at `http://localhost:3001/api/health`; the API does not serve a webpage at `http://localhost:3001/`.

## Demo data

After initializing `sweety_db`, run this from `server/`:

```sh
npm run seed
```

The script creates the local demo user `demo@sweety.local` with password `Demo@12345` and sample readings. Running the seed again replaces **that demo user’s readings**. These are fake credentials for local demonstration only.

## Tests and checks

Tests use `sweety_db_test`. Create that database in pgAdmin with your configured PostgreSQL user as owner. Then, from `server/`, run:

```sh
npm run db:init-test
npm test
```

The integration tests reset tables in the **test database**. They refuse to run against a database whose name does not end in `_test`. If your PostgreSQL user has permission to create databases, `npm run db:create-test` can create the test database.

From `client/`, run:

```sh
npm run lint
npm run build
```

## Features

Users can register, log in, and add, view, edit, or delete **only their own** readings. Each date supports one reading in each of four slots: Morning (fasting), After breakfast, After lunch, and After dinner.

A glucose value is required and must be a whole number from 40 to 600 mg/dl. A date cannot be in the future. The UI displays validation messages and friendly empty states.

Reports show the highest, lowest, average rounded to one decimal place, and number of readings. The daily report also lists the readings and their slots:

- **Daily:** selected date
- **Month-to-date:** first day of the selected month through the selected date
- **Previous month:** the entire calendar month before the selected date’s month

The optional pagination feature displays five readings per page in the UI.

## API

Reading and report routes require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register with name, email, and password |
| POST | `/api/auth/login` | Log in and receive a token |
| GET | `/api/auth/me` | Check the current session |
| GET, POST | `/api/readings` | List or add readings |
| PUT, DELETE | `/api/readings/:id` | Edit or delete an owned reading |
| GET | `/api/reports?date=YYYY-MM-DD` | Get the three reports |

`GET /api/readings?page=1&limit=20` supports pagination. `GET /api/readings?date=YYYY-MM-DD` optionally filters readings by date.

## Project flow

The React client sends requests through `client/src/api.js` to the Express API. During registration, the server hashes the password with bcrypt. During login, it checks the password and issues a JWT. Later requests send that token to the authentication middleware, which identifies the user.

`server/src/readings.js` validates reading changes and queries PostgreSQL using the authenticated user’s ID. `server/src/reports.js` calculates the report date ranges and aggregates that user’s readings. The table definitions and database constraints are in `server/db/schema.sql`.

## Notes

- The server’s local calendar date determines whether a selected date is in the future.
- When all four slots are occupied, the four-readings-per-day message takes precedence over the duplicate-slot message.
- JWTs expire after seven days and are stored in the browser’s `localStorage`.
- With more time, I would add login rate limiting, consider secure cookie sessions, and improve deployment configuration.

## Submission demo

Screenshots or a 2–3 minute screen recording accompany the submission email. The demo shows login, adding or editing a reading, a validation message, reports, and pagination.