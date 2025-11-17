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

//   // ---------------------------
//   // Helper logs (prefix with device/time if needed)
//   // ---------------------------
//   const log = (...args) => console.log(...args);

//   // =========================================================
//   // IMMEDIATELY request media on mount so both peers have streams
//   // =========================================================
//   useEffect(() => {
//     (async () => {
//       try {
//         log("⏳ Requesting media immediately on mount...");
//         await initMedia(); // safe if already called
//         log("✅ Initial media (mount) ready");
//       } catch (e) {
//         log("⚠️ initial initMedia error:", e);
//       }
//     })();
//     // we intentionally run once on mount
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // =========================================================
//   // 1) JOIN ROOM + DETERMINE ROLE (wait for local media before join)
//   // =========================================================
//   useEffect(() => {
//     if (!socket) return;

//     (async () => {
//       // Ensure local media is ready BEFORE join so callee can attach tracks quickly
//       if (!localStreamRef.current) {
//         log("⏳ Waiting for localMedia before join...");
//         try {
//           await initMedia();
//         } catch (err) {
//           log("⚠️ initMedia failed before join:", err);
//         }
//       }

//       socket.emit("join-call", { roomId }, (participants) => {
//         log("👥 join-call ack participants:", participants);
//         // participants === 1 => first person (caller)
//         setIsCaller(participants === 1);
//         setRoleKnown(true);
//       });
//     })();
//   }, [socket, roomId]);

//   // =========================================================
//   // 2) GLOBAL SOCKET LISTENERS
//   // =========================================================
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
//   // 3) START WEBRTC once role known: create pc + transceivers
//   // =========================================================
//   useEffect(() => {
//     if (!roleKnown) return;

//     (async () => {
//       log("🎯 ROLE:", isCaller ? "Caller" : "Callee");

//       // create peer and ensure transceivers exist early
//       if (!pcRef.current) {
//         createPeer();
//         addExplicitTransceivers();
//       }

//       // If caller, send offer after a small wait so callee has time to attach
//       if (isCaller) {
//         // slight delay to allow callee to finish join/initMedia
//         setTimeout(() => sendOfferLater(), 400);
//       }
//     })();

//     return () => cleanup();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [roleKnown, isCaller]);

//   // =========================================================
//   // MEDIA / PEER Creation
//   // =========================================================
//   const initMedia = async () => {
//     // If already present, return quickly
//     if (localStreamRef.current) return;

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       localStreamRef.current = stream;

//       if (localVideo.current) {
//         localVideo.current.srcObject = stream;
//         localVideo.current.muted = true; // local preview muted
//         localVideo.current.autoplay = true;
//         localVideo.current.playsInline = true;
//       }

//       log("📷 Local stream ready, tracks:", stream.getTracks().map(t => t.kind));
//     } catch (err) {
//       log("Media error:", err);
//       throw err;
//     }
//   };

//   const createPeer = () => {
//     if (pcRef.current) return;

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

//     pcRef.current.onconnectionstatechange = () => {
//       log("🔗 PeerConnection connectionState:", pcRef.current.connectionState);
//     };

//     pcRef.current.oniceconnectionstatechange = () => {
//       log("🛰️ ICE connectionState:", pcRef.current.iceConnectionState);
//     };

//     pcRef.current.ontrack = (event) => {
//       log("🎥 REMOTE TRACK ARRIVED", "trackKind:", event.track?.kind, "streams:", event.streams?.length);

//       const stream = (event.streams && event.streams[0]) || new MediaStream([event.track]);
//       if (remoteVideo.current) {
//         remoteVideo.current.srcObject = stream;
//         remoteVideo.current.autoplay = true;
//         remoteVideo.current.playsInline = true;
//         remoteVideo.current.muted = false;

//         // Try to play and also wait for metadata (some browsers require it)
//         remoteVideo.current.onloadedmetadata = () => {
//           log("🎉 remote onloadedmetadata — attempting play()");
//           remoteVideo.current.play().catch(err => log("⚠️ remote play() error:", err));
//         };

//         // Force a play attempt (may be blocked but that gives a useful error)
//         setTimeout(() => {
//           remoteVideo.current.play().catch((err) => {
//             log("⚠️ remote play() attempt:", err);
//           });
//         }, 150);
//       } else {
//         log("⚠️ remoteVideo ref missing");
//       }
//     };

