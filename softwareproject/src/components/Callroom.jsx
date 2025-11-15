import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function CallRoom({ socket }) {
  const { roomId } = useParams();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isCaller, setIsCaller] = useState(null); // null until known

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-call", { roomId });

    // 🔹 Server tells how many participants are in the room
    socket.on("room-joined", ({ participants }) => {
      if (participants === 1) {
        setIsCaller(true);     // First user
      } else if (participants === 2) {
        setIsCaller(false);    // Second user
      }
    });

    // Now wait for isCaller to be determined
  }, [socket]);

  // 🟦 When caller/callee is known, then initialize WebRTC
  useEffect(() => {
    if (isCaller === null) return; // Wait until we know role
    initWebRTC();
    setupSocketListeners();
  }, [isCaller]);

  // ----------------------------------------------------
  // INIT MEDIA + PEER CONNECTION
  // ----------------------------------------------------
  const initWebRTC = async () => {
    await initMedia();          // Get local camera
    createPeer();               // Create RTCPeerConnection
    attachTracks();             // Add tracks AFTER PC created
  };

  const initMedia = async () => {
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = localStreamRef.current;
  };

  const createPeer = () => {
    pcRef.current = new RTCPeerConnection({
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
    });

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pcRef.current.ontrack = (event) => {
      remoteVideo.current.srcObject = event.streams[0];
    };

    // 🔥 Negotiation only for caller
    pcRef.current.onnegotiationneeded = async () => {
      if (!isCaller) return;

      console.log("📡 Caller creating offer...");
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socket.emit("offer", { roomId, sdp: offer });
    };
  };

  const attachTracks = () => {
    localStreamRef.current.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, localStreamRef.current);
    });
  };

  // ----------------------------------------------------
  // SOCKET SIGNALING HANDLERS
  // ----------------------------------------------------
  const setupSocketListeners = () => {
    socket.on("offer", async ({ sdp }) => {
      console.log("📩 Offer received");
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answer", { roomId, sdp: answer });
    });

    socket.on("answer", async ({ sdp }) => {
      console.log("📩 Answer received");
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE error:", err);
      }
    });
  };

  // ----------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------
  const cleanup = () => {
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white gap-4">
      <h2 className="text-xl font-semibold mb-4">Video Call</h2>

      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        className="w-1/3 rounded-xl border"
      />

      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="w-1/3 rounded-xl border"
      />
    </div>
  );
}
