import { Server } from "socket.io";
import http from "http";

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for now (safe for development)
    methods: ["GET", "POST"],
  },
});

// onlineUsers Map: userId → { socketId, name, email }
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(" New socket connected:", socket.id);

  socket.on("join", (user) => {
    if (!user || !user.id) return;


    onlineUsers.set(user.id, {
      socketId: socket.id,
      name: user.name,
      email: user.email,
    });

    console.log(` ${user.name} (${user.email}) connected`);

 
    const userList = Array.from(onlineUsers.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      email: info.email,
    }));

    io.emit("online-users", userList);
  });

  // 🔁 WebRTC Offer: A → B
  socket.on("offer", ({ to, offer, from }) => {
    const targetSocket = onlineUsers.get(to)?.socketId;
    if (targetSocket) {
      io.to(targetSocket).emit("offer", { offer, from });
      console.log(` Offer sent from ${from} → ${to}`);
    } else {
      console.log(` Offer target ${to} not found`);
    }
  });

  // 🔁 WebRTC Answer: B → A
  socket.on("answer", ({ to, answer, from }) => {
    const targetSocket = onlineUsers.get(to)?.socketId;
    if (targetSocket) {
      io.to(targetSocket).emit("answer", { answer, from });
      console.log(` Answer sent from ${from} → ${to}`);
    } else {
      console.log(` Answer target ${to} not found`);
    }
  });

  // 🌐 ICE Candidate exchange
  socket.on("candidate", ({ to, candidate, from }) => {
    const targetSocket = onlineUsers.get(to)?.socketId;
    if (targetSocket) {
      io.to(targetSocket).emit("candidate", { candidate, from });
      console.log(` Candidate sent from ${from} → ${to}`);
    } else {
      console.log(` Candidate target ${to} not found`);
    }
  });

  // ❌ When user disconnects
  socket.on("disconnect", () => {
    for (const [id, info] of onlineUsers.entries()) {
      if (info.socketId === socket.id) {
        console.log(` ${info.name} disconnected`);
        onlineUsers.delete(id);
        break;
      }
    }

    // Update everyone’s online list
    const userList = Array.from(onlineUsers.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      email: info.email,
    }));
    io.emit("online-users", userList);
  });
});

//  Start signaling server
httpServer.listen(8080, () => {
  console.log(" Signaling Server running on port 8080");
});
