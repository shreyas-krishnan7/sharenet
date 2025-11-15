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
      "https://sharenet-ashen.vercel.app", // your Vercel frontend
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
    origin: "*", // Expand later to limit origins
    methods: ["GET", "POST"],
  },
});

let onlineUsers = {};

// ---- SOCKET HANDLERS ---- //
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // A user joins the platform
  socket.on("join", (user) => {
    onlineUsers[user.id] = { ...user, socketId: socket.id };
    console.log("📌 User joined:", user);
    io.emit("online-users", Object.values(onlineUsers));
  });

  // ------------------------------------------------------------
  // 🔹 CHAT SIGNALING (DataChannel Only — text + file sharing)
  // ------------------------------------------------------------

  socket.on("chat-offer", ({ to, from, offer }) => {
    console.log(`💬 Chat Offer: ${from} → ${to}`);
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("chat-offer", { offer, from });
    }
  });

  socket.on("chat-answer", ({ to, from, answer }) => {
    console.log(`💬 Chat Answer: ${from} → ${to}`);
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

  // ------------------------------------------------------------
  // 🔹 CALL SIGNALING (Audio/Video WebRTC)
  // ------------------------------------------------------------

  socket.on("call-offer", ({ to, from, offer }) => {
    console.log(`📞 Call Offer: ${from} → ${to}`);
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("call-offer", { offer, from });
    }
  });

  socket.on("call-answer", ({ to, from, answer }) => {
    console.log(`📞 Call Answer: ${from} → ${to}`);
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

  // ------------------------------------------------------------
  // 🔹 USER DISCONNECT
  // ------------------------------------------------------------
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    // Remove user from online list
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
