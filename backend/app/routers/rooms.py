from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.database import rooms_collection, history_collection
from app.dependencies import get_current_user
from app.schemas.room import RoomCreate, RoomHistory, RoomOut, JoinRoomRequest, RTCConfigOut
from app.utils.helpers import generate_room_code, serialize_room
from app.websocket.connection_manager import manager

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(payload: RoomCreate, current_user: dict = Depends(get_current_user)):
    room_doc = {
        "room_code": generate_room_code().upper(),
        "title": payload.title,
        "host_id": current_user["_id"],
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
        "ended_at": None,
    }
    result = await rooms_collection.insert_one(room_doc)
    room_doc["_id"] = result.inserted_id

    # Log a history entry for the host too, so hosted rooms show up
    # alongside joined rooms in "Recent rooms".
    await history_collection.insert_one({
        "user_id": current_user["_id"],
        "room_code": room_doc["room_code"],
        "joined_at": room_doc["created_at"],
    })

    return serialize_room(room_doc)


@router.get("/rtc/config", response_model=RTCConfigOut)
async def get_rtc_config(current_user: dict = Depends(get_current_user)):
    """
    Returns ICE server configuration (STUN/TURN) for the frontend's RTCPeerConnection.
    NAT traversal for real deployments generally needs a TURN server;
    STUN alone often fails across restrictive NATs/firewalls.
    """
    ice_servers = [{"urls": settings.stun_servers}]
    if settings.turn_server_url:
        ice_servers.append({
            "urls": settings.turn_server_url,
            "username": settings.turn_username,
            "credential": settings.turn_credential,
        })
    return RTCConfigOut(ice_servers=ice_servers)


@router.get("/{user_id}/active/history", response_model=list[RoomHistory])
async def get_room_history(user_id: str, current_user: dict = Depends(get_current_user)):
    if str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own room history")

    try:
        uid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")

    # Pull the user's join/host events (most recent first), then look up
    # the corresponding room docs. A user can appear in history_collection
    # multiple times for the same room_code (rejoins) — dedupe while
    # preserving most-recent-first order.
    history_cursor = history_collection.find({"user_id": uid}).sort("joined_at", -1)
    history_entries = await history_cursor.to_list(length=200)

    ordered_codes = []
    seen = set()
    for h in history_entries:
        code = h["room_code"]
        if code in seen:
            continue
        seen.add(code)
        ordered_codes.append(code)
        if len(ordered_codes) >= 100:
            break

    if not ordered_codes:
        return []

    rooms = await rooms_collection.find({
        "room_code": {"$in": ordered_codes},
        "is_active": True
    }).to_list(length=len(ordered_codes))
    rooms_by_code = {r["room_code"]: r for r in rooms}

    # Re-apply the history order (Mongo's $in does not guarantee result order).
    result = [
        serialize_room(rooms_by_code[code])
        for code in ordered_codes
        if code in rooms_by_code

    ]
    return result


@router.get("/{room_code}", response_model=RoomOut)
async def get_room(room_code: str, current_user: dict = Depends(get_current_user)):
    room = await rooms_collection.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return serialize_room(room)


@router.post("/join", response_model=RoomOut)
async def join_room(payload: JoinRoomRequest, current_user: dict = Depends(get_current_user)):
    room_code = payload.room_code.strip().upper()
    room = await rooms_collection.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if not room["is_active"]:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This meeting has ended")

    current_count = len(manager.get_participants(room_code))
    if current_count >= settings.max_participants_per_room:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Room is full")

    # Record a history entry for the user joining the room.
    # Note: this is a best-effort log at request time, not proof the websocket
    # connection succeeded. The websocket layer remains the source of truth
    # for actual room occupancy/enforcement.
    history_doc = {
        "user_id": current_user["_id"],
        "room_code": room_code,
        "joined_at": datetime.now(timezone.utc),
    }
    await history_collection.insert_one(history_doc)

    return serialize_room(room)


@router.post("/{room_code}/end", status_code=status.HTTP_204_NO_CONTENT)
async def end_room(room_code: str, current_user: dict = Depends(get_current_user)):
    room = await rooms_collection.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if str(room["host_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host can end the meeting")

    await rooms_collection.update_one(
        {"_id": room["_id"]},
        {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc)}},
    )

    # Notify everyone currently connected that the meeting has ended
    await manager.broadcast(room_code, {"type": "meeting-ended"})