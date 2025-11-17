import express from "express";
import "./loadenv.js";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userroutes.js";
import twilioRoute from "./routes/twilio.js";


import { createServer } from "http";
import { Server } from "socket.io";

// dotenv.config();
connectDB();
console.log("SID:", process.env.TWILIO_ACCOUNT_SID);

const app = express();

// allow your frontend and local dev
app.use(
  cors({
    origin: [
      "https://sharenet-ashen.vercel.app",
      "http://localhost:5173",
      // you can add more allowed origins here
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

// socket.io with permissive CORS for signaling
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use("/twilio", twilioRoute);


// In-memory stores
// map socketId -> userObj { id, name, email, socketId }
const onlineBySocket = {};
// map userId -> socketId (fast lookup when code wants to send to a userId)
const socketByUserId = {};

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // -------------------------
  // Join platform (presence)
  // -------------------------
  socket.on("join", (user) => {
    try {
      // store both maps
      onlineBySocket[socket.id] = { ...user, socketId: socket.id };
      if (user?.id) socketByUserId[user.id] = socket.id;

      console.log(`📌 User online: ${user.name} (${user.id}) -> socket ${socket.id}`);
      io.emit("online-users", Object.values(onlineBySocket));
    } catch (err) {
      console.error("Error in join:", err);
    }
  });

  // -------------------------
  // CHAT (datachannel) signaling
  // -------------------------
  socket.on("chat-offer", ({ to, from, offer }) => {
    try {
      const targetSocket = socketByUserId[to];
      if (targetSocket) {
        io.to(targetSocket).emit("chat-offer", { offer, from });
        console.log(`💬 chat-offer forwarded: ${from} -> ${to}`);
      } else {
        console.warn("chat-offer target not found for userId:", to);
      }
    } catch (err) {
      console.error("chat-offer error:", err);
    }
  });

  socket.on("chat-answer", ({ to, from, answer }) => {
    try {
      const targetSocket = socketByUserId[to];
      if (targetSocket) {
        io.to(targetSocket).emit("chat-answer", { answer, from });
        console.log(`💬 chat-answer forwarded: ${from} -> ${to}`);
      } else {
        console.warn("chat-answer target not found for userId:", to);
      }
    } catch (err) {
      console.error("chat-answer error:", err);
    }
  });

  socket.on("chat-candidate", ({ to, from, candidate }) => {
    try {
      const targetSocket = socketByUserId[to];
      if (targetSocket) {
        io.to(targetSocket).emit("chat-candidate", { candidate, from });
        // don't log heavy candidate objects
        console.log(`💬 chat-candidate forwarded: ${from} -> ${to}`);
      } else {
        console.warn("chat-candidate target not found for userId:", to);
      }
    } catch (err) {
      console.error("chat-candidate error:", err);
    }
  });

  // -------------------------
  // Legacy direct call signalling (optional)
  // -------------------------
  // socket.on("call-user", ({ receiverId, roomId }) => {
  //   try {
  //     const targetSocket = socketByUserId[receiverId];
  //     if (targetSocket) {
  //       io.to(targetSocket).emit("incoming-call", {
  //         roomId,
  //         callerId: socket.id,
  //       });
  //       console.log(`📞 call-user -> incoming-call: ${socket.id} -> ${receiverId} (room ${roomId})`);
  //     } else {
  //       console.warn("call-user: target not found", receiverId);
  //     }
  //   } catch (err) {
  //     console.error("call-user error:", err);
  //   }
  // });
  socket.on("call-user", ({ receiverId, roomId, callType }) => {
  try {
    const targetSocket = socketByUserId[receiverId];
    const callerInfo = onlineBySocket[socket.id]; // 🔥 GET CALLER INFO FROM SERVER
    
    if (targetSocket) {
      io.to(targetSocket).emit("incoming-call", {
        roomId,
        callerId: socket.id,
        callerName: callerInfo?.name || "Unknown User", // 🔥 SEND CALLER NAME
        callType,
      });
      console.log(
        `📞 call-user (${callType}) -> incoming-call: ${socket.id} -> ${receiverId} (room ${roomId})`
      );
    } else {
      console.warn("call-user: target not found", receiverId);
    }
  } catch (err) {
    console.error("call-user error:", err);
  }
});


  // -------------------------
  // Room / WebRTC signaling (recommended flow)
  // -------------------------
  socket.on("join-call", ({ roomId }, ack) => {
    try {
      socket.join(roomId);

      const room = io.sockets.adapter.rooms.get(roomId);
      const participants = room ? room.size : 0;

      console.log(`👥 User ${socket.id} joined call room ${roomId} (participants: ${participants})`);

      // Notify everyone in the room (including joiner) about participant count
      io.in(roomId).emit("room-joined", { participants });

      // Acknowledge to joiner with number of participants
      if (typeof ack === "function") ack(participants);
    } catch (err) {
      console.error("join-call error:", err);
      if (typeof ack === "function") ack(0);
    }
  });

  // Offer -> forward to other sockets in room (except sender)
  socket.on("offer", ({ roomId, sdp }) => {
    try {
      console.log(`📡 Offer received from ${socket.id} for room ${roomId}`);
      // send to everyone in room except the sender
      socket.to(roomId).emit("offer", { sdp, from: socket.id });
      console.log(`📡 Offer forwarded by server for room ${roomId}`);
    } catch (err) {
      console.error("offer handler error:", err);
    }
  });

  socket.on("answer", ({ roomId, sdp }) => {
    try {
      console.log(`📡 Answer received from ${socket.id} for room ${roomId}`);
      socket.to(roomId).emit("answer", { sdp, from: socket.id });
      console.log(`📡 Answer forwarded by server for room ${roomId}`);
    } catch (err) {
      console.error("answer handler error:", err);
    }
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    try {
      // small candidate object logging only
      console.log(`🌍 ICE candidate from ${socket.id} for room ${roomId}`);
      socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
    } catch (err) {
      console.error("ice-candidate handler error:", err);
    }
  });

  // legacy direct call signaling (kept for compatibility)
  socket.on("call-offer", ({ to, from, offer }) => {
    try {
      const target = socketByUserId[to];
      if (target) io.to(target).emit("call-offer", { offer, from });
    } catch (err) {
      console.error("call-offer error:", err);
    }
  });

  socket.on("call-answer", ({ to, from, answer }) => {
    try {
      const target = socketByUserId[to];
      if (target) io.to(target).emit("call-answer", { answer, from });
    } catch (err) {
      console.error("call-answer error:", err);
    }
  });

  socket.on("call-candidate", ({ to, from, candidate }) => {
    try {
      const target = socketByUserId[to];
      if (target) io.to(target).emit("call-candidate", { candidate, from });
    } catch (err) {
      console.error("call-candidate error:", err);
    }
  });

  // -------------------------
  // Disconnect cleanup
  // -------------------------
  socket.on("disconnect", (reason) => {
    try {
      console.log("🔴 Disconnected:", socket.id, "reason:", reason);

      // remove from both maps
      const userObj = onlineBySocket[socket.id];
      if (userObj && userObj.id && socketByUserId[userObj.id] === socket.id) {
        delete socketByUserId[userObj.id];
      }
      delete onlineBySocket[socket.id];

      // broadcast updated presence
      io.emit("online-users", Object.values(onlineBySocket));
    } catch (err) {
      console.error("disconnect cleanup error:", err);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
  console.log(`🚀 API + Signaling Server running on port ${PORT}`)
);
