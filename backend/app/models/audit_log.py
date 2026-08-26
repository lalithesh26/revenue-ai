import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid, index=True)
    recovery_case_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # case_detected, agent_analyzed, guardrail_evaluated, action_executed, payment_recovered, case_closed
    actor: Mapped[str] = mapped_column(String(64), nullable=False)  # system, recovery_agent, guardrail_engine, mock_payment_provider, operator
    description: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON payload
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    recovery_case = relationship("RecoveryCase", back_populates="audit_logs")
