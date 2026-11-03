from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.solenoid import SolenoidRead
from app.models.solenoid_command import SolenoidCommandRead
from app.schemas.solenoid import SolenoidTable
from app.schemas.solenoid_command import SolenoidCommandTable


def serialize_solenoids(
    solenoids: list[SolenoidTable],
    session: Session,
    user_id: UUID,
) -> list[SolenoidRead]:
    if any(item.user_id != user_id for item in solenoids):
        raise HTTPException(
            status_code=404,
            detail="solenoid not found",
        )

    logger_ids = {item.logger_id for item in solenoids if item.logger_id > 0}

    latest_by_logger: dict[int, SolenoidCommandRead] = {}
    latest_queued_by_logger: dict[int, SolenoidCommandRead] = {}

    if logger_ids:
        # Select the newest command attempt for each owned logger.
        statement = (
            select(SolenoidCommandTable)
            .where(
                SolenoidCommandTable.user_id == user_id,
                SolenoidCommandTable.logger_id.in_(logger_ids),
            )
            .distinct(SolenoidCommandTable.logger_id)
            .order_by(
                SolenoidCommandTable.logger_id,
                SolenoidCommandTable.created_at.desc(),
                SolenoidCommandTable.id.desc(),
            )
        )

        commands = session.exec(statement).all()

        latest_by_logger = {
            command.logger_id: SolenoidCommandRead.model_validate(command)
            for command in commands
        }

        # Filter to successful submissions before selecting the newest
        # command for each logger.
        queued_statement = statement.where(SolenoidCommandTable.status == "queued")
        queued_commands = session.exec(queued_statement).all()

        latest_queued_by_logger = {
            command.logger_id: SolenoidCommandRead.model_validate(command)
            for command in queued_commands
        }

    results = []

    for solenoid in solenoids:
        result = SolenoidRead.model_validate(solenoid)

        result.last_command = latest_by_logger.get(solenoid.logger_id)
        result.last_queued_command = latest_queued_by_logger.get(solenoid.logger_id)

        results.append(result)

    return results
