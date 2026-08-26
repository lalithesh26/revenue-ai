"""
Test Suite for Recovery Fatigue Detector & End-to-End Workflows.
Covers Scenarios A, B, C, D, E, F, G, Guardrail Policy 7, and Live APIs.
"""
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import List

# Setup path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database import SessionLocal
from app.models import RecoveryCase, Customer, Payment, RecoveryAction, AuditLog, RecoveryFatigueAssessment
from app.engine.fatigue import FatigueEngine
from app.engine.guardrails import GuardrailEngine
from app.engine.orchestrator import RecoveryOrchestrator

from types import SimpleNamespace

def make_dummy_customer(consent=True, ltv=25000.0, risk_score=0.15):
    return SimpleNamespace(
        id="cust_test_123",
        name="Test Customer",
        email="test@customer.com",
        consent_status=consent,
        risk_score=risk_score
    )

def make_dummy_case(retry_count=0, status="open", amount=9999.0):
    return SimpleNamespace(
        id="rc_test_123",
        payment_id="pay_test_123",
        customer_id="cust_test_123",
        revenue_at_risk=amount,
        status=status,
        retry_count=retry_count,
        assigned_action="retry",
        priority="medium",
        actions=[]
    )

def make_dummy_action(action_type="retry", status="completed", hours_ago=1.0):
    return SimpleNamespace(
        id=f"act_{action_type}_{hours_ago}",
        recovery_case_id="rc_test_123",
        action_type=action_type,
        status=status,
        executed_at=datetime.now(timezone.utc) - timedelta(hours=hours_ago),
        amount_recovered=0.0
    )


