from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = AsyncIOMotorClient(settings.mongo_uri)
database = client[settings.mongo_db_name]

users_collection = database.get_collection("users")
rooms_collection = database.get_collection("rooms")
history_collection = database.get_collection("history")


async def init_indexes():
    """Create indexes needed for uniqueness and fast lookups."""
    await users_collection.create_index("email", unique=True)
    await rooms_collection.create_index("room_code", unique=True)
    await history_collection.create_index("room_code")
    # Recent-rooms lookups filter by user_id and sort by joined_at desc —
    # a compound index lets Mongo satisfy both parts of that query directly
    # instead of scanning all of a user's history rows and sorting in memory.
    await history_collection.create_index([("user_id", 1), ("joined_at", -1)])