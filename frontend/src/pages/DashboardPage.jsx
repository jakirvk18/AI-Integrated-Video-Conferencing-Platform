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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-2">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-red-500">
            On air, in seconds
          </p>
        </div>

        <h1
          className="mt-4 text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-3xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Good to see you, {user?.name}.
        </h1>
        <div className="mt-4 h-[3px] w-14 bg-[#E4102A]" />

        {error && (
          <div className="mt-8 flex items-center gap-3 border border-[#0A0A0A] px-4 py-3 text-sm text-[#0A0A0A]">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E4102A] text-[10px] font-bold text-white">
              !
            </span>
            {error}
          </div>
        )}

        {/* Action panels */}
        <div className="mt-12 grid gap-10 overflow-hidden sm:grid-cols-2 p-4">
          <form onSubmit={handleCreate} className="rounded-xl shadow-[2px_4px_6px_3px_rgba(0,0,0,0.3)] p-7">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8A8A8A]">
              01 — Create
            </span>
            <h2
              className="mt-2 text-xl font-bold text-[#0A0A0A]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              New meeting
            </h2>
            <p className="mt-1 text-sm text-[#8A8A8A]">
              Give it a name — or don't, we'll title it for you.
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Meeting"
              className="mt-5 w-full rounded-xl border border-[#0A0A0A]/20 bg-transparent px-3 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#B5B5B5] focus:border-[#E4102A] focus:outline-none"
            />
            <button
              type="submit"
              disabled={creating}
              className="mt-6 cursor-pointer rounded-xl flex w-full items-center justify-center gap-2 bg-[#0A0A0A] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#E4102A] disabled:opacity-50"
            >
              {creating ? "Starting…" : "Start meeting"}
            </button>
          </form>

          <form onSubmit={handleJoin} className="rounded-xl shadow-[2px_4px_6px_3px_rgba(0,0,0,0.3)] p-7">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8A8A8A]">
              02 — Join
            </span>
            <h2
              className="mt-2 text-xl font-bold text-[#0A0A0A]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Join with a code
            </h2>
            <p className="mt-1 text-sm text-[#8A8A8A]">
              Ask the host for their room code.
            </p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. 7F3-K9Q"
              className="mt-5 rounded-xl w-full border border-[#0A0A0A]/20 bg-transparent px-3 py-2.5 font-mono text-sm uppercase tracking-widest text-[#0A0A0A] placeholder:text-[#B5B5B5] placeholder:tracking-normal focus:border-[#E4102A] focus:outline-none"
            />
            <button
              type="submit"
              disabled={joining}
              className="mt-6 bg-black rounded-xl cursor-pointer flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join meeting"}
            </button>
          </form>
        </div>

        {/* Recent rooms */}
        {historyLoading && (
          <div className="mt-14 text-sm text-[#8A8A8A]">Loading Active rooms…</div>
        )}

        {!historyLoading && historyError && (
          <div className="mt-14 text-sm text-[#E4102A]">{historyError}</div>
        )}

        {!historyLoading && !historyError && recents.length > 0 && (
          <div className="mt-14">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8A8A8A]">
              Active rooms
            </h3>
            <div className="mt-4 divide-y divide-[#E5E5E5] border-t border-[#E5E5E5]">
              {recents.map((r, i) => (
                <li
                  key={r.room_code}
                  
                  className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-[#0A0A0A]/[0.02]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="font-mono text-xs text-[#B5B5B5]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#0A0A0A]">{r.title}</p>
                      <p className="mt-0.5 text-xs text-[#8A8A8A]">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <RoomCodeChip
                    code={r.room_code}
                    copyable={false}
                    className="shrink-0 !bg-transparent !text-[#0A0A0A] border border-[#0A0A0A]/15 group-hover:border-[#E4102A] group-hover:!text-[#E4102A]"
                  />
                  <div>
                      <span className="rounded-full bg-[#E4102A] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Live
                      </span>
                      <button 
                      onClick={() => navigate(`/rooms/${r.room_code}/lobby`)}
                      className="ml-2 rounded-lg bg-[#0A0A0A] px-3 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-[#E4102A]">
                        Resume Meeting
                      </button>                   
                  </div>
                </li>
              ))}
            </div>
          </div>
        )}

        {!historyLoading && !historyError && recents.length === 0 && (
          <div className="mt-14 text-sm text-[#8A8A8A]">
            No active rooms yet — create or join a meeting to see it here.
          </div>
        )}
      </main>
    </div>
  );
}