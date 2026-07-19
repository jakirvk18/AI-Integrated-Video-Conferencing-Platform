import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import RoomCodeChip from "../components/RoomCodeChip";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [recents, setRecents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // Tracks the most recent fetch so a slow, stale request can't overwrite
  // the result of a newer one (and so we don't setState after unmount).
  const requestIdRef = useRef(0);

  const fetchHistory = useCallback(() => {
    if (!user?.id) {
      setHistoryLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setHistoryLoading(true);
    setHistoryError("");

    api
      .get(`/rooms/${user.id}/active/history`)
      .then(({ data }) => {
        if (requestIdRef.current !== requestId) return; // stale/unmounted
        setRecents(data);
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return;
        setHistoryError(apiErrorMessage(err, "Couldn't load your meeting history."));
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setHistoryLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
    // Invalidate any in-flight request from a prior user/unmount.
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchHistory]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const { data } = await api.post("/rooms", { title: title || "Untitled Meeting" });
      navigate(`/rooms/${data.room_code}/lobby`);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't create the meeting."));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const { data } = await api.post("/rooms/join", { room_code: code });
      navigate(`/rooms/${data.room_code}/lobby`);
    } catch (err) {
      setError(apiErrorMessage(err, "That room code doesn't look right."));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0B0D10] text-[#F5F4F1]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ambient glow, purely decorative */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: "radial-gradient(circle, red 0%, transparent 70%)" }}
      />

      <Navbar />

      <main className="relative mx-auto max-w-6xl px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-red-500">
            On air, in seconds
          </p>
        </div>

        <h1
          className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Good to see you, {user?.name}.
        </h1>
        <p className="mt-3 max-w-md text-sm text-[#9AA0A6]">
          Start a new broadcast or drop into one that's already live.
        </p>

        {error && (
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-[#F5F4F1]">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-[#0B0D10]">
              !
            </span>
            {error}
          </div>
        )}

        {/* Action panels */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="group rounded-2xl border border-white/[0.08] bg-[#14171B] p-7 transition-colors hover:border-red-500/30"
          >
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6B7076]">
              Create
            </span>
            <h2
              className="mt-2 text-xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              New meeting
            </h2>
            <p className="mt-1 text-sm text-[#9AA0A6]">
              Give it a name — or don't, we'll title it for you.
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Meeting"
              className="mt-5 w-full rounded-xl border border-white/10 bg-[#0B0D10] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5A5F65] focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            />
            <button
              type="submit"
              disabled={creating}
              className="mt-6 
              border border-black
              flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white transition-colors  active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Starting…" : "Start meeting"}
            </button>
          </form>

          <form
            onSubmit={handleJoin}
            className="group rounded-2xl border border-white/[0.08] bg-[#14171B] p-7 transition-colors hover:border-red-500/30"
          >
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6B7076]">
              Join
            </span>
            <h2
              className="mt-2 text-xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Join with a code
            </h2>
            <p className="mt-1 text-sm text-[#9AA0A6]">
              Ask the host for their room code.
            </p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. 7F3-K9Q"
              className="mt-5 w-full rounded-xl border border-white/10 bg-[#0B0D10] px-3.5 py-2.5 font-mono text-sm uppercase tracking-widest text-white outline-none transition-colors placeholder:text-[#5A5F65] placeholder:tracking-normal focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            />
            <button
              type="submit"
              disabled={joining}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent py-3 text-sm font-semibold text-white transition-colors  active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join meeting"}
            </button>
          </form>
        </div>

        {/* Recent rooms */}
        {historyLoading && (
          <div className="mt-14 flex items-center gap-2 text-sm text-[#9AA0A6]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
            Loading active rooms…
          </div>
        )}

        {!historyLoading && historyError && (
          <div className="mt-14 text-sm text-[#FF7A6B]">{historyError}</div>
        )}

        {!historyLoading && !historyError && recents.length > 0 && (
          <div className="mt-16">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6B7076]">
              Active rooms
            </h3>
            <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14171B]">
              {recents.map((r, i) => (
                <li
                  key={r.room_code}
                  className="group flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="font-mono text-xs text-[#5A5F65]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{r.title}</p>
                      <p className="mt-0.5 text-xs text-[#9AA0A6]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <RoomCodeChip
                      code={r.room_code}
                      copyable={false}
                      className="shrink-0 !bg-transparent !text-[#F5F4F1] border border-white/15 group-hover:border-red-500 group-hover:!text-red-500"
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-500">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                      </span>
                      Live
                    </span>
                    <button
                      onClick={() => navigate(`/rooms/${r.room_code}/lobby`)}
                      className="rounded-lg bg-green-500 px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white hover:text-green-500"
                    >
                      Resume
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!historyLoading && !historyError && recents.length === 0 && (
          <div className="mt-16 rounded-2xl border border-dashed border-white/[0.12] px-6 py-10 text-center text-sm text-[#9AA0A6]">
            No active rooms yet — create or join a meeting to see it here.
          </div>
        )}
      </main>
    </div>
  );
}