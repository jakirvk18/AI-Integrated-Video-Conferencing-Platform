import { useCallback, useEffect, useRef, useState } from "react";
import { signalingUrl } from "../api/client";

const ICE_FALLBACK = [{ urls: ["stun:stun.l.google.com:19302"] }];

/**
 * Manages the signaling WebSocket + a mesh of RTCPeerConnections for a room.
 *
 * Flow:
 *  - On connect, server sends "room-state" with existing participant ids.
 *    We are the newcomer, so we create an offer to each existing participant.
 *  - When someone else joins later, server sends "peer-joined" to us; we wait
 *    for their offer (they are the newcomer relative to us).
 *  - offer/answer/ice-candidate are relayed by the server to a specific target.
 */
export function useRoomCall({ roomCode, token, localName, iceServers, autoStart = true }) {
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting | connected | closed | error | ended
  const [localStream, setLocalStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [participants, setParticipants] = useState({}); // id -> { id, name, stream, audioEnabled, videoEnabled }
  const [messages, setMessages] = useState([]);
  const [mediaError, setMediaError] = useState(null);

  const wsRef = useRef(null);
  const peersRef = useRef({}); // id -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const namesRef = useRef({}); // id -> name

  // "ended" is terminal: once the server tells us the meeting is over, no
  // later event on this socket (close, error, etc.) should be able to
  // downgrade the UI back to a live-looking room. Helper below encodes that.
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

      // These fire on every close/error, including the one we trigger
      // ourselves right after setting "ended" below — so they must not be
      // allowed to stomp on a terminal "ended" status.
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
          case "peer-left":
            closePeer(data.participant_id);
            break;
          case "meeting-ended":
            // Set the terminal state first, then tear down. onclose above
            // is guarded so it won't overwrite "ended" once this is set.
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