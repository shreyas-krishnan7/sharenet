import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function CallRoom({ socket }) {
  const { roomId } = useParams();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const [roleKnown, setRoleKnown] = useState(false);
  const [isCaller, setIsCaller] = useState(null); // true = caller, false = callee

  // ---------------------------------------------
  // JOIN CALL ROOM (use server ack to avoid race)
  // ---------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // Join and use a callback acknowledgement from server
    socket.emit("join-call", { roomId }, (participants) => {
      console.log("👥 join-call ack participants:", participants);

      if (participants === 1) {
        setIsCaller(true);
      } else {
        setIsCaller(false);
      }

      setRoleKnown(true);
      // IMPORTANT: we do not init here directly, init happens in the next effect
    });

    // cleanup nothing else here
  }, [socket, roomId]);

  // ---------------------------------------------
  // Once role is known -> initialize webrtc + listeners
  // ---------------------------------------------
  useEffect(() => {
    if (!roleKnown) return;

    console.log("🎯 Role decided:", isCaller ? "Caller" : "Callee");
    setupSocketListeners();

    // init + listeners
    (async () => {
      await initWebRTC();
      
    })();

    // cleanup on unmount (remove socket listeners and close pc)
    return () => {
      cleanup();

      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKnown]);

  // ---------------------------------------------
  // INIT MEDIA + PEER CONNECTION
  // ---------------------------------------------
  const initWebRTC = async () => {
    await initMedia(); // get camera
    createPeer(); // create RTCPeerConnection
    attachTracks(); // add tracks after creating PC

    // FORCED OFFER: if caller, wait a short moment (ensures server/room fully stable)
    if (isCaller) {
      try {
        console.log("📡 Caller will create offer after short delay...");
        // small delay avoids racing with socket join propagation
        setTimeout(async () => {
          // double-check pc exists and socket connected
          if (!pcRef.current) return;
          if (!socket || !socket.connected) {
            console.warn("Socket not connected yet — skipping forced offer");
            return;
          }

          try {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            socket.emit("offer", { roomId, sdp: offer });
            console.log("📡 Offer sent");
          } catch (err) {
            console.error("Error creating/sending offer:", err);
          }
        }, 200); // 200ms delay is usually enough
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

      if (localVideo.current)
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

    // keep onnegotiationneeded as a no-op: we force offer explicitly for caller above
    pcRef.current.onnegotiationneeded = () => {};
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
    const handleOffer = async ({ sdp, from }) => {
      console.log("🔥 Incoming OFFER event:", { from, hasSDP: !!sdp });

      try {
        const pc = pcRef.current;
        if (!pc) {
          console.warn(
            "⚠️ PeerConnection missing — creating new one on callee"
          );
          createPeer();
        }

        console.log("📥 Setting remote description (offer)...");
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        console.log("✅ Remote description set");

        // Process queued candidates
        if (pendingCandidates.current.length > 0) {
          console.log(
            "🔄 Processing queued ICE candidates:",
            pendingCandidates.current.length
          );
        }

        while (pendingCandidates.current.length > 0) {
          const candidate = pendingCandidates.current.shift();
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("⚠️ Failed adding queued ICE:", err);
          }
        }

        console.log("🎤 Creating answer...");
        const answer = await pcRef.current.createAnswer();

        console.log("📥 Setting local description (answer)...");
        await pcRef.current.setLocalDescription(answer);

        console.log("📤 Sending ANSWER back to caller...");
        socket.emit("answer", { roomId, sdp: answer });

        console.log("✅ Answer sent successfully");
      } catch (err) {
        console.error("❌ ERROR in handleOffer():", err);
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

        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );

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
