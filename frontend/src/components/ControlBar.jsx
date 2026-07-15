export default function ControlBar({
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onLeave,
  onToggleChat,
  onToggleParticipants,
  chatActive,
  participantsActive,
  unreadChat = 0,
  roomCode,
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-mist bg-ink-soft/95 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur">
        <span className="hidden pl-2 pr-3 font-mono text-xs tracking-widest text-muted sm:inline">
          #{roomCode}
        </span>

        <CircleButton active={micEnabled} onClick={onToggleMic} label={micEnabled ? "Mute" : "Unmute"}>
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
        </CircleButton>

        <CircleButton active={cameraEnabled} onClick={onToggleCamera} label={cameraEnabled ? "Stop video" : "Start video"}>
          {cameraEnabled ? <CamIcon /> : <CamOffIcon />}
        </CircleButton>

        <CircleButton active={participantsActive} onClick={onToggleParticipants} label="Participants" neutral>
          <PeopleIcon />
        </CircleButton>

        <CircleButton active={chatActive} onClick={onToggleChat} label="Chat" neutral badge={unreadChat}>
          <ChatIcon />
        </CircleButton>

        <button
          onClick={onLeave}
          className="ml-1 flex h-11 items-center gap-2 rounded-full bg-tally px-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
        >
          <LeaveIcon />
          Leave
        </button>
      </div>
    </div>
  );
}

function CircleButton({ active, onClick, label, children, neutral = false, badge = 0 }) {
  const base = "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors";
  const tone = neutral
    ? active
      ? "bg-signal text-white"
      : "bg-mist text-paper/90 hover:bg-mist-light"
    : active
    ? "bg-mist text-paper/90 hover:bg-mist-light"
    : "bg-tally text-white";

  return (
    <button onClick={onClick} className={`${base} ${tone}`} aria-label={label} title={label}>
      {children}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tally px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0011.2 5.6M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10.5l5-3v9l-5-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function CamOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10.5l5-3v9l-5-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M16 8.2a2.7 2.7 0 110 5.4M17.5 14.6c2 .4 3.5 1.8 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H9l-4.5 4v-4A2.5 2.5 0 012 13.5v-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function LeaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M15 4H7a2 2 0 00-2 2v12a2 2 0 002 2h8M10 12h11m0 0l-3.5-3.5M21 12l-3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)" />
    </svg>
  );
}
