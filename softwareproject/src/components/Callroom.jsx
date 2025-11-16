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

  // ---------------------------
  // Helper logs (prefix with device/time if needed)
  // ---------------------------
  const log = (...args) => console.log(...args);

  // =========================================================
  // IMMEDIATELY request media on mount so both peers have streams
  // =========================================================
  useEffect(() => {
    (async () => {
      try {
        log("⏳ Requesting media immediately on mount...");
        await initMedia(); // safe if already called
        log("✅ Initial media (mount) ready");
      } catch (e) {
        log("⚠️ initial initMedia error:", e);
      }
    })();
    // we intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // 1) JOIN ROOM + DETERMINE ROLE (wait for local media before join)
  // =========================================================
  useEffect(() => {
    if (!socket) return;

    (async () => {
      // Ensure local media is ready BEFORE join so callee can attach tracks quickly
      if (!localStreamRef.current) {
        log("⏳ Waiting for localMedia before join...");
        try {
          await initMedia();
        } catch (err) {
          log("⚠️ initMedia failed before join:", err);
        }
      }

      socket.emit("join-call", { roomId }, (participants) => {
        log("👥 join-call ack participants:", participants);
        // participants === 1 => first person (caller)
        setIsCaller(participants === 1);
        setRoleKnown(true);
      });
    })();
  }, [socket, roomId]);

  // =========================================================
  // 2) GLOBAL SOCKET LISTENERS
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
  // 3) START WEBRTC once role known: create pc + transceivers
  // =========================================================
  useEffect(() => {
    if (!roleKnown) return;

    (async () => {
      log("🎯 ROLE:", isCaller ? "Caller" : "Callee");

      // create peer and ensure transceivers exist early
      if (!pcRef.current) {
        createPeer();
        addExplicitTransceivers();
      }

      // If caller, send offer after a small wait so callee has time to attach
      if (isCaller) {
        // slight delay to allow callee to finish join/initMedia
        setTimeout(() => sendOfferLater(), 400);
      }
    })();

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKnown, isCaller]);

  // =========================================================
  // MEDIA / PEER Creation
  // =========================================================
  const initMedia = async () => {
    // If already present, return quickly
    if (localStreamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
        localVideo.current.muted = true; // local preview muted
        localVideo.current.autoplay = true;
        localVideo.current.playsInline = true;
      }

      log("📷 Local stream ready, tracks:", stream.getTracks().map(t => t.kind));
    } catch (err) {
      log("Media error:", err);
      throw err;
    }
  };

  const createPeer = () => {
    if (pcRef.current) return;

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
      log("🔗 PeerConnection connectionState:", pcRef.current.connectionState);
    };

    pcRef.current.oniceconnectionstatechange = () => {
      log("🛰️ ICE connectionState:", pcRef.current.iceConnectionState);
    };

    pcRef.current.ontrack = (event) => {
      log("🎥 REMOTE TRACK ARRIVED", "trackKind:", event.track?.kind, "streams:", event.streams?.length);

      const stream = (event.streams && event.streams[0]) || new MediaStream([event.track]);
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = stream;
        remoteVideo.current.autoplay = true;
        remoteVideo.current.playsInline = true;
        remoteVideo.current.muted = false;

        // Try to play and also wait for metadata (some browsers require it)
        remoteVideo.current.onloadedmetadata = () => {
          log("🎉 remote onloadedmetadata — attempting play()");
          remoteVideo.current.play().catch(err => log("⚠️ remote play() error:", err));
        };

        // Force a play attempt (may be blocked but that gives a useful error)
        setTimeout(() => {
          remoteVideo.current.play().catch((err) => {
            log("⚠️ remote play() attempt:", err);
          });
        }, 150);
      } else {
        log("⚠️ remoteVideo ref missing");
      }
    };

    log("🛠️ PeerConnection created");
  };

  // =========================================================
  // EXPLICIT TRANSCEIVERS
  // =========================================================
  const addExplicitTransceivers = () => {
    if (!pcRef.current) return;
    log("🔧 Adding explicit transceivers...");
    try {
      pcRef.current.addTransceiver("video", { direction: "sendrecv" });
      pcRef.current.addTransceiver("audio", { direction: "sendrecv" });
      log("✅ Transceivers added");
    } catch (e) {
      log("⚠️ addTransceiver error:", e);
    }
  };

  // =========================================================
  // ATTACH TRACKS (replace when possible)
  // =========================================================
  const attachTracks = () => {
    log("⭐ attachTracks CALLED on:", isCaller ? "Caller" : "Callee");

    if (!localStreamRef.current) {
      log("⚠️ attachTracks: no local stream to attach");
      return;
    }
    if (!pcRef.current) {
      log("⚠️ attachTracks: no pcRef");
      return;
    }

    const tracks = localStreamRef.current.getTracks();
    log("🔧 Attaching tracks. current senders:", pcRef.current.getSenders().length, "local tracks:", tracks.length);

    tracks.forEach((track) => {
      // try to find a sender for this kind and replace it
      const senders = pcRef.current.getSenders();
      const sender = senders.find((s) => s.track?.kind === track.kind);

      if (sender) {
        log(`✏️ Replacing track on sender: ${track.kind}`);
        sender.replaceTrack(track);
      } else {
        log(`➕ No sender found for ${track.kind}, calling addTrack`);
        pcRef.current.addTrack(track, localStreamRef.current);
      }
    });

    log("🎬 Tracks attached. Final senders:", pcRef.current.getSenders().length);
  };

  // =========================================================
  // SEND OFFER (caller)
  // =========================================================
  const sendOfferLater = () => {
    log("⏳ Caller will send offer in 400ms…");
    setTimeout(async () => {
      try {
        log("📍 About to attach tracks (caller)...");
        attachTracks();

        log("📡 Caller creating OFFER…");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        const transceivers = pcRef.current.getTransceivers();
        log("📊 OFFER: Transceivers count:", transceivers.length);
        transceivers.forEach((t, i) => {
          log(`   [${i}] kind=${t.receiver?.track?.kind || t.sender?.track?.kind || "unknown"}, direction=${t.direction}`);
        });

        socket.emit("offer", { roomId, sdp: offer });
        log("📤 OFFER SENT");
      } catch (err) {
        log("❌ Error creating/sending offer:", err);
      }
    }, 400);
  };

  // =========================================================
  // HANDLE OFFER (callee) - robust: wait for media & transceivers
  // =========================================================
  async function handleOffer({ sdp }) {
    log("🔥 OFFER received from caller");

    // Ensure local media is ready
    if (!localStreamRef.current) {
      log("⏳ Callee waiting for media...");
      try {
        await initMedia();
      } catch (e) {
        log("⚠️ initMedia failed in handleOffer:", e);
      }
    }

    // Ensure peer + transceivers exist
    if (!pcRef.current) {
      createPeer();
      addExplicitTransceivers();
    }

    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
      log("❌ setRemoteDescription error:", e);
    }

    // Attach tracks NOW (this must run)
    log("📍 Callee attaching tracks...");
    attachTracks();

    // Add queued ICE candidates
    while (pendingCandidates.current.length > 0) {
      try {
        const cand = pendingCandidates.current.shift();
        await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        log("⚠️ addIceCandidate error while draining queue:", e);
      }
    }

    try {
      log("🎤 Creating ANSWER…");
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { roomId, sdp: answer });
      log("📤 ANSWER SENT");
    } catch (e) {
      log("❌ Error creating/sending answer:", e);
    }
  }

  // =========================================================
  // HANDLE ANSWER (caller)
  // =========================================================
  async function handleAnswer({ sdp }) {
    log("📩 ANSWER received from callee");

    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
      log("❌ setRemoteDescription on answer error:", e);
    }

    log("📊 ANSWER: transceivers:", pcRef.current.getTransceivers().length);
    pcRef.current.getTransceivers().forEach((t, i) =>
      log(`   [${i}] kind=${t.receiver?.track?.kind || t.sender?.track?.kind || "unknown"}, direction=${t.direction}`)
    );

    // Drain pending ICE candidates
    while (pendingCandidates.current.length > 0) {
      try {
        const cand = pendingCandidates.current.shift();
        await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        log("⚠️ addIceCandidate error while draining queue after answer:", e);
      }
    }
  }

  // =========================================================
  // ICE CANDIDATE
  // =========================================================
  async function handleICE({ candidate }) {
    // store until remoteDescription is available
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      pendingCandidates.current.push(candidate);
      log("🔁 Queued ICE candidate (no remoteDescription yet). queueLen:", pendingCandidates.current.length);
      return;
    }

    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      log("➕ added ICE candidate");
    } catch (err) {
      log("❌ ICE add error:", err);
    }
  }

  // =========================================================
  // CLEANUP
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
    log("🧹 cleanup done");
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Video Call</h2>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Local video box */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex items-center justify-center relative">
            <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg">
              <video ref={localVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
            <div className="absolute mt-2 ml-2 text-sm text-gray-700">You</div>
          </div>

          {/* Remote video box */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex items-center justify-center relative">
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
