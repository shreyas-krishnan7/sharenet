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
  // 1) JOIN + DETERMINE ROLE
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
  // 2) SOCKET LISTENERS
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
  // 3) AFTER ROLE IS KNOWN → START WEBRTC
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
  // 4) INIT WEBRTC
  // =========================================================
  const initWebRTC = async () => {
    await initMedia();
    createPeer();
    addExplicitTransceivers(); // 🔥 Important
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
      console.log("🎥 REMOTE TRACK ARRIVED, kind:", event.track.kind);

      if (event.streams?.length > 0) {
        remoteVideo.current.srcObject = event.streams[0];
      } else {
        const ms = new MediaStream([event.track]);
        remoteVideo.current.srcObject = ms;
      }
    };
  };

  // =========================================================
  // ADD EXPLICIT TRANSCEIVERS (IMPORTANT)
  // =========================================================
  const addExplicitTransceivers = () => {
    console.log("🔧 Adding explicit transceivers...");

    pcRef.current.addTransceiver("video", { direction: "sendrecv" });
    pcRef.current.addTransceiver("audio", { direction: "sendrecv" });

    console.log("✅ Transceivers added");
  };

  // =========================================================
  // ATTACH TRACKS USING REPLACE
  // =========================================================
  const attachTracks = () => {
    console.log("⭐ attachTracks CALLED on:", isCaller ? "Caller" : "Callee");

    if (!localStreamRef.current || !pcRef.current) return;

    const tracks = localStreamRef.current.getTracks();
    const senders = pcRef.current.getSenders();

    console.log("🔧 Attaching tracks. Senders:", senders.length, "Tracks:", tracks.length);

    tracks.forEach((track) => {
      const sender = senders.find((s) => s.track?.kind === track.kind);

      if (sender) {
        console.log(`✏️ Replacing track on sender: ${track.kind}`);
        sender.replaceTrack(track);
      } else {
        console.warn(`⚠️ No sender found for: ${track.kind} - addTrack`);
        pcRef.current.addTrack(track, localStreamRef.current);
      }
    });

    console.log("🎬 Tracks attached. Final senders:", pcRef.current.getSenders().length);
  };

  // =========================================================
  // 5) CALLER SENDS OFFER
  // =========================================================
  const sendOfferLater = () => {
    console.log("⏳ Caller will send offer in 600ms…");

    setTimeout(async () => {
      console.log("📍 About to attach tracks...");
      attachTracks();

      console.log("📡 Caller creating OFFER…");
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      const transceivers = pcRef.current.getTransceivers();
      console.log("📊 OFFER: Transceivers count:", transceivers.length);
      transceivers.forEach((t, i) =>
        console.log(`   [${i}] kind=${t.receiver.track?.kind}, direction=${t.direction}`)
      );

      socket.emit("offer", { roomId, sdp: offer });
      console.log("📤 OFFER SENT");
    }, 600);
  };

  // =========================================================
  // 6) CALLEE HANDLE OFFER
  // =========================================================
  // async function handleOffer({ sdp }) {
  //   console.log("🔥 OFFER received from caller");

  //   if (!pcRef.current) createPeer();

  //   await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

  //   const transceivers = pcRef.current.getTransceivers();
  //   console.log("📊 OFFER (Callee): Transceivers count:", transceivers.length);
  //   transceivers.forEach((t, i) =>
  //     console.log(`   [${i}] kind=${t.receiver.track?.kind}, direction=${t.direction}`)
  //   );

  //   if (localStreamRef.current) {
  //     console.log("📍 About to attach callee tracks...");
  //     attachTracks();
  //   }

  //   while (pendingCandidates.current.length > 0) {
  //     await pcRef.current.addIceCandidate(pendingCandidates.current.shift());
  //   }

  //   console.log("🎤 Creating ANSWER…");
  //   const answer = await pcRef.current.createAnswer();
  //   await pcRef.current.setLocalDescription(answer);

  //   socket.emit("answer", { roomId, sdp: answer });
  //   console.log("📤 ANSWER SENT");
  // }
 async function handleOffer({ sdp }) {
  console.log("🔥 OFFER received from caller");

  // (1) Make sure media is ready BEFORE answering
  if (!localStreamRef.current) {
    console.log("⏳ Callee waiting for media to be ready...");
    await initMedia();
  }

  // (2) Make sure PeerConnection + transceivers exist BEFORE SDP
  if (!pcRef.current) {
    createPeer();
    addExplicitTransceivers();
  }

  // (3) Set the remote SDP
  await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

  // (4) NOW attach tracks (this is the part NOT happening on your callee)
  console.log("📍 Callee attaching tracks (THIS MUST RUN)...");
  attachTracks();

  // (5) Apply queued ICE candidates
  while (pendingCandidates.current.length > 0) {
    const cand = pendingCandidates.current.shift();
    await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
  }

  // (6) Create + send the answer
  console.log("🎤 Creating ANSWER…");
  const answer = await pcRef.current.createAnswer();
  await pcRef.current.setLocalDescription(answer);

  socket.emit("answer", { roomId, sdp: answer });
  console.log("📤 ANSWER SENT");
}



  // =========================================================
  // 7) CALLER HANDLE ANSWER
  // =========================================================
  async function handleAnswer({ sdp }) {
    console.log("📩 ANSWER received from callee");

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

    const transceivers = pcRef.current.getTransceivers();
    console.log("📊 ANSWER: Transceivers count:", transceivers.length);
    transceivers.forEach((t, i) =>
      console.log(`   [${i}] kind=${t.receiver.track?.kind}, direction=${t.direction}`)
    );

    while (pendingCandidates.current.length > 0) {
      await pcRef.current.addIceCandidate(pendingCandidates.current.shift());
    }
  }

  // =========================================================
  // 8) ICE CANDIDATES
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
  // 9) CLEANUP
  // =========================================================
  const cleanup = () => {
    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}

    pendingCandidates.current = [];
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Video Call</h2>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex items-center justify-center">
            <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg">
              <video ref={localVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
            <div className="absolute mt-2 ml-2 text-sm text-gray-700">You</div>
          </div>

          <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex items-center justify-center">
            <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg">
              <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="absolute mt-2 ml-2 text-sm text-gray-700">Remote</div>
          </div>
        </div>
      </div>
    </div>
  );
}
