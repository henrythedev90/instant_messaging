# Instant Messaging

Real-time chat app: Next.js API/UI on port **3000**, Socket.IO presence and messaging on port **3001**.

## Stack

- Next.js 15 (Pages API + App Router)
- Socket.IO
- MongoDB
- JWT auth

## Setup

```bash
cd nextjs-api
npm install
```

Create `nextjs-api/.env.local` (this overrides `.env`):

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
MONGODB_DB=Cluster0
JWT_SECRET=<your-secret>
PORT=3000
SOCKET_PORT=3001
```

Use a live Atlas connection string. `mongodb+srv` hosts that no longer resolve will make every API route return 500.

Optional: `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001` if the client should not use the default.

## Run

Both processes must be running or the UI will show socket connection errors and contacts will never appear online.

```bash
cd nextjs-api

# terminal 1 — Next.js
npm run dev

# terminal 2 — Socket.IO
npm run dev:socket
```

Or start both:

```bash
npm run dev:all
```

- App: http://localhost:3000 (redirects to `/login`)
- Socket: http://localhost:3001

## App flow

1. Sign up at `/signup` or log in at `/login`
2. Chat room at `/chat-room` — contacts, add contact, online status, logout
3. After login, the client connects to Socket.IO with the JWT and broadcasts online/offline status to contacts

## API (high level)

| Area | Routes |
| --- | --- |
| Auth | `POST /api/signup`, `POST /api/login`, `GET /api/auth`, `POST /api/auth/logout`, `POST /api/auth/refresh-token` |
| Contacts | `/api/contacts/get-all-contact`, `add-contact`, `remove-contact`, `update-name` |
| Private messages | `/api/messages/send`, `conversation`, `inbox` |
| Groups | `/api/messages/group/*` |

Queries use `getDb()` and `MONGODB_DB`. Collections: `imUsers`, `contacts`, `messages`, `groupChats`, `groupChatsMessages`.

## Project layout

```
nextjs-api/
  src/app/                 # login, signup, chat-room UI
  pages/api/               # REST handlers
  backend/config/mongodb.ts
  backend/config/socket.ts
  backend/context/         # contacts + shared socket provider
  server.ts                # Socket.IO process (port 3001)
```
