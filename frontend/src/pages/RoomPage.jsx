import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRoomCall } from "../hooks/useRoomCall";
import { useActiveSpeaker } from "../hooks/useActiveSpeaker";
import { api } from "../api/client";
import VideoTile from "../components/VideoTile";
import ControlBar from "../components/ControlBar";
import SidePanel from "../components/SidePanel";
import TallyDot from "../components/TallyDot";

const RESIZE_CLASSES = { sm: "", md: "", lg: "col-span-2 row-span-2" };

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [iceServers, setIceServers] = useState(null);
  const [panel, setPanel] = useState(null); // null | "chat" | "participants"
  const [lastReadCount, setLastReadCount] = useState(0);

  const [isHost, setIsHost] = useState(false);
  const [endError, setEndError] = useState(null);
  const [ending, setEnding] = useState(false);
  const [localTileSize, setLocalTileSize] = useState("md");

  const userId = user?.id ?? user?._id;

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
        setIsHost(Boolean(userId) && String(data.host_id) === String(userId));
      })
      .catch(() => {
        if (active) setIsHost(false);
      });
    return () => {
      active = false;
    };
  }, [roomCode, userId]);

  // Fires whenever the server broadcasts a host change — including our own
  // transfer taking effect, or someone else handing host to us.
  const handleHostChanged = useCallback(
    (newHostId) => {
      setIsHost(Boolean(userId) && String(newHostId) === String(userId));
    },
    [userId]
  );

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
    onHostChanged: handleHostChanged,
  });

  const remoteList = useMemo(() => Object.values(participants), [participants]);

  const streamsById = useMemo(() => {
    const map = { self: localStream };
    remoteList.forEach((p) => { map[p.id] = p.stream; });
    return map;
  }, [localStream, remoteList]);

  const { activeSpeakerId, speakingIds } = useActiveSpeaker(streamsById);

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

  const transferHost = useCallback(
    async (newHostId) => {
      setEndError(null);
      try {
        await api.post(
          `/rooms/${roomCode}/transfer-host`,
          { new_host_id: newHostId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // isHost flips to false once the "host-changed" broadcast arrives
        // via handleHostChanged above.
      } catch (err) {
        setEndError(
          err?.response?.data?.detail || "Couldn't transfer host. Try again."
        );
      }
    },
    [roomCode, token]
  );

  const cycleLocalSize = () =>
    setLocalTileSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"));

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

  // Host's manual resize wins for their own tile; otherwise the active
  // speaker (if any, and only once someone else has joined) gets enlarged.
  const localClassName =
    isHost && localTileSize !== "md"
      ? RESIZE_CLASSES[localTileSize]
      : activeSpeakerId === "self" && remoteList.length > 0
      ? "col-span-2 row-span-2"
      : "";

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
            speaking={speakingIds.has("self")}
            className={localClassName}
          >
            {isHost && (
              <button
                onClick={cycleLocalSize}
                className="absolute right-2 top-2 rounded-md bg-ink/70 px-2 py-1 text-[10px] font-medium text-paper/90 opacity-0 transition-opacity group-hover:opacity-100"
                title="Resize your video"
              >
                {localTileSize.toUpperCase()}
              </button>
            )}
          </VideoTile>
          {remoteList.map((p) => (
            <VideoTile
              key={p.id}
              stream={p.stream}
              name={p.name}
              audioEnabled={p.audioEnabled}
              videoEnabled={p.videoEnabled}
              speaking={speakingIds.has(p.id)}
              className={activeSpeakerId === p.id ? "col-span-2 row-span-2" : ""}
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
        isHost={isHost}
        onTransferHost={transferHost}
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