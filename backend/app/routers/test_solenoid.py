import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/api/test-solenoid",
    tags=["Test Solenoid"],
)

SOLENOID_TESTER_URL = os.getenv(
    "SOLENOID_TESTER_URL",
    "http://solenoid-tester:8002",
)

@router.get("/status")
async def get_test_solenoid_status():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{SOLENOID_TESTER_URL}/status"
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=503,
            detail="Test solenoid is unavailable",
        ) from error