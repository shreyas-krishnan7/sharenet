import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";

export default function CallPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: targetId } = useParams(); // receiver id

  // Navigation data
  const { currentUser, targetUser, socketUrl } = location.state || {};

  // Refs
  const socket = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  // UI State
  const [callStatus, setCallStatus] = useState("Connecting...");

  // ICE Servers (TURN + STUN)
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "99233f39212e9124c007bab2",
        credential: "1TiVAiSMvWI3b6ah",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "99233f39212e9124c007bab2",
        credential: "1TiVAiSMvWI3b6ah",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "99233f39212e9124c007bab2",
        credential: "1TiVAiSMvWI3b6ah",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "99233f39212e9124c007bab2",
        credential: "1TiVAiSMvWI3b6ah",
      },
    ],
  };

  // ================================  
  // 1️⃣ Initialize media + socket  
  // ================================
  useEffect(() => {
    if (!currentUser || !targetUser) {
      alert("Call data missing. Redirecting...");
      return navigate("/");
    }

    startCall();

    return () => cleanup();
  }, []);

  const startCall = async () => {
    try {
      setCallStatus("Getting camera & mic...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current.srcObject = stream;

      localStreamRef.current.muted = true;

      // Initialize socket
      socket.current = io(socketUrl, { transports: ["websocket"] });

      registerSocketEvents();

      createPeerConnection(stream);

      // Caller -> create offer
      sendOffer();

    } catch (err) {
      console.error("Media Error:", err);
      alert("Camera/Microphone access denied.");
      navigate("/");
    }
  };

  // =========================================  
  // 2️⃣ Create Peer Connection  
  // =========================================
  const createPeerConnection = (stream) => {
    pcRef.current = new RTCPeerConnection(iceServers);

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, stream);
    });

    // Get remote tracks
    pcRef.current.ontrack = (e) => {
      console.log("📡 Remote stream received");
      remoteStreamRef.current.srcObject = e.streams[0];
    };

    // Send ICE candidates
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", {
          to: targetUser.id,
          candidate: event.candidate,
        });
      }
    };

    pcRef.current.onconnectionstatechange = () => {
      console.log("Connection state:", pcRef.current.connectionState);

      if (pcRef.current.connectionState === "connected") {
        setCallStatus("Connected ✔");
      }
      if (
        pcRef.current.connectionState === "failed" ||
        pcRef.current.connectionState === "disconnected"
      ) {
        endCall();
      }
    };
  };

  // =========================================  
  // 3️⃣ Signaling (Offer / Answer / ICE)  
  // =========================================
  const registerSocketEvents = () => {
    socket.current.on("offer", async ({ from, offer }) => {
      console.log("📩 Received Offer");

      await pcRef.current.setRemoteDescription(offer);

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.current.emit("answer", {
        to: from,
        answer,
      });
    });

    socket.current.on("answer", async ({ answer }) => {
      console.log("📩 Received Answer");
      await pcRef.current.setRemoteDescription(answer);
    });

    socket.current.on("ice-candidate", async ({ candidate }) => {
      try {
        console.log("📩 Received ICE Candidate");
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn("ICE add error:", err);
      }
    });

    socket.current.emit("join-call", currentUser.id);
  };

  const sendOffer = async () => {
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socket.current.emit("offer", {
      to: targetUser.id,
      offer,
    });
  };

  // ================================  
  // 4️⃣ End Call + Cleanup  
  // ================================
  const endCall = () => {
    cleanup();
    navigate("/chat");
  };

  const cleanup = () => {
    if (pcRef.current) pcRef.current.close();
    if (socket.current) socket.current.disconnect();

    if (localStreamRef.current?.srcObject) {
      localStreamRef.current.srcObject
        .getTracks()
        .forEach((t) => t.stop());
    }
  };

  // ================================  
  // UI  
  // ================================
  return (
    <div className="call-container">
      <h2>{callStatus}</h2>

      <div className="video-box">
        <video ref={localStreamRef} autoPlay playsInline className="localVideo" />
        <video ref={remoteStreamRef} autoPlay playsInline className="remoteVideo" />
      </div>

      <button className="endCallBtn" onClick={endCall}>
        End Call
      </button>

      <style>{`
        .call-container {
          padding: 30px;
          text-align: center;
        }
        .video-box {
          display: flex;
          gap: 20px;
          justify-content: center;
        }
        video {
          width: 45%;
          height: 300px;
          background: #000;
          border-radius: 10px;
        }
        .endCallBtn {
          margin-top: 20px;
          background: red;
          color: white;
          padding: 12px 20px;
          border-radius: 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
