import httpx
import os
from sqlmodel import Session
from app.schemas.solenoid import SolenoidTable

SOLENOID_TESTER_URL = os.getenv(
    "SOLENOID_TESTER_URL",
    "http://solenoid-tester:8002",
)

async def set_solenoid_state(
    solenoid: SolenoidTable,
    desired_state: str,
    session: Session,
    force: bool = False,
):
    if not force and solenoid.active_state == desired_state:
        return solenoid

    if desired_state not in {"open", "closed"}:
        raise ValueError(f"Unsupported solenoid state: {desired_state}")

    endpoint = "open" if desired_state == "open" else "close"
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{SOLENOID_TESTER_URL}/{endpoint}"
        )
        response.raise_for_status()
        result = response.json()
    
    solenoid.active_state = result["state"]
    session.add(solenoid)
    session.commit()
    session.refresh(solenoid)

    return solenoid

async def open_solenoid(solenoid, session, force: bool = False):
    return await set_solenoid_state(
        solenoid, 
        "open",
        session,
        force=force,
    )

async def close_solenoid(solenoid, session, force: bool = False):
    return await set_solenoid_state(
        solenoid, 
        "closed",
        session,
        force=force,
    )
