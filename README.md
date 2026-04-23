# FlowBoard Pro - Full Stack Task Management SaaS

A production-style MERN task management platform with JWT auth, role-based access control, board workflows, drag-and-drop task handling, dashboard metrics, and activity tracking.

## Features

- Secure authentication with JWT access tokens and bcrypt password hashing
- Role-based authorization (`admin`, `user`) with admin-only endpoints
- Board, list, and task management with protected APIs
- Task workflow fields: `status` (`todo`, `in_progress`, `completed`) and `priority` (`low`, `medium`, `high`)
- Due dates, assignees, and status/priority filtering in board view
- Dashboard KPI cards (total, completed, pending, in-progress)
- Activity log timeline per board
- Modern responsive UI using React + Tailwind CSS
- Loading states, skeleton loaders, and toast notifications
- Standard API response envelope: `{ success, message, data }`
- Centralized backend error handling middleware

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Axios, DnD Kit, React Hot Toast
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Socket.io
- **Database:** MongoDB Atlas
- **Deployment:** Frontend on Vercel, Backend on Render or Vercel

## Project Structure

```bash
client/
  src/
    api/
    components/
    context/
    pages/
server/
  src/
    config/
    middleware/
    models/
    routes/
    utils/
```

## Installation

### 1) Clone and install dependencies

```bash
git clone https://github.com/ihamidch/Full-stack-task-management.git
cd Full-stack-task-management
cd server && npm install
cd ../client && npm install
```

### 2) Setup environment variables

Server:

```bash
cd server
cp .env.example .env
```

Client:

```bash
cd client
cp .env.example .env
```

### 3) Run locally

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` or `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `PORT` | No | API port (default `5000`) |
| `JWT_EXPIRES_IN` | No | JWT expiration (default `7d`) |
| `CLIENT_URL` | Yes | Allowed frontend origin(s) for CORS |
| `ADMIN_EMAILS` | No | Comma-separated emails granted admin role |

### Frontend (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes (prod) | Backend base URL without `/api` suffix |
| `VITE_SOCKET_URL` | No | Socket server URL |
| `VITE_ENABLE_REALTIME` | No | `false` for serverless backend |

## API Highlights

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`
- `GET /api/dashboard/stats`
- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:boardId/activity`
- `POST /api/lists/:listId/tasks`
- `PATCH /api/tasks/:taskId`
- `GET /api/admin/users` (admin only)
- `GET /api/admin/tasks` (admin only)

## Deployment

### Frontend (Vercel)

1. Import repository
2. Set root directory to `client`
3. Add `VITE_API_URL` and optional realtime vars
4. Deploy

### Backend (Render or Vercel)

- **Render:** Deploy `server` as Node web service, set env vars from `.env.example`
- **Vercel:** Deploy `server` with `api/[...all].js` serverless handler

## Screenshots

- `TODO: Add login page screenshot`
- `TODO: Add dashboard screenshot`
- `TODO: Add board/task management screenshot`

## Live Demo

- Frontend: https://client-eight-puce-44.vercel.app
- Backend: https://server-xi-khaki-22.vercel.app

## Author

**ihamidch**  
GitHub: https://github.com/ihamidch
