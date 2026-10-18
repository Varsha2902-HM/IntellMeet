
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import "../App.css";

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  startTime?: string;
  status?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  socketId?: string;
}

interface PeerState {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  settingRemoteAnswer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
}

interface SignalPayload {
  meetingId: string;
  fromSocketId?: string;
  socketId?: string;
  targetSocketId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"
).replace(/\/$/, "");

function RemoteVideo({
  stream,
  name,
}: {
  stream: MediaStream;
  name: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    void video.play().catch((error) => {
      console.warn("Remote video playback requires user interaction:", error);
    });
  }, [stream]);

  return (
    <div className="meeting-video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="meeting-local-video"
        style={{ transform: "none" }}
      />
      <div className="meeting-video-name">{name}</div>
    </div>
  );
}

export default function MeetingRoom() {
  const { id: meetingId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [chatError, setChatError] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerState>>(new Map());
  const localNameRef = useRef("Participant");
  const mountedRef = useRef(true);
  const startingMediaRef = useRef(false);

  const token = localStorage.getItem("token");

  // Load meeting details.
  useEffect(() => {
    mountedRef.current = true;

    async function loadMeeting() {
      if (!meetingId) {
        setError("Meeting ID is missing.");
        setLoading(false);
        return;
      }

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/meetings/${meetingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load this meeting.");
        }

        const loadedMeeting: Meeting = data.meeting ?? data;

        if (mountedRef.current) {
          setMeeting(loadedMeeting);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Unable to load meeting."
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    void loadMeeting();

    return () => {
      mountedRef.current = false;
    };
  }, [meetingId, token, navigate]);

  // Create a WebRTC connection for a participant.
  const createPeerConnection = useCallback(
    (remoteSocketId: string): PeerState | undefined => {
      const existing = peerConnectionsRef.current.get(remoteSocketId);
      if (existing) return existing;

      const socket = socketRef.current;

      // A connected socket must have an ID before negotiating with a peer.
      if (!socket?.connected || !socket.id || !meetingId) {
        return undefined;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      const peer: PeerState = {
        pc,
        polite: socket.id.localeCompare(remoteSocketId) > 0,
        makingOffer: false,
        ignoreOffer: false,
        settingRemoteAnswer: false,
        pendingCandidates: [],
      };

      peerConnectionsRef.current.set(remoteSocketId, peer);

      const localStream =
        displayStreamRef.current ?? cameraStreamRef.current;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          const alreadyAdded = pc
            .getSenders()
            .some((sender) => sender.track?.kind === track.kind);

          if (!alreadyAdded) {
            pc.addTrack(track, localStream);
          }
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            meetingId,
            targetSocketId: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);

        setRemoteStreams((previous) => ({
          ...previous,
          [remoteSocketId]: stream,
        }));

        setParticipants((previous) =>
          previous.includes(remoteSocketId)
            ? previous
            : [...previous, remoteSocketId]
        );
      };

      pc.onnegotiationneeded = async () => {
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();

          if (pc.localDescription) {
            socket.emit("webrtc-offer", {
              meetingId,
              targetSocketId: remoteSocketId,
              offer: pc.localDescription,
            });
          }
        } catch (err) {
          console.error("WebRTC negotiation failed:", err);
        } finally {
          peer.makingOffer = false;
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          pc.close();
          peerConnectionsRef.current.delete(remoteSocketId);

          setRemoteStreams((previous) => {
            const next = { ...previous };
            delete next[remoteSocketId];
            return next;
          });

          setParticipants((previous) =>
            previous.filter((id) => id !== remoteSocketId)
          );
        }
      };

      return peer;
    },
    [meetingId]
  );

  // Connect to the real-time meeting server.
  useEffect(() => {
    if (!meetingId || !token || !meeting) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-meeting", { meetingId });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setError(
        "Real-time connection failed. Check that the backend is running."
      );
    });

    socket.on(
      "existing-participants",
      (data: string[] | { participants?: string[] }) => {
        const ids = Array.isArray(data) ? data : data.participants ?? [];

        ids.forEach((participantId) => {
          if (participantId && participantId !== socket.id) {
            createPeerConnection(participantId);
          }
        });

        setParticipants((previous) =>
          Array.from(
            new Set([
              ...previous,
              ...ids.filter((id) => id !== socket.id),
            ])
          )
        );
      }
    );

    socket.on(
      "participant-joined",
      (data: string | { socketId?: string; participantId?: string }) => {
        const participantId =
          typeof data === "string"
            ? data
            : data.socketId ?? data.participantId;

        if (!participantId || participantId === socket.id) return;

        createPeerConnection(participantId);

        setParticipants((previous) =>
          previous.includes(participantId)
            ? previous
            : [...previous, participantId]
        );
      }
    );

    socket.on("webrtc-offer", async (data: SignalPayload) => {
      const remoteSocketId = data.fromSocketId;
      if (!remoteSocketId || !data.offer) return;

      const peer = createPeerConnection(remoteSocketId);
      if (!peer) return;

      const pc = peer.pc;
      const offerCollision =
        data.offer.type === "offer" &&
        (peer.makingOffer ||
          (pc.signalingState !== "stable" && !peer.settingRemoteAnswer));

      peer.ignoreOffer = !peer.polite && offerCollision;
      if (peer.ignoreOffer) return;

      try {
        if (offerCollision && peer.polite) {
          await pc.setLocalDescription({ type: "rollback" });
        }

        await pc.setRemoteDescription(data.offer);

        for (const candidate of peer.pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        peer.pendingCandidates = [];

        if (data.offer.type === "offer") {
          await pc.setLocalDescription();

          if (pc.localDescription) {
            socket.emit("webrtc-answer", {
              meetingId,
              targetSocketId: remoteSocketId,
              answer: pc.localDescription,
            });
          }
        }
      } catch (err) {
        console.error("Could not process WebRTC offer:", err);
      }
    });

    socket.on("webrtc-answer", async (data: SignalPayload) => {
      const remoteSocketId = data.fromSocketId;
      if (!remoteSocketId || !data.answer) return;

      const peer = peerConnectionsRef.current.get(remoteSocketId);
      if (!peer) return;

      try {
        peer.settingRemoteAnswer = true;
        await peer.pc.setRemoteDescription(data.answer);

        for (const candidate of peer.pendingCandidates) {
          await peer.pc.addIceCandidate(candidate);
        }
        peer.pendingCandidates = [];
      } catch (err) {
        console.error("Could not process WebRTC answer:", err);
      } finally {
        peer.settingRemoteAnswer = false;
      }
    });

    socket.on("webrtc-ice-candidate", async (data: SignalPayload) => {
      const remoteSocketId = data.fromSocketId;
      if (!remoteSocketId || !data.candidate) return;

      const peer = createPeerConnection(remoteSocketId);
      if (!peer) return;

      try {
        if (peer.pc.remoteDescription) {
          await peer.pc.addIceCandidate(data.candidate);
        } else {
          peer.pendingCandidates.push(data.candidate);
        }
      } catch (err) {
        if (!peer.ignoreOffer) {
          console.error("Could not add ICE candidate:", err);
        }
      }
    });

    socket.on(
      "participant-left",
      (data: string | { socketId?: string; participantId?: string }) => {
        const remoteSocketId =
          typeof data === "string"
            ? data
            : data.socketId ?? data.participantId;

        if (!remoteSocketId) return;

        const peer = peerConnectionsRef.current.get(remoteSocketId);
        peer?.pc.close();
        peerConnectionsRef.current.delete(remoteSocketId);

        setRemoteStreams((previous) => {
          const next = { ...previous };
          delete next[remoteSocketId];
          return next;
        });

        setParticipants((previous) =>
          previous.filter((id) => id !== remoteSocketId)
        );
      }
    );

    socket.on(
      "meeting-message",
      (data: Partial<ChatMessage> & { text?: string }) => {
        setMessages((previous) => [
          ...previous,
          {
            id: `${Date.now()}-${Math.random()}`,
            sender: data.sender ?? "Participant",
            message: data.message ?? data.text ?? "",
            timestamp: data.timestamp ?? new Date().toISOString(),
            socketId: data.socketId,
          },
        ]);
      }
    );

    return () => {
      socket.emit("leave-meeting", { meetingId });
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      peerConnectionsRef.current.forEach((peer) => peer.pc.close());
      peerConnectionsRef.current.clear();

      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());

      cameraStreamRef.current = null;
      displayStreamRef.current = null;
    };
  }, [meetingId, token, meeting, createPeerConnection]);

  // Attach the active local stream to the video element.
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        displayStreamRef.current ?? cameraStreamRef.current;
    }
  }, [cameraOn, screenSharing]);

  const startCamera = async () => {
    if (startingMediaRef.current) return;
    startingMediaRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      cameraStreamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];
      console.log("Microphone settings:", audioTrack?.getSettings());

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }

      setCameraOn(true);
      setMicOn(true);
      setError("");

      peerConnectionsRef.current.forEach(({ pc }) => {
        stream.getTracks().forEach((track) => {
          const senderExists = pc
            .getSenders()
            .some((sender) => sender.track?.kind === track.kind);

          if (!senderExists) {
            pc.addTrack(track, stream);
          }
        });
      });
    } catch (err) {
      console.error("Camera/microphone error:", err);
      setError(
        "Could not access your camera or microphone. Check browser permissions and try again."
      );
    } finally {
      startingMediaRef.current = false;
    }
  };

  const toggleCamera = () => {
    if (!cameraStreamRef.current) {
      void startCamera();
      return;
    }

    const next = !cameraOn;
    cameraStreamRef.current
      .getVideoTracks()
      .forEach((track) => (track.enabled = next));

    setCameraOn(next);
  };

  const toggleMic = () => {
    if (!cameraStreamRef.current) {
      void startCamera();
      return;
    }

    const next = !micOn;
    cameraStreamRef.current
      .getAudioTracks()
      .forEach((track) => (track.enabled = next));

    setMicOn(next);
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;

      const cameraTrack =
        cameraStreamRef.current?.getVideoTracks()[0] ?? null;

      for (const { pc } of peerConnectionsRef.current.values()) {
        const sender = pc
          .getSenders()
          .find((item) => item.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(cameraTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStreamRef.current;
      }

      setScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      displayStreamRef.current = displayStream;
      const displayTrack = displayStream.getVideoTracks()[0];

      for (const { pc } of peerConnectionsRef.current.values()) {
        const sender = pc
          .getSenders()
          .find((item) => item.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(displayTrack);
        } else {
          pc.addTrack(displayTrack, displayStream);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      setScreenSharing(true);

      displayTrack.onended = () => {
        if (mountedRef.current) {
          void toggleScreenShare();
        }
      };
    } catch (err) {
      console.error("Screen sharing failed:", err);
      setError("Screen sharing was cancelled or could not be started.");
    }
  };

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = messageText.trim();
    const socket = socketRef.current;

    if (!text || !socket || !meetingId) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: localNameRef.current,
      message: text,
      timestamp: new Date().toISOString(),
      socketId: socket.id ?? undefined,
    };

    setMessages((previous) => [...previous, message]);

    socket.emit("meeting-message", {
      meetingId,
      sender: localNameRef.current,
      message: text,
    });

    setMessageText("");
    setChatError("");
  };

  const leaveMeeting = () => {
    socketRef.current?.emit("leave-meeting", { meetingId });
    navigate("/meetings");
  };

  if (loading) {
    return <div className="meeting-room-page">Loading meeting...</div>;
  }

  if (!meeting) {
    return (
      <div className="meeting-room-page">
        <p>{error || "Meeting not found."}</p>
        <Link to="/meetings">Back to meetings</Link>
      </div>
    );
  }

  return (
    <main className="meeting-room-page">
      <header className="meeting-room-header">
        <div>
          <h2>{meeting.title}</h2>
          <p>
            {participants.length + 1} participant
            {participants.length === 1 ? "" : "s"} connected
          </p>
        </div>

        <button onClick={leaveMeeting} className="meeting-control-button">
          Leave meeting
        </button>
      </header>

      {error && (
        <div role="alert" style={{ color: "crimson", padding: 8 }}>
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <div className="meeting-room-layout">
        <section className="meeting-room-main">
          <div className="meeting-room-video-grid">
            <div className="meeting-video-tile">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="meeting-local-video"
              />

              {!cameraOn && !screenSharing && (
                <div className="meeting-video-placeholder">
                  <p>Your camera is off</p>
                  <button onClick={() => void startCamera()}>
                    Turn on camera
                  </button>
                </div>
              )}

              <div className="meeting-video-name">You</div>
            </div>

            {Object.entries(remoteStreams).map(([socketId, stream]) => (
              <RemoteVideo
                key={socketId}
                stream={stream}
                name={`Participant ${socketId.slice(0, 5)}`}
              />
            ))}

            {Object.keys(remoteStreams).length === 0 && (
              <div className="meeting-video-tile meeting-video-placeholder">
                <p>Waiting for other participants to connect...</p>
                <p>Share the same meeting with another logged-in user.</p>
              </div>
            )}
          </div>

          <div className="meeting-controls">
            <button
              onClick={toggleMic}
              className="meeting-control-button"
              aria-pressed={micOn}
            >
              {micOn ? "🎙️ Mute mic" : "🔇 Unmute mic"}
            </button>

            <button
              onClick={toggleCamera}
              className="meeting-control-button"
              aria-pressed={cameraOn}
            >
              {cameraOn ? "📷 Turn camera off" : "📷 Turn camera on"}
            </button>

            <button
              onClick={() => void toggleScreenShare()}
              className="meeting-control-button"
              aria-pressed={screenSharing}
            >
              {screenSharing ? "Stop sharing" : "Share screen"}
            </button>

            <button onClick={leaveMeeting} className="meeting-control-button">
              Leave
            </button>
          </div>

          <p>Meeting status: {meeting.status ?? "Active"}</p>
        </section>

        <aside className="meeting-info-panel">
          <section className="meeting-chat-panel">
            <h3>Meeting chat</h3>

            <div
              style={{
                minHeight: 180,
                maxHeight: 320,
                overflowY: "auto",
                padding: 8,
              }}
            >
              {messages.length === 0 ? (
                <p>No messages yet. Start the conversation.</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} style={{ marginBottom: 12 }}>
                    <strong>{message.sender}</strong>
                    <p style={{ overflowWrap: "anywhere" }}>
                      {message.message}
                    </p>
                    <small>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={sendMessage}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type a message..."
                aria-label="Chat message"
              />

              <button type="submit" disabled={!messageText.trim()}>
                Send
              </button>
            </form>

            {chatError && <p role="alert">{chatError}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