//     log("🛠️ PeerConnection created");
//   };

//   // =========================================================
//   // EXPLICIT TRANSCEIVERS
//   // =========================================================
//   const addExplicitTransceivers = () => {
//     if (!pcRef.current) return;
//     log("🔧 Adding explicit transceivers...");
//     try {
//       pcRef.current.addTransceiver("video", { direction: "sendrecv" });
//       pcRef.current.addTransceiver("audio", { direction: "sendrecv" });
//       log("✅ Transceivers added");
//     } catch (e) {
//       log("⚠️ addTransceiver error:", e);
//     }
//   };

//   // =========================================================
//   // ATTACH TRACKS (replace when possible)
//   // =========================================================
//   const attachTracks = () => {
//     log("⭐ attachTracks CALLED on:", isCaller ? "Caller" : "Callee");

//     if (!localStreamRef.current) {
//       log("⚠️ attachTracks: no local stream to attach");
//       return;
//     }
//     if (!pcRef.current) {
//       log("⚠️ attachTracks: no pcRef");
//       return;
//     }

//     const tracks = localStreamRef.current.getTracks();
//     log("🔧 Attaching tracks. current senders:", pcRef.current.getSenders().length, "local tracks:", tracks.length);

//     tracks.forEach((track) => {
//       // try to find a sender for this kind and replace it
//       const senders = pcRef.current.getSenders();
//       const sender = senders.find((s) => s.track?.kind === track.kind);

//       if (sender) {
//         log(`✏️ Replacing track on sender: ${track.kind}`);
//         sender.replaceTrack(track);
//       } else {
//         log(`➕ No sender found for ${track.kind}, calling addTrack`);
//         pcRef.current.addTrack(track, localStreamRef.current);
//       }
//     });

//     log("🎬 Tracks attached. Final senders:", pcRef.current.getSenders().length);
//   };

//   // =========================================================
//   // SEND OFFER (caller)
//   // =========================================================
//   const sendOfferLater = () => {
//     log("⏳ Caller will send offer in 400ms…");
//     setTimeout(async () => {
//       try {
//         log("📍 About to attach tracks (caller)...");
//         attachTracks();

//         log("📡 Caller creating OFFER…");
//         const offer = await pcRef.current.createOffer();
//         await pcRef.current.setLocalDescription(offer);

//         const transceivers = pcRef.current.getTransceivers();
//         log("📊 OFFER: Transceivers count:", transceivers.length);
//         transceivers.forEach((t, i) => {
//           log(`   [${i}] kind=${t.receiver?.track?.kind || t.sender?.track?.kind || "unknown"}, direction=${t.direction}`);
//         });

//         socket.emit("offer", { roomId, sdp: offer });
//         log("📤 OFFER SENT");
//       } catch (err) {
//         log("❌ Error creating/sending offer:", err);
//       }
//     }, 400);
//   };

//   // =========================================================
//   // HANDLE OFFER (callee) - robust: wait for media & transceivers
//   // =========================================================
//   async function handleOffer({ sdp }) {
//     log("🔥 OFFER received from caller");

//     // Ensure local media is ready
//     if (!localStreamRef.current) {
//       log("⏳ Callee waiting for media...");
//       try {
//         await initMedia();
//       } catch (e) {
//         log("⚠️ initMedia failed in handleOffer:", e);
//       }
//     }

//     // Ensure peer + transceivers exist
//     if (!pcRef.current) {
//       createPeer();
//       addExplicitTransceivers();
//     }

//     try {
//       await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
//     } catch (e) {
//       log("❌ setRemoteDescription error:", e);
//     }

//     // Attach tracks NOW (this must run)
//     log("📍 Callee attaching tracks...");
//     attachTracks();

//     // Add queued ICE candidates
//     while (pendingCandidates.current.length > 0) {
//       try {
//         const cand = pendingCandidates.current.shift();
//         await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
//       } catch (e) {
//         log("⚠️ addIceCandidate error while draining queue:", e);
//       }
//     }

//     try {
//       log("🎤 Creating ANSWER…");
//       const answer = await pcRef.current.createAnswer();
//       await pcRef.current.setLocalDescription(answer);
//       socket.emit("answer", { roomId, sdp: answer });
//       log("📤 ANSWER SENT");
//     } catch (e) {
//       log("❌ Error creating/sending answer:", e);
//     }
//   }

