import { useEffect, useRef } from "react";
import TallyDot from "./TallyDot";

export default function VideoTile({
  stream,
  name,
  isLocal = false,
  muted = false,
  audioEnabled = true,
  videoEnabled = true,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  const initial = name?.[0]?.toUpperCase() || "?";

  return (
    <div className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-slate ring-1 ring-mist">
      {stream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className={`h-full w-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-noise">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mist font-display text-xl font-semibold text-paper">
            {initial}
          </div>
          <span className="text-xs text-muted-light">Camera off</span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/80 to-transparent px-3 py-2">
        <span className="truncate font-medium text-sm text-paper/95">
          {name} {isLocal && <span className="text-muted-light">(you)</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {!audioEnabled && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-tally" title="Muted">
              <MicOffIcon />
            </span>
          )}
          {!stream && <TallyDot live={false} />}
        </div>
      </div>
    </div>
  );
}

function MicOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
      <path
        d="M4 4l12 12M9.5 3.5a2.5 2.5 0 015 0v5c0 .4-.06.79-.17 1.15M6.5 8v.5a3.5 3.5 0 005.6 2.8M5 9v.5a5 5 0 007.9 4.05M10 15v2m-2.5 0h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
