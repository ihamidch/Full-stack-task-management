# FlowBoard — SaaS Task Management (MERN)

Full-stack task management with boards, Trello-style lists, drag-and-drop tasks, JWT auth, MongoDB, real-time updates (Socket.io), and activity logs.

## Features

- **Auth**: Register, login, JWT-protected API routes
- **Boards**: Multiple boards per user; invite members by email
- **Lists**: Default columns *To Do*, *In Progress*, *Done*; add tasks per list
- **Tasks**: Create, edit, delete; assign to board members; due dates
- **Drag and drop**: Move tasks within and between lists ([@dnd-kit](https://dndkit.com/))
- **Real-time**: Socket.io broadcasts board changes to clients viewing the same board
- **Activity**: Per-board audit trail of key actions

## Repository layout

```
├── client/          # React (Vite) + Tailwind CSS
├── server/          # Express + Mongoose + Socket.io
├── render.yaml      # Optional Render Blueprint
└── README.md
```

## Prerequisites

- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and connection string

## Local development

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET, CLIENT_URL=http://localhost:5173
npm install
npm run dev
```

API: `http://localhost:5000` — health check: `GET /api/health`

### 2. Client

```bash
cd client
# Optional: cp .env.example .env — set VITE_SOCKET_URL=http://localhost:5000 for Socket.io in dev
npm install
npm run dev
```

App: `http://localhost:5173` — Vite proxies `/api` to the server.

## Environment variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `5000`) |
| `MONGODB_URI` | MongoDB Atlas SRV connection string |
| `JWT_SECRET` | Long random string for signing JWTs |
| `JWT_EXPIRES_IN` | Optional (default `7d`) |
| `CLIENT_URL` | Frontend origin for CORS and Socket.io (e.g. `https://your-app.vercel.app`) |

### Client (Vercel / `.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Public API base URL, **no** `/api` suffix (e.g. `https://your-api.onrender.com`) |
| `VITE_SOCKET_URL` | Same host as the API for Socket.io if it differs from the page origin |

If `VITE_API_URL` is unset, the app uses relative `/api` (works with Vite proxy locally).

## Deploy

### Backend — [Vercel](https://vercel.com)

1. Import the repo; set **Root Directory** to `server`.
2. Deploy as Node serverless functions.
3. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `NODE_ENV=production`.
4. Redeploy after env updates.

### Frontend — [Vercel](https://vercel.com)

1. Import the repo; set **Root Directory** to `client`.
2. Framework preset: **Vite**.
3. Add:
   - `VITE_API_URL` = your backend Vercel URL (no trailing slash)
   - `VITE_SOCKET_URL` = your backend Vercel URL (no trailing slash)
   - `VITE_ENABLE_REALTIME=false` (serverless mode)

`client/vercel.json` includes SPA rewrites for client-side routing.

## API overview

- `POST /api/users/register` — `{ name, email, password }`
- `POST /api/users/login` — `{ email, password }`
- `GET /api/users/me` — Bearer token
- `GET/POST /api/boards` — list / create board (default lists created)
- `GET/PATCH/DELETE /api/boards/:boardId`
- `GET /api/boards/:boardId/activity`
- `POST /api/boards/:boardId/lists` — `{ title }`
- `PATCH/DELETE /api/lists/:listId`
- `POST /api/lists/:listId/tasks` — `{ title, description?, assignee?, dueDate? }`
- `PATCH/DELETE /api/tasks/:taskId` — move: `{ listId, position }`

Socket.io realtime requires a persistent Node host. In this Vercel serverless deployment, realtime is disabled with `VITE_ENABLE_REALTIME=false`.

## Live demo

Live links:

- **App (Vercel):** `https://client-eight-puce-44.vercel.app`
- **API (Vercel):** `https://server-xi-khaki-22.vercel.app`

## License

MIT
