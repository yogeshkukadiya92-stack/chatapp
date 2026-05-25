import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createMobileSocket } from "../services/socket";

export function useChatSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = createMobileSocket(token);
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("user:online"));

    return () => {
      socket.emit("user:offline");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef;
}
