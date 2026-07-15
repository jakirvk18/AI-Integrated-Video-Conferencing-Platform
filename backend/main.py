from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_indexes
from app.routers import auth, rooms, signaling


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    yield


app = FastAPI(
    title="Video Call Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(signaling.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Video Call Platform API!"}

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}