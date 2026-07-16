# Mentorque Scheduler

Mentorque Scheduler is a full-stack mentoring coordination app with separate flows for `USER`, `MENTOR`, and `ADMIN`.

- `USER` can update requirements and availability
- `MENTOR` can update availability and view assigned bookings
- `ADMIN` can review requirements, compare overlap, rank mentors, and schedule meetings

## Tech Stack

### Frontend

- React 18
- Vite
- React Router DOM
- Plain CSS

### Backend

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcryptjs for password hashing

## Project Structure

```text
.
├─ backend/    # Express API + Prisma + seed scripts
├─ frontend/   # React + Vite app
└─ README.md
```

## Prerequisites

Make sure these are installed on your machine:

- Node.js 18+ recommended
- npm
- PostgreSQL database, or a valid hosted PostgreSQL connection string

## Environment Variables

This project currently uses local `.env` files inside both `backend/` and `frontend/`.

### Backend `.env`

Create `backend/.env` with:

```env
DATABASE_URL=your_postgresql_connection_string
DIRECT_URL=your_direct_postgresql_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@mentorque.com
ADMIN_PASSWORD=Password@123
ADMIN_NAME=Mentorque Admin
```

Notes:

- `DATABASE_URL` is used by Prisma
- `DIRECT_URL` is useful for Prisma operations on hosted databases
- `FRONTEND_URL` should match the Vite frontend URL

### Frontend `.env`

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000
```

## Installation

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

## Database Setup

From the `backend/` folder, run:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

What these commands do:

- `db:generate` generates the Prisma client
- `db:push` syncs the Prisma schema to the database
- `db:seed` inserts demo users, mentors, admin data, and sample records

## Run the Project

You need two terminals.

### Terminal 1: Start backend

```bash
cd backend
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

### Terminal 2: Start frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

## Production Commands

### Backend

```bash
cd backend
npm start
```

### Frontend build

```bash
cd frontend
npm run build
```

### Frontend preview

```bash
cd frontend
npm run preview
```

## Demo Credentials

### Admin

- Email: `admin@mentorque.com`
- Password: `Password@123`

### User and Mentor

Seeded user and mentor accounts are created by:

```text
backend/src/scripts/seedDemoData.js
```

All seeded accounts use:

- Password: `Password@123`

## Application Workflow

### User Workflow

1. Log in as a user
2. Open `Requirements` and add name, timezone, tags, and description
3. Open `Availability` and mark available weekly time slots
4. Open `Bookings` to see scheduled mentoring sessions

### Mentor Workflow

1. Log in as a mentor
2. Open `Availability` and mark free slots
3. Open `Bookings` to see meetings assigned by admin

### Admin Workflow

1. Log in as admin
2. Select a user
3. Review user requirements
4. Review ranked mentor recommendations
5. Compare user and mentor overlapping availability
6. Choose a slot and schedule a meeting
7. The meeting then appears in both user and mentor booking views

## Available Scripts

### Backend scripts

```bash
npm run dev
npm start
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:studio
npm run db:seed
```

### Frontend scripts

```bash
npm run dev
npm run build
npm run preview
```

## Troubleshooting

### Frontend cannot reach backend

Check:

- backend is running on `http://localhost:5000`
- frontend `.env` has `VITE_API_URL=http://localhost:5000`
- backend `.env` has `FRONTEND_URL=http://localhost:5173`

### Prisma or database errors

Run again from `backend/`:

```bash
npm run db:generate
npm run db:push
```

### Seed data missing

Run:

```bash
cd backend
npm run db:seed
```

## Notes

- This app uses role-based flows for `USER`, `MENTOR`, and `ADMIN`
- Meeting booking is admin-led
- Availability is managed through weekly slot selection
