from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Mongo
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "video_call_db"

    # JWT
    jwt_secret_key: str = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # WebRTC / TURN (used only for handing config to clients, not for media relay)
    stun_servers: list[str] = ["stun:stun.l.google.com:19302"]
    turn_server_url: str | None = None
    turn_username: str | None = None
    turn_credential: str | None = None

    # Room limits
    max_participants_per_room: int = 12

    class Config:
        env_file = ".env"


settings = Settings()