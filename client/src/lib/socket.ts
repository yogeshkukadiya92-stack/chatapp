import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export function createChatSocket(token: string): Socket {
  return io(SOCKET_URL, {
    auth: {
      token
    },
    autoConnect: true,
    transports: ["websocket", "polling"]
  });
}