//   // =========================================================
//   // HANDLE ANSWER (caller)
//   // =========================================================
//   async function handleAnswer({ sdp }) {
//     log("📩 ANSWER received from callee");

//     try {
//       await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
//     } catch (e) {
//       log("❌ setRemoteDescription on answer error:", e);
//     }

//     log("📊 ANSWER: transceivers:", pcRef.current.getTransceivers().length);
//     pcRef.current.getTransceivers().forEach((t, i) =>
//       log(`   [${i}] kind=${t.receiver?.track?.kind || t.sender?.track?.kind || "unknown"}, direction=${t.direction}`)
//     );

//     // Drain pending ICE candidates
//     while (pendingCandidates.current.length > 0) {
//       try {
//         const cand = pendingCandidates.current.shift();
//         await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
//       } catch (e) {
//         log("⚠️ addIceCandidate error while draining queue after answer:", e);
//       }
//     }
//   }

//   // =========================================================
//   // ICE CANDIDATE
//   // =========================================================
//   async function handleICE({ candidate }) {
//     // store until remoteDescription is available
//     if (!pcRef.current || !pcRef.current.remoteDescription) {
//       pendingCandidates.current.push(candidate);
//       log("🔁 Queued ICE candidate (no remoteDescription yet). queueLen:", pendingCandidates.current.length);
//       return;
//     }

//     try {
//       await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//       log("➕ added ICE candidate");
//     } catch (err) {
//       log("❌ ICE add error:", err);
//     }
//   }

//   // =========================================================
//   // CLEANUP
//   // =========================================================
//   const cleanup = () => {
//     try {
//       pcRef.current?.close();
//     } catch {}
//     pcRef.current = null;

//     try {
//       localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     } catch {}

//     pendingCandidates.current = [];
//     log("🧹 cleanup done");
//   };

//   // =========================================================
//   // UI
//   // =========================================================
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
//       <div className="w-full max-w-6xl bg-white rounded-xl shadow-md p-6">
//         <h2 className="text-2xl font-semibold text-gray-800 mb-6">Video Call</h2>

//         <div className="flex flex-col md:flex-row gap-6">
//           {/* Local video box */}
//           <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex items-center justify-center relative">
//             <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg">
//               <video ref={localVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
//             </div>
//             <div className="absolute mt-2 ml-2 text-sm text-gray-700">You</div>
//           </div>

//           {/* Remote video box */}
//           <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-2 flex items-center justify-center relative">
//             <div className="w-full h-64 md:h-96 overflow-hidden rounded-lg">
//               <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
//             </div>
//             <div className="absolute mt-2 ml-2 text-sm text-gray-700">Remote</div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// import React, { useEffect, useRef, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { connect } from "twilio-video";

// export default function CallRoom() {
//   const { roomId } = useParams();
//   const navigate = useNavigate();

//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);

//   const [room, setRoom] = useState(null);
//   const [participants, setParticipants] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const user = JSON.parse(localStorage.getItem("userInfo"));
//   // Use the unique user ID from localStorage as identity
//   const identity = user?.id?.toString() || "user";

//   // Track mounted elements to avoid duplicates
//   const localTracksRef = useRef(new Set());
//   const remoteTracksRef = useRef(new Set());

//   const log = (...args) => console.log("🎥 Twilio:", ...args);

//   useEffect(() => {
//     if (!user?.name) {
//       setError("User not authenticated");
//       return;
//     }

//     const joinTwilioRoom = async () => {
//       try {
//         log(`Requesting token for identity: ${identity}, room: ${roomId}`);
//         setLoading(true);

//         // 1️⃣ Fetch Twilio token
//         const res = await fetch(
//           `https://sharenet-production.up.railway.app/twilio/token?identity=${encodeURIComponent(identity)}&room=${roomId}`
//         );

//         if (!res.ok) {
//           throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`);
//         }

//         const data = await res.json();
//         log("✅ Token received:", data.token?.substring(0, 20) + "...");

//         // 2️⃣ Connect to Twilio Room
//         log("🔌 Connecting to room:", roomId);
//         const twilioRoom = await connect(data.token, {
//           name: roomId,
//           audio: true,
//           video: { width: 640, height: 480 },
//           maxAudioBitrate: 16000,
//           maxVideoBitrate: 2500000,
//         });

