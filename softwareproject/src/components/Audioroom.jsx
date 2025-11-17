import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connect } from "twilio-video";

export default function AudioCallRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const audioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [partner, setPartner] = useState(null);

  const user = JSON.parse(localStorage.getItem("userInfo"));
  const identity = `audio_${user.email}`;

  useEffect(() => {
    let twilioRoom = null;

    const joinAudioRoom = async () => {
      try {
        const tokenRes = await fetch(
          `https://sharenet-production.up.railway.app/twilio/token?identity=${identity}&room=${roomId}`
        );

        const { token } = await tokenRes.json();

        // connect audio only
        twilioRoom = await connect(token, {
          name: roomId,
          audio: true,
          video: false, // 🔥 Disable video completely
        });

        setRoom(twilioRoom);

        // Attach local audio
        twilioRoom.localParticipant.audioTracks.forEach((pub) => {
          const audioEl = pub.track.attach();
          audioEl.muted = true; // Avoid echo
          audioRef.current.appendChild(audioEl);
        });

        // When remote user joins
        twilioRoom.on("participantConnected", (participant) => {
          setPartner(participant.identity);

          participant.on("trackSubscribed", (track) => {
            if (track.kind === "audio") {
              const audioEl = track.attach();
              audioEl.autoplay = true;
              remoteAudioRef.current.appendChild(audioEl);
            }
          });
        });

        // Remote left
        twilioRoom.on("participantDisconnected", () => {
          setPartner(null);
          remoteAudioRef.current.innerHTML = "";
        });

      } catch (err) {
        console.log(err);
      }
    };

    joinAudioRoom();

    return () => {
      if (twilioRoom) twilioRoom.disconnect();
    };
  }, [roomId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">

      <h1 className="text-3xl font-bold mb-6">Voice Call</h1>

      {/* local audio (hidden) */}
      <div ref={audioRef}></div>

      {/* remote audio (hidden) */}
      <div ref={remoteAudioRef}></div>

      <div className="flex flex-col items-center bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="w-40 h-40 rounded-full overflow-hidden mb-4 border-4 border-green-400">
          <img
            src={user.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="You"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xl mb-6">You</p>

        <hr className="w-32 border-gray-600 my-4" />

        <div className="w-40 h-40 rounded-full overflow-hidden mb-4 border-4 border-blue-400">
          <img
            src={user.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="Partner"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xl">{partner || "Waiting for partner..."}</p>
      </div>

      <button
        onClick={() => {
          if (room) room.disconnect();
          navigate("/");
        }}
        className="px-8 py-3 mt-8 bg-red-600 hover:bg-red-700 rounded text-white font-semibold"
      >
        End Call
      </button>

    </div>
  );
}

