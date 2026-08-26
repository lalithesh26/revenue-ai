import random
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.schemas.demo import SeedRequest, SeedResponse, SimulateFailureRequest, SimulateRecoveryRequest
from app.seed import seed_synthetic_data, FAILURE_CATEGORIES, PAYMENT_METHODS
from app.engine.orchestrator import orchestrator

router = APIRouter(prefix="/demo", tags=["Demo & Simulation"])

PREDEFINED_SCENARIOS = [
    {
        "id": "scenario_low_pressure_low_risk",
        "title": "Low Pressure + Low Risk (Transient Network Timeout)",
        "category": "Happy Path",
        "expected_action": "retry",
        "expected_guardrail": "PASSED",
        "description": "Standard recurring subscription failure due to transient network timeout. Consent is active, 0 prior attempts, low transaction risk. Agent recommends smart retry and succeeds."
    },
    {
        "id": "scenario_high_pressure_low_risk",
        "title": "High Pressure + Low Risk (Contextual Warning Check)",
        "category": "Contextual Safety",
        "expected_action": "retry",
        "expected_guardrail": "PASSED (Warning)",
        "description": "Customer has received several recent recovery communications (Pressure score ~65/100). Failure is temporary timeout. Guardrail Policy 7 emits contextual warning but does NOT block retry."
    },
    {
        "id": "scenario_low_pressure_high_risk",
        "title": "Low Pressure + High Risk (Security Decline Flag)",
        "category": "Risk Protection",
        "expected_action": "escalate",
        "expected_guardrail": "PASSED",
        "description": "Transaction flagged with security/fraud keywords and high-value deviation. Agent recognizes elevated risk and recommends human escalation."
    },
    {
        "id": "scenario_high_pressure_high_risk",
        "title": "High Pressure + High Risk (Critical Escalation)",
        "category": "Risk Protection",
        "expected_action": "escalate",
        "expected_guardrail": "PASSED",
        "description": "Multiple past declines coupled with high transaction risk and elevated pressure. Agent and Guardrails route case to senior retention operations."
    },
    {
        "id": "scenario_revoked_consent",
        "title": "Consent Revoked (Policy 1 Hard Block)",
        "category": "Deterministic Safety",
        "expected_action": "stop",
        "expected_guardrail": "BLOCKED (Policy 1)",
        "description": "Customer explicitly revoked communication consent. Outbound communications and retries are hard-blocked by Policy 1."
    },
    {
        "id": "scenario_retry_limit_reached",
        "title": "Max Retries Reached (Policy 2 Hard Block)",
        "category": "Deterministic Safety",
        "expected_action": "escalate",
        "expected_guardrail": "BLOCKED (Policy 2)",
        "description": "Case already reached maximum allowable retries (3/3). Automated retries are hard-blocked by Policy 2."
    },
    {
        "id": "scenario_already_recovered",
        "title": "Already Recovered (Policy 3 Idempotency Block)",
        "category": "Deterministic Safety",
        "expected_action": "none",
        "expected_guardrail": "BLOCKED (Policy 3)",
        "description": "Payment was already settled previously. Re-execution is hard-blocked by Policy 3 to prevent double debits."
    },
    {
        "id": "scenario_amount_tampering",
        "title": "Amount Tampering / Mismatch (Policy 4 Hard Block)",
        "category": "Deterministic Safety",
        "expected_action": "none",
        "expected_guardrail": "BLOCKED (Policy 4)",
        "description": "Requested recovery amount differs from original invoice amount. Execution is hard-blocked by Policy 4."
    }
]


@router.get("/scenarios")
def get_demo_scenarios() -> List[Dict[str, Any]]:
    """Returns the catalog of 8 predefined architecture test scenarios."""
    return PREDEFINED_SCENARIOS


@router.post("/simulate-scenario/{scenario_id}")
def simulate_predefined_scenario(scenario_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Creates and sets up the precise test state for any of the 8 predefined scenarios,
    allowing instant one-click validation of the AI Agent and Guardrail pipeline.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Low Pressure + Low Risk
    if scenario_id == "scenario_low_pressure_low_risk":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Aarav Sharma",
            email="aarav.sharma@example.com",
            phone="+919876543210",
            consent_status=True,
            risk_score=0.08
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=4999.0,
            currency="INR",
            status="failed",
            failure_code="ERR_BANK_TIMEOUT",
            failure_reason="Issuing bank timed out during processing",
            payment_method="card",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="open",
            detected_at=now,
            priority="medium",
            retry_count=0
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Low Pressure + Low Risk (Transient Network Timeout)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent on this case"
        }

    # 2. High Pressure + Low Risk (Non-blocking contextual safety)
    elif scenario_id == "scenario_high_pressure_low_risk":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Priya Patel",
            email="priya.patel@example.com",
            phone="+919876543211",
            consent_status=True,
            risk_score=0.12
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=3499.0,
            currency="INR",
            status="failed",
            failure_code="ERR_NETWORK_DROP",
            failure_reason="Gateway connection dropped temporarily",
            payment_method="upi",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="in_recovery",
            detected_at=now - timedelta(hours=36),
            priority="high",
            retry_count=1
        )
        db.add(case)
        db.flush()

        # Add 3 recent outreach actions to create high recovery pressure
        for i, act_type in enumerate(["send_reminder", "send_payment_link", "send_reminder"]):
            act = RecoveryAction(
                recovery_case_id=case.id,
                action_type=act_type,
                status="completed",
                result="Communication dispatched",
                amount_recovered=0.0,
                executed_at=now - timedelta(hours=24 - (i * 6))
            )
            db.add(act)

        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "High Pressure + Low Risk (Contextual Warning Check)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "note": "Case has 3 recent communications. Guardrails will verify Policy 7 warning without blocking retry.",
            "recommended_next_step": "Run AI Recovery Agent on this case"
        }

    # 3. Low Pressure + High Risk (Security flag)
    elif scenario_id == "scenario_low_pressure_high_risk":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Vikram Malhotra",
            email="vikram.malhotra@example.com",
            phone="+919876543212",
            consent_status=True,
            risk_score=0.82
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=48000.0,
            currency="INR",
            status="failed",
            failure_code="ERR_FRAUD_FLAGGED",
            failure_reason="Suspicious high velocity activity flagged by issuer security filter",
            payment_method="card",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="open",
            detected_at=now,
            priority="critical",
            retry_count=0
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Low Pressure + High Risk (Security Decline Flag)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent to observe Escalate recommendation"
        }

    # 4. High Pressure + High Risk
    elif scenario_id == "scenario_high_pressure_high_risk":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Rohan Mehra",
            email="rohan.mehra@example.com",
            phone="+919876543213",
            consent_status=True,
            risk_score=0.78
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=32000.0,
            currency="INR",
            status="failed",
            failure_code="ERR_AUTH_FAILED",
            failure_reason="Security verification 3DS authentication repeated failure",
            payment_method="card",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="in_recovery",
            detected_at=now - timedelta(days=2),
            priority="critical",
            retry_count=2
        )
        db.add(case)
        db.flush()

        for act_type in ["send_payment_link", "send_reminder"]:
            act = RecoveryAction(
                recovery_case_id=case.id,
                action_type=act_type,
                status="completed",
                result="Dispatched",
                amount_recovered=0.0
            )
            db.add(act)

        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "High Pressure + High Risk (Critical Escalation)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent to trigger human escalation"
        }

    # 5. Revoked Consent (Policy 1 Hard Block)
    elif scenario_id == "scenario_revoked_consent":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Ananya Roy",
            email="ananya.roy@example.com",
            phone="+919876543214",
            consent_status=False,  # Explicitly revoked
            risk_score=0.10
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=7500.0,
            currency="INR",
            status="failed",
            failure_code="ERR_CARD_EXPIRED",
            failure_reason="Card validity expired",
            payment_method="card",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="open",
            detected_at=now,
            priority="high",
            retry_count=0
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Consent Revoked (Policy 1 Hard Block)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "note": "Customer consent_status is False. Guardrail Policy 1 will block any outreach.",
            "recommended_next_step": "Execute action to observe Guardrail Policy 1 hard block"
        }

    # 6. Retry Limit Reached (Policy 2 Hard Block)
    elif scenario_id == "scenario_retry_limit_reached":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Karan Kapoor",
            email="karan.kapoor@example.com",
            phone="+919876543215",
            consent_status=True,
            risk_score=0.20
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=5200.0,
            currency="INR",
            status="failed",
            failure_code="ERR_INSUFFICIENT_FUNDS",
            failure_reason="Insufficient balance at issuing bank",
            payment_method="netbanking",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="in_recovery",
            detected_at=now - timedelta(days=3),
            priority="medium",
            retry_count=3  # Max retries reached
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Max Retries Reached (Policy 2 Hard Block)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "retry_count": 3,
            "note": "Retry count is 3/3. Policy 2 will hard-block further automated retries.",
            "recommended_next_step": "Attempt retry to observe Policy 2 hard block"
        }

    # 7. Already Recovered Case (Policy 3 Idempotency)
    elif scenario_id == "scenario_already_recovered":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Siddharth Rao",
            email="siddharth.rao@example.com",
            phone="+919876543216",
            consent_status=True,
            risk_score=0.05
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=9999.0,
            currency="INR",
            status="recovered",
            payment_method="upi",
            created_at=now - timedelta(hours=12),
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=0.0,
            status="recovered",
            detected_at=now - timedelta(hours=12),
            resolved_at=now,
            priority="medium",
            retry_count=1
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Already Recovered (Policy 3 Idempotency Block)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "status": "recovered",
            "note": "Case is already recovered. Guardrail Policy 3 blocks double execution.",
            "recommended_next_step": "Attempt action to verify idempotency gate"
        }

    # 8. Amount Tampering / Mismatch (Policy 4)
    elif scenario_id == "scenario_amount_tampering":
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Neha Joshi",
            email="neha.joshi@example.com",
            phone="+919876543217",
            consent_status=True,
            risk_score=0.15
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=15000.0,
            currency="INR",
            status="failed",
            failure_code="ERR_CARD_DECLINED",
            failure_reason="Card declined by issuer",
            payment_method="card",
            created_at=now,
            updated_at=now
        )
        db.add(pay)
        db.flush()

        case = RecoveryCase(
            id=f"rc_demo_{uuid.uuid4().hex[:8]}",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=pay.amount,
            status="open",
            detected_at=now,
            priority="high",
            retry_count=0
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Amount Tampering / Mismatch (Policy 4 Hard Block)",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "original_amount": pay.amount,
            "note": "Payment amount is ₹15,000. Any mismatched debit request will be blocked by Policy 4.",
            "recommended_next_step": "Test GuardrailEngine with altered requested amount"
        }

    else:
        raise HTTPException(status_code=404, detail=f"Unknown scenario '{scenario_id}'")


