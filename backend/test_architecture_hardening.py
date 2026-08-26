"""
REVENUEAI ARCHITECTURE HARDENING & INTELLIGENCE TEST SUITE
Covers Scenarios A through Q across:
- Recovery Pressure Engine
- Current Transaction Risk Engine
- Strategy Simulator Engine
- AI Decision Provider (Groq / Heuristic)
- Guardrail Engine (Policies 1-6 Blocking, Policy 7 Contextual)
- Autonomous Recovery Orchestrator & Audit Trail
- Dedicated APIs & Scenarios
"""
import json
from datetime import datetime, timezone, timedelta

from app.engine.recovery_pressure import RecoveryPressureEngine
from app.engine.transaction_risk import TransactionRiskEngine
from app.engine.strategy_simulator import StrategySimulatorEngine
from app.engine.guardrails import GuardrailEngine
from app.engine.ai_provider import (
    AgentContext,
    HeuristicFallbackProvider,
    AgentActionEnum,
    AgentPriorityEnum
)
from app.database import SessionLocal, init_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.engine.orchestrator import RecoveryOrchestrator


def test_scenario_k_pressure_engine_calculations():
    """Scenario K: Recovery Pressure Score & Level Assignment."""
    engine = RecoveryPressureEngine()

    # Low pressure case (0-24)
    res_low = engine.assess(
        case={"id": "case_1", "retry_count": 0, "detected_at": datetime.now(timezone.utc)},
        actions=[],
        customer={"id": "cust_1"}
    )
    assert res_low["score"] < 25, f"Expected low pressure score < 25, got {res_low['score']}"
    assert res_low["level"] == "low"
    assert res_low["recommendation"] == "continue"

    # High / Critical pressure case (repeated outreach within 24h)
    now = datetime.now(timezone.utc)
    dense_actions = [
        {"action_type": "send_payment_link", "executed_at": now - timedelta(hours=1)},
        {"action_type": "send_reminder", "executed_at": now - timedelta(hours=3)},
        {"action_type": "retry", "executed_at": now - timedelta(hours=6)},
        {"action_type": "send_payment_link", "executed_at": now - timedelta(hours=12)},
    ]
    res_high = engine.assess(
        case={"id": "case_2", "retry_count": 2, "detected_at": now - timedelta(hours=48)},
        actions=dense_actions,
        customer={"id": "cust_2"}
    )
    assert res_high["score"] >= 50, f"Expected high/critical pressure score >= 50, got {res_high['score']}"
    assert res_high["level"] in ("high", "critical")
    assert res_high["recommendation"] in ("reduce_frequency", "pause", "escalate")
    assert len(res_high["factors"]) > 0
    print("[PASS] Scenario K: Recovery Pressure Engine calculations passed")


def test_scenario_l_transaction_risk_engine_calculations():
    """Scenario L: Current Transaction Risk Score & Level Assignment."""
    engine = TransactionRiskEngine()

    # Low risk payment
    res_low = engine.assess(
        payment={"id": "p_1", "amount": 2500.0, "failure_code": "ERR_BANK_TIMEOUT", "failure_reason": "Bank timeout", "payment_method": "upi"},
        customer={"id": "c_1", "risk_score": 0.05},
        case={"id": "case_1", "retry_count": 0},
        past_payments_summary={"total_spend": 30000.0, "total_count": 10, "success_rate": 95.0}
    )
    assert res_low["score"] < 30, f"Expected low risk score < 30, got {res_low['score']}"
    assert res_low["level"] == "low"

    # High risk payment (security / fraud keywords + high amount anomaly)
    res_high = engine.assess(
        payment={"id": "p_2", "amount": 95000.0, "failure_code": "ERR_FRAUD_FLAGGED", "failure_reason": "Suspicious fraudulent activity flagged by bank", "payment_method": "card"},
        customer={"id": "c_2", "risk_score": 0.85},
        case={"id": "case_2", "retry_count": 1},
        past_payments_summary={"total_spend": 5000.0, "total_count": 2, "success_rate": 50.0}
    )
    assert res_high["score"] >= 60, f"Expected high risk score >= 60, got {res_high['score']}"
    assert res_high["level"] in ("high", "critical")
    assert any(s["category"] == "Failure Reason Signal" for s in res_high["signals"])
    print("[PASS] Scenario L: Transaction Risk Engine calculations passed")


