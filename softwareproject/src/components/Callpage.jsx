import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom";

export default function CallPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser, targetUser, socketUrl } = location.state;
  const socket = useRef(null);

  // Refs
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const [connectionState, setConnectionState] = useState("new");

  // ---------------------------------------------
  // INITIAL SETUP
  // ---------------------------------------------
  useEffect(() => {
    socket.current = io(socketUrl, { transports: ["websocket"] });

    socket.current.emit("join-call", currentUser.id);

    socket.current.on("offer", handleReceivedOffer);
    socket.current.on("answer", handleReceivedAnswer);
    socket.current.on("candidate", handleReceivedCandidate);

    startLocalStream().then(() => {
      setupPeerConnection();

      // Caller initiates only when they navigated from chat
      if (location.state.isCaller) {
        makeOffer();
      }
    });

    return () => {
      socket.current.disconnect();
      endCall();
    };
  }, []);

  // ---------------------------------------------
  // 1) GET LOCAL MEDIA
  // ---------------------------------------------
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  // ---------------------------------------------
  // 2) CREATE RTCPeerConnection + addTrack
  // ---------------------------------------------
  const setupPeerConnection = () => {
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:relay1.expressturn.com:3478",
          username: "efV7A...demoUser",
          credential: "demoPass123",
        },
      ],
    });

    // Add local tracks to connection BEFORE offer
    localStreamRef.current.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, localStreamRef.current);
    });

    // Remote stream
    pcRef.current.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteVideoRef.current.srcObject = remoteStream;
    };

    // ICE
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("candidate", {
          to: targetUser.id,
          from: currentUser.id,
          candidate: event.candidate,
        });
      }
    };

    pcRef.current.onconnectionstatechange = () => {
      setConnectionState(pcRef.current.connectionState);
      console.log("Connection state:", pcRef.current.connectionState);

      if (
        pcRef.current.connectionState === "failed" ||
        pcRef.current.connectionState === "disconnected"
      ) {
        endCall();
      }
    };
  };

  // ---------------------------------------------
  // 3) CALLER — CREATE OFFER
  // ---------------------------------------------
  const makeOffer = async () => {
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socket.current.emit("offer", {
      to: targetUser.id,
      from: currentUser.id,
      offer,
    });
  };

  // ---------------------------------------------
  // 4) CALLEE — RECEIVE OFFER + SEND ANSWER
  // ---------------------------------------------
  const handleReceivedOffer = async ({ offer, from }) => {
    await pcRef.current.setRemoteDescription(offer);

    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    socket.current.emit("answer", {
      to: from,
      from: currentUser.id,
      answer,
    });
  };

  // ---------------------------------------------
  // 5) CALLER — RECEIVE ANSWER
  // ---------------------------------------------
  const handleReceivedAnswer = async ({ answer }) => {
    await pcRef.current.setRemoteDescription(answer);
  };

  // ---------------------------------------------
  // 6) ICE CANDIDATES
  // ---------------------------------------------
  const handleReceivedCandidate = async ({ candidate }) => {
    if (candidate) {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    }
  };

  // ---------------------------------------------
  // END CALL
  // ---------------------------------------------
  const endCall = () => {
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    navigate("/chat");
  };

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  return (
    <div className="flex h-screen items-center justify-center bg-[#0c1222] text-white">
      <div className="w-[90%] max-w-5xl text-center">
        <h1 className="text-3xl font-bold mb-6">
          Call with {targetUser.name}
        </h1>

        {/* Videos */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 border-2 border-pink-500 rounded-lg"
          />

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-96 h-72 border-2 border-pink-500 rounded-lg bg-black"
          />
        </div>

        {/* End Call */}
        <button
          onClick={endCall}
          className="bg-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition"
        >
          End Call
        </button>
      </div>
    </div>
  );
}
