from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RoomCreate(BaseModel):
    title: str = Field(default="Untitled Meeting", max_length=120)


class RoomOut(BaseModel):
    id: str
    room_code: str
    title: str
    host_id: str
    created_at: datetime
    is_active: bool
    ended_at: Optional[datetime] = None


class RoomHistory(RoomOut):
    pass


class JoinRoomRequest(BaseModel):
    room_code: str


class RTCConfigOut(BaseModel):
    ice_servers: list[dict]


class TransferHostRequest(BaseModel):
    new_host_id: str