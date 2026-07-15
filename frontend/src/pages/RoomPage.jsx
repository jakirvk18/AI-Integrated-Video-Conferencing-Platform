import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRoomCall } from "../hooks/useRoomCall";
import { api } from "../api/client";
import VideoTile from "../components/VideoTile";
import ControlBar from "../components/ControlBar";
import SidePanel from "../components/SidePanel";
import TallyDot from "../components/TallyDot";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [iceServers, setIceServers] = useState(null);
  const [panel, setPanel] = useState(null); // null | "chat" | "participants"
  const [lastReadCount, setLastReadCount] = useState(0);

  // Per-room host status. `user.isHost` (if it exists at all) is a global
  // auth-level flag — it doesn't know which room this is. The backend's
  // /rooms/{room_code}/end route only allows the request through when
  // room.host_id === current_user._id, so we determine host status the
  // same way: by fetching the room and comparing.
  const [isHost, setIsHost] = useState(false);
  const [endError, setEndError] = useState(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/rooms/rtc/config")
      .then(({ data }) => active && setIceServers(data.ice_servers))
      .catch(() => active && setIceServers([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get(`/rooms/${roomCode}`)
      .then(({ data }) => {
        if (!active) return;
        const userId = user?.id ?? user?._id;
        setIsHost(Boolean(userId) && String(data.host_id) === String(userId));
      })
      .catch(() => {
        // If the room lookup fails, fall back to "not host" — we don't
        // want to attempt a privileged action we can't confirm.
        if (active) setIsHost(false);
      });
    return () => {
      active = false;
    };
  }, [roomCode, user]);

  const {
    connectionStatus,
    localStream,
    micEnabled,
    cameraEnabled,
    participants,
    messages,
    mediaError,
    toggleMic,
    toggleCamera,
    sendChat,
    leave,
  } = useRoomCall({
    roomCode,
    token,
    localName: user?.name,
    iceServers: iceServers || [],
    autoStart: iceServers !== null,
  });

  const remoteList = useMemo(() => Object.values(participants), [participants]);

  const handleLeave = useCallback(async () => {
    setEndError(null);

    if (isHost) {
      setEnding(true);
      try {
        await api.post(
          `/rooms/${roomCode}/end`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        // Don't silently swallow this — if the meeting didn't actually
        // end on the server, the host needs to know before we navigate
        // them away and everyone else is left hanging in the call.
        setEnding(false);
        setEndError(
          err?.response?.status === 403
            ? "Only the host can end this meeting."
            : "Couldn't end the meeting. Check your connection and try again."
        );
        return;
      }
      setEnding(false);
    }

    leave();
    navigate("/dashboard");
  }, [isHost, roomCode, token, leave, navigate]);

  const openPanel = (mode) => {
    setPanel((prev) => {
      const next = prev === mode ? null : mode;
      if (next === "chat") setLastReadCount(messages.length);
      return next;
    });
  };

  useEffect(() => {
    if (panel === "chat") setLastReadCount(messages.length);
  }, [messages, panel]);

  if (connectionStatus === "ended") {
    return <EndedScreen onBack={() => navigate("/dashboard")} />;
  }

  const gridCols = gridColsForCount(remoteList.length + 1);

  return (
    <div className="relative min-h-screen bg-ink text-paper">
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 rounded-full bg-ink-soft/80 px-3 py-1.5 backdrop-blur">
          <TallyDot live={connectionStatus === "connected"} />
          <span className="text-xs font-medium text-muted-light">
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "connecting"
              ? "Connecting…"
              : "Reconnecting…"}
          </span>
        </div>
      </header>

      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 pb-32 pt-20">
        {mediaError && (
          <div className="mx-auto mb-4 max-w-md rounded-lg border border-tally/30 bg-tally/10 px-4 py-2.5 text-center text-sm text-tally">
            {mediaError}
          </div>
        )}

        {endError && (
          <div className="mx-auto mb-4 max-w-md rounded-lg border border-tally/30 bg-tally/10 px-4 py-2.5 text-center text-sm text-tally">
            {endError}
          </div>
        )}

        <div className={`mx-auto grid w-full gap-3 ${gridCols}`}>
          <VideoTile
            stream={localStream}
            name={user?.name || "You"}
            isLocal
            audioEnabled={micEnabled}
            videoEnabled={cameraEnabled}
          />
          {remoteList.map((p) => (
            <VideoTile
              key={p.id}
              stream={p.stream}
              name={p.name}
              audioEnabled={p.audioEnabled}
              videoEnabled={p.videoEnabled}
            />
          ))}
        </div>

        {remoteList.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            Waiting for others to join — share the room code from the control bar below.
          </p>
        )}
      </main>

      <ControlBar
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onLeave={handleLeave}
        leaveDisabled={ending}
        leaveLabel={isHost ? (ending ? "Ending…" : "End meeting") : "Leave"}
        onToggleChat={() => openPanel("chat")}
        onToggleParticipants={() => openPanel("participants")}
        chatActive={panel === "chat"}
        participantsActive={panel === "participants"}
        unreadChat={panel === "chat" ? 0 : Math.max(0, messages.length - lastReadCount)}
        roomCode={roomCode}
      />

      <SidePanel
        mode={panel}
        onClose={() => setPanel(null)}
        messages={messages}
        onSendChat={sendChat}
        selfName={user?.name}
        participants={[
          { id: "self", name: user?.name, isLocal: true, audioEnabled: micEnabled },
          ...remoteList,
        ]}
      />
    </div>
  );
}

function gridColsForCount(count) {
  if (count <= 1) return "max-w-2xl grid-cols-1";
  if (count === 2) return "max-w-4xl grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "max-w-5xl grid-cols-1 sm:grid-cols-2";
  if (count <= 6) return "max-w-6xl grid-cols-2 lg:grid-cols-3";
  return "max-w-6xl grid-cols-2 lg:grid-cols-4";
}

function EndedScreen({ onBack }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-paper">
      <TallyDot live={false} size="lg" />
      <h1 className="font-display text-2xl font-semibold">This meeting has ended</h1>
      <p className="max-w-sm text-sm text-muted">The host ended the call for everyone.</p>
      <button
        onClick={onBack}
        className="mt-2 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
      >
        Back to dashboard
      </button>
    </div>
  );
}