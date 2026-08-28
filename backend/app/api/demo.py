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
from app.seed import seed_synthetic_data, generate_realistic_amount, FAILURE_CATEGORIES, PAYMENT_METHODS
from app.engine.orchestrator import orchestrator

router = APIRouter(prefix="/demo", tags=["Demo & Simulation"])

# 5 Core Controlled AI Demo Scenarios (Input Conditions Only - AI reasons independently)
PRIMARY_DEMO_SCENARIOS = [
    {
        "id": "demo_payment_link",
        "title": "Payment Link Demo",
        "icon": "🔗",
        "category": "Customer Action Required",
        "band": "Band A (₹500–₹4,999)",
        "amount": 2499.0,
        "failure_reason": "Card expired / validity date mismatch",
        "description": "Card expired on recurring subscription. Customer consent is active, low risk, low pressure. Customer action needed to update payment method."
    },
    {
        "id": "demo_retry",
        "title": "Retry Demo",
        "icon": "🔄",
        "category": "Transient Gateway Issue",
        "band": "Band B (₹5,000–₹9,999)",
        "amount": 6999.0,
        "failure_reason": "Issuing bank processing timeout during 3DS verification",
        "description": "Transient bank gateway timeout on healthy subscription. Consent active, low risk, low pressure, 0 prior retries. Safe for automated retry."
    },
    {
        "id": "demo_reminder_wait",
        "title": "Reminder / Wait Demo",
        "icon": "⏳",
        "category": "High-Value Liquidity Pacing",
        "band": "Band C (₹10,000–₹14,999)",
        "amount": 12500.0,
        "failure_reason": "Declined due to temporary insufficient balance",
        "description": "High-value subscriber (LTV ₹45,000+, 100% historical success) with temporary balance issue. Contextual reasoning determines optimal pacing."
    },
    {
        "id": "demo_escalate",
        "title": "Escalate Demo",
        "icon": "👤",
        "category": "Security & Risk Protection",
        "band": "Band D (₹15,000–₹49,999)",
        "amount": 32000.0,
        "failure_reason": "Security 3DS authentication repeated failure / anomaly flagged",
        "description": "High-value transaction with repeated authentication drop-offs and elevated risk indicators. Requires human retention specialist review."
    },
    {
        "id": "demo_guardrail_block",
        "title": "Guardrail Block Demo",
        "icon": "🛑",
        "category": "Deterministic Safety Gate",
        "band": "Band A (₹500–₹4,999)",
        "amount": 3500.0,
        "failure_reason": "Card expired on un-consented subscriber",
        "description": "Subscriber has revoked communication consent (consent_status=false). Deterministic Guardrail #1 strictly blocks any outbound recovery outreach."
    }
]

# Combined catalog preserving backward compatibility
PREDEFINED_SCENARIOS = [
    *PRIMARY_DEMO_SCENARIOS,
    {
        "id": "scenario_low_pressure_low_risk",
        "title": "Low Pressure + Low Risk (Transient Network Timeout)",
        "category": "Happy Path",
        "description": "Standard recurring subscription failure due to transient network timeout. Consent is active, 0 prior attempts, low transaction risk."
    },
    {
        "id": "scenario_high_pressure_low_risk",
        "title": "High Pressure + Low Risk (Contextual Warning Check)",
        "category": "Contextual Safety",
        "description": "Customer has received several recent recovery communications (Pressure score ~65/100). Guardrail emits contextual warning."
    },
    {
        "id": "scenario_low_pressure_high_risk",
        "title": "Low Pressure + High Risk (Security Decline Flag)",
        "category": "Risk Protection",
        "description": "Transaction flagged with security/fraud keywords and high-value deviation."
    },
    {
        "id": "scenario_high_pressure_high_risk",
        "title": "High Pressure + High Risk (Critical Escalation)",
        "category": "Risk Protection",
        "description": "Multiple past declines coupled with high transaction risk and elevated pressure."
    },
    {
        "id": "scenario_revoked_consent",
        "title": "Consent Revoked (Policy 1 Hard Block)",
        "category": "Deterministic Safety",
        "description": "Customer explicitly revoked communication consent. Outbound communications are hard-blocked by Policy 1."
    },
    {
        "id": "scenario_retry_limit_reached",
        "title": "Max Retries Reached (Policy 2 Hard Block)",
        "category": "Deterministic Safety",
        "description": "Case already reached maximum allowable retries (3/3). Automated retries are hard-blocked by Policy 2."
    },
    {
        "id": "scenario_already_recovered",
        "title": "Already Recovered (Policy 3 Idempotency Block)",
        "category": "Deterministic Safety",
        "description": "Payment was already settled previously. Re-execution is hard-blocked by Policy 3 to prevent double debits."
    },
    {
        "id": "scenario_amount_tampering",
        "title": "Amount Tampering / Mismatch (Policy 4 Hard Block)",
        "category": "Deterministic Safety",
        "description": "Requested recovery amount differs from original invoice amount. Execution is hard-blocked by Policy 4."
    }
]


