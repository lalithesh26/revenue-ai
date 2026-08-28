import calendar
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.agent_decision import AgentDecision
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.schemas.dashboard import RecoveryTrendResponse, RecoveryTrendPoint
from app.engine.recovery_pressure import RecoveryPressureEngine
from app.engine.transaction_risk import TransactionRiskEngine
from app.engine.orchestrator import orchestrator

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Standard India Standard Time (IST) offset: UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))


@router.get("/recovery-trend", response_model=RecoveryTrendResponse)
def get_recovery_trend(
    time_range: str = Query("month", alias="range", pattern="^(month|quarter|year)$"),
    db: Session = Depends(get_db)
) -> RecoveryTrendResponse:
    """
    Returns real, SQL/database-aggregated recovery trend time-series:
    - range=month: weekly breakdowns for current calendar month in IST
    - range=quarter: bi-weekly/monthly breakdowns for current calendar quarter in IST
    - range=year: monthly breakdowns from Jan to current month of current year in IST
    """
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(IST)
    current_year = now_ist.year
    current_month = now_ist.month

    points: List[RecoveryTrendPoint] = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    def to_utc_window(ist_start: datetime, ist_end: datetime):
        return ist_start.astimezone(timezone.utc), ist_end.astimezone(timezone.utc)

    if time_range == "year":
        period_label = f"{current_year} (Year to Date)"
        for m in range(1, current_month + 1):
            last_day_m = calendar.monthrange(current_year, m)[1]
            ist_start = datetime(current_year, m, 1, 0, 0, 0, tzinfo=IST)
            ist_end = datetime(current_year, m, last_day_m, 23, 59, 59, 999999, tzinfo=IST)
            start_utc, end_utc = to_utc_window(ist_start, ist_end)

            rec_payments = db.query(Payment).filter(
                Payment.status == "recovered",
                func.coalesce(Payment.updated_at, Payment.created_at) >= start_utc,
                func.coalesce(Payment.updated_at, Payment.created_at) <= end_utc
            ).all()

            failed_payments = db.query(Payment).filter(
                Payment.status == "failed",
                Payment.created_at >= start_utc,
                Payment.created_at <= end_utc
            ).all()

            points.append(RecoveryTrendPoint(
                period=f"{current_year}-{m:02d}",
                label=month_names[m - 1],
                recovered=round(sum(p.amount for p in rec_payments), 2),
                at_risk=round(sum(p.amount for p in failed_payments), 2),
                count_recovered=len(rec_payments),
                count_at_risk=len(failed_payments)
            ))

    elif time_range == "quarter":
        quarter_num = (current_month - 1) // 3 + 1
        period_label = f"Q{quarter_num} {current_year}"
        start_m = (quarter_num - 1) * 3 + 1
        end_m = start_m + 2

        for m in range(start_m, end_m + 1):
            m_name = month_names[m - 1]
            last_day = calendar.monthrange(current_year, m)[1]

            # Part 1: Days 1-15
            p1_ist_start = datetime(current_year, m, 1, 0, 0, 0, tzinfo=IST)
            p1_ist_end = datetime(current_year, m, 15, 23, 59, 59, 999999, tzinfo=IST)
            p1_start_utc, p1_end_utc = to_utc_window(p1_ist_start, p1_ist_end)

            # Part 2: Days 16-last_day
            p2_ist_start = datetime(current_year, m, 16, 0, 0, 0, tzinfo=IST)
            p2_ist_end = datetime(current_year, m, last_day, 23, 59, 59, 999999, tzinfo=IST)
            p2_start_utc, p2_end_utc = to_utc_window(p2_ist_start, p2_ist_end)

            for s_utc, e_utc, p_label, day_code in [
                (p1_start_utc, p1_end_utc, f"{m_name} 1–15", 1),
                (p2_start_utc, p2_end_utc, f"{m_name} 16–{last_day}", 16)
            ]:
                rec_payments = db.query(Payment).filter(
                    Payment.status == "recovered",
                    func.coalesce(Payment.updated_at, Payment.created_at) >= s_utc,
                    func.coalesce(Payment.updated_at, Payment.created_at) <= e_utc
                ).all()

                failed_payments = db.query(Payment).filter(
                    Payment.status == "failed",
                    Payment.created_at >= s_utc,
                    Payment.created_at <= e_utc
                ).all()

                points.append(RecoveryTrendPoint(
                    period=f"{current_year}-{m:02d}-{day_code:02d}",
                    label=p_label,
                    recovered=round(sum(p.amount for p in rec_payments), 2),
                    at_risk=round(sum(p.amount for p in failed_payments), 2),
                    count_recovered=len(rec_payments),
                    count_at_risk=len(failed_payments)
                ))

    else:  # "month"
        period_label = now_ist.strftime("%B %Y")
        m = current_month
        m_name = month_names[m - 1]
        last_day = calendar.monthrange(current_year, m)[1]

        intervals = [
            (1, 7, f"{m_name} 1–7"),
            (8, 14, f"{m_name} 8–14"),
            (15, 21, f"{m_name} 15–21"),
            (22, 28, f"{m_name} 22–28"),
            (29, last_day, f"{m_name} 29–{last_day}")
        ]

        for d_start, d_end, i_label in intervals:
            ist_s = datetime(current_year, m, d_start, 0, 0, 0, tzinfo=IST)
            ist_e = datetime(current_year, m, d_end, 23, 59, 59, 999999, tzinfo=IST)
            s_utc, e_utc = to_utc_window(ist_s, ist_e)

            rec_payments = db.query(Payment).filter(
                Payment.status == "recovered",
                func.coalesce(Payment.updated_at, Payment.created_at) >= s_utc,
                func.coalesce(Payment.updated_at, Payment.created_at) <= e_utc
            ).all()

            failed_payments = db.query(Payment).filter(
                Payment.status == "failed",
                Payment.created_at >= s_utc,
                Payment.created_at <= e_utc
            ).all()

            points.append(RecoveryTrendPoint(
                period=f"{current_year}-{m:02d}-{d_start:02d}",
                label=i_label,
                recovered=round(sum(p.amount for p in rec_payments), 2),
                at_risk=round(sum(p.amount for p in failed_payments), 2),
                count_recovered=len(rec_payments),
                count_at_risk=len(failed_payments)
            ))

    total_rec = sum(p.recovered for p in points)
    total_risk = sum(p.at_risk for p in points)

    return RecoveryTrendResponse(
        range=time_range,
        period_label=period_label,
        points=points,
        total_recovered=round(total_rec, 2),
        total_at_risk=round(total_risk, 2)
    )



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