def test_scenario_m_strategy_simulator_deterministic_scoring():
    """Scenario M: Strategy Simulator suitability scoring for 5 strategies."""
    sim = StrategySimulatorEngine()

    res = sim.simulate(
        case_id="case_sim_1",
        case_status="open",
        amount=4999.0,
        currency="INR",
        payment_method="card",
        failure_reason="Card validity expired",
        failure_code="ERR_CARD_EXPIRED",
        customer_id="cust_1",
        consent_status=True,
        customer_lifetime_value=25000.0,
        customer_payment_success_rate=90.0,
        risk_score=0.1,
        retry_count=0,
        max_retries=3,
        previous_recovery_actions=[],
        pressure_score=15,
        pressure_level="low",
        transaction_risk_score=10,
        transaction_risk_level="low"
    )

    assert len(res["strategies"]) == 5, f"Expected 5 strategies, got {len(res['strategies'])}"
    assert res["recommended_strategy"] == "send_payment_link"
    link_strat = next(s for s in res["strategies"] if s["strategy"] == "send_payment_link")
    assert link_strat["suitability_score"] >= 80
    assert link_strat["eligible"] is True
    print("[PASS] Scenario M: Strategy Simulator scoring passed")


def test_scenario_a_low_pressure_low_risk_retry():
    """Scenario A: Low Pressure + Low Risk + Bank Timeout -> Retry."""
    ai = HeuristicFallbackProvider()
    guard = GuardrailEngine()

    ctx = AgentContext(
        payment_id="p_a",
        amount=3999.0,
        payment_method="upi",
        failure_code="ERR_TIMEOUT",
        failure_reason="Issuing bank timed out during processing",
        customer_id="c_a",
        customer_name="Aarav Sharma",
        customer_email="aarav@example.com",
        consent_status=True,
        transaction_risk={"score": 10, "level": "low"},
        recovery_pressure={"score": 10, "level": "low"}
    )
    decision = ai.evaluate_recovery(ctx)
    assert decision.action == AgentActionEnum.RETRY

    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 3999.0, "status": "failed", "failure_reason": "Bank timeout"},
        recovery_case={"status": "open", "retry_count": 0},
        requested_amount=3999.0,
        pressure_score=10,
        transaction_risk_score=10
    )
    assert passed is True
    print("[PASS] Scenario A: Low pressure + Low risk + Bank timeout -> Retry passed")


def test_scenario_b_high_pressure_low_risk_contextual_warning():
    """Scenario B: High Pressure + Low Risk + Bank Timeout -> Retry allowed without blocking."""
    guard = GuardrailEngine()

    # Policy 7 check: Pressure score 68 (HIGH) must NOT hard-block retry if policies 1-6 pass!
    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 4500.0, "status": "failed", "failure_reason": "Bank network timeout"},
        recovery_case={"status": "open", "retry_count": 1},
        requested_amount=4500.0,
        pressure_score=68,
        transaction_risk_score=12
    )
    assert passed is True, f"Expected Guardrails to allow retry under high pressure, but got blocked: {msg}"
    policy_7_check = next((c for c in checks if "Policy 7" in c.get("rule_name", "") or "Pressure" in c.get("rule_name", "")), None)
    assert policy_7_check is not None
    assert policy_7_check.get("severity") == "WARNING"
    print("[PASS] Scenario B: High pressure + Low risk -> Contextual warning non-blocking passed")


def test_scenario_c_low_pressure_high_risk_escalate():
    """Scenario C: Low Pressure + High Risk (3DS/Security Anomaly) -> Escalate."""
    ai = HeuristicFallbackProvider()
    guard = GuardrailEngine()

    ctx = AgentContext(
        payment_id="p_c",
        amount=55000.0,
        payment_method="card",
        failure_code="ERR_FRAUD_SECURITY",
        failure_reason="Security verification flag / suspicious decline",
        customer_id="c_c",
        customer_name="Rohan Mehra",
        customer_email="rohan@example.com",
        consent_status=True,
        transaction_risk={"score": 85, "level": "high"},
        recovery_pressure={"score": 10, "level": "low"}
    )
    decision = ai.evaluate_recovery(ctx)
    assert decision.action == AgentActionEnum.ESCALATE

    # If automated retry was attempted on security decline, guardrail Policy 5 blocks it
    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 55000.0, "status": "failed", "failure_reason": "Security flag fraud decline"},
        recovery_case={"status": "open", "retry_count": 0},
        requested_amount=55000.0,
        pressure_score=10,
        transaction_risk_score=85
    )
    assert passed is False, "Expected Policy 5 to block automated retry on fraud/security decline"
    print("[PASS] Scenario C: Low pressure + High risk -> Escalate & retry blocked passed")


def test_scenario_d_high_pressure_high_risk_escalate():
    """Scenario D: High Pressure + High Risk -> Escalate."""
    ai = HeuristicFallbackProvider()
    ctx = AgentContext(
        payment_id="p_d",
        amount=42000.0,
        payment_method="card",
        failure_code="ERR_AUTH_FAILED",
        failure_reason="Repeated 3DS authentication failure and stolen card report",
        customer_id="c_d",
        customer_name="Karan Kapoor",
        customer_email="karan@example.com",
        consent_status=True,
        transaction_risk={"score": 90, "level": "critical"},
        recovery_pressure={"score": 80, "level": "critical"}
    )
    decision = ai.evaluate_recovery(ctx)
    assert decision.action == AgentActionEnum.ESCALATE
    print("[PASS] Scenario D: High pressure + High risk -> Escalate passed")


def test_scenario_e_revoked_consent_hard_block():
    """Scenario E: Consent Revoked -> Policy 1 Hard Block."""
    guard = GuardrailEngine()
    passed, checks, msg = guard.validate(
        action_type="send_payment_link",
        customer={"consent_status": False},
        payment={"amount": 3000.0, "status": "failed"},
        recovery_case={"status": "open", "retry_count": 0},
        requested_amount=3000.0
    )
    assert passed is False
    assert "Policy 1" in msg or "consent" in msg.lower()
    print("[PASS] Scenario E: Revoked consent Policy 1 hard block passed")


def test_scenario_f_retry_limit_hard_block():
    """Scenario F: Retry Limit Reached (>= 3) -> Policy 2 Hard Block."""
    guard = GuardrailEngine()
    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 3000.0, "status": "failed"},
        recovery_case={"status": "in_recovery", "retry_count": 3},
        requested_amount=3000.0
    )
    assert passed is False
    assert "Policy 2" in msg or "retry" in msg.lower()
    print("[PASS] Scenario F: Retry limit Policy 2 hard block passed")


def test_scenario_g_already_recovered_idempotency_block():
    """Scenario G: Already Recovered -> Policy 3 Idempotency Block."""
    guard = GuardrailEngine()
    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 3000.0, "status": "recovered"},
        recovery_case={"status": "recovered", "retry_count": 1},
        requested_amount=3000.0
    )
    assert passed is False
    assert "Policy 3" in msg or "idempotency" in msg.lower() or "recovered" in msg.lower()
    print("[PASS] Scenario G: Already recovered Policy 3 idempotency block passed")


def test_scenario_h_amount_tampering_hard_block():
    """Scenario H: Amount Tampering / Mismatch -> Policy 4 Hard Block."""
    guard = GuardrailEngine()
    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 5000.0, "status": "failed"},
        recovery_case={"status": "open", "retry_count": 0},
        requested_amount=7500.0  # Tampered amount
    )
    assert passed is False
    assert "Policy 4" in msg or "amount" in msg.lower()
    print("[PASS] Scenario H: Amount tampering Policy 4 hard block passed")


def test_scenario_i_expired_card_routing():
    """Scenario I: Expired Card -> Payment link recommended (Policy 6)."""
    ai = HeuristicFallbackProvider()
    ctx = AgentContext(
        payment_id="p_i",
        amount=8500.0,
        payment_method="card",
        failure_code="ERR_EXPIRED",
        failure_reason="Card validity expired at issuing bank",
        customer_id="c_i",
        customer_name="Priya Patel",
        customer_email="priya@example.com",
        consent_status=True,
        transaction_risk={"score": 10, "level": "low"},
        recovery_pressure={"score": 10, "level": "low"}
    )
    decision = ai.evaluate_recovery(ctx)
    assert decision.action == AgentActionEnum.SEND_PAYMENT_LINK
    print("[PASS] Scenario I: Expired card routing passed")


