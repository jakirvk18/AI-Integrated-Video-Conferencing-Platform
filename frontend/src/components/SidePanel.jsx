import { useEffect, useRef, useState } from "react";

export default function SidePanel({ mode, onClose, messages, onSendChat, participants, selfName, isHost, onTransferHost }) {
  if (!mode) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-mist bg-ink-soft shadow-2xl">
      <div className="flex items-center justify-between border-b border-mist px-4 py-3">
        <h2 className="font-display text-sm font-semibold tracking-wide text-paper">
          {mode === "chat" ? "In-call messages" : `People (${participants.length})`}
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted transition-colors hover:bg-mist hover:text-paper"
          aria-label="Close panel"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {mode === "chat" ? (
        <ChatBody messages={messages} onSendChat={onSendChat} selfName={selfName} />
      ) : (
        <ParticipantsBody participants={participants} isHost={isHost} onTransferHost={onTransferHost} />
      )}
    </aside>
  );
}

function ChatBody({ messages, onSendChat, selfName }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSendChat(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted">
            Messages sent here are only visible to people in this call.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderName === selfName && !m.sender;
          return (
            <div key={m.id}>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-signal">{m.senderName}</span>
                <span className="text-[10px] text-muted">
                  {m.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-paper/90">{m.message}</p>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-mist px-3 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Send a message to everyone"
          className="flex-1 rounded-lg border border-mist bg-ink px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ParticipantsBody({ participants, isHost, onTransferHost }) {
  return (
    <div className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
      {participants.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-mist/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mist font-display text-xs font-semibold text-paper">
            {p.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="flex-1 truncate text-sm text-paper/90">
            {p.name} {p.isLocal && <span className="text-muted-light">(you)</span>}
          </span>
          {p.audioEnabled === false && <span className="text-xs text-tally">muted</span>}
          {isHost && !p.isLocal && (
            <button
              onClick={() => onTransferHost(p.id)}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-signal hover:bg-signal/10"
            >
              Make host
            </button>
          )}
        </div>
      ))}
    </div>
  );
}