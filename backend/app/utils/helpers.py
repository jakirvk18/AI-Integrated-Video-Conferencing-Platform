import random
import string
from bson import ObjectId


def generate_room_code(length: int = 9) -> str:
    """Generates a Meet-style code, e.g. abc-defg-hij"""
    chars = string.ascii_lowercase
    raw = "".join(random.choices(chars, k=length))
    return f"{raw[0:3]}-{raw[3:7]}-{raw[7:9]}"


def oid_str(value) -> str:
    return str(value) if isinstance(value, ObjectId) else value


def serialize_user(doc: dict) -> dict:
    return {
        "id": oid_str(doc["_id"]),
        "name": doc["name"],
        "email": doc["email"],
    }


def serialize_room(doc: dict) -> dict:
    return {
        "id": oid_str(doc["_id"]),
        "room_code": doc["room_code"],
        "title": doc["title"],
        "host_id": oid_str(doc["host_id"]),
        "created_at": doc["created_at"],
        "is_active": doc["is_active"],
    }