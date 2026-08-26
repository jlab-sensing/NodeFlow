from sqlmodel import SQLModel

class ArchiveUpdate(SQLModel):
    archived: bool