//         log("✅ Connected to room");
//         setRoom(twilioRoom);
//         setLoading(false);

//         // 3️⃣ Attach Local Video
//         log("📹 Attaching local tracks...");
//         try {
//           twilioRoom.localParticipant.videoTracks.forEach((publication) => {
//             try {
//               const track = publication.track;
//               const trackId = `local_video_${Date.now()}`;
              
//               const videoElement = track.attach();
//               videoElement.style.width = "100%";
//               videoElement.style.height = "100%";
//               videoElement.style.objectFit = "cover";
              
//               if (localVideoRef.current) {
//                 localVideoRef.current.innerHTML = "";
//                 localVideoRef.current.appendChild(videoElement);
//                 log("✅ Local video attached");
//               }
//             } catch (e) {
//               log("⚠️ Error attaching local video track:", e.message);
//             }
//           });
//         } catch (e) {
//           log("⚠️ Error in local video attachment:", e.message);
//         }

//         try {
//           twilioRoom.localParticipant.audioTracks.forEach((publication) => {
//             try {
//               publication.track.attach();
//               log("✅ Local audio attached");
//             } catch (e) {
//               log("⚠️ Error attaching local audio track:", e.message);
//             }
//           });
//         } catch (e) {
//           log("⚠️ Error in local audio attachment:", e.message);
//         }

//         // 4️⃣ Handle Remote Participants Already in Room
//         log(`📊 Initial participants: ${twilioRoom.participants.size}`);
//         twilioRoom.participants.forEach((participant) => {
//           log(`👤 Participant already in room: ${participant.sid}`);
//           participantConnected(participant);
//         });

//         // 5️⃣ Handle New Remote Participant Joining
//         twilioRoom.on("participantConnected", (participant) => {
//           log(`👤 New participant connected: ${participant.sid}`);
//           participantConnected(participant);
//         });

//         // 6️⃣ Handle Remote Participant Leaving
//         twilioRoom.on("participantDisconnected", (participant) => {
//           log(`👤 Participant disconnected: ${participant.sid}`);
//           if (remoteVideoRef.current) {
//             remoteVideoRef.current.innerHTML = "";
//             remoteTracksRef.current.clear();
//           }
//         });
//       } catch (err) {
//         log("❌ Error joining Twilio room:", err.message);
//         setError(err.message);
//         setLoading(false);
//       }
//     };

//     const participantConnected = (participant) => {
//       try {
//         setParticipants((participants) => [...participants, participant]);

//         // Attach video track
//         try {
//           participant.videoTracks.forEach((publication) => {
//             try {
//               const track = publication.track;
//               const videoElement = track.attach();
//               videoElement.style.width = "100%";
//               videoElement.style.height = "100%";
//               videoElement.style.objectFit = "cover";
              
//               if (remoteVideoRef.current) {
//                 remoteVideoRef.current.appendChild(videoElement);
//                 log(`✅ Remote video attached: ${participant.sid}`);
//               }
//             } catch (e) {
//               log("⚠️ Error attaching remote video:", e.message);
//             }
//           });
//         } catch (e) {
//           log("⚠️ Error in video tracks loop:", e.message);
//         }

//         // Handle new tracks when published
//         try {
//           participant.on("trackSubscribed", (track) => {
//             try {
//               if (track.kind === "video") {
//                 const videoElement = track.attach();
//                 videoElement.style.width = "100%";
//                 videoElement.style.height = "100%";
//                 videoElement.style.objectFit = "cover";
                
//                 if (remoteVideoRef.current) {
//                   remoteVideoRef.current.appendChild(videoElement);
//                   log(`✅ Remote track subscribed: ${participant.sid}`);
//                 }
//               }
//             } catch (e) {
//               log("⚠️ Error attaching subscribed track:", e.message);
//             }
//           });
//         } catch (e) {
//           log("⚠️ Error setting up trackSubscribed:", e.message);
//         }

//         // Handle track unsubscription
//         try {
//           participant.on("trackUnsubscribed", (track) => {
//             log(`⏹️ Remote track unsubscribed`);
//           });
//         } catch (e) {
//           log("⚠️ Error setting up trackUnsubscribed:", e.message);
//         }
//       } catch (e) {
//         log("⚠️ Error in participantConnected:", e.message);
//       }
//     };

//     joinTwilioRoom();

//     // Cleanup: disconnect when leaving
//     return () => {
//       if (room) {
//         log("🧹 Disconnecting from room...");
//         room.disconnect();
//         setRoom(null);
//       }
//     };
//   }, [roomId, user]);

//   return (
//     <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
//       <h1 className="text-3xl font-bold mb-6">ShareNet Video Call</h1>
//       <p className="text-gray-400 mb-4">Room: {roomId}</p>

//       {loading && <div className="mb-4 text-blue-400">🔌 Connecting...</div>}
//       {error && <div className="mb-4 text-red-400">❌ Error: {error}</div>}

//       <div className="flex gap-8">
//         {/* Local Video */}
//         <div className="flex flex-col items-center">
//           <h2 className="mb-3 text-lg font-semibold">You</h2>
//           <div
//             ref={localVideoRef}
//             className="w-80 h-60 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-blue-500"
//           />
//         </div>

//         {/* Remote Video */}
//         <div className="flex flex-col items-center">
//           <h2 className="mb-3 text-lg font-semibold">
//             {participants.length > 0 ? "Partner" : "Waiting for participant..."}
//           </h2>
//           <div
//             ref={remoteVideoRef}
//             className="w-80 h-60 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-green-500"
//           />
//         </div>
//       </div>

//       <button
//         onClick={() => {
//           if (room) room.disconnect();
//           navigate("/");
//         }}
//         className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 rounded text-white font-semibold transition"
//       >
//         End Call
//       </button>
//     </div>
//   );
// }

import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connect } from "twilio-video";

