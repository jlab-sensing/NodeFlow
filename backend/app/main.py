from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager, suppress
import asyncio
import os

from app.routers.solenoid import router as solenoid_router
from app.routers.sensor import router as sensor_router
from app.routers.logger import router as logger_router
from app.routers.groups import router as groups_router
from app.routers.cells import router as cell_router
from app.routers.data_availability import router as data_availability_router
from app.routers.tag import router as tag_router
from app.routers.users import router as user_router
from app.routers.apikey import router as apikey_router
from app.auth.routes import router as auth_router
from app.routers.test_solenoid import router as test_solenoid_router
from app.services.activation_engine import run_activation_loop
from app.services.sensor_reading_collector import (
    run_sensor_reading_collection_loop,
)
from app.routers.chart_sources import router as chart_sources_router
from app.routers.chart_data import router as chart_data_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    activation_task = asyncio.create_task(run_activation_loop())
    reading_collection_task = asyncio.create_task(
        run_sensor_reading_collection_loop()
    )

    try:
        yield
    finally:
        activation_task.cancel()
        reading_collection_task.cancel()
        for task in (activation_task, reading_collection_task):
            with suppress(asyncio.CancelledError):
                await task

app = FastAPI(title="NodeFlow API", lifespan=lifespan)

# Allow frontend to communicate with backend
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(solenoid_router)
app.include_router(sensor_router)
app.include_router(logger_router)
app.include_router(groups_router)
app.include_router(cell_router)
app.include_router(data_availability_router)
app.include_router(tag_router)
app.include_router(user_router)
app.include_router(apikey_router)
app.include_router(auth_router)
app.include_router(test_solenoid_router)
app.include_router(chart_sources_router)
app.include_router(chart_data_router)


@app.get("/")
async def root():
    return {"message": "It's Working!!!"}
