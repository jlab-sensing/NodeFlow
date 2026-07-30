import asyncio
import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

SolenoidState = Literal["open", "closed"]

class StateUpdate(BaseModel):
    state: SolenoidState

class StatusResponse(BaseModel):
    state: SolenoidState

app = FastAPI(
    title="Test Solenoid",
    description="Solenoid sim with open and closed state",
)

initial_state = os.getenv(
    "INITIAL_SOLENOID_STATE",
    "closed",
).lower()
# finish

if initial_state not in {"open", "closed"}:
    initial_state = "closed"

solenoid = {
    "state": initial_state,
}

state_lock = asyncio.Lock()

@app.get("/health")
async def health():
    return {
        "status": "healthy",
    }

@app.get("/status", response_model=StatusResponse)
async def get_status():
    return {
        "state": solenoid["state"]
    }

@app.put("/status", response_model=StatusResponse)
async def update_status(update: StateUpdate):
    async with state_lock:
        solenoid["state"] = update.state

    return {
        "state": solenoid["state"]
    }

@app.post("/open", response_model=StatusResponse)
async def open_solenoid():
    async with state_lock:
        solenoid["state"] = "open"
    return {
        "state": solenoid["state"],
    }

@app.post("/close", response_model=StatusResponse)
async def close_solenoid():
    async with state_lock:
        solenoid["state"] = "closed"
    return {
        "state": solenoid["state"],
    }