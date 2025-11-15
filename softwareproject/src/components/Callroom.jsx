import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function CallRoom({ socket }) {
  const { roomId } = useParams();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const [isCaller, setIsCaller] = useState(null); // null until we know role

  // ---------------------------------------------
  // JOIN CALL ROOM
  // ---------------------------------------------
  useEffect(() => {
    if (!socket) return;

    socket.emit("join-call", { roomId });

    // Server tells how many participants are present
    socket.on("room-joined", ({ participants }) => {
      console.log("👥 Participants in room:", participants);

      if (participants === 1) {
        setIsCaller(true);   // first user
      } else if (participants === 2) {
        setIsCaller(false);  // second user
      }
    });
  }, [socket]);

  // ---------------------------------------------
  // WHEN CALLER/CALLEE ROLE IS KNOWN → SETUP WEBRTC
  // ---------------------------------------------
  useEffect(() => {
    if (isCaller === null) return; // Wait for role

    console.log("🎯 Role decided:", isCaller ? "Caller" : "Callee");

    initWebRTC();
    setupSocketListeners();
  }, [isCaller]);

  // ---------------------------------------------
  // INIT MEDIA + PEER CONNECTION
  // ---------------------------------------------
  const initWebRTC = async () => {
    await initMedia();   // get camera
    createPeer();        // create RTCPeerConnection
    attachTracks();      // add tracks after creating PC
  };

  const initMedia = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localVideo.current.srcObject = localStreamRef.current;
      console.log("📷 Local stream ready");
    } catch (err) {
      console.error("Media error:", err);
    }
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

    // ICE candidate event
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    // Remote stream arrives
    pcRef.current.ontrack = (event) => {
      console.log("🎥 Remote track received");
      remoteVideo.current.srcObject = event.streams[0];
    };

    // Caller creates offer AFTER negotiation triggers
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

  // ---------------------------------------------
  // SIGNALING HANDLERS
  // ---------------------------------------------
  const setupSocketListeners = () => {
    // OFFER RECEIVED (callee)
    socket.on("offer", async ({ sdp }) => {
      console.log("📩 Offer received from caller");

      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );

      // Process queued ICE candidates
      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answer", { roomId, sdp: answer });
    });

    // ANSWER RECEIVED (caller)
    socket.on("answer", async ({ sdp }) => {
      console.log("📩 Answer received from callee");

      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );

      // Process queued ICE candidates
      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // ICE RECEIVED
    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (!pc.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ ICE error:", err);
      }
    });
  };

  // ---------------------------------------------
  // CLEANUP
  // ---------------------------------------------
  const cleanup = () => {
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
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
