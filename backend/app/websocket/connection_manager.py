import json
from typing import Dict

from fastapi import WebSocket


class ConnectionManager:
    """
    Tracks active WebSocket connections grouped by room_code.
    Structure: { room_code: { participant_id: WebSocket } }
    """

    def __init__(self):
        self.active_rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_code: str, participant_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_rooms.setdefault(room_code, {})[participant_id] = websocket

    def disconnect(self, room_code: str, participant_id: str):
        room = self.active_rooms.get(room_code)
        if room and participant_id in room:
            del room[participant_id]
        if room is not None and len(room) == 0:
            self.active_rooms.pop(room_code, None)

    def get_participants(self, room_code: str) -> list[str]:
        return list(self.active_rooms.get(room_code, {}).keys())

    async def send_to_participant(self, room_code: str, participant_id: str, message: dict):
        room = self.active_rooms.get(room_code, {})
        ws = room.get(participant_id)
        if ws:
            await ws.send_text(json.dumps(message))

    async def broadcast(self, room_code: str, message: dict, exclude: str | None = None):
        room = self.active_rooms.get(room_code, {})
        for participant_id, ws in list(room.items()):
            if participant_id == exclude:
                continue
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                # Connection likely already dead; will be cleaned up on its own disconnect
                pass


manager = ConnectionManager()