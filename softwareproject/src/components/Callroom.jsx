import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function CallRoom({ socket }) {
  const { roomId } = useParams();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    initCall();
  }, []);

  const initCall = async () => {
    socket.emit("join-call", { roomId });

    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = localStream.current;

    peerRef.current = new RTCPeerConnection();

    localStream.current.getTracks().forEach(track =>
      peerRef.current.addTrack(track, localStream.current)
    );

    peerRef.current.ontrack = (event) => {
      remoteVideo.current.srcObject = event.streams[0];
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    socket.on("offer", async ({ sdp }) => {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit("answer", { roomId, sdp: answer });
    });

    socket.on("answer", async ({ sdp }) => {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", ({ candidate }) => {
      peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    peerRef.current.onnegotiationneeded = async () => {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socket.emit("offer", { roomId, sdp: offer });
    };
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <video ref={localVideo} autoPlay playsInline className="w-1/3 rounded border" />
      <video ref={remoteVideo} autoPlay playsInline className="w-1/3 rounded border mt-4" />
    </div>
  );
}
