from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.recovery import AuditLogResponse

router = APIRouter(prefix="/audit-trail", tags=["Audit Trail"])


@router.get("", response_model=List[AuditLogResponse])
def get_audit_trail(
    case_id: Optional[str] = Query(None, description="Filter by recovery case ID"),
    event_type: Optional[str] = Query(None, description="Filter by audit event type"),
    actor: Optional[str] = Query(None, description="Filter by actor (recovery_agent, guardrail_engine, system, etc.)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns an immutable, time-ordered audit trail across the RevenueAI platform.
    Supports filtering by case_id, event_type, actor, with pagination.
    """
    query = db.query(AuditLog)
    
    if case_id:
        query = query.filter(AuditLog.recovery_case_id == case_id)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if actor:
        query = query.filter(AuditLog.actor == actor)
        
    records = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return records
