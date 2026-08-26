from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recovery_case import RecoveryCase
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.audit_log import AuditLog
from app.schemas.recovery import (
    RecoveryCaseResponse,
    RecoveryCaseDetailResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    ExecuteRequest,
    ExecuteResponse,
    AuditLogResponse,
    SubscriptionInfo,
    AgentPipelineResponse,
    RecoveryPressureResponse,
    FatigueAssessmentResponse,
    TransactionRiskAssessmentResponse,
    StrategySimulationRequest,
    StrategySimulationResponse
)
from app.engine.orchestrator import orchestrator
from app.engine.recovery_pressure import RecoveryPressureEngine
from app.engine.transaction_risk import TransactionRiskEngine
from app.engine.strategy_simulator import StrategySimulatorEngine
from app.models.recovery_pressure import RecoveryPressureAssessment

router = APIRouter(prefix="/recovery-cases", tags=["Recovery Cases"])


@router.get("", response_model=List[RecoveryCaseResponse])
def get_recovery_cases(
    status: Optional[str] = Query(None, description="Filter by status (open, in_recovery, recovered, failed_unrecovered, closed)"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high, critical)"),
    search: Optional[str] = Query(None, description="Search by customer name or email"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(RecoveryCase).join(Customer).join(Payment)
    
    if status:
        query = query.filter(RecoveryCase.status == status)
    if priority:
        query = query.filter(RecoveryCase.priority == priority)
    if search:
        query = query.filter(Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%"))

    cases = query.order_by(RecoveryCase.detected_at.desc()).offset(offset).limit(limit).all()
    
    results = []
    for c in cases:
        latest_decision = c.decisions[0].decision if c.decisions else c.assigned_action
        latest_confidence = c.decisions[0].confidence if c.decisions else None
        latest_action_status = c.actions[0].status if c.actions else None
        amount_recovered = sum(a.amount_recovered for a in c.actions if a.status == "completed")

        item = RecoveryCaseResponse(
            id=c.id,
            payment_id=c.payment_id,
            customer_id=c.customer_id,
            revenue_at_risk=c.revenue_at_risk,
            status=c.status,
            assigned_action=c.assigned_action,
            priority=c.priority,
            retry_count=c.retry_count,
            detected_at=c.detected_at,
            resolved_at=c.resolved_at,
            customer_name=c.customer.name if c.customer else None,
            customer_email=c.customer.email if c.customer else None,
            failure_reason=c.payment.failure_reason if c.payment else None,
            payment_method=c.payment.payment_method if c.payment else None,
            latest_decision=latest_decision,
            latest_confidence=latest_confidence,
            latest_action_status=latest_action_status,
            amount_recovered=amount_recovered
        )
        results.append(item)

    return results


@router.get("/{case_id}", response_model=RecoveryCaseDetailResponse)
def get_recovery_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    
    payment = case.payment
    customer = case.customer
    subscription = db.query(Subscription).filter(Subscription.customer_id == customer.id).first() if customer else None
    
    past_payments_summary = orchestrator.get_customer_past_payments_summary(db, customer.id, exclude_payment_id=payment.id)
    
    sub_info = None
    if subscription:
        sub_info = SubscriptionInfo(
            id=subscription.id,
            amount=subscription.amount,
            billing_cycle=subscription.billing_cycle,
            status=subscription.status,
            next_billing_date=subscription.next_billing_date
        )

    latest_decision = case.decisions[0].decision if case.decisions else case.assigned_action
    latest_confidence = case.decisions[0].confidence if case.decisions else None
    latest_action_status = case.actions[0].status if case.actions else None
    amount_recovered = sum(a.amount_recovered for a in case.actions if a.status == "completed")

    return RecoveryCaseDetailResponse(
        id=case.id,
        payment_id=case.payment_id,
        customer_id=case.customer_id,
        revenue_at_risk=case.revenue_at_risk,
        status=case.status,
        assigned_action=case.assigned_action,
        priority=case.priority,
        retry_count=case.retry_count,
        detected_at=case.detected_at,
        resolved_at=case.resolved_at,
        customer_name=customer.name if customer else None,
        customer_email=customer.email if customer else None,
        failure_reason=payment.failure_reason if payment else None,
        payment_method=payment.payment_method if payment else None,
        latest_decision=latest_decision,
        latest_confidence=latest_confidence,
        latest_action_status=latest_action_status,
        amount_recovered=amount_recovered,
        customer=customer,
        payment=payment,
        subscription=sub_info,
        customer_past_payments_summary=past_payments_summary,
        decisions=case.decisions,
        actions=case.actions,
        audit_logs=case.audit_logs
    )


@router.post("/{case_id}/run-agent", response_model=AgentPipelineResponse)
def run_ai_recovery_agent(case_id: str, db: Session = Depends(get_db)):
    """
    Primary One-Click autonomous AI Recovery Agent endpoint.
    Orchestrates: Context Gathering -> Risk -> Pressure -> Simulation -> AI Strategy -> Guardrails Validation -> Execution -> Sealed Audit Trail.
    """
    try:
        result = orchestrator.run_agent_pipeline(db, case_id)
        return AgentPipelineResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Autonomous agent pipeline failed: {str(e)}")


@router.post("/{case_id}/analyze", response_model=AnalyzeResponse)
def analyze_recovery_case(case_id: str, payload: Optional[AnalyzeRequest] = None, db: Session = Depends(get_db)):
    try:
        result = orchestrator.analyze_case(db, case_id)
        return AnalyzeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/{case_id}/execute", response_model=ExecuteResponse)
def execute_recovery_case(case_id: str, payload: Optional[ExecuteRequest] = None, db: Session = Depends(get_db)):
    try:
        action_type = payload.action_type if payload else None
        result = orchestrator.execute_action(db, case_id, action_type=action_type)
        return ExecuteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/{case_id}/audit", response_model=List[AuditLogResponse])
def get_case_audit_trail(case_id: str, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    
    audits = db.query(AuditLog).filter(AuditLog.recovery_case_id == case_id).order_by(AuditLog.created_at.asc()).all()
    return audits


@router.get("/{case_id}/pressure", response_model=RecoveryPressureResponse)
def get_case_pressure(case_id: str, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    
    customer = case.customer
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found for recovery case")
    
    pressure_engine = RecoveryPressureEngine()
    result = pressure_engine.assess(case, list(case.actions), customer)
    
    latest_assessment = db.query(RecoveryPressureAssessment).filter(
        RecoveryPressureAssessment.case_id == case_id
    ).order_by(RecoveryPressureAssessment.created_at.desc()).first()
    
    assessed_at = latest_assessment.created_at if latest_assessment else None
    
    return RecoveryPressureResponse(
        case_id=result["case_id"],
        customer_id=result["customer_id"],
        score=result["score"],
        level=result["level"],
        recommendation=result["recommendation"],
        factors=result["factors"],
        assessed_at=assessed_at
    )


@router.get("/{case_id}/fatigue", response_model=FatigueAssessmentResponse)
def get_case_fatigue(case_id: str, db: Session = Depends(get_db)):
    """Backward-compatible endpoint for recovery pressure."""
    return get_case_pressure(case_id, db)


@router.get("/{case_id}/transaction-risk", response_model=TransactionRiskAssessmentResponse)
def get_case_transaction_risk(case_id: str, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    
    payment = case.payment
    customer = case.customer
    if not payment or not customer:
        raise HTTPException(status_code=404, detail="Payment or Customer not found")
    
    past_payments = orchestrator.get_customer_past_payments_summary(db, customer.id, exclude_payment_id=payment.id)
    risk_engine = TransactionRiskEngine()
    result = risk_engine.assess(payment, customer, case, past_payments)
    
    return TransactionRiskAssessmentResponse(
        payment_id=result["payment_id"],
        customer_id=result["customer_id"],
        score=result["score"],
        level=result["level"],
        signals=result["signals"],
        explanation=result["explanation"],
        assessed_at=None
    )


@router.post("/{case_id}/simulate", response_model=StrategySimulationResponse)
def simulate_recovery_strategy(case_id: str, payload: Optional[StrategySimulationRequest] = None, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    
    payment = case.payment
    customer = case.customer
    if not payment or not customer:
        raise HTTPException(status_code=404, detail="Payment or Customer record missing")
    
    past_payments = orchestrator.get_customer_past_payments_summary(db, customer.id, exclude_payment_id=payment.id)
    previous_actions = [
        {"action_type": a.action_type, "status": a.status, "result": a.result, "amount_recovered": a.amount_recovered}
        for a in case.actions
    ]
    
    pressure_engine = RecoveryPressureEngine()
    pressure_result = pressure_engine.assess(case, list(case.actions), customer)
    
    risk_engine = TransactionRiskEngine()
    risk_result = risk_engine.assess(payment, customer, case, past_payments)
    
    requested_strategies = payload.strategies if payload else None
    
    simulator = StrategySimulatorEngine()
    result = simulator.simulate(
        case_id=case.id,
        case_status=case.status,
        amount=payment.amount,
        currency=payment.currency,
        payment_method=payment.payment_method,
        failure_reason=payment.failure_reason,
        failure_code=payment.failure_code,
        customer_id=customer.id,
        consent_status=customer.consent_status,
        customer_lifetime_value=past_payments["total_spend"],
        customer_payment_success_rate=past_payments["success_rate"],
        risk_score=customer.risk_score,
        retry_count=case.retry_count,
        max_retries=3,
        previous_recovery_actions=previous_actions,
        pressure_score=pressure_result["score"],
        pressure_level=pressure_result["level"],
        pressure_recommendation=pressure_result["recommendation"],
        transaction_risk_score=risk_result["score"],
        transaction_risk_level=risk_result["level"],
        strategies_requested=requested_strategies
    )
    
    return StrategySimulationResponse(**result)
