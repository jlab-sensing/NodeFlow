from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import create_db_and_tables
from app.routers.solenoid import router as solenoid_router
from app.routers.sensor import router as sensor_router
from app.routers.logger import router as logger_router
from app.routers.groups import router as groups_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="NodeFlow API", lifespan=lifespan)

app.include_router(solenoid_router)
app.include_router(sensor_router)
app.include_router(logger_router)
app.include_router(groups_router)

@app.get("/")
async def root():
    return {"message": "It's Working!!!"}

@app.get("/api/user", response_model=dict)
async def get_user_info():
    """Getting user details"""
    return {}

@app.get("/api/data-availability/")
async def check_data_availability():
    """Getting status of hardware"""
    return {}