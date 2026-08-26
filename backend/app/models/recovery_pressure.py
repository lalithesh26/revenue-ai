import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class RecoveryPressureAssessment(Base):
    """
    Persists a point-in-time Recovery Pressure Assessment for a recovery case.
    Measures recent automated recovery activity and outreach density.
    """
    __tablename__ = "recovery_pressure_assessments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid, index=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)               # 0-100
    level: Mapped[str] = mapped_column(String(16), nullable=False)             # low | moderate | high | critical
    recommendation: Mapped[str] = mapped_column(String(32), nullable=False)   # continue | reduce_frequency | pause | escalate
    factors_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)             # JSON array of contributing factors
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


# Backward compatibility alias
RecoveryFatigueAssessment = RecoveryPressureAssessment
