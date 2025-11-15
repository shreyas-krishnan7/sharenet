import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function CallRoom({ socket }) {
  const { roomId } = useParams();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isCaller, setIsCaller] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-call", { roomId });

    socket.once("ready", () => {
      setIsCaller(true); // first user
    });

    socket.once("other-joined", () => {
      setIsCaller(false); // second user
    });

    initMedia();
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, []);

  const initMedia = async () => {
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = localStreamRef.current;

    pcRef.current = createPeerConnection();

    localStreamRef.current
      .getTracks()
      .forEach((track) =>
        pcRef.current.addTrack(track, localStreamRef.current)
      );
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      remoteVideo.current.srcObject = event.streams[0];
    };

    pc.onnegotiationneeded = async () => {
      // Wait until isCaller has correct value
      await new Promise((r) => setTimeout(r, 200));

      if (!isCaller) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", { roomId, sdp: offer });
    };

    return pc;
  };

  const setupSocketListeners = () => {
    socket.on("offer", async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answer", { roomId, sdp: answer });
    });

    socket.on("answer", async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE error:", err);
      }
    });

    socket.on("room-joined", ({ participants }) => {
      if (participants === 1) {
        setIsCaller(true);
        socket.emit("ready", roomId);
      } else if (participants === 2) {
        setIsCaller(false);
        socket.emit("other-joined", roomId);
      }
    });
  };

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
