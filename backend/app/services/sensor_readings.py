import httpx
import os
from fastapi import HTTPException

SENSOR_TESTER_URL = os.getenv(
    "SENSOR_TESTER_URL",
    "http://sensor-tester:8003",
)
TEST_SENSOR_ID = -1
TEST_SENSOR_LOGGER_ID = -2


async def request_test_sensor(
    method: str,
    path: str,
    payload: dict | None = None,
):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.request(
                method,
                f"{SENSOR_TESTER_URL}{path}",
                json=payload,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as error:
        try:
            tester_detail = error.response.json().get("detail")
        except ValueError:
            tester_detail = None

        raise HTTPException(
            status_code=error.response.status_code,
            detail=tester_detail or "Test sensor rejected the request",
        ) from error
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=503,
            detail="Test sensor unavailable",
        ) from error

async def get_sensor_reading(sensor):
    if (
        sensor.sensor_id != TEST_SENSOR_ID
        or sensor.logger_id != TEST_SENSOR_LOGGER_ID
    ):
        raise NotImplementedError(
            f"Reading source is not implemented for sensor {sensor.id}"
        )

    return await request_test_sensor("GET", "/reading")
