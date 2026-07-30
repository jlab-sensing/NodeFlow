from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager, suppress
import asyncio
import os

from app.database import create_db_and_tables
from app.routers.solenoid import router as solenoid_router
from app.routers.sensor import router as sensor_router
from app.routers.logger import router as logger_router
from app.routers.groups import router as groups_router
from app.routers.cells import router as cell_router
from app.routers.data_availability import router as data_availability_router
from app.routers.power_data import router as power_data_router
from app.routers.teros_data import router as teros_data_router
from app.routers.tag import router as tag_router
from app.routers.catalog import router as catalog_router
from app.routers.users import router as user_router
from app.routers.apikey import router as apikey_router
from app.auth.routes import router as auth_router
from app.routers.test_solenoid import router as test_solenoid_router
from app.services.activation_engine import run_activation_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    activation_task = asyncio.create_task(run_activation_loop())

    try:
        yield
    finally:
        activation_task.cancel()
        with suppress(asyncio.CancelledError):
            await activation_task

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
app.include_router(power_data_router)
app.include_router(teros_data_router)
app.include_router(tag_router)
app.include_router(catalog_router)
app.include_router(user_router)
app.include_router(apikey_router)
app.include_router(auth_router)
app.include_router(test_solenoid_router)


@app.get("/")
async def root():
    return {"message": "It's Working!!!"}
