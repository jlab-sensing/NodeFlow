from sqlmodel import SQLModel
from uuid import UUID
from typing import Literal
from pydantic import model_validator

ComparisonOperator = Literal["<", ">"]

class SolenoidAction(SQLModel):
    action: str 

class NotificationPref(SQLModel):
    group_id: int
    condition: str
    notification_frequency_seconds: float 
    enabled: bool

class ActivationPref(SQLModel):
    sensor_id: int
    measurement: str
    condition_operator: ComparisonOperator
    condition_value: float
    close_condition_operator: ComparisonOperator | None = None
    close_condition_value: float | None = None
    enabled: bool = True

    @model_validator(mode="after")
    def validate_close_condition(self):
        has_operator = self.close_condition_operator is not None
        has_value = self.close_condition_value is not None

        if has_operator != has_value:
            raise ValueError("Close operator and threshold must both be provided")

        if not has_operator:
            return self

        expected_operator = (
            ">"
            if self.condition_operator == "<"
            else "<"
        )

        if self.close_condition_operator != expected_operator:
            raise ValueError("close operator must be opposite")

        if (
            self.condition_operator == "<"
            and self.close_condition_value
            <= self.condition_value
        ):
            raise ValueError("Close threshold must be higher than activation threshold")

        if (
            self.condition_operator == ">"
            and self.close_condition_value
            >= self.condition_value
        ):
            raise ValueError("Close threshold must be lower than the activation threshold")

        return self
