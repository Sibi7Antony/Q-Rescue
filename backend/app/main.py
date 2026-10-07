from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(
    title="Q-RESCUE API",
    description="Educational disaster-response simulation and optimization API.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "name": "Q-RESCUE API",
        "status": "simulation-ready",
        "disclaimer": "Tactical disaster digital twin. Not for real emergency response.",
    }
