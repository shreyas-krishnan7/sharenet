import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function SharentChat({ socket }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const incomingFileRef = useRef(null);
  const navigate = useNavigate();

  // WebRTC Refs
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const targetPeerIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Initialize user ONLY (socket already exists)
  useEffect(() => {
    if (!socket) return;

    const storedUser = JSON.parse(localStorage.getItem("userInfo"));
    const me = {
      id: storedUser?.email || `user_${Math.floor(Math.random() * 1000)}`,
      name: storedUser?.name || "Guest User",
      email: storedUser?.email || "guest@example.com",
      avatar:
        storedUser?.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "GU",
    };

    setCurrentUser(me);

    // Join socket room
    socket.emit("join", me);

    // Online users
    socket.on("online-users", (users) => {
      const filtered = users.filter((u) => u.id !== me.id);
      setOnlineUsers(filtered);
    });

    // ----------------------
    // CHAT SIGNALING
    // ----------------------

    socket.on("chat-offer", async ({ offer, from }) => {
      createPeerConnection(from);
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("chat-answer", { to: from, from: me.id, answer });
    });

    socket.on("chat-answer", async ({ answer }) => {
      if (pcRef.current) await pcRef.current.setRemoteDescription(answer);
    });

    socket.on("chat-candidate", async ({ candidate }) => {
      if (candidate && pcRef.current) {
        await pcRef.current.addIceCandidate(candidate);
      }
    });

    // ----------------------
    // CALL SIGNALING
    // ----------------------

    socket.on("incoming-call", ({ roomId }) => {
      setIncomingCall({ roomId });
    });

    return () => {
      cleanupPeerConnection();
    };
  }, [socket]);

  // ---------------------------
  // 📞 Start Call
  // ---------------------------
  const startCall = (receiver) => {
    if (!socket || !receiver?.id) return;

    const roomId = `${socket.id}-${receiver.id}`;
    socket.emit("call-user", { receiverId: receiver.id, roomId });
    navigate(`/call/${roomId}`);
  };

  const acceptCall = () => {
    navigate(`/call/${incomingCall.roomId}`);
    setIncomingCall(null);
  };

  // ---------------------------
  // WebRTC Functions
  // ---------------------------

  const createPeerConnection = (targetId) => {
    cleanupPeerConnection();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "99233f39212e9124c007bab2",
          credential: "1TiVAiSMvWI3b6ah",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "99233f39212e9124c007bab2",
          credential: "1TiVAiSMvWI3b6ah",
        },
      ],
    });

    pcRef.current = pc;
    targetPeerIdRef.current = targetId;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("chat-candidate", {
          to: targetId,
          from: currentUser?.id,
          candidate: e.candidate,
        });
      }
    };

    pc.ondatachannel = (event) => hookDataChannel(event.channel);

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        cleanupPeerConnection();
      }
    };
  };

  const hookDataChannel = (channel) => {
    dcRef.current = channel;

    channel.onmessage = (e) => {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const fromId = targetPeerIdRef.current;

      setMessages((prev) => ({
        ...prev,
        [fromId]: [
          ...(prev[fromId] || []),
          { text: e.data, time: now, sender: fromId },
        ],
      }));
    };
  };

  const startCallWith = async (user) => {
    setSelectedUser(user);
    createPeerConnection(user.id);
    const dc = pcRef.current.createDataChannel("chat");
    hookDataChannel(dc);

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socket.emit("chat-offer", {
      to: user.id,
      from: currentUser?.id,
      offer,
    });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !selectedUser) return;

    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(message);
    }

    setMessages((prev) => ({
      ...prev,
      [selectedUser.id]: [
        ...(prev[selectedUser.id] || []),
        { text: message, time: now, sender: currentUser?.id },
      ],
    }));

    setMessage("");
  };

  const cleanupPeerConnection = () => {
    try {
      dcRef.current?.close();
      pcRef.current?.close();
    } catch {}
    dcRef.current = null;
    pcRef.current = null;
    targetPeerIdRef.current = null;
  };

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 min-w-[280px] bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold" style={{ color: "#e91359" }}>
            Sharenet
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wide">
            Online Users ({onlineUsers.length})
          </h2>
          <div className="flex flex-col gap-1">
            {onlineUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => startCallWith(user)}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 ${
                  selectedUser?.id === user.id
                    ? "border"
                    : "border border-transparent"
                }`}
                style={
                  selectedUser?.id === user.id
                    ? { backgroundColor: "#ffe8f0", borderColor: "#e91359" }
                    : {}
                }
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{
                      background: "linear-gradient(135deg, #e91359, #ff4081)",
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="ml-3 text-left flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {user.name}
                  </div>
                  <div className="text-sm text-green-600">Online</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {selectedUser ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #e91359, #ff4081)",
                  }}
                >
                  {selectedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {selectedUser.name}
                  </h2>
                  <p className="text-sm text-green-600">
                    {dcRef.current?.readyState === "open"
                      ? "Connected"
                      : "Connecting..."}
                  </p>
                </div>
              </div>

              {/* 📞 Call Button */}
              <button
                className="p-2 bg-blue-600 text-white rounded"
                onClick={() => startCall(selectedUser)}
              >
                📞
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {messages[selectedUser.id]?.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {messages[selectedUser.id].map((msg, idx) => {
                    const isMine = msg.sender === currentUser?.id;
                    return (
                      <div
                        key={idx}
                        className={`flex w-full ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] min-w-[100px] flex flex-col ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`px-4 py-3 rounded-xl break-words ${
                              isMine
                                ? "text-white rounded-br-sm"
                                : "bg-gray-200 text-gray-900 rounded-bl-sm"
                            }`}
                            style={isMine ? { backgroundColor: "#e91359" } : {}}
                          >
                            {isMine && (
                              <strong className="block text-xs opacity-90 mb-1">
                                You:
                              </strong>
                            )}
                            <span className="whitespace-pre-wrap break-words">
                              {msg.isFile ? (
                                <a
                                  href={msg.fileURL || "#"}
                                  download={msg.fileName}
                                  className="text-blue-600 underline hover:text-blue-800"
                                >
                                  {msg.text}
                                </a>
                              ) : (
                                msg.text
                              )}
                            </span>
                          </div>
                          <div
                            className={`text-xs text-gray-500 mt-1 px-1 ${
                              isMine ? "text-right" : "text-left"
                            }`}
                          >
                            {msg.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-center px-4">
                  <div>
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg">
                      Start a conversation with {selectedUser.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 p-4 flex gap-3 flex-shrink-0">
              {/* Hidden file input */}
              <input
                type="file"
                id="fileInput"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* 📎 Attach Button */}
              <button
                onClick={() => document.getElementById("fileInput").click()}
                className="px-3 py-3 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
                title="Attach file"
              >
                📎
              </button>

              {/* Message Input */}
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#e91359] focus:ring-2 focus:ring-[#e91359]/20 transition-all"
              />

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                className="px-6 py-3 text-white rounded-lg font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-lg active:scale-95 flex-shrink-0"
                style={{ backgroundColor: "#e91359" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-center px-4">
            <div>
              <div className="text-6xl mb-4">💬</div>
              <p className="text-xl">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
      {/* 📞 Incoming Call Popup */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center animate-fadeIn">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Incoming Call...
            </h2>

            <button
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg mr-3"
              onClick={acceptCall}
            >
              Accept
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

