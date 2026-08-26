from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.agent_decision import AgentDecision
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.engine.recovery_pressure import RecoveryPressureEngine
from app.engine.transaction_risk import TransactionRiskEngine
from app.engine.orchestrator import orchestrator

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("")
def get_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns real, SQL/database-derived analytics for the RevenueAI platform:
    - Overview metrics (at risk, recovered, rates, case counts)
    - Recovery Pressure distribution across open cases
    - Transaction Risk distribution across open cases
    - Strategy execution performance & conversion
    - Failure reason resolution breakdown
    - Payment method performance
    """
    # 1. Overview metrics
    all_cases = db.query(RecoveryCase).all()
    open_cases = [c for c in all_cases if c.status in ("open", "in_recovery")]
    recovered_cases = [c for c in all_cases if c.status == "recovered"]
    unrecovered_cases = [c for c in all_cases if c.status in ("failed_unrecovered", "closed")]

    revenue_at_risk = sum(c.revenue_at_risk for c in open_cases)
    
    completed_actions = db.query(RecoveryAction).filter(RecoveryAction.status == "completed").all()
    total_recovered_amount = sum(a.amount_recovered for a in completed_actions)

    total_pool = total_recovered_amount + revenue_at_risk
    recovery_rate_pct = (total_recovered_amount / total_pool * 100.0) if total_pool > 0 else 0.0

    # 2. Recovery Pressure & Transaction Risk Distributions
    pressure_engine = RecoveryPressureEngine()
    risk_engine = TransactionRiskEngine()

    pressure_counts = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    risk_counts = {"low": 0, "moderate": 0, "high": 0, "critical": 0}

    for c in open_cases:
        if c.customer and c.payment:
            past_payments = orchestrator.get_customer_past_payments_summary(db, c.customer_id, exclude_payment_id=c.payment_id)
            p_res = pressure_engine.assess(c, list(c.actions), c.customer)
            r_res = risk_engine.assess(c.payment, c.customer, c, past_payments)
            
            p_lvl = p_res.get("level", "low")
            r_lvl = r_res.get("level", "low")
            
            pressure_counts[p_lvl] = pressure_counts.get(p_lvl, 0) + 1
            risk_counts[r_lvl] = risk_counts.get(r_lvl, 0) + 1

    # 3. Strategy Usage & Success
    decisions = db.query(AgentDecision).all()
    strategy_map: Dict[str, Dict[str, Any]] = {
        "retry": {"strategy": "retry", "display_name": "Retry Payment", "decisions_count": 0, "executed_count": 0, "recovered_amount": 0.0},
        "send_payment_link": {"strategy": "send_payment_link", "display_name": "Send Payment Link", "decisions_count": 0, "executed_count": 0, "recovered_amount": 0.0},
        "send_reminder": {"strategy": "send_reminder", "display_name": "Send Reminder", "decisions_count": 0, "executed_count": 0, "recovered_amount": 0.0},
        "wait": {"strategy": "wait", "display_name": "Wait 24 Hours", "decisions_count": 0, "executed_count": 0, "recovered_amount": 0.0},
        "escalate": {"strategy": "escalate", "display_name": "Escalate to Human", "decisions_count": 0, "executed_count": 0, "recovered_amount": 0.0},
        "stop": {"strategy": "stop", "display_name": "Stop Workflow", "decisions_count": 0, "executed_count": 0, "recovered_amount": 0.0},
    }

    for d in decisions:
        dec_key = d.decision
        if dec_key in strategy_map:
            strategy_map[dec_key]["decisions_count"] += 1

    for a in completed_actions:
        act_key = a.action_type
        if act_key in strategy_map:
            strategy_map[act_key]["executed_count"] += 1
            strategy_map[act_key]["recovered_amount"] += a.amount_recovered

    strategy_performance = list(strategy_map.values())

    # 4. Failure reasons breakdown
    payments = db.query(Payment).all()
    reasons_map: Dict[str, Dict[str, Any]] = {}
    for p in payments:
        if p.status in ("failed", "recovered"):
            r_name = p.failure_reason or "General Network / Issuer Decline"
            if r_name not in reasons_map:
                reasons_map[r_name] = {"reason": r_name, "total_cases": 0, "recovered_cases": 0, "amount_at_risk": 0.0, "amount_recovered": 0.0}
            reasons_map[r_name]["total_cases"] += 1
            reasons_map[r_name]["amount_at_risk"] += p.amount
            if p.status == "recovered":
                reasons_map[r_name]["recovered_cases"] += 1
                reasons_map[r_name]["amount_recovered"] += p.amount

    failure_reasons = sorted(
        list(reasons_map.values()),
        key=lambda x: x["total_cases"],
        reverse=True
    )[:6]

    # 5. Method Performance
    methods_map: Dict[str, Dict[str, Any]] = {}
    for p in payments:
        m_name = (p.payment_method or "card").upper()
        if m_name not in methods_map:
            methods_map[m_name] = {"method": m_name, "total_volume": 0.0, "failed_count": 0, "recovered_count": 0, "recovered_volume": 0.0}
        methods_map[m_name]["total_volume"] += p.amount
        if p.status == "failed":
            methods_map[m_name]["failed_count"] += 1
        elif p.status == "recovered":
            methods_map[m_name]["recovered_count"] += 1
            methods_map[m_name]["recovered_volume"] += p.amount

    methods_breakdown = list(methods_map.values())

    # 6. Guardrail Intercept Statistics
    blocked_actions = db.query(RecoveryAction).filter(RecoveryAction.status == "blocked_by_guardrail").all()
    blocked_audits = db.query(AuditLog).filter(AuditLog.event_type == "action_blocked").count()

    return {
        "overview": {
            "total_revenue_at_risk": round(revenue_at_risk, 2),
            "total_revenue_recovered": round(total_recovered_amount, 2),
            "recovery_rate_pct": round(recovery_rate_pct, 1),
            "open_cases_count": len(open_cases),
            "recovered_cases_count": len(recovered_cases),
            "unrecovered_cases_count": len(unrecovered_cases),
            "total_cases_count": len(all_cases),
            "total_customers_count": db.query(Customer).count(),
            "total_guardrail_blocks": blocked_audits
        },
        "recovery_pressure_distribution": pressure_counts,
        "transaction_risk_distribution": risk_counts,
        "strategy_performance": strategy_performance,
        "failure_reasons": failure_reasons,
        "method_performance": methods_breakdown
    }
