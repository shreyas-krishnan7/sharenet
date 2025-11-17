import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connect } from "twilio-video";

export default function AudioCallRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);

  const audioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("userInfo"));
  // 🔥 Use same identity pattern as video room
  const identity = user?.id?.toString() || "user";

  const log = (...args) => console.log("🎤 Audio:", ...args);

  useEffect(() => {
    let twilioRoom = null;

    const joinAudioRoom = async () => {
      try {
        log(`Requesting token for identity: ${identity}, room: ${roomId}`);
        setLoading(true);

        const tokenRes = await fetch(
          `https://sharenet-production.up.railway.app/twilio/token?identity=${encodeURIComponent(identity)}&room=${roomId}`
        );

        if (!tokenRes.ok) {
          throw new Error(`Token fetch failed: ${tokenRes.status}`);
        }

        const { token } = await tokenRes.json();
        log("✅ Token received");

        // 🔥 Connect audio only
        log("🔌 Connecting to audio room...");
        twilioRoom = await connect(token, {
          name: roomId,
          audio: true,
          video: false, // 🔥 Disable video completely
        });

        setRoom(twilioRoom);
        setLoading(false);
        log("✅ Connected to audio room");

        // Attach local audio
        twilioRoom.localParticipant.audioTracks.forEach((pub) => {
          try {
            const audioEl = pub.track.attach();
            audioEl.muted = true; // Avoid echo
            if (audioRef.current) {
              audioRef.current.innerHTML = "";
              audioRef.current.appendChild(audioEl);
              log("✅ Local audio attached");
            }
          } catch (e) {
            log("⚠️ Error attaching local audio:", e.message);
          }
        });

        // Handle existing participants
        log(`📊 Initial participants: ${twilioRoom.participants.size}`);
        twilioRoom.participants.forEach((participant) => {
          log(`👤 Participant already in room: ${participant.sid}`);
          handleParticipantConnected(participant);
        });

        // When remote user joins
        twilioRoom.on("participantConnected", (participant) => {
          log(`👤 New participant connected: ${participant.sid}`);
          handleParticipantConnected(participant);
        });

        // Remote left
        twilioRoom.on("participantDisconnected", (participant) => {
          log(`👤 Participant disconnected: ${participant.sid}`);
          setParticipants((p) => p.filter((pt) => pt.sid !== participant.sid));
          remoteAudioRef.current.innerHTML = "";
        });
      } catch (err) {
        log("❌ Error joining audio room:", err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    const handleParticipantConnected = (participant) => {
      try {
        setParticipants((p) => [...p, participant]);

        participant.on("trackSubscribed", (track) => {
          try {
            if (track.kind === "audio") {
              const audioEl = track.attach();
              audioEl.autoplay = true;
              if (remoteAudioRef.current) {
                remoteAudioRef.current.innerHTML = "";
                remoteAudioRef.current.appendChild(audioEl);
                log("✅ Remote audio attached");
              }
            }
          } catch (e) {
            log("⚠️ Error attaching remote audio:", e.message);
          }
        });

        participant.on("trackUnsubscribed", () => {
          log(`⏹️ Remote audio unsubscribed`);
        });
      } catch (e) {
        log("⚠️ Error in handleParticipantConnected:", e.message);
      }
    };

    joinAudioRoom();

    return () => {
      if (twilioRoom) {
        log("🧹 Disconnecting from audio room...");
        twilioRoom.disconnect();
      }
    };
  }, [roomId, identity]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-2">🎤 Voice Call</h1>
      <p className="text-gray-400 mb-6">Room: {roomId}</p>

      {loading && <div className="mb-4 text-blue-400">🔌 Connecting...</div>}
      {error && <div className="mb-4 text-red-400">❌ Error: {error}</div>}

      {/* local audio (hidden) */}
      <div ref={audioRef}></div>

      {/* remote audio (hidden) */}
      <div ref={remoteAudioRef}></div>

      <div className="flex flex-col items-center bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="w-40 h-40 rounded-full overflow-hidden mb-4 border-4 border-green-400">
          <img
            src={user?.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="You"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xl mb-6">You ({user?.name || "User"})</p>

        <hr className="w-32 border-gray-600 my-4" />

        <div className="w-40 h-40 rounded-full overflow-hidden mb-4 border-4 border-blue-400">
          <img
            src={user?.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="Partner"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xl">
          {participants.length > 0 ? `Partner (${participants.length})` : "Waiting for partner..."}
        </p>
      </div>

      {/* End Call Button */}
      <button
        onClick={() => {
          if (room) room.disconnect();
          navigate("/");
        }}
        className="px-8 py-3 mt-8 bg-red-600 hover:bg-red-700 rounded text-white font-semibold transition"
      >
        End Call
      </button>
    </div>
  );
}