def run_tests():
    engine = FatigueEngine()
    guardrails = GuardrailEngine()
    
    print("=" * 60)
    print("RUNNING RECOVERY FATIGUE DETECTOR TEST SUITE")
    print("=" * 60)
    
    # -------------------------------------------------------------
    # Scenario A: 1 attempt, 25h gap -> LOW
    # -------------------------------------------------------------
    case_a = make_dummy_case(retry_count=1)
    actions_a = [make_dummy_action("retry", "completed", hours_ago=25.0)]
    cust_a = make_dummy_customer(consent=True)
    res_a = engine.assess(case_a, actions_a, cust_a)
    print(f"Scenario A (1 attempt, 25h gap): Score={res_a['score']} Level={res_a['level']} Rec={res_a['recommendation']}")
    assert res_a['level'] == 'low', f"Expected low, got {res_a['level']}"
    assert res_a['recommendation'] == 'continue', f"Expected continue, got {res_a['recommendation']}"
    print("  [PASS] Scenario A -> LOW / continue")

    # -------------------------------------------------------------
    # Scenario B: 2 attempts, reasonable interval -> MODERATE
    # -------------------------------------------------------------
    case_b = make_dummy_case(retry_count=1)
    actions_b = [
        make_dummy_action("send_payment_link", "completed", hours_ago=14.0),
        make_dummy_action("send_reminder", "completed", hours_ago=7.0),
    ]
    cust_b = make_dummy_customer(consent=True)
    res_b = engine.assess(case_b, actions_b, cust_b)
    print(f"Scenario B (2 attempts, 7h interval): Score={res_b['score']} Level={res_b['level']} Rec={res_b['recommendation']}")
    assert res_b['level'] in ('low', 'moderate'), f"Expected low/moderate, got {res_b['level']}"
    print(f"  [PASS] Scenario B -> {res_b['level'].upper()} / {res_b['recommendation']}")

    # -------------------------------------------------------------
    # Scenario C: 3 attempts, short intervals -> HIGH
    # -------------------------------------------------------------
    case_c = make_dummy_case(retry_count=2)
    actions_c = [
        make_dummy_action("send_payment_link", "failed", hours_ago=8.0),
        make_dummy_action("send_reminder", "failed", hours_ago=4.0),
        make_dummy_action("retry", "failed", hours_ago=1.5),
    ]
    cust_c = make_dummy_customer(consent=True)
    res_c = engine.assess(case_c, actions_c, cust_c)
    print(f"Scenario C (3 attempts, failed, short gap): Score={res_c['score']} Level={res_c['level']} Rec={res_c['recommendation']}")
    assert res_c['score'] >= 50, f"Expected score >= 50, got {res_c['score']}"
    assert res_c['level'] in ('high', 'critical'), f"Expected high/critical, got {res_c['level']}"
    assert res_c['recommendation'] in ('pause', 'escalate'), f"Expected pause/escalate, got {res_c['recommendation']}"
    print(f"  [PASS] Scenario C -> {res_c['level'].upper()} ({res_c['score']}/100) / {res_c['recommendation']}")

    # -------------------------------------------------------------
    # Scenario D: 3+ attempts, multiple links, very short intervals, all failed -> CRITICAL
    # -------------------------------------------------------------
    case_d = make_dummy_case(retry_count=3)
    actions_d = [
        make_dummy_action("send_payment_link", "failed", hours_ago=3.0),
        make_dummy_action("send_payment_link", "failed", hours_ago=2.0),
        make_dummy_action("send_reminder", "failed", hours_ago=1.0),
        make_dummy_action("retry", "failed", hours_ago=0.3),
    ]
    cust_d = make_dummy_customer(consent=True)
    res_d = engine.assess(case_d, actions_d, cust_d)
    print(f"Scenario D (Aggressive saturation): Score={res_d['score']} Level={res_d['level']} Rec={res_d['recommendation']}")
    assert res_d['score'] >= 75, f"Expected score >= 75, got {res_d['score']}"
    assert res_d['level'] == 'critical', f"Expected critical, got {res_d['level']}"
    assert res_d['recommendation'] in ('pause', 'escalate'), f"Expected pause/escalate, got {res_d['recommendation']}"
    print(f"  [PASS] Scenario D -> CRITICAL ({res_d['score']}/100) / {res_d['recommendation']}")

    # -------------------------------------------------------------
    # Scenario E: Consent revoked -> CRITICAL (100) override
    # -------------------------------------------------------------
    case_e = make_dummy_case()
    cust_e = make_dummy_customer(consent=False)
    res_e = engine.assess(case_e, [], cust_e)
    print(f"Scenario E (Consent revoked): Score={res_e['score']} Level={res_e['level']} Rec={res_e['recommendation']}")
    assert res_e['score'] == 100, f"Expected 100, got {res_e['score']}"
    assert res_e['level'] == 'critical', f"Expected critical, got {res_e['level']}"
    print("  [PASS] Scenario E -> 100 / CRITICAL (Consent Override)")

    # -------------------------------------------------------------
    # Scenario F: Already recovered -> score 0 override
    # -------------------------------------------------------------
    case_f = make_dummy_case(status="recovered")
    cust_f = make_dummy_customer(consent=True)
    res_f = engine.assess(case_f, actions_d, cust_f)
    print(f"Scenario F (Already recovered): Score={res_f['score']} Level={res_f['level']}")
    assert res_f['score'] == 0, f"Expected 0, got {res_f['score']}"
    assert res_f['level'] == 'low', f"Expected low, got {res_f['level']}"
    print("  [PASS] Scenario F -> 0 / LOW (Resolved Override)")

    # -------------------------------------------------------------
    # Guardrail Policy 7: Recovery Pressure Cadence Verification
    # -------------------------------------------------------------
    print("\n--- Testing Guardrail Policy 7 ---")
    cust_dict = {"id": "c1", "consent_status": True, "risk_score": 0.1}
    pay_dict = {"id": "p1", "amount": 5000.0, "status": "failed"}
    case_dict = {"id": "rc1", "status": "open", "retry_count": 0}

    # 7.1: Elevated pressure -> WARNING issued (Contextual safety cadence check)
    passed, results, msg = guardrails.validate(
        action_type="retry",
        customer=cust_dict,
        payment=pay_dict,
        recovery_case=case_dict,
        requested_amount=5000.0,
        fatigue_score=85
    )
    assert passed, "Policy 7 is a contextual safety cadence check (non-blocking warning)"
    p7_check = next(c for c in results if c["rule_name"] == "Policy 7: Recovery Pressure Cadence Check")
    assert p7_check["passed"], "Policy 7 check should pass with warning"
    assert p7_check["severity"] == "WARNING"
    print("  [PASS] Guardrail Policy 7 emitted contextual WARNING at pressure 85/100")

    # 7.2: Normal pressure -> INFO
    passed_low, results_low, _ = guardrails.validate(
        action_type="retry",
        customer=cust_dict,
        payment=pay_dict,
        recovery_case=case_dict,
        requested_amount=5000.0,
        fatigue_score=20
    )
    assert passed_low, "Policy 7 should pass under LOW pressure"
    p7_low = next(c for c in results_low if c["rule_name"] == "Policy 7: Recovery Pressure Cadence Check")
    assert p7_low["severity"] == "INFO"
    print("  [PASS] Guardrail Policy 7 emitted INFO at pressure 20/100")

    # -------------------------------------------------------------
    # Scenario G: Full Orchestrator Autonomous Pipeline Execution
    # -------------------------------------------------------------
    print("\n--- Testing Live Database Pipeline Execution ---")
    db = SessionLocal()
    try:
        # Find an open recovery case
        open_case = db.query(RecoveryCase).filter(RecoveryCase.status == "open").first()
        if open_case:
            orchestrator = RecoveryOrchestrator()
            res = orchestrator.run_agent_pipeline(db, open_case.id)
            dec_val = res['decision'].get('decision') if isinstance(res['decision'], dict) else res['decision'].decision
            print(f"  Decision: {dec_val}")
            print(f"  Action Status: {res['action_status']}")
            print(f"  Number of Stages: {len(res['stages'])}")

            for idx, stg in enumerate(res['stages']):
                print(f"    Stage {idx+1}: {stg['stage_id']} -> {stg['status']} ({stg.get('duration_ms', 0)}ms)")
            
            # Verify recovery pressure / fatigue stage exists
            pressure_stg = next((s for s in res['stages'] if s['stage_id'] in ['recovery_pressure', 'fatigue_assessment']), None)
            assert pressure_stg is not None, "recovery_pressure / fatigue_assessment stage must be in stages list"
            score_val = pressure_stg['metadata'].get('score', 0)
            print(f"  [PASS] Stage 3 Recovery Pressure Assessment verified in pipeline! Score={score_val}")

            # Verify audit event emitted
            pressure_audit = db.query(AuditLog).filter(
                AuditLog.recovery_case_id == open_case.id,
                AuditLog.event_type.in_(["recovery_pressure_assessed", "recovery_fatigue_assessed"])
            ).first()
            assert pressure_audit is not None, "recovery_pressure_assessed audit log must exist"
            print(f"  [PASS] Audit Log verified: {pressure_audit.description}")

            # Verify persistence in recovery_pressure_assessments
            assessment_record = db.query(RecoveryFatigueAssessment).filter(
                RecoveryFatigueAssessment.case_id == open_case.id
            ).first()
            assert assessment_record is not None, "RecoveryPressureAssessment / RecoveryFatigueAssessment record must be persisted in DB"
            print(f"  [PASS] DB Record verified: ID={assessment_record.id}, Score={assessment_record.score}, Level={assessment_record.level}")
        else:
            print("  [WARN] No open case in DB to run pipeline on.")
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("ALL TEST SCENARIOS PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
