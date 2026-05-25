require("dotenv").config();

const cors = require("cors");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const chatAdminRoutes = require("./routes/chat-admin.routes");
const chatAuthRoutes = require("./routes/chat-auth.routes");
const chatCallRoutes = require("./routes/chat-call.routes");
const chatConversationRoutes = require("./routes/chat-conversation.routes");
const chatMediaRoutes = require("./routes/chat-media.routes");
const chatMessageRoutes = require("./routes/chat-message.routes");
const chatUserRoutes = require("./routes/chat-user.routes");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const { requireChatAdmin, requireChatAuth } = require("./middleware/chat-auth.middleware");
const { registerChatSocket } = require("./services/chat-socket.service");

const app = express();
const server = http.createServer(app);
const localDefaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([...localDefaultOrigins, ...configuredOrigins])
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "chat-platform-api"
  });
});

app.use("/api/chat-auth", chatAuthRoutes);
app.use("/api/chat/users", requireChatAuth, chatUserRoutes);
app.use("/api/chat/conversations", requireChatAuth, chatConversationRoutes);
app.use("/api/chat", requireChatAuth, chatMessageRoutes);
app.use("/api/chat/calls", requireChatAuth, chatCallRoutes);
app.use("/api/chat/media", requireChatAuth, chatMediaRoutes);
app.use("/api/chat/admin", requireChatAuth, requireChatAdmin, chatAdminRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

registerChatSocket(io);

const port = Number(process.env.PORT || 3000);

server.listen(port, () => {
  console.log(`Chat API listening on http://localhost:${port}`);
});

module.exports = {
  app,
  server
};