export default function CallRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem("userInfo"));
  
  // ✅ FIX: Create a unique identity by adding a timestamp and random string
  // This ensures each connection has a unique identity even if the same user opens multiple tabs
  const identity = user?.id 
    ? `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    : `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const log = (...args) => console.log("🎥 Twilio:", ...args);

  useEffect(() => {
    if (!user?.name) {
      setError("User not authenticated");
      return;
    }

    let twilioRoom = null;

    const joinTwilioRoom = async () => {
      try {
        log(`Requesting token for identity: ${identity}, room: ${roomId}`);
        setLoading(true);

        // 1️⃣ Fetch Twilio token
        const res = await fetch(
          `https://sharenet-production.up.railway.app/twilio/token?identity=${encodeURIComponent(identity)}&room=${roomId}`
        );

        if (!res.ok) {
          throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        log("✅ Token received:", data.token?.substring(0, 20) + "...");

        // 2️⃣ Connect to Twilio Room
        log("🔌 Connecting to room:", roomId);
        twilioRoom = await connect(data.token, {
          name: roomId,
          audio: true,
          video: { width: 640, height: 480 },
          maxAudioBitrate: 16000,
          maxVideoBitrate: 2500000,
        });

        log("✅ Connected to room");
        setRoom(twilioRoom);
        setLoading(false);

        // 3️⃣ Attach Local Video
        log("📹 Attaching local tracks...");
        try {
          twilioRoom.localParticipant.videoTracks.forEach((publication) => {
            try {
              const track = publication.track;
              
              const videoElement = track.attach();
              videoElement.style.width = "100%";
              videoElement.style.height = "100%";
              videoElement.style.objectFit = "cover";
              
              if (localVideoRef.current) {
                localVideoRef.current.innerHTML = "";
                localVideoRef.current.appendChild(videoElement);
                log("✅ Local video attached");
              }
            } catch (e) {
              log("⚠️ Error attaching local video track:", e.message);
            }
          });
        } catch (e) {
          log("⚠️ Error in local video attachment:", e.message);
        }

        try {
          twilioRoom.localParticipant.audioTracks.forEach((publication) => {
            try {
              publication.track.attach();
              log("✅ Local audio attached");
            } catch (e) {
              log("⚠️ Error attaching local audio track:", e.message);
            }
          });
        } catch (e) {
          log("⚠️ Error in local audio attachment:", e.message);
        }

        // 4️⃣ Handle Remote Participants Already in Room
        log(`📊 Initial participants: ${twilioRoom.participants.size}`);
        twilioRoom.participants.forEach((participant) => {
          log(`👤 Participant already in room: ${participant.sid}`);
          participantConnected(participant);
        });

        // 5️⃣ Handle New Remote Participant Joining
        twilioRoom.on("participantConnected", (participant) => {
          log(`👤 New participant connected: ${participant.sid}`);
          participantConnected(participant);
        });

        // 6️⃣ Handle Remote Participant Leaving
        twilioRoom.on("participantDisconnected", (participant) => {
          log(`👤 Participant disconnected: ${participant.sid}`);
          setParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
          if (remoteVideoRef.current) {
            remoteVideoRef.current.innerHTML = "";
          }
        });

        // ✅ FIX: Handle room disconnection events
        twilioRoom.on("disconnected", (room, error) => {
          if (error) {
            log("❌ Disconnected due to error:", error.message);
            if (error.message.includes("duplicate identity")) {
              setError("Duplicate connection detected. Please use a unique identity.");
            } else {
              setError(error.message);
            }
          } else {
            log("🔌 Disconnected from room");
          }
        });

      } catch (err) {
        log("❌ Error joining Twilio room:", err.message);
        if (err.message.includes("duplicate identity")) {
          setError("Connection failed: Duplicate identity detected. Please refresh and try again.");
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    };

    const participantConnected = (participant) => {
      try {
        setParticipants((participants) => {
          // Avoid adding duplicate participants
          if (participants.find(p => p.sid === participant.sid)) {
            return participants;
          }
          return [...participants, participant];
        });

        // Attach video track
        try {
          participant.videoTracks.forEach((publication) => {
            try {
              if (publication.isSubscribed && publication.track) {
                const track = publication.track;
                const videoElement = track.attach();
                videoElement.style.width = "100%";
                videoElement.style.height = "100%";
                videoElement.style.objectFit = "cover";
                
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.appendChild(videoElement);
                  log(`✅ Remote video attached: ${participant.sid}`);
                }
              }
            } catch (e) {
              log("⚠️ Error attaching remote video:", e.message);
            }
          });
        } catch (e) {
          log("⚠️ Error in video tracks loop:", e.message);
        }

        // Handle new tracks when published
        try {
          participant.on("trackSubscribed", (track) => {
            try {
              if (track.kind === "video") {
                const videoElement = track.attach();
                videoElement.style.width = "100%";
                videoElement.style.height = "100%";
                videoElement.style.objectFit = "cover";
                
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.appendChild(videoElement);
                  log(`✅ Remote track subscribed: ${participant.sid}`);
                }
              }
            } catch (e) {
              log("⚠️ Error attaching subscribed track:", e.message);
            }
          });
        } catch (e) {
          log("⚠️ Error setting up trackSubscribed:", e.message);
        }

        // Handle track unsubscription
        try {
          participant.on("trackUnsubscribed", (track) => {
            log(`⏹️ Remote track unsubscribed`);
            if (track.kind === "video") {
              track.detach().forEach(element => element.remove());
            }
          });
        } catch (e) {
          log("⚠️ Error setting up trackUnsubscribed:", e.message);
        }
      } catch (e) {
        log("⚠️ Error in participantConnected:", e.message);
      }
    };

    joinTwilioRoom();

    // Cleanup: disconnect when leaving
    return () => {
      if (twilioRoom) {
        log("🧹 Disconnecting from room...");
        twilioRoom.disconnect();
      }
    };
  }, [roomId, user?.name]); // ✅ FIX: Only depend on stable values

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-6">ShareNet Video Call</h1>
      <p className="text-gray-400 mb-4">Room: {roomId}</p>

      {loading && <div className="mb-4 text-blue-400">🔌 Connecting...</div>}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200 max-w-md text-center">
          ❌ {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Local Video */}
        <div className="flex flex-col items-center">
          <h2 className="mb-3 text-lg font-semibold">You</h2>
          <div
            ref={localVideoRef}
            className="w-80 h-60 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-blue-500"
          />
        </div>

        {/* Remote Video */}
        <div className="flex flex-col items-center">
          <h2 className="mb-3 text-lg font-semibold">
            {participants.length > 0 ? "Partner" : "Waiting for participant..."}
          </h2>
          <div
            ref={remoteVideoRef}
            className="w-80 h-60 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-green-500"
          />
        </div>
      </div>

      <button
        onClick={() => {
          if (room) room.disconnect();
          navigate("/");
        }}
        className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 rounded text-white font-semibold transition"
      >
        End Call
      </button>
    </div>
  );
}