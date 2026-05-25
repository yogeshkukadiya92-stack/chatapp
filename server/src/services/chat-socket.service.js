const { verifyChatToken } = require("../middleware/chat-auth.middleware");
const chatCallService = require("./chat-call.service");
const chatConversationService = require("./chat-conversation.service");
const chatMessageService = require("./chat-message.service");
const chatUserService = require("./chat-user.service");

function registerChatSocket(io) {
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Missing socket auth token"));
    }

    try {
      socket.data.chatUser = verifyChatToken(token);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.chatUser.sub;
    const privateRoom = getUserRoom(userId);

    socket.join(privateRoom);

    try {
      const user = await chatUserService.createOrUpdatePresence(userId, true);
      io.emit("user:presence", {
        user_id: userId,
        is_online: true,
        user
      });
    } catch (error) {
      emitSocketError(socket, error);
    }

    socket.on("user:online", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const user = await chatUserService.createOrUpdatePresence(userId, true);
        io.emit("user:presence", {
          user_id: userId,
          is_online: true,
          user
        });
        return { user };
      });
    });

    socket.on("user:offline", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const user = await chatUserService.createOrUpdatePresence(userId, false);
        io.emit("user:presence", {
          user_id: userId,
          is_online: false,
          user
        });
        return { user };
      });
    });

    socket.on("conversation:join", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const conversationId = payload?.conversation_id || payload?.conversationId;
        await chatConversationService.assertParticipant(conversationId, userId);
        socket.join(getConversationRoom(conversationId));
        return { conversation_id: conversationId };
      });
    });

    socket.on("conversation:leave", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const conversationId = payload?.conversation_id || payload?.conversationId;
        socket.leave(getConversationRoom(conversationId));
        return { conversation_id: conversationId };
      });
    });

    socket.on("message:send", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const conversationId = payload?.conversation_id || payload?.conversationId;
        const message = await chatMessageService.createMessage(userId, conversationId, payload);
        io.to(getConversationRoom(conversationId)).emit("message:new", { message });
        io.to(getConversationRoom(conversationId)).emit("conversation:update", {
          conversation_id: conversationId,
          last_message: message
        });
        return { message };
      });
    });

    socket.on("message:delivered", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const messageId = payload?.message_id || payload?.messageId;
        const status = await chatMessageService.markDelivered(userId, messageId);
        io.to(getConversationRoom(status.conversation_id)).emit("message:status", { status });
        return { status };
      });
    });

    socket.on("message:read", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        const messageId = payload?.message_id || payload?.messageId;
        const status = await chatMessageService.markRead(userId, messageId);
        io.to(getConversationRoom(status.conversation_id)).emit("message:status", { status });
        return { status };
      });
    });

    socket.on("typing:start", (payload) => {
      emitTyping(socket, payload, true);
    });

    socket.on("typing:stop", (payload) => {
      emitTyping(socket, payload, false);
    });

    socket.on("call:offer", (payload) => {
      const targetUserId = getTargetUserId(payload);
      const event = {
        ...payload,
        from_user_id: userId
      };
      io.to(getUserRoom(targetUserId)).emit("call:incoming", event);
      io.to(getUserRoom(targetUserId)).emit("call:offer", event);
    });

    socket.on("call:answer", (payload) => {
      const targetUserId = getTargetUserId(payload);
      io.to(getUserRoom(targetUserId)).emit("call:answer", {
        ...payload,
        from_user_id: userId
      });
    });

    socket.on("call:ice-candidate", (payload) => {
      const targetUserId = getTargetUserId(payload);
      io.to(getUserRoom(targetUserId)).emit("call:ice-candidate", {
        ...payload,
        from_user_id: userId
      });
    });

    socket.on("call:ringing", (payload) => {
      emitCallStatus(io, userId, payload, "ringing");
    });

    socket.on("call:accepted", (payload) => {
      emitCallStatus(io, userId, payload, "accepted");
    });

    socket.on("call:rejected", (payload) => {
      emitCallStatus(io, userId, payload, "rejected");
    });

    socket.on("call:ended", async (payload, ack) => {
      await withAck(socket, ack, async () => {
        let call = null;

        if (payload?.call_id || payload?.callId) {
          call = await chatCallService.endCall(userId, {
            call_id: payload.call_id || payload.callId,
            status: "ended"
          });
        }

        emitCallStatus(io, userId, payload, "ended");
        return { call };
      });
    });

    socket.on("disconnect", async () => {
      try {
        const user = await chatUserService.createOrUpdatePresence(userId, false);
        io.emit("user:presence", {
          user_id: userId,
          is_online: false,
          user
        });
      } catch (error) {
        console.error(error);
      }
    });
  });
}

function emitTyping(socket, payload, isTyping) {
  const userId = socket.data.chatUser.sub;
  const conversationId = payload?.conversation_id || payload?.conversationId;

  socket.to(getConversationRoom(conversationId)).emit("typing:update", {
    conversation_id: conversationId,
    user_id: userId,
    is_typing: isTyping
  });
}

function emitCallStatus(io, userId, payload, status) {
  const targetUserId = getTargetUserId(payload);
  const conversationId = payload?.conversation_id || payload?.conversationId;
  const event = {
    ...payload,
    from_user_id: userId,
    status
  };

  if (targetUserId) {
    io.to(getUserRoom(targetUserId)).emit("call:status", event);
  }

  if (conversationId) {
    io.to(getConversationRoom(conversationId)).emit("call:status", event);
  }
}

async function withAck(socket, ack, handler) {
  try {
    const result = await handler();

    if (typeof ack === "function") {
      ack({ ok: true, ...result });
    }

    return result;
  } catch (error) {
    emitSocketError(socket, error);

    if (typeof ack === "function") {
      ack({
        ok: false,
        error: error.message || "Socket event failed"
      });
    }

    return null;
  }
}

function emitSocketError(socket, error) {
  socket.emit("error", {
    error: error.message || "Socket error"
  });
}

function getTargetUserId(payload = {}) {
  return payload.to_user_id || payload.toUserId || payload.target_user_id || payload.targetUserId;
}

function getUserRoom(userId) {
  return `user:${userId}`;
}

function getConversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

// Socket.IO is used only while the app is active. Phase 2 should add push
// notifications through FCM for Android/Web and APNs for iOS so users receive
// message and call alerts while the app is backgrounded or closed.

module.exports = {
  getConversationRoom,
  getUserRoom,
  registerChatSocket
};
