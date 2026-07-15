import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.database import rooms_collection, users_collection
from app.utils.security import decode_access_token
from app.websocket.connection_manager import manager
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(tags=["Signaling"])

# Message "type" values exchanged over this socket:
#   join           -> server broadcasts "peer-joined" to existing participants
#   offer          -> SDP offer, relayed to a specific target participant
#   answer         -> SDP answer, relayed to a specific target participant
#   ice-candidate  -> ICE candidate, relayed to a specific target participant
#   chat           -> text chat message, broadcast to room
#   leave / disconnect -> server broadcasts "peer-left"


async def _authenticate(token: str) -> dict | None:
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        return None
    return user


@router.websocket("/ws/rooms/{room_code}")
async def signaling_endpoint(websocket: WebSocket, room_code: str, token: str = Query(...)):
    user = await _authenticate(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    room = await rooms_collection.find_one({"room_code": room_code})
    if not room or not room.get("is_active"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    participant_id = str(user["_id"])
    participant_name = user["name"]

    await manager.connect(room_code, participant_id, websocket)

    # Tell the new participant who is already in the room
    await manager.send_to_participant(room_code, participant_id, {
        "type": "room-state",
        "participants": [p for p in manager.get_participants(room_code) if p != participant_id],
    })

    # Tell everyone else a new peer joined
    await manager.broadcast(room_code, {
        "type": "peer-joined",
        "participant_id": participant_id,
        "participant_name": participant_name,
    }, exclude=participant_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type in ("offer", "answer", "ice-candidate"):
                target_id = data.get("target")
                if not target_id:
                    continue
                await manager.send_to_participant(room_code, target_id, {
                    "type": msg_type,
                    "sender": participant_id,
                    "sender_name": participant_name,
                    "payload": data.get("payload"),
                })

            elif msg_type == "chat":
                await manager.broadcast(room_code, {
                    "type": "chat",
                    "sender": participant_id,
                    "sender_name": participant_name,
                    "message": data.get("message", ""),
                })

            elif msg_type == "media-state":
                # e.g. mic muted, camera off - relay to everyone
                await manager.broadcast(room_code, {
                    "type": "media-state",
                    "participant_id": participant_id,
                    "audio_enabled": data.get("audio_enabled"),
                    "video_enabled": data.get("video_enabled"),
                }, exclude=participant_id)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(room_code, participant_id)
        await manager.broadcast(room_code, {
            "type": "peer-left",
            "participant_id": participant_id,
        })