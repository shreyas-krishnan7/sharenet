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
app.use(cors());
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
    origin: "*",              // For deployment change this to your frontend domain
    methods: ["GET", "POST"],
  },
});

let onlineUsers = {};

// When a user connects
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // User joins system
  socket.on("join", (user) => {
    onlineUsers[user.id] = { ...user, socketId: socket.id };
    console.log("📌 User joined:", user);

    io.emit("online-users", Object.values(onlineUsers));
  });

  // Handle WebRTC Offer
  socket.on("offer", ({ to, from, offer }) => {
    console.log(`📤 Offer sent from ${from} → ${to}`);
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("offer", { offer, from });
    }
  });

  // Handle WebRTC Answer
  socket.on("answer", ({ to, from, answer }) => {
    console.log(`📥 Answer sent from ${from} → ${to}`);
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("answer", { answer, from });
    }
  });

  // Handle ICE Candidates
  socket.on("candidate", ({ to, from, candidate }) => {
    const target = onlineUsers[to];
    if (target) {
      io.to(target.socketId).emit("candidate", { candidate, from });
    }
  });

  // Disconnecting
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
