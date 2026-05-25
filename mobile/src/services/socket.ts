import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

export function createMobileSocket(token: string): Socket {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"]
  });
}
