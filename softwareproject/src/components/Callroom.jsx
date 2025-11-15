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
    const handleRoomJoined = ({ participants }) => {
      console.log("👥 Participants in room:", participants);

      if (participants === 1) {
        setIsCaller(true); // first user
      } else if (participants === 2) {
        setIsCaller(false); // second user
      }
    };

    socket.on("room-joined", handleRoomJoined);

    return () => {
      socket.off("room-joined", handleRoomJoined);
    };
  }, [socket, roomId]);

  // ---------------------------------------------
  // WHEN CALLER/CALLEE ROLE IS KNOWN → SETUP WEBRTC
  // ---------------------------------------------
  useEffect(() => {
    if (isCaller === null) return; // Wait for role

    console.log("🎯 Role decided:", isCaller ? "Caller" : "Callee");

    // set up webRTC and listeners
    (async () => {
      await initWebRTC();
      setupSocketListeners();
    })();

    // cleanup listeners and connection on unmount or role change
    return () => {
      cleanup();
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCaller]);

  // ---------------------------------------------
  // INIT MEDIA + PEER CONNECTION
  // ---------------------------------------------
  const initWebRTC = async () => {
    await initMedia(); // get camera
    createPeer(); // create RTCPeerConnection
    attachTracks(); // add tracks after creating PC

    // <-- FORCED OFFER: some browsers (mobile) don't trigger negotiationneeded reliably.
    // If we're the caller, create and send the offer now (guaranteed).
    if (isCaller) {
      try {
        console.log("📡 Caller forcing offer creation...");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit("offer", { roomId, sdp: offer });
      } catch (err) {
        console.error("Error forcing offer:", err);
      }
    }
  };

  const initMedia = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideo.current) localVideo.current.srcObject = localStreamRef.current;
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
      if (event?.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    // Remote stream arrives
    pcRef.current.ontrack = (event) => {
      console.log("🎥 Remote track received");
      if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
    };

    // Keep onnegotiationneeded as a fallback (some browsers do fire it)
    pcRef.current.onnegotiationneeded = async () => {
      if (!isCaller) return;
    };
  };

  const attachTracks = () => {
    if (!localStreamRef.current || !pcRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, localStreamRef.current);
    });
  };

  // ---------------------------------------------
  // SIGNALING HANDLERS
  // ---------------------------------------------
  const setupSocketListeners = () => {
    // OFFER RECEIVED (callee)
    const handleOffer = async ({ sdp }) => {
      try {
        console.log("📩 Offer received from caller");

        // ensure peer exists
        if (!pcRef.current) createPeer();

        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

        // Process queued ICE candidates (that arrived early)
        while (pendingCandidates.current.length > 0) {
          const candidate = pendingCandidates.current.shift();
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed adding queued candidate:", err);
          }
        }

        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        socket.emit("answer", { roomId, sdp: answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    // ANSWER RECEIVED (caller)
    const handleAnswer = async ({ sdp }) => {
      try {
        console.log("📩 Answer received from callee");

        if (!pcRef.current) {
          console.warn("pcRef missing when answer arrived — creating peer");
          createPeer();
        }

        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

        // Process queued ICE candidates
        while (pendingCandidates.current.length > 0) {
          const candidate = pendingCandidates.current.shift();
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed adding queued candidate:", err);
          }
        }
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    };

    // ICE RECEIVED
    const handleIce = async ({ candidate }) => {
      try {
        const pc = pcRef.current;
        if (!pc) {
          // pc not ready — queue the candidate
          pendingCandidates.current.push(candidate);
          return;
        }

        if (!pc.remoteDescription || !pc.remoteDescription.type) {
          // remote description not set yet — queue
          pendingCandidates.current.push(candidate);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ ICE error:", err);
      }
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIce);
  };

  // ---------------------------------------------
  // CLEANUP
  // ---------------------------------------------
  const cleanup = () => {
    try {
      if (pcRef.current) {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onnegotiationneeded = null;
        pcRef.current.close();
        pcRef.current = null;
      }
    } catch (e) {
      console.warn("Error closing pc:", e);
    }

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.warn("Error stopping tracks:", e);
      }
      localStreamRef.current = null;
    }

    // clear pending candidates
    pendingCandidates.current = [];
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
