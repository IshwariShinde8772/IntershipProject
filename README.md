# KBTCOE Placement Tracker

Monorepo workspace with:

- `backend/` - Node.js, Express, Prisma, PostgreSQL API
- `frontend/` - React, Vite, Tailwind dashboard app

## Quick Start

1. Copy `backend/.env.example` to `backend/.env`
2. Copy `frontend/.env.example` to `frontend/.env`
3. Install dependencies in both apps with `npm install`
4. Run Prisma generate and migrate from `backend/`
5. Seed the super admin with `npm run prisma:seed`
6. Start backend: `npm run dev`
7. Start frontend: `npm run dev`
