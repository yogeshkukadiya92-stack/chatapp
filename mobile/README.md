# Mobile App

Expo React Native foundation for the Phase 1 chat platform.

## Setup

```bash
cp .env.example .env
npm install
npm run start
```

For a physical Android or iOS device, set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000/api
EXPO_PUBLIC_SOCKET_URL=http://YOUR_LAN_IP:3000
```

Use `http://10.0.2.2:3000` for the Android emulator when the backend runs on the host machine.

## Phase 1 Scope

- Phone login and mock OTP verification.
- Chat list and direct conversation creation.
- Message list, message input, and Socket.IO realtime messages.
- Basic typing and call signaling events.
- Call UI is a placeholder. Add `react-native-webrtc`, permissions, audio routing, TURN configuration, and background handling in Phase 2.
