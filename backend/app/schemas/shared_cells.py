from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field, SQLModel


class SharedCellTable(SQLModel, table=True):
    __tablename__ = "shared_cell"

    __table_args__ = (
        UniqueConstraint(
            "source_instance",
            "cell_id",
            name="uq_shared_cell_source_cell",
        ),
        CheckConstraint(
            "cell_id > 0",
            name="ck_shared_cell_positive_id",
        ),
    )

    uuid: UUID = Field(default_factory=uuid4, primary_key=True)
    source_instance: str
    cell_id: int
    cached_name: str
    enabled: bool = Field(
        default=True,
        sa_column_kwargs={"server_default": "true"},
    )


class GroupCellLink(SQLModel, table=True):
    __tablename__ = "group_cell_link"

    group_id: int = Field(
        foreign_key="groups.id",
        primary_key=True,
    )
    shared_cell_uuid: UUID = Field(
        foreign_key="shared_cell.uuid",
        primary_key=True,
    )
