# Real-Time Chat Platform

This repository is a Phase 1 MVP foundation for a cross-platform real-time chat app for Web, Android, and iOS. It intentionally does not copy WhatsApp branding, names, logos, colors, assets, or exact UI. The goal is to provide a clean, original chat platform base that can grow into production features over later phases.

## Apps

- `server`: Express, Supabase/Postgres, JWT auth, REST APIs, and Socket.IO.
- `client`: React + Vite web client with phone sign in/sign up, OTP mock verification, chat UI, typing, presence, message status, call signaling UI, and admin placeholders.
- `mobile`: Expo React Native foundation with sign in/sign up, OTP, chat list, chat screen, API client, and Socket.IO wiring.
- `supabase/chat_schema.sql`: Phase 1 database schema.
- `docs/CHAT_APP_ARCHITECTURE.md`: Architecture notes, realtime flows, security notes, and roadmap.

## Development Limits

- OTP is mocked for development. The default OTP is `123456`.
- Sign in requires an existing `chat_users` row. Sign up creates a new profile after OTP verification and requires a display name.
- End-to-end encryption is not implemented in Phase 1.
- Push notifications are not implemented yet. Add FCM/APNs in Phase 2.
- Media upload endpoints are placeholders unless Supabase Storage is configured.
- Voice/video calling includes WebRTC signaling foundations. TURN/STUN hardening and production-grade media flows are Phase 2 work.

## Local Demo Features

When Supabase is not configured, the backend now runs a local in-memory demo mode with preloaded users `9825344428` and `7990979942`.

Available in demo mode:

- Sign in with OTP `123456`.
- All Contacts list and one-click direct chat.
- Group creation with available contacts.
- Text messages, reply metadata, forwarding, editing, and delete-for-everyone.
- Image/video/document/audio placeholder messages.
- Chat search, emoji shortcuts, browser notification permission prompt, and call signaling UI.

Demo mode resets when the backend process restarts.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment files:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   cp mobile/.env.example mobile/.env
   ```

3. Create the Supabase schema:

   Run `supabase/chat_schema.sql` in your Supabase SQL editor or through your migration pipeline.

4. Optional: seed two local test users:

   ```bash
   npm run seed:chat-users --workspace server
   ```

   Or run `supabase/seed_chat_users.sql` in the Supabase SQL editor.

5. Start the backend:

   ```bash
   npm run dev:server
   ```

6. Start the web client:

   ```bash
   npm run dev:client
   ```

7. Start the mobile app:

   ```bash
   npm run dev:mobile
   ```

## Environment Variables

Backend (`server/.env`):

```bash
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
```

Client (`client/.env`):

```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Mobile (`mobile/.env`):

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
```

## API Endpoints

Auth:

- `POST /api/chat-auth/request-otp`
- `POST /api/chat-auth/verify-otp`
- `GET /api/chat-auth/me`

Auth request bodies:

- `request-otp`: `{ "phone": "+15551234567", "mode": "signin" }` or `{ "phone": "+15551234567", "mode": "signup" }`
- `verify-otp`: `{ "phone": "+15551234567", "otp": "123456", "mode": "signin" }`
- `verify-otp` for signup: `{ "phone": "+15551234567", "otp": "123456", "mode": "signup", "name": "Display Name" }`

Users:

- `GET /api/chat/users/search?phone=`
- `PATCH /api/chat/users/profile`
- `POST /api/chat/users/block`
- `POST /api/chat/users/unblock`

Conversations:

- `GET /api/chat/conversations`
- `POST /api/chat/conversations/direct`
- `POST /api/chat/conversations/group`
- `PATCH /api/chat/conversations/:id`
- `POST /api/chat/conversations/:id/participants`
- `DELETE /api/chat/conversations/:id/participants/:userId`

Messages:

- `GET /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/conversations/:conversationId/messages`
- `PATCH /api/chat/messages/:id`
- `DELETE /api/chat/messages/:id`
- `POST /api/chat/messages/:id/read`
- `POST /api/chat/messages/:id/delivered`

Calls:

- `POST /api/chat/calls/start`
- `POST /api/chat/calls/end`
- `GET /api/chat/calls/history`

Media:

- `POST /api/chat/media/upload`
- `GET /api/chat/media/:id`

Admin:

- `GET /api/chat/admin/overview`
- `GET /api/chat/admin/users`
- `GET /api/chat/admin/conversations`
- `GET /api/chat/admin/messages`

## Socket.IO Events

Client emits:

- `user:online`
- `user:offline`
- `conversation:join`
- `conversation:leave`
- `message:send`
- `message:delivered`
- `message:read`
- `typing:start`
- `typing:stop`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:ringing`
- `call:accepted`
- `call:rejected`
- `call:ended`

Server emits:

- `user:presence`
- `message:new`
- `message:status`
- `typing:update`
- `conversation:update`
- `call:incoming`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:status`

## Phase 2 Roadmap

- Real OTP provider integration.
- Push notifications with FCM/APNs.
- Full media upload with Supabase Storage policies.
- Production voice/video calling with TURN server support.
- Group calls.
- End-to-end encryption using Signal Protocol or an audited encryption library.
- Message search.
- Archived chats.
- Starred messages.
- Disappearing messages.
- Broadcast channels.
- Business accounts.
- Payment integration.
- Moderation and report system.
- Scalable deployment with the Socket.IO Redis adapter.
