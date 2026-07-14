# Mentorque Scheduling Assignment

This workspace contains:

- `backend/`: Express + Prisma API with simple JWT auth, RBAC, availability, recommendations, and admin booking.
- `frontend/`: Fresh React + Vite frontend with separate login screens for user, mentor, and admin flows.

## Setup

### Backend

1. Copy `backend/.env.example` to `backend/.env`
2. Install dependencies
3. Run Prisma generate and schema push
4. Seed demo users
5. Start the server

Suggested commands:

```bash
cd backend
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env`
2. Install dependencies
3. Start the app

Suggested commands:

```bash
cd frontend
npm install
npm run dev
```

## Demo credentials

- Admin: `admin@mentorque.com` / `Password@123`
- Users and mentors: use any seeded email from `backend/src/scripts/seedDemoData.js` with password `Password@123`

## Product flow implemented

- `USER`: edits tags, description, timezone, and availability
- `MENTOR`: edits availability only
- `ADMIN`: manages mentor metadata, reviews user requirements, sees ranked recommendations, checks overlap, and books calls
