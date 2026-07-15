import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import TallyDot from "../components/TallyDot";
import RoomCodeChip from "../components/RoomCodeChip";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PreJoinPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [stream, setStream] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [checking, setChecking] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let active = true;
    api
      .get(`/rooms/${roomCode}`)
      .then(({ data }) => active && setRoom(data))
      .catch((err) => active && setLoadError(apiErrorMessage(err, "This room doesn't exist or has ended.")));

    let localStream;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = s;
        setStream(s);
      })
      .catch(() => active && setMediaError("Camera or microphone unavailable. You can still join with them off."));

    return () => {
      active = false;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
  }, [micEnabled, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = cameraEnabled));
  }, [cameraEnabled, stream]);

  const handleJoin = async () => {
    setChecking(true);
    setLoadError("");
    try {
      await api.post("/rooms/join", { room_code: roomCode });
      stream?.getTracks().forEach((t) => t.stop());
      navigate(`/rooms/${roomCode}`, { state: { micEnabled, cameraEnabled } });
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Couldn't join this room."));
    } finally {
      setChecking(false);
    }
  };

  if (loadError && !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-tally">Off air</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-paper">{loadError}</h1>
          <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-signal hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink px-6 py-10 text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <TallyDot />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-light">Lobby</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
            {room?.title || "Joining meeting…"}
          </h1>
          {room && (
            <div className="mt-3 flex justify-center">
              <RoomCodeChip code={room.room_code} />
            </div>
          )}
        </div>

        <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl bg-slate ring-1 ring-mist">
          {stream && cameraEnabled ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-noise">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mist font-display text-xl font-semibold">
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="text-xs text-muted-light">Camera off</span>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
            <ToggleButton active={micEnabled} onClick={() => setMicEnabled((v) => !v)} label={micEnabled ? "Mute" : "Unmute"} />
            <ToggleButton active={cameraEnabled} onClick={() => setCameraEnabled((v) => !v)} label={cameraEnabled ? "Stop video" : "Start video"} />
          </div>
        </div>

        {mediaError && <p className="max-w-md text-center text-sm text-warn">{mediaError}</p>}
        {loadError && <p className="max-w-md text-center text-sm text-tally">{loadError}</p>}

        <button
          onClick={handleJoin}
          disabled={checking || !room}
          className="rounded-full bg-signal px-8 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {checking ? "Joining…" : "Join now"}
        </button>
      </div>
    </div>
  );
}

function ToggleButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
        active ? "border-mist-light bg-ink-soft/80 text-paper" : "border-tally bg-tally text-white"
      }`}
      aria-label={label}
      title={label}
    >
      <span className="text-xs">{active ? "ON" : "OFF"}</span>
    </button>
  );
}
