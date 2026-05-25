import type { Socket } from "socket.io-client";

export function sendCallOffer(
  socket: Socket | null,
  payload: {
    conversationId: string;
    toUserId: string;
    type: "voice" | "video";
  }
) {
  socket?.emit("call:offer", {
    conversation_id: payload.conversationId,
    to_user_id: payload.toUserId,
    type: payload.type,
    offer: {
      type: "offer",
      sdp: "mobile-phase-1-placeholder"
    }
  });
}

// TODO: Add react-native-webrtc in Phase 2 for native media capture, peer
// connection lifecycle, permissions, audio routing, and TURN server support.