@router.post("/seed", response_model=SeedResponse)
def seed_demo_data(payload: SeedRequest, db: Session = Depends(get_db)):
    try:
        res = seed_synthetic_data(
            db, 
            num_customers=payload.num_customers, 
            num_payments=payload.num_payments, 
            reset_existing=payload.reset_existing
        )
        return SeedResponse(
            message="Synthetic fintech dataset successfully seeded.",
            customers_created=res["customers_created"],
            payments_created=res["payments_created"],
            recovery_cases_created=res["recovery_cases_created"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed demo data: {str(e)}")


@router.post("/simulate-failure")
def simulate_new_failed_payment(payload: Optional[SimulateFailureRequest] = None, db: Session = Depends(get_db)):
    """Simulates a real-time incoming failed payment and spins up a new RecoveryCase."""
    customer = None
    if payload and payload.customer_id:
        customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        customers = db.query(Customer).all()
        if not customers:
            raise HTTPException(status_code=400, detail="No customers found in database. Please seed demo data first.")
        customer = random.choice(customers)

    amount = payload.amount if (payload and payload.amount) else random.choice([2499.0, 4999.0, 8999.0, 14500.0, 22000.0])
    payment_method = payload.payment_method if (payload and payload.payment_method) else random.choice(PAYMENT_METHODS)
    
    if payload and payload.failure_reason:
        fail_cat = "custom_failure"
        fail_code = "ERR_SIMULATED"
        fail_msg = payload.failure_reason
    else:
        fail_cat, fail_code, fail_msg = random.choice(FAILURE_CATEGORIES)

    now = datetime.now(timezone.utc)

    # 1. Create failed payment
    payment = Payment(
        id=f"pay_live_{uuid.uuid4().hex[:10]}",
        customer_id=customer.id,
        amount=amount,
        currency="INR",
        status="failed",
        failure_code=fail_code,
        failure_reason=fail_msg,
        payment_method=payment_method,
        created_at=now,
        updated_at=now
    )
    db.add(payment)
    db.flush()

    # 2. Create RecoveryCase
    priority = "critical" if amount >= 18000 else ("high" if amount >= 8000 else "medium")
    case = RecoveryCase(
        id=f"rc_live_{uuid.uuid4().hex[:10]}",
        payment_id=payment.id,
        customer_id=customer.id,
        revenue_at_risk=amount,
        status="open",
        detected_at=now,
        priority=priority,
        retry_count=0
    )
    db.add(case)
    db.flush()

    # 3. Create AuditLog
    audit = AuditLog(
        recovery_case_id=case.id,
        event_type="case_detected",
        actor="system",
        description=f"Incoming failed payment detected (₹{amount:,.2f}, {payment_method}, {fail_msg}). Case created.",
        metadata_json=json.dumps({
            "payment_id": payment.id,
            "amount": amount,
            "failure_code": fail_code,
            "failure_reason": fail_msg,
            "customer_id": customer.id
        })
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Simulated failed payment successfully created.",
        "payment_id": payment.id,
        "recovery_case_id": case.id,
        "customer_name": customer.name,
        "amount": amount,
        "failure_reason": fail_msg,
        "priority": priority
    }


@router.post("/simulate-recovery")
def simulate_customer_recovery(payload: SimulateRecoveryRequest, db: Session = Depends(get_db)):
    try:
        res = orchestrator.simulate_payment_recovery(db, payload.recovery_case_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recovery simulation failed: {str(e)}")
