from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.auth.auth import get_current_user
from app.database import get_session
from app.models.chart_sources import (
    ChartGroupRead,
    ChartSensorRead,
    ChartSourcesRead,
)
from app.schemas.groups import GroupTable
from app.schemas.sensor import SensorTable
from app.schemas.sensor_reading import SensorReadingTable
from app.schemas.user_schema import UserTable
from app.services.sensor_config import get_sensor_capabilities
from app.services.sensor_readings import TEST_SENSOR_ID, TEST_SENSOR_LOGGER_ID


router = APIRouter(
    prefix="/api/chart-sources",
    tags=["Chart Sources"],
)


@router.get("/", response_model=ChartSourcesRead)
def get_chart_sources(
    session: Session = Depends(get_session),
    current_user: UserTable = Depends(get_current_user),
):
    groups = session.exec(
        select(GroupTable).where(
            GroupTable.user_id == current_user.id,
        )
    ).all()

    sensors = session.exec(
        select(SensorTable).where(
            SensorTable.user_id == current_user.id,
        )
    ).all()

    group_rows = [
        ChartGroupRead(
            uuid=group.uuid,
            name=group.name,
        )
        for group in groups
    ]

    sensor_rows = []
    for sensor in sensors:
        capabilities = get_sensor_capabilities(sensor.sensor_type)
        has_native_readings = session.exec(
            select(SensorReadingTable.id).where(
                SensorReadingTable.sensor_uuid == sensor.uuid,
                SensorReadingTable.user_id == current_user.id,
            )
        ).first() is not None
        is_test_sensor = (
            sensor.sensor_id == TEST_SENSOR_ID
            and sensor.logger_id == TEST_SENSOR_LOGGER_ID
        )
        sensor_rows.append(
            ChartSensorRead(
                uuid=sensor.uuid,
                name=sensor.name,
                sensor_type=sensor.sensor_type,
                logger_id=sensor.logger_id,
                group_id=sensor.group_id,
                has_chart_data=(
                    has_native_readings
                    or is_test_sensor
                    or sensor.legacy_cell_id is not None
                ),
                measurements=capabilities["measurements"],
                panel_ids=capabilities["panel_ids"],
            )
        )

    return ChartSourcesRead(
        groups=group_rows,
        sensors=sensor_rows,
    )
