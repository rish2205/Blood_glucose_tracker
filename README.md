# Sweety – glucose tracker

Express + PostgreSQL API (`server/`) and a React (Vite) UI (`client/`).

## Setup

1. Install dependencies: `npm install` in the root, `server/` and `client/`.
2. Copy `server/.env.example` to `server/.env` and fill in your own values.
   Never commit `.env`; it is git-ignored.
3. Create the development database `sweety_db` (the name in `PGDATABASE`) in PostgreSQL, then:
   ```
   cd server
   npm run db:init     # creates the tables
   npm run seed        # optional demo data: demo@sweety.local / Demo@12345 (fake, local only)
   ```
4. From the project root: `npm run dev` starts the API (http://localhost:3001) and the UI (http://localhost:5173).

## Tests and the test database

Integration tests run against a **separate** database, `sweety_db_test` (`PGDATABASE_TEST` in `.env`).
They empty its tables before every test, so the test helper refuses to run unless the database name
ends in `_test` and differs from `PGDATABASE`. The development database is never touched.

Create the test database once. Your app user usually cannot create databases, so run this as a
PostgreSQL admin (for example in pgAdmin's query tool, connected as `postgres`):

```sql
CREATE DATABASE sweety_db_test OWNER sweety_user;
```

(Replace `sweety_user` with your `PGUSER`. If your user has the CREATEDB right, `npm run db:create-test` in `server/` does the same.)

Then:

```
cd server
npm run db:init-test   # optional: the tests also apply the schema themselves
npm test
```

## API (all `/api/readings` and `/api/reports` routes need `Authorization: Bearer <token>`)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` (password 8–72 chars) |
| POST | `/api/auth/login` | `{email, password}` returns `{token, user}` |
| GET / POST | `/api/readings` | `GET ?date=YYYY-MM-DD` optional filter; POST `{date, slot, value}` |
| PUT / DELETE | `/api/readings/:id` | only your own readings, else 404 |
| GET | `/api/reports?date=YYYY-MM-DD` | daily, month-to-date and previous-month stats; date defaults to today |

Slots: `morning`, `after_breakfast`, `after_lunch`, `after_dinner`.

## Decisions worth knowing

- "Future" is judged by the server's local date.
- When a day already has 4 readings, the "only 4 per day" message wins over the "slot already used" message
  (otherwise the 4-reading rule could never be shown, because 4 readings fill every slot).
- The previous-month report is the whole month before the selected date's month.
- The login token is kept in `localStorage` and expires after 7 days.
- No rate limiting on login yet.
