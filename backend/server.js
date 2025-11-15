import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userroutes.js";

import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();
connectDB(); // connect to database

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

// ---- API ROUTES ---- //
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("API + Signaling Server is running...");
});

// ---- CREATE HTTP SERVER ---- //
const server = createServer(app);

// ---- SOCKET.IO SIGNALLING ---- //
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let onlineUsers = {};

// ============================================================
// 🔵 SOCKET HANDLERS
// ============================================================
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // A user joins platform
  socket.on("join", (user) => {
    onlineUsers[user.id] = { ...user, socketId: socket.id };
    console.log("📌 User joined:", user);
    io.emit("online-users", Object.values(onlineUsers));
  });

  // ============================================================
  // 🔹 CHAT SIGNALING (DataChannel Only)
  // ============================================================
  socket.on("chat-offer", ({ to, from, offer }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("chat-offer", { offer, from });
    }
  });

  socket.on("chat-answer", ({ to, from, answer }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("chat-answer", { answer, from });
    }
  });

  socket.on("chat-candidate", ({ to, from, candidate }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("chat-candidate", { candidate, from });
    }
  });

  // ============================================================
  // 🔹 **NEW: WebRTC Call Signaling for 1-to-1 Video Calls**
  // ============================================================

  // Step 1: Caller requests call
  socket.on("call-user", ({ receiverId, roomId }) => {
    const target = onlineUsers[receiverId];
    console.log(`📞 Call Request: ${socket.id} → ${receiverId} (room ${roomId})`);
    if (target) {
      io.to(target.socketId).emit("incoming-call", { roomId, callerId: socket.id });
    }
  });

  // Step 2: When user joins call room
  socket.on("join-call", ({ roomId }) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined call room ${roomId}`);
  });

  // Step 3: WebRTC Offer
  socket.on("offer", ({ roomId, sdp }) => {
    console.log(`📡 Offer Relayed in room ${roomId}`);
    socket.to(roomId).emit("offer", { sdp });
  });

  // Step 4: WebRTC Answer
  socket.on("answer", ({ roomId, sdp }) => {
    console.log(`📡 Answer Relayed in room ${roomId}`);
    socket.to(roomId).emit("answer", { sdp });
  });

  // Step 5: ICE Candidates
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  // ============================================================
  // 🔹 OLD Call Signaling (Keep it, doesn’t interfere)
  // ============================================================
  socket.on("call-offer", ({ to, from, offer }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("call-offer", { offer, from });
    }
  });

  socket.on("call-answer", ({ to, from, answer }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("call-answer", { answer, from });
    }
  });

  socket.on("call-candidate", ({ to, from, candidate }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("call-candidate", { candidate, from });
    }
  });

  // ============================================================
  // 🔹 DISCONNECT
  // ============================================================
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    for (const id in onlineUsers) {
      if (onlineUsers[id].socketId === socket.id) {
        delete onlineUsers[id];
        break;
      }
    }

    io.emit("online-users", Object.values(onlineUsers));
  });
});

// ---- START SERVER ---- //
const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
  console.log(`🚀 API + Signaling Server running on port ${PORT}`)
);
