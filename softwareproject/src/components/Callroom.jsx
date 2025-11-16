// import React, { useEffect, useRef, useState } from "react";
// import { useParams } from "react-router-dom";

// export default function CallRoom({ socket }) {
//   const { roomId } = useParams();

//   const localVideo = useRef(null);
//   const remoteVideo = useRef(null);

//   const pcRef = useRef(null);
//   const localStreamRef = useRef(null);
//   const pendingCandidates = useRef([]);

//   const [roleKnown, setRoleKnown] = useState(false);
//   const [isCaller, setIsCaller] = useState(null);

//   // =========================================================
//   // 1) --- GLOBAL SOCKET LISTENERS (stable references) ---
//   // =========================================================

//   const handleOffer = async ({ sdp }) => {
//     console.log("🔥 OFFER received from caller");

//     try {
//       if (!pcRef.current) {
//         console.warn("⚠️ PeerConnection missing — creating new peer");
//         createPeer();
//       }

//       await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
//       console.log("📥 Remote description (offer) SET");

//       // Handle queued ICE
//       while (pendingCandidates.current.length > 0) {
//         const cand = pendingCandidates.current.shift();
//         await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
//       }

//       const answer = await pcRef.current.createAnswer();
//       await pcRef.current.setLocalDescription(answer);
//       socket.emit("answer", { roomId, sdp: answer });

//       console.log("📤 ANSWER sent");
//     } catch (err) {
//       console.error("❌ Error in handleOffer:", err);
//     }
//   };

//   const handleAnswer = async ({ sdp }) => {
//     console.log("📩 ANSWER received from callee");

//     try {
//       await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

//       while (pendingCandidates.current.length > 0) {
//         const cand = pendingCandidates.current.shift();
//         await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
//       }
//     } catch (err) {
//       console.error("❌ Error in handleAnswer:", err);
//     }
//   };

//   const handleICE = async ({ candidate }) => {
//     const pc = pcRef.current;

//     if (!pc || !pc.remoteDescription) {
//       pendingCandidates.current.push(candidate);
//       return;
//     }

//     try {
//       await pc.addIceCandidate(new RTCIceCandidate(candidate));
//     } catch (err) {
//       console.error("❌ ICE candidate error:", err);
//     }
//   };

//   // Attach global listeners ONCE
//   useEffect(() => {
//     if (!socket) return;

//     socket.on("offer", handleOffer);
//     socket.on("answer", handleAnswer);
//     socket.on("ice-candidate", handleICE);

//     return () => {
//       socket.off("offer", handleOffer);
//       socket.off("answer", handleAnswer);
//       socket.off("ice-candidate", handleICE);
//     };
//   }, [socket]);

//   // =========================================================
//   // 2) --- JOIN ROOM + DETERMINE ROLE ---
//   // =========================================================
//   useEffect(() => {
//     if (!socket) return;

//     socket.emit("join-call", { roomId }, (participants) => {
//       console.log("👥 join-call ack participants:", participants);

//       setIsCaller(participants === 1);
//       setRoleKnown(true);
//     });
//   }, [socket, roomId]);

//   // =========================================================
//   // 3) --- WHEN ROLE IS KNOWN  → START WEBRTC ---
//   // =========================================================
//   useEffect(() => {
//     if (!roleKnown) return;

//     console.log("🎯 ROLE:", isCaller ? "Caller" : "Callee");

//     (async () => {
//       await initWebRTC();
//     })();

//     return () => cleanup();
//   }, [roleKnown]);

//   // =========================================================
//   // 4) --- INIT WEBRTC PIPELINE ---
//   // =========================================================

//   const initWebRTC = async () => {
//     await initMedia();
//     createPeer();
//     attachTracks();

//     if (isCaller) {
//       console.log("📡 Caller will send offer after short delay...");
//       setTimeout(sendOfferAsCaller, 500);
//     }
//   };

//   const initMedia = async () => {
//     try {
//       localStreamRef.current = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });

//       localVideo.current.srcObject = localStreamRef.current;
//       console.log("📷 Local stream ready");
//     } catch (err) {
//       console.error("Media error:", err);
//     }
//   };

