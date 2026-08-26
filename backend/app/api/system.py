from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/data-health")
def get_data_health(db: Session = Depends(get_db)):
    return {
        "database": "connected",
        "customers": db.query(Customer).count(),
        "payments": db.query(Payment).count(),
        "subscriptions": db.query(Subscription).count(),
        "recovery_cases": db.query(RecoveryCase).count(),
        "recovery_actions": db.query(RecoveryAction).count(),
        "audit_logs": db.query(AuditLog).count()
    }
