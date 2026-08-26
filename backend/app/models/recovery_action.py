import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid, index=True)
    recovery_case_id: Mapped[str] = mapped_column(String(64), ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)  # retry, send_payment_link, send_reminder, wait, escalate, stop
    status: Mapped[str] = mapped_column(String(32), default="scheduled", nullable=False)  # scheduled, executing, completed, failed, blocked_by_guardrail
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount_recovered: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    recovery_case = relationship("RecoveryCase", back_populates="actions")