//   const createPeer = () => {
//     pcRef.current = new RTCPeerConnection({
//       iceServers: [
//         { urls: "stun:stun.relay.metered.ca:80" },
//         {
//           urls: "turn:global.relay.metered.ca:80",
//           username: "99233f39212e9124c007bab2",
//           credential: "1TiVAiSMvWI3b6ah",
//         },
//         {
//           urls: "turn:global.relay.metered.ca:443",
//           username: "99233f39212e9124c007bab2",
//           credential: "1TiVAiSMvWI3b6ah",
//         },
//       ],
//     });

//     pcRef.current.onicecandidate = (e) => {
//       if (e.candidate) {
//         socket.emit("ice-candidate", { roomId, candidate: e.candidate });
//       }
//     };

//     pcRef.current.ontrack = (event) => {
//       console.log("🎥 Remote track received");
//       remoteVideo.current.srcObject = event.streams[0];
//     };

//     pcRef.current.onnegotiationneeded = () => {};
//   };

//   const attachTracks = () => {
//     localStreamRef.current.getTracks().forEach((track) => {
//       pcRef.current.addTrack(track, localStreamRef.current);
//     });
//   };

//   const sendOfferAsCaller = async () => {
//     if (!pcRef.current) return;

//     console.log("📡 Caller creating OFFER");
//     try {
//       const offer = await pcRef.current.createOffer();
//       await pcRef.current.setLocalDescription(offer);

//       socket.emit("offer", { roomId, sdp: offer });
//       console.log("📤 OFFER SENT");
//     } catch (err) {
//       console.error("❌ Error sending offer:", err);
//     }
//   };

//   // =========================================================
//   // 5) --- CLEANUP ---
//   // =========================================================
//   const cleanup = () => {
//     try {
//       if (pcRef.current) {
//         pcRef.current.close();
//         pcRef.current = null;
//       }
//     } catch (err) {}

//     try {
//       if (localStreamRef.current) {
//         localStreamRef.current.getTracks().forEach((t) => t.stop());
//       }
//     } catch (err) {}

//     pendingCandidates.current = [];
//   };

//   // =========================================================
//   // 6) --- UI ---
//   // =========================================================

//   return (
//     <div className="flex flex-col items-center justify-center h-screen bg-black text-white gap-4">
//       <h2 className="text-xl font-semibold mb-4">Video Call</h2>

//       <video
//         ref={localVideo}
//         autoPlay
//         muted
//         playsInline
//         className="w-1/3 rounded-xl border"
//       />

