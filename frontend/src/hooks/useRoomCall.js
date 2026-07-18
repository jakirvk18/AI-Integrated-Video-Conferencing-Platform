import { useCallback, useEffect, useRef, useState } from "react";
import { signalingUrl } from "../api/client";

const ICE_FALLBACK = [{ urls: ["stun:stun.l.google.com:19302"] }];

export function useRoomCall({ roomCode, token, localName, iceServers, autoStart = true, onHostChanged }) {
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [localStream, setLocalStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [participants, setParticipants] = useState({});
  const [messages, setMessages] = useState([]);
  const [mediaError, setMediaError] = useState(null);

  const wsRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const namesRef = useRef({});
  const onHostChangedRef = useRef(onHostChanged);
  onHostChangedRef.current = onHostChanged;

  const setStatusUnlessEnded = useCallback((status) => {
    setConnectionStatus((prev) => (prev === "ended" ? prev : status));
  }, []);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const upsertParticipant = useCallback((id, patch) => {
    setParticipants((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { id, name: namesRef.current[id] || "Guest", audioEnabled: true, videoEnabled: true }), ...patch },
    }));
  }, []);

  const removeParticipant = useCallback((id) => {
    setParticipants((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerId) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers?.length ? iceServers : ICE_FALLBACK });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({ type: "ice-candidate", target: peerId, payload: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        upsertParticipant(peerId, { stream });
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          // leave cleanup to explicit peer-left handling
        }
      };

      peersRef.current[peerId] = pc;
      return pc;
    },
    [iceServers, send, upsertParticipant]
  );

  const getOrCreatePeer = useCallback(
    (peerId) => peersRef.current[peerId] || createPeerConnection(peerId),
    [createPeerConnection]
  );

  const initiateOfferTo = useCallback(
    async (peerId) => {
      const pc = getOrCreatePeer(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "offer", target: peerId, payload: offer });
    },
    [getOrCreatePeer, send]
  );

  const handleOffer = useCallback(
    async (fromId, payload) => {
      const pc = getOrCreatePeer(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", target: fromId, payload: answer });
    },
    [getOrCreatePeer, send]
  );

  const handleAnswer = useCallback(async (fromId, payload) => {
    const pc = peersRef.current[fromId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload));
  }, []);

  const handleIceCandidate = useCallback(async (fromId, payload) => {
    const pc = peersRef.current[fromId];
    if (pc && payload) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      } catch {
        // benign if it arrives before remote description is set in rare races
      }
    }
  }, []);

  const closePeer = useCallback(
    (peerId) => {
      const pc = peersRef.current[peerId];
      if (pc) {
        pc.close();
        delete peersRef.current[peerId];
      }
      removeParticipant(peerId);
    },
    [removeParticipant]
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      send({ type: "media-state", audio_enabled: next, video_enabled: cameraEnabled });
      return next;
    });
  }, [cameraEnabled, send]);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      send({ type: "media-state", audio_enabled: micEnabled, video_enabled: next });
      return next;
    });
  }, [micEnabled, send]);

  const sendChat = useCallback(
    (message) => {
      if (!message.trim()) return;
      send({ type: "chat", message });
    },
    [send]
  );

  const leave = useCallback(() => {
    wsRef.current?.close(1000, "leave");
  }, []);

  useEffect(() => {
    if (!autoStart || !roomCode || !token) return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        setMediaError(
          err?.name === "NotAllowedError"
            ? "Camera and microphone access was blocked. Allow access in your browser settings and rejoin."
            : "Couldn't access your camera or microphone."
        );
      }

      const ws = new WebSocket(signalingUrl(roomCode, token));
      wsRef.current = ws;

      ws.onopen = () => setStatusUnlessEnded("connected");
      ws.onclose = () => setStatusUnlessEnded("closed");
      ws.onerror = () => setStatusUnlessEnded("error");

      ws.onmessage = async (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (data.type) {
          case "room-state": {
            for (const peerId of data.participants || []) {
              await initiateOfferTo(peerId);
            }
            break;
          }
          case "peer-joined": {
            namesRef.current[data.participant_id] = data.participant_name;
            upsertParticipant(data.participant_id, { name: data.participant_name });
            break;
          }
          case "offer":
            namesRef.current[data.sender] = data.sender_name;
            upsertParticipant(data.sender, { name: data.sender_name });
            await handleOffer(data.sender, data.payload);
            break;
          case "answer":
            await handleAnswer(data.sender, data.payload);
            break;
          case "ice-candidate":
            await handleIceCandidate(data.sender, data.payload);
            break;
          case "chat":
            setMessages((prev) => [
              ...prev,
              { id: `${data.sender}-${Date.now()}-${Math.random()}`, sender: data.sender, senderName: data.sender_name, message: data.message, at: new Date() },
            ]);
            break;
          case "media-state":
            upsertParticipant(data.participant_id, {
              audioEnabled: data.audio_enabled,
              videoEnabled: data.video_enabled,
            });
            break;
          case "host-changed":
            onHostChangedRef.current?.(data.new_host_id);
            break;
          case "peer-left":
            closePeer(data.participant_id);
            break;
          case "meeting-ended":
            setConnectionStatus("ended");
            Object.keys(peersRef.current).forEach((id) => peersRef.current[id].close());
            peersRef.current = {};
            ws.close();
            break;
          default:
            break;
        }
      };
    }

    start();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      Object.keys(peersRef.current).forEach((id) => peersRef.current[id].close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, token, autoStart]);

  return {
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
  };
}