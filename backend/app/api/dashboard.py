from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.agent_decision import AgentDecision
from app.models.audit_log import AuditLog
from app.schemas.dashboard import DashboardSummaryResponse
from app.engine.recovery_pressure import RecoveryPressureEngine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    # 1. High-level metric sums
    open_cases = db.query(RecoveryCase).filter(RecoveryCase.status.in_(["open", "in_recovery"])).all()
    revenue_at_risk = sum(c.revenue_at_risk for c in open_cases)
    
    recovered_payments = db.query(Payment).filter(Payment.status == "recovered").all()
    revenue_recovered = sum(p.amount for p in recovered_payments)
    
    total_at_risk_pool = revenue_recovered + revenue_at_risk
    recovery_rate = (revenue_recovered / total_at_risk_pool * 100.0) if total_at_risk_pool > 0 else 0.0

    total_failed_count = db.query(Payment).filter(Payment.status == "failed").count()
    successful_recoveries_count = len(recovered_payments)
    total_payments = db.query(Payment).count()
    total_customers = db.query(Customer).count()

    # 2. Failure reasons breakdown
    failed_and_recovered = db.query(Payment).filter(Payment.status.in_(["failed", "recovered"])).all()
    reasons_map = {}
    for p in failed_and_recovered:
        reason = p.failure_reason or "Other Reason"
        if reason not in reasons_map:
            reasons_map[reason] = {"reason": reason, "count": 0, "amount": 0.0}
        reasons_map[reason]["count"] += 1
        reasons_map[reason]["amount"] += p.amount
    
    failure_breakdown = sorted(list(reasons_map.values()), key=lambda x: x["count"], reverse=True)[:6]

    # 3. Payment Method breakdown
    methods_map = {}
    for p in failed_and_recovered:
        pm = p.payment_method or "unknown"
        if pm not in methods_map:
            methods_map[pm] = {"method": pm, "count": 0, "amount": 0.0, "recovered": 0}
        methods_map[pm]["count"] += 1
        methods_map[pm]["amount"] += p.amount
        if p.status == "recovered":
            methods_map[pm]["recovered"] += 1
    
    methods_breakdown = list(methods_map.values())

    # 4. Recent agent decisions
    recent_decisions = db.query(AgentDecision).order_by(AgentDecision.created_at.desc()).limit(6).all()

    # 5. Recent audit logs
    recent_audits = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()

    # 6. Recovery Fatigue breakdown across open cases
    fatigue_engine = RecoveryPressureEngine()
    fatigue_counts = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    for c in open_cases:
        if c.customer:
            res = fatigue_engine.assess(c, list(c.actions), c.customer)
            lvl = res.get("level", "low")
            if lvl in fatigue_counts:
                fatigue_counts[lvl] += 1
            else:
                fatigue_counts["low"] += 1

    return {
        "total_revenue_at_risk": round(revenue_at_risk, 2),
        "total_revenue_recovered": round(revenue_recovered, 2),
        "recovery_rate_pct": round(recovery_rate, 1),
        "open_recovery_cases_count": len(open_cases),
        "total_failed_payments_count": total_failed_count,
        "successful_recoveries_count": successful_recoveries_count,
        "total_payments_count": total_payments,
        "total_customers_count": total_customers,
        "failure_reasons_breakdown": failure_breakdown,
        "recovery_by_method_breakdown": methods_breakdown,
        "recent_agent_decisions": recent_decisions,
        "recent_audit_logs": recent_audits,
        "recovery_fatigue_breakdown": fatigue_counts
    }