//       <video
//         ref={remoteVideo}
//         autoPlay
//         playsInline
//         className="w-1/3 rounded-xl border"
//       />
//     </div>
//   );
// }

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
  const [isCaller, setIsCaller] = useState(null);

  // =========================================================
  // 1) --- JOIN ROOM + DETERMINE ROLE ---
  // =========================================================
  useEffect(() => {
    if (!socket) return;

    socket.emit("join-call", { roomId }, (participants) => {
      console.log("👥 join-call ack participants:", participants);

      setIsCaller(participants === 1);
      setRoleKnown(true);
    });
  }, [socket, roomId]);

  // =========================================================
  // 2) --- GLOBAL SOCKET LISTENERS ---
  // =========================================================
  useEffect(() => {
    if (!socket) return;

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleICE);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleICE);
    };
  }, [socket]);

  // =========================================================
  // 3) --- AFTER ROLE IS KNOWN → START WEBRTC ---
  // =========================================================
  useEffect(() => {
    if (!roleKnown) return;

    console.log("🎯 ROLE:", isCaller ? "Caller" : "Callee");

    (async () => {
      await initWebRTC();
      if (isCaller) sendOfferLater();
    })();

    return () => cleanup();
  }, [roleKnown]);

  // =========================================================
  // 4) --- INIT WEBRTC ---
  // =========================================================
  const initWebRTC = async () => {
    await initMedia();
    createPeer();
    // TRACKS WILL BE ATTACHED LATER BEFORE OFFER (important)
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
          urls: "turn:global.relay.metered.ca:443",
          username: "99233f39212e9124c007bab2",
          credential: "1TiVAiSMvWI3b6ah",
        },
      ],
    });

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: e.candidate });
      }
    };

    pcRef.current.onconnectionstatechange = () => {
      console.log("🔗 PeerConnection connectionState:", pcRef.current.connectionState);
    };

    pcRef.current.oniceconnectionstatechange = () => {
      console.log("🛰️ ICE connectionState:", pcRef.current.iceConnectionState);
    };

    pcRef.current.ontrack = (event) => {
      console.log("🎥 Remote track received", event);
      try {
        // Prefer full stream if provided
        let streamToUse = null;
        if (event.streams && event.streams[0]) {
          streamToUse = event.streams[0];
        } else if (event.track) {
          // Fallback: create a stream from the single track
          streamToUse = new MediaStream([event.track]);
        }

        if (!streamToUse) {
          console.warn("ontrack received no streams or track", event);
          return;
        }

        // Temporarily mute remote video to allow autoplay in many browsers
        try {
          remoteVideo.current.muted = true;
        } catch (e) {}

        remoteVideo.current.srcObject = streamToUse;

        // play and then unmute when playback starts
        const playPromise = remoteVideo.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("▶️ Remote video playing");
              try {
                remoteVideo.current.muted = false;
              } catch (e) {}
            })
            .catch((err) => {
              console.warn("Remote video play() blocked or errored:", err);
            });
        }
      } catch (err) {
        console.error("Error setting remote stream:", err);
      }
    };
  };

  const attachTracks = () => {
    if (!localStreamRef.current || !pcRef.current) return;

    localStreamRef.current.getTracks().forEach((track) => {
      console.log("➕ Attaching track to PeerConnection:", track.kind, track);
      const sender = pcRef.current.addTrack(track, localStreamRef.current);
      console.log("   -> sender added:", sender && sender.track && sender.track.kind);
    });

    console.log("🎬 Tracks attached (senders):", pcRef.current.getSenders().map(s => s.track && s.track.kind));
  };

  // =========================================================
  // 5) --- CALLER CREATES OFFER LATE (stable) ---
  // =========================================================
  const sendOfferLater = () => {
    console.log("⏳ Caller will send offer in 600ms…");

    setTimeout(async () => {
      try {
        // IMPORTANT: attach tracks HERE (not earlier)
        attachTracks();

        console.log("📡 Caller creating OFFER…");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        socket.emit("offer", { roomId, sdp: offer });
        console.log("📤 OFFER SENT");
      } catch (err) {
        console.error("❌ Error creating offer:", err);
      }
    }, 600);
  };

  // =========================================================
  // 6) --- OFFER RECEIVED (CALLEE) ---
  // =========================================================
  async function handleOffer({ sdp }) {
    console.log("🔥 OFFER received from caller");

    if (!pcRef.current) createPeer();

    // Callee MUST attach tracks at offer time
    if (localStreamRef.current) {
      attachTracks();
    }

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

    // Ice candidates that came early
    while (pendingCandidates.current.length > 0) {
      const cand = pendingCandidates.current.shift();
      await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
    }

    console.log("🎤 Creating ANSWER…");
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    socket.emit("answer", { roomId, sdp: answer });
    console.log("📤 ANSWER SENT");
  }

  // =========================================================
  // 7) --- ANSWER RECEIVED (CALLER) ---
  // =========================================================
  async function handleAnswer({ sdp }) {
    console.log("📩 ANSWER received from callee");

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

    while (pendingCandidates.current.length > 0) {
      const cand = pendingCandidates.current.shift();
      await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
    }
  }

  // =========================================================
  // 8) --- ICE CANDIDATE ---
  // =========================================================
  async function handleICE({ candidate }) {
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      pendingCandidates.current.push(candidate);
      return;
    }

    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("❌ ICE error:", err);
    }
  }

  // =========================================================
  // 9) --- CLEANUP ---
  // =========================================================
  const cleanup = () => {
    try {
      pcRef.current?.close();
    } catch (err) {}
    pcRef.current = null;

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {}

    pendingCandidates.current = [];
  };

  // =========================================================
  // UI
  // =========================================================
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