@router.get("/scenarios")
def get_demo_scenarios() -> List[Dict[str, Any]]:
    """Returns the catalog of controlled AI demo scenarios."""
    return PREDEFINED_SCENARIOS


@router.post("/simulate-scenario/{scenario_id}")
def simulate_predefined_scenario(scenario_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Creates and sets up the precise controlled input state for any demo scenario.
    The AI independently reasons over the input conditions without any pre-set answer.
    """
    now = datetime.now(timezone.utc)
    
    # ── DEMO 1: Payment Link (Card expired, ₹2,499 in Band A) ──
    if scenario_id in ("demo_payment_link", "scenario_expired_card"):
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Ananya Sharma",
            email="ananya.sharma@example.com",
            phone="+919876543220",
            consent_status=True,
            risk_score=0.10
        )
        db.add(cust)
        db.flush()

        # Seed 2 past successful payments for context
        for p_amt in [2499.0, 2499.0]:
            p_past = Payment(
                id=f"pay_demo_{uuid.uuid4().hex[:8]}",
                customer_id=cust.id,
                amount=p_amt,
                currency="INR",
                status="succeeded",
                payment_method="credit_card",
                created_at=now - timedelta(days=60),
                updated_at=now - timedelta(days=60)
            )
            db.add(p_past)

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=2499.0,
            currency="INR",
            status="failed",
            failure_code="ERR_CARD_EXPIRED",
            failure_reason="Card expired or validity date mismatch.",
            payment_method="credit_card",
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
            "title": "Payment Link Demo",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent on this case"
        }

    # ── DEMO 2: Retry (Bank timeout, ₹6,999 in Band B) ──
    elif scenario_id in ("demo_retry", "scenario_low_pressure_low_risk"):
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Aarav Verma",
            email="aarav.verma@example.com",
            phone="+919876543210",
            consent_status=True,
            risk_score=0.08
        )
        db.add(cust)
        db.flush()

        # Past payments
        for p_amt in [6999.0, 6999.0]:
            p_past = Payment(
                id=f"pay_demo_{uuid.uuid4().hex[:8]}",
                customer_id=cust.id,
                amount=p_amt,
                currency="INR",
                status="succeeded",
                payment_method="upi",
                created_at=now - timedelta(days=45),
                updated_at=now - timedelta(days=45)
            )
            db.add(p_past)

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=6999.0,
            currency="INR",
            status="failed",
            failure_code="ERR_BANK_TIMEOUT",
            failure_reason="Issuing bank processing timeout during 3DS verification.",
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
            status="open",
            detected_at=now,
            priority="medium",
            retry_count=0
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Retry Demo",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent on this case"
        }

    # ── DEMO 3: Reminder / Wait (Insufficient balance, high LTV, ₹12,500 in Band C) ──
    elif scenario_id in ("demo_reminder_wait", "scenario_high_pressure_low_risk"):
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Rohan Mehta",
            email="rohan.mehta@example.com",
            phone="+919876543211",
            consent_status=True,
            risk_score=0.12
        )
        db.add(cust)
        db.flush()

        # High LTV customer history (4 successful past payments)
        for p_amt in [12500.0, 12500.0, 12500.0, 12500.0]:
            p_past = Payment(
                id=f"pay_demo_{uuid.uuid4().hex[:8]}",
                customer_id=cust.id,
                amount=p_amt,
                currency="INR",
                status="succeeded",
                payment_method="netbanking",
                created_at=now - timedelta(days=90),
                updated_at=now - timedelta(days=90)
            )
            db.add(p_past)

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=12500.0,
            currency="INR",
            status="failed",
            failure_code="ERR_INSUFFICIENT_FUNDS",
            failure_reason="Declined due to temporary insufficient account balance.",
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
            status="open",
            detected_at=now,
            priority="high",
            retry_count=0
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Reminder / Wait Demo",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent on this case"
        }

    # ── DEMO 4: Escalate (Auth/Fraud flag, ₹32,000 in Band D) ──
    elif scenario_id in ("demo_escalate", "scenario_low_pressure_high_risk", "scenario_high_pressure_high_risk"):
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Vikram Malhotra",
            email="vikram.malhotra@example.com",
            phone="+919876543212",
            consent_status=True,
            risk_score=0.85
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
            failure_reason="Security 3DS authentication repeated failure / anomaly flagged.",
            payment_method="credit_card",
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
            retry_count=1
        )
        db.add(case)
        db.commit()

        return {
            "scenario_id": scenario_id,
            "title": "Escalate Demo",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "recommended_next_step": "Run AI Recovery Agent on this case"
        }

    # ── DEMO 5: Guardrail Block (Revoked Consent, ₹3,500 in Band A) ──
    elif scenario_id in ("demo_guardrail_block", "scenario_revoked_consent"):
        cust = Customer(
            id=f"cust_demo_{uuid.uuid4().hex[:8]}",
            name="Priya Nair",
            email="priya.nair@example.com",
            phone="+919876543214",
            consent_status=False,  # Explicitly revoked consent
            risk_score=0.15
        )
        db.add(cust)
        db.flush()

        pay = Payment(
            id=f"pay_demo_{uuid.uuid4().hex[:8]}",
            customer_id=cust.id,
            amount=3500.0,
            currency="INR",
            status="failed",
            failure_code="ERR_CARD_EXPIRED",
            failure_reason="Card expired on un-consented subscriber.",
            payment_method="credit_card",
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
            "title": "Guardrail Block Demo",
            "recovery_case_id": case.id,
            "customer_id": cust.id,
            "payment_id": pay.id,
            "amount": pay.amount,
            "failure_reason": pay.failure_reason,
            "note": "Subscriber consent_status is False. Guardrail Policy 1 will deterministically block execution.",
            "recommended_next_step": "Run AI Recovery Agent to observe Guardrail Policy 1 hard block"
        }

    # ── Legacy Scenarios for Backward Compatibility ──
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
            amount=5499.0,
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
            retry_count=3
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
            "recommended_next_step": "Attempt retry to observe Policy 2 hard block"
        }

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
            amount=8999.0,
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
            "recommended_next_step": "Attempt action to verify idempotency gate"
        }

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
            amount=14500.0,
            currency="INR",
            status="failed",
            failure_code="ERR_CARD_DECLINED",
            failure_reason="Card declined by issuer",
            payment_method="credit_card",
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
    """Simulates a real-time incoming failed payment across realistic fintech bands."""
    customer = None
    if payload and payload.customer_id:
        customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        customers = db.query(Customer).all()
        if not customers:
            raise HTTPException(status_code=400, detail="No customers found in database. Please seed demo data first.")
        customer = random.choice(customers)

    amount = payload.amount if (payload and payload.amount) else generate_realistic_amount()
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
