

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

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const targetPeerIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  // const [localIp, setLocalIp] = useState(null);

  

  // Fetch PUBLIC/LAN IP FIRST before joining
  // useEffect(() => {
  //   fetch("https://api.ipify.org?format=json")
  //     .then((res) => res.json())
  //     .then((data) => setLocalIp(data.ip))
  //     .catch(() => setLocalIp(null));
  // }, []);

  // Auto scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // -----------------------------------------
  // 🔥 JOIN SERVER *AFTER* localIp is fetched
  // -----------------------------------------
  useEffect(() => {
    if (!socket ) return;

    const storedUser = JSON.parse(localStorage.getItem("userInfo"));
    const me = {
      id: storedUser?.id,
      name: storedUser?.name || "Guest User",
      email: storedUser?.email || "guest@example.com",
      // localIp: localIp, // 🔥 GUARANTEED NOT NULL NOW
      avatar:
        storedUser?.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "GU",
    };

    setCurrentUser(me);

    if (!socket.hasJoined) {
      socket.emit("join", me); // send IP now
      socket.hasJoined = true;
    }
  }, [socket]); // runs only after IP obtained

  // -----------------------------------------
  // SOCKET LISTENERS (no join here anymore)
  // -----------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (users) => {
      if (!currentUser) return;
      const filtered = users.filter((u) => u.id !== currentUser.id);
      setOnlineUsers(filtered);
    };

    const handleOffer = async ({ offer, from }) => {
      createPeerConnection(from);
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("chat-answer", { to: from, from: currentUser?.id, answer });
    };

    const handleAnswer = async ({ answer }) => {
      if (pcRef.current) await pcRef.current.setRemoteDescription(answer);
    };

    const handleCandidate = async ({ candidate }) => {
      if (candidate && pcRef.current) {
        await pcRef.current.addIceCandidate(candidate);
      }
    };

    const handleIncomingCall = ({ roomId, callerName, callType }) => {
      setIncomingCall({
        roomId,
        callerName: callerName || "Unknown User",
        callType: callType || "video",
      });
    };

    socket.on("online-users", handleOnlineUsers);
    socket.on("chat-offer", handleOffer);
    socket.on("chat-answer", handleAnswer);
    socket.on("chat-candidate", handleCandidate);
    socket.on("incoming-call", handleIncomingCall);

    return () => {
      socket.off("online-users", handleOnlineUsers);
      socket.off("chat-offer", handleOffer);
      socket.off("chat-answer", handleAnswer);
      socket.off("chat-candidate", handleCandidate);
      socket.off("incoming-call", handleIncomingCall);
    };
  }, [socket, currentUser]);

  // Generate room ID
  function generateRoomId(id1, id2) {
    const sorted = [id1, id2].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  // -----------------------------------
  // LAN CHECK + START CHAT CONNECTION
  // -----------------------------------
  const startCallWith = async (user) => {
    // const isSameNetwork = (ip1, ip2) => {
    //   if (!ip1 || !ip2) return false;
    //   return (
    //     ip1.split(".").slice(0, 3).join(".") ===
    //     ip2.split(".").slice(0, 3).join(".")
    //   );
    // };

    // if (!isSameNetwork(localIp, user.localIp)) {
    //   console.log("localIp:", localIp);
    //   console.log("user.localIp:", user.localIp);
    //   alert(
    //     "❌ Can't connect — user is not on the same local network (LAN).\n" +
    //       localIp +
    //       " vs " +
    //       user.localIp
    //   );
    //   return;
    // }

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

  // -----------------------------------
  // WebRTC Peer Connection Helpers
  // -----------------------------------
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
  };

  const hookDataChannel = (channel) => {
    dcRef.current = channel;

    channel.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        if (incomingFileRef.current) {
          incomingFileRef.current.chunks.push(e.data);
        }
        return;
      }

      let msgData;
      try {
        msgData = JSON.parse(e.data);
      } catch {
        msgData = null;
      }

      if (msgData?.type === "file-meta") {
        incomingFileRef.current = {
          name: msgData.name,
          size: msgData.size,
          mime: msgData.mime,
          totalChunks: msgData.totalChunks,
          chunks: [],
        };
        return;
      }

      if (msgData?.type === "file-end") {
        const file = incomingFileRef.current;
        const blob = new Blob(file.chunks, { type: file.mime });
        const url = URL.createObjectURL(blob);

        setMessages((prev) => ({
          ...prev,
          [targetPeerIdRef.current]: [
            ...(prev[targetPeerIdRef.current] || []),
            {
              text: `📎 ${file.name}`,
              fileURL: url,
              isFile: true,
              fileName: file.name,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              sender: targetPeerIdRef.current,
            },
          ],
        }));

        incomingFileRef.current = null;
        return;
      }

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

  // Clean peer connection
  const cleanupPeerConnection = () => {
    try {
      dcRef.current?.close();
      pcRef.current?.close();
    } catch {}
    dcRef.current = null;
    pcRef.current = null;
    targetPeerIdRef.current = null;
  };

  // -----------------------------------
  // CALLS (unchanged)
  // -----------------------------------
  const startCall = (receiver, type = "video") => {
    if (!socket || !receiver?.id) return;

    const roomId = generateRoomId(currentUser.id, receiver.id);

    socket.emit("call-user", {
      receiverId: receiver.id,
      roomId,
      callType: type,
    });

    navigate(type === "audio" ? `/audio-room/${roomId}` : `/call/${roomId}`);
  };

  const startAudioCall = (receiver) => startCall(receiver, "audio");

  const acceptCall = () => {
    navigate(
      incomingCall.callType === "audio"
        ? `/audio-room/${incomingCall.roomId}`
        : `/call/${incomingCall.roomId}`
    );
    setIncomingCall(null);
  };

  const rejectCall = () => setIncomingCall(null);

  // -----------------------------------
  // Chat sending
  // -----------------------------------
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !dcRef.current || dcRef.current.readyState !== "open") {
      alert("⚠️ DataChannel not ready or no file selected.");
      return;
    }

    const chunkSize = 16 * 1024;
    const fileReader = new FileReader();

    fileReader.onload = async (event) => {
      const buffer = event.target.result;
      const totalChunks = Math.ceil(buffer.byteLength / chunkSize);

      dcRef.current.send(
        JSON.stringify({
          type: "file-meta",
          name: file.name,
          size: file.size,
          mime: file.type,
          totalChunks,
        })
      );

      let offset = 0;
      while (offset < buffer.byteLength) {
        const chunk = buffer.slice(offset, offset + chunkSize);
        dcRef.current.send(chunk);
        offset += chunkSize;
      }

      dcRef.current.send(JSON.stringify({ type: "file-end" }));

      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setMessages((prev) => ({
        ...prev,
        [selectedUser.id]: [
          ...(prev[selectedUser.id] || []),
          {
            text: `📎 Sent file: ${file.name}`,
            time: now,
            sender: currentUser?.id,
            isFile: true,
            fileName: file.name,
          },
        ],
      }));
    };

    fileReader.readAsArrayBuffer(file);
  };
  const handlereturntodashboard = () => {
    navigate('/dashboard');
  }

  // -----------------------------------
  // UI (unchanged)
  // -----------------------------------
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100">
      {/* SIDEBAR */}
      <div className="w-full md:w-80 md:min-w-[280px] bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: "#e91359" }} onClick={handlereturntodashboard}>
            ShareNet
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
            Online Users ({onlineUsers.length})
          </h2>

          <div className="flex flex-col gap-1">
            {onlineUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => startCallWith(user)}
                className={`w-full flex items-center p-2 sm:p-2.5 md:p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 ${
                  selectedUser?.id === user.id
                    ? "border border-[#e91359] bg-[#ffe8f0]"
                    : "border border-transparent"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm"
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

                <div className="ml-2 sm:ml-2.5 md:ml-3 text-left flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate text-xs sm:text-sm">
                    {user.name}
                  </div>
                  <div className="text-xs sm:text-sm text-green-600">Online</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {selectedUser ? (
          <>
            {/* HEADER */}
            <div className="bg-white border-b border-gray-200 p-2 sm:p-3 md:p-4 flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center min-w-0">
                <div
                  className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm"
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

                <div className="ml-2 sm:ml-2.5 md:ml-3 min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 truncate text-sm sm:text-base md:text-base">
                    {selectedUser.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-green-600">
                    {dcRef.current?.readyState === "open"
                      ? "Connected"
                      : "Connecting..."}
                  </p>
                </div>
              </div>

              <button
                className="p-2 sm:p-2 md:p-2 bg-blue-600 text-white rounded text-base sm:text-lg md:text-lg flex-shrink-0"
                onClick={() => startCall(selectedUser)}
              >
                🎦
              </button>

              <button
                className="p-2 sm:p-2 md:p-2 bg-green-600 text-white rounded flex-shrink-0"
                onClick={() => startAudioCall(selectedUser)}
              >
                🎙️
              </button>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
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
                        <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] min-w-[80px] flex flex-col">
                          <div
                            className={`px-3 py-2 sm:px-4 sm:py-3 rounded-xl break-words text-sm sm:text-base ${
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

                            {msg.isFile ? (
                              <a
                                href={msg.fileURL}
                                download={msg.fileName}
                                className="text-blue-600 underline"
                              >
                                {msg.text}
                              </a>
                            ) : (
                              msg.text
                            )}
                          </div>

                          <div
                            className={`text-xs text-gray-500 mt-1 ${
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
                <div className="text-center text-gray-400 h-full flex items-center justify-center p-4">
                  <div>
                    <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">💬</div>
                    <p className="text-sm sm:text-base">Start a conversation with {selectedUser.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* INPUT BAR */}
            <div className="bg-white border-t border-gray-200 p-2 sm:p-3 md:p-4 flex gap-2 sm:gap-3 flex-shrink-0">
              <input
                type="file"
                id="fileInput"
                className="hidden"
                onChange={handleFileSelect}
              />

              <button
                onClick={() => document.getElementById("fileInput").click()}
                className="px-2 sm:px-3 py-2 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-100 text-base sm:text-lg flex-shrink-0"
              >
                📎
              </button>

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base"
              />

              <button
                onClick={handleSendMessage}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[#e91359] text-white rounded-lg hover:shadow-lg active:scale-95 text-sm sm:text-base font-medium flex-shrink-0"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">💬</div>
              <p className="text-sm sm:text-base md:text-lg">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* INCOMING CALL POPUP */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <h2 className="text-xl font-semibold mb-4">
              {incomingCall?.callerName} is calling you...
            </h2>

            <button
              className="bg-green-500 text-white px-6 py-2 rounded-lg mr-3"
              onClick={acceptCall}
            >
              Accept
            </button>

            <button
              className="bg-red-500 text-white px-6 py-2 rounded-lg"
              onClick={rejectCall}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


