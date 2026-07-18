import { useEffect, useRef, useState } from "react";

const SPEAKING_THRESHOLD = 12; // 0-255 scale — tune by ear
const HANG_MS = 600;           // keep "speaking" true briefly after volume drops, avoids flicker

export function useActiveSpeaker(streamsById) {
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const analysersRef = useRef({});
  const audioCtxRef = useRef(null);
  const lastSpokeRef = useRef({});

  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtxRef.current = new AudioCtx();
    return () => audioCtxRef.current?.close();
  }, []);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const currentIds = new Set(Object.keys(streamsById));

    Object.keys(analysersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        analysersRef.current[id].source.disconnect();
        delete analysersRef.current[id];
      }
    });

    Object.entries(streamsById).forEach(([id, stream]) => {
      if (!stream || analysersRef.current[id] || stream.getAudioTracks().length === 0) return;
      try {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        analysersRef.current[id] = { source, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
      } catch {
        // stream's audio track may not be ready yet — next effect run retries
      }
    });
  }, [streamsById]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const now = Date.now();
      let loudestId = null;
      let loudestVal = 0;
      const speaking = new Set();

      Object.entries(analysersRef.current).forEach(([id, { analyser, data }]) => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;

        if (avg > SPEAKING_THRESHOLD) lastSpokeRef.current[id] = now;
        if (now - (lastSpokeRef.current[id] || 0) < HANG_MS) speaking.add(id);
        if (avg > loudestVal) { loudestVal = avg; loudestId = id; }
      });

      setSpeakingIds(speaking);
      setActiveSpeakerId((prev) => (loudestVal > SPEAKING_THRESHOLD ? loudestId : prev));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { activeSpeakerId, speakingIds };
}