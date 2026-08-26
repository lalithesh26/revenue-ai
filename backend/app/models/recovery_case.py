import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_uuid, index=True)
    payment_id: Mapped[str] = mapped_column(String(64), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    revenue_at_risk: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False, index=True)  # open, in_recovery, recovered, failed_unrecovered, closed
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    assigned_action: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # retry, send_payment_link, send_reminder, wait, escalate, stop
    priority: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)  # low, medium, high, critical
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    payment = relationship("Payment", back_populates="recovery_case")
    customer = relationship("Customer", back_populates="recovery_cases")
    decisions = relationship("AgentDecision", back_populates="recovery_case", cascade="all, delete-orphan", order_by="desc(AgentDecision.created_at)")
    actions = relationship("RecoveryAction", back_populates="recovery_case", cascade="all, delete-orphan", order_by="desc(RecoveryAction.executed_at)")
    audit_logs = relationship("AuditLog", back_populates="recovery_case", cascade="all, delete-orphan", order_by="asc(AuditLog.created_at)")
