import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userroutes.js";

import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: [
      "https://sharenet-ashen.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("API + Signaling Server is running...");
});

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ============================================================
// 🔵 ONLINE USERS STORE (FIXED)
// ============================================================
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // ============================================================
  // 🔹 USER JOINS PLATFORM (FIXED)
  // ============================================================
  socket.on("join", (user) => {
    // Store by socket.id (unique every tab)
    onlineUsers[socket.id] = { ...user, socketId: socket.id };

    console.log(`📌 User online: ${user.name} (${socket.id})`);

    io.emit("online-users", Object.values(onlineUsers));
  });

  // ============================================================
  // 🔹 CHAT SIGNALING (unchanged)
  // ============================================================
  socket.on("chat-offer", ({ to, from, offer }) => {
    const target = Object.values(onlineUsers).find(u => u.id === to);
    if (target) io.to(target.socketId).emit("chat-offer", { offer, from });
  });

  socket.on("chat-answer", ({ to, from, answer }) => {
    const target = Object.values(onlineUsers).find(u => u.id === to);
    if (target) io.to(target.socketId).emit("chat-answer", { answer, from });
  });

  socket.on("chat-candidate", ({ to, from, candidate }) => {
    const target = Object.values(onlineUsers).find(u => u.id === to);
    if (target) io.to(target.socketId).emit("chat-candidate", { candidate, from });
  });

  // ============================================================
  // 🔹 VIDEO CALL SIGNALING
  // ============================================================
  socket.on("call-user", ({ receiverId, roomId }) => {
    const target = Object.values(onlineUsers).find(u => u.id === receiverId);
    if (target) {
      io.to(target.socketId).emit("incoming-call", {
        roomId,
        callerId: socket.id,
      });
    }
  });

  socket.on("join-call", ({ roomId }) => {
    socket.join(roomId);
    console.log(`👥 ${socket.id} joined call room ${roomId}`);
  });

  socket.on("offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("offer", { sdp });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("answer", { sdp });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  // ============================================================
  // 🔹 OLD Call Signaling (safe to keep)
  // ============================================================
  socket.on("call-offer", ({ to, from, offer }) => {
    const target = Object.values(onlineUsers).find(u => u.id === to);
    if (target) io.to(target.socketId).emit("call-offer", { offer, from });
  });

  socket.on("call-answer", ({ to, from, answer }) => {
    const target = Object.values(onlineUsers).find(u => u.id === to);
    if (target) io.to(target.socketId).emit("call-answer", { answer, from });
  });

  socket.on("call-candidate", ({ to, from, candidate }) => {
    const target = Object.values(onlineUsers).find(u => u.id === to);
    if (target) io.to(target.socketId).emit("call-candidate", { candidate, from });
  });

  // ============================================================
  // 🔹 DISCONNECT (100% FIXED)
  // ============================================================
  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);

    // Remove user instantly
    delete onlineUsers[socket.id];

    io.emit("online-users", Object.values(onlineUsers));
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
  console.log(`🚀 API + Signaling Server running on port ${PORT}`)
);
