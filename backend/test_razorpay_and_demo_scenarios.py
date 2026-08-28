import sys
import os
import hmac
import hashlib
import json

# Add backend to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.config import settings
from app.providers.razorpay_test_mode import RazorpayTestModeProvider
from app.api.webhooks import verify_razorpay_signature
from app.api.demo import simulate_predefined_scenario
from app.engine.orchestrator import orchestrator
from app.models.recovery_case import RecoveryCase
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.audit_log import AuditLog

def run_tests():
    print("==================================================")
    print("RUNNING RAZORPAY TEST MODE & DEMO SCENARIOS VALIDATION")
    print("==================================================")

    # 1. Test Live Key Prevention
    print("\n--- 1. Testing Live Razorpay Key Blocking ---")
    try:
        provider = RazorpayTestModeProvider(key_id="rzp_live_1234567890", key_secret="live_secret")
        print("  [FAIL] Live key should have raised ValueError!")
        sys.exit(1)
    except ValueError as e:
        print(f"  [PASS] Live key correctly rejected: {e}")

    # 2. Test Razorpay Test Mode Provider
    print("\n--- 2. Testing Razorpay Test Mode Provider Methods ---")
    rzp_provider = RazorpayTestModeProvider(key_id="rzp_test_demo123", key_secret="test_secret")
    assert rzp_provider.provider_name == "razorpay_test"
    
    order = rzp_provider.create_payment("cust_test123", 4999.0, "INR")
    assert order["amount"] == 4999.0
    assert order["amount_paise"] == 499900
    assert order["provider"] == "razorpay_test"
    print(f"  [PASS] Test Order creation verified: {order['id']}, amount={order['amount']}")

    link = rzp_provider.create_payment_link("pay_test123", 2499.0, "customer@example.com")
    assert link["amount"] == 2499.0
    assert "https://rzp.io/i/" in link["short_url"]
    print(f"  [PASS] Test Payment Link creation verified: {link['payment_link_id']}, url={link['short_url']}")

    retry = rzp_provider.retry_payment("pay_test123")
    assert retry["status"] == "success"
    print(f"  [PASS] Test Retry payment response verified: {retry['retry_id']}")

    # 3. Test Webhook Signature Verification
    print("\n--- 3. Testing Webhook Cryptographic Signature Verification ---")
    secret = "secret_webhook_key_2026"
    test_body = b'{"event":"payment_link.paid","payload":{"payment_link":{"entity":{"id":"plink_123","amount_paid":249900}}}}'
    valid_sig = hmac.new(secret.encode("utf-8"), test_body, hashlib.sha256).hexdigest()
    invalid_sig = "bad_signature_12345"

    assert verify_razorpay_signature(test_body, valid_sig, secret) is True
    assert verify_razorpay_signature(test_body, invalid_sig, secret) is False
    assert verify_razorpay_signature(test_body, None, secret) is False
    print("  [PASS] Webhook HMAC-SHA256 signature verification verified with 100% precision.")

    # 4. Test All 5 Controlled AI Demo Scenarios
    db = SessionLocal()
    try:
        print("\n--- 4. Testing 5 Core Controlled AI Demo Scenarios ---")
        
        # DEMO 1: Payment Link (Expired card, ₹2,499 in Band A)
        res1 = simulate_predefined_scenario("demo_payment_link", db)
        case_id_1 = res1["recovery_case_id"]
        pipeline_res1 = orchestrator.run_agent_pipeline(db, case_id_1)
        assert pipeline_res1["guardrail_passed"] is True
        assert pipeline_res1["decision"]["decision"] in ("send_payment_link", "retry")
        print(f"  [PASS] Demo 1 (Payment Link): AI decided '{pipeline_res1['decision']['decision']}', Guardrails PASSED, Recovery Amount INR {res1['amount']}")

        # DEMO 2: Retry (Bank timeout, ₹6,999 in Band B)
        res2 = simulate_predefined_scenario("demo_retry", db)
        case_id_2 = res2["recovery_case_id"]
        pipeline_res2 = orchestrator.run_agent_pipeline(db, case_id_2)
        assert pipeline_res2["guardrail_passed"] is True
        assert pipeline_res2["decision"]["decision"] == "retry"
        print(f"  [PASS] Demo 2 (Retry): AI decided '{pipeline_res2['decision']['decision']}', Guardrails PASSED, Recovery Amount INR {res2['amount']}")

        # DEMO 3: Reminder / Wait (Insufficient balance, high LTV, ₹12,500 in Band C)
        res3 = simulate_predefined_scenario("demo_reminder_wait", db)
        case_id_3 = res3["recovery_case_id"]
        pipeline_res3 = orchestrator.run_agent_pipeline(db, case_id_3)
        assert pipeline_res3["guardrail_passed"] is True
        assert pipeline_res3["decision"]["decision"] in ("send_reminder", "retry", "wait")
        print(f"  [PASS] Demo 3 (Reminder/Wait): AI decided '{pipeline_res3['decision']['decision']}', Guardrails PASSED, Recovery Amount INR {res3['amount']}")

        # DEMO 4: Escalate (Fraud / auth flag, ₹32,000 in Band D)
        res4 = simulate_predefined_scenario("demo_escalate", db)
        case_id_4 = res4["recovery_case_id"]
        pipeline_res4 = orchestrator.run_agent_pipeline(db, case_id_4)
        assert pipeline_res4["decision"]["decision"] == "escalate"
        print(f"  [PASS] Demo 4 (Escalate): AI decided '{pipeline_res4['decision']['decision']}', Recovery Amount INR {res4['amount']}")

        # DEMO 5: Guardrail Block (Revoked Consent, ₹3,500 in Band A)
        res5 = simulate_predefined_scenario("demo_guardrail_block", db)
        case_id_5 = res5["recovery_case_id"]
        pipeline_res5 = orchestrator.run_agent_pipeline(db, case_id_5)
        # In revoked consent, either AI stops or guardrail hard-blocks outreach
        if pipeline_res5["decision"]["decision"] in ("send_payment_link", "send_reminder", "retry"):
            assert pipeline_res5["guardrail_passed"] is False
            print(f"  [PASS] Demo 5 (Guardrail Block): AI suggested '{pipeline_res5['decision']['decision']}' but Guardrail Policy 1 strictly BLOCKED.")
        else:
            assert pipeline_res5["decision"]["decision"] == "stop"
            print(f"  [PASS] Demo 5 (Guardrail Block): AI recognized revoked consent and formulated 'stop'.")

        print("\n==================================================")
        print("ALL RAZORPAY AND DEMO SCENARIOS PASSED WITH 100% SUCCESS!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