def test_scenario_j_stolen_fraud_ineligibility():
    """Scenario J: Stolen / Lost Card -> Fraud ineligibility (Policy 5)."""
    guard = GuardrailEngine()
    passed, checks, msg = guard.validate(
        action_type="retry",
        customer={"consent_status": True},
        payment={"amount": 10000.0, "status": "failed", "failure_reason": "Card reported stolen"},
        recovery_case={"status": "open", "retry_count": 0},
        requested_amount=10000.0
    )
    assert passed is False
    assert "Policy 5" in msg or "stolen" in msg.lower() or "fraud" in msg.lower()
    print("[PASS] Scenario J: Stolen/fraud card ineligibility passed")


def test_scenario_n_o_p_pipeline_and_audit():
    """Scenario N, O, P: Full pipeline run, stage tracking, and sealed audit trail."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        cust = Customer(
            id="cust_test_audit",
            name="Audit Test User",
            email="audit@example.com",
            consent_status=True,
            risk_score=0.1
        )
        db.merge(cust)

        pay = Payment(
            id="pay_test_audit",
            customer_id=cust.id,
            amount=2999.0,
            currency="INR",
            status="failed",
            failure_code="ERR_NETWORK",
            failure_reason="Gateway network timeout",
            payment_method="card",
            created_at=now,
            updated_at=now
        )
        db.merge(pay)

        case = RecoveryCase(
            id="rc_test_audit",
            payment_id=pay.id,
            customer_id=cust.id,
            revenue_at_risk=2999.0,
            status="open",
            detected_at=now,
            priority="medium",
            retry_count=0
        )
        db.merge(case)
        db.commit()

        orch = RecoveryOrchestrator()
        result = orch.run_agent_pipeline(db, case.id)

        assert result["guardrail_passed"] is True
        assert len(result["stages"]) >= 7
        stage_ids = [s["stage_id"] for s in result["stages"]]
        assert "transaction_risk" in stage_ids
        assert "recovery_pressure" in stage_ids
        assert "strategy_simulation" in stage_ids
        assert "ai_reasoning" in stage_ids
        assert "guardrail_verification" in stage_ids
        assert "action_execution" in stage_ids
        assert "agent_completion" in stage_ids

        # Verify audit logs in database
        audits = db.query(AuditLog).filter(AuditLog.recovery_case_id == case.id).all()
        event_types = [a.event_type for a in audits]
        assert "transaction_risk_assessed" in event_types
        assert "recovery_pressure_assessed" in event_types
        assert "strategy_simulated" in event_types
        assert "agent_decision" in event_types
        assert "guardrail_evaluated" in event_types
        assert "action_executed" in event_types
        assert "agent_completed" in event_types

        print("[PASS] Scenario N, O, P: Full pipeline and sealed audit trail passed")
    finally:
        db.close()


def run_all():
    print("==================================================")
    print("RUNNING REVENUEAI ARCHITECTURE HARDENING TEST SUITE")
    print("==================================================")
    init_db()
    test_scenario_k_pressure_engine_calculations()
    test_scenario_l_transaction_risk_engine_calculations()
    test_scenario_m_strategy_simulator_deterministic_scoring()
    test_scenario_a_low_pressure_low_risk_retry()
    test_scenario_b_high_pressure_low_risk_contextual_warning()
    test_scenario_c_low_pressure_high_risk_escalate()
    test_scenario_d_high_pressure_high_risk_escalate()
    test_scenario_e_revoked_consent_hard_block()
    test_scenario_f_retry_limit_hard_block()
    test_scenario_g_already_recovered_idempotency_block()
    test_scenario_h_amount_tampering_hard_block()
    test_scenario_i_expired_card_routing()
    test_scenario_j_stolen_fraud_ineligibility()
    test_scenario_n_o_p_pipeline_and_audit()
    print("==================================================")
    print("ALL TEST SCENARIOS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_all()
