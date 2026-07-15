import { useState } from "react";

export default function RoomCodeChip({ code, copyable = true, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard may be unavailable; fail silently
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!copyable}
      className={`group inline-flex items-center gap-2 rounded-md border border-mist-light/60 bg-ink-soft px-3 py-1.5 font-mono text-sm tracking-[0.15em] text-paper/90 ${
        copyable ? "cursor-pointer hover:border-signal/60" : "cursor-default"
      } ${className}`}
      title={copyable ? "Copy room code" : undefined}
    >
      <span className="text-muted-light">#</span>
      {code}
      {copyable && (
        <span className="ml-1 text-[10px] uppercase tracking-wider text-muted transition-colors group-hover:text-signal">
          {copied ? "copied" : "copy"}
        </span>
      )}
    </button>
  );
}
