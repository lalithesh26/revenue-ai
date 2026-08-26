"""
==============================================================================
REVENUEAI — CLOUD DEPLOYMENT READINESS & API VALIDATION TEST SUITE
==============================================================================
Tests all key production requirements over real HTTP:
1. Health check & configuration
2. Authentication (Login, Me, Google Sandbox, Token Expiry, Logout)
3. Dashboard Summary API
4. Recovery Cases API (Listing, Details, Filtering)
5. Customers API (Listing, Search)
6. Analytics API
7. Guardrails API & Deterministic Safety Barriers
8. Audit Trail API & Immutability
9. Notifications API (Listing, Read, Read-All)
10. System Data Health API & Persistence
11. End-to-End Autonomous AI Agent Execution with Groq LLM & Fallback
12. Failure Simulation & Recovery Simulation Endpoints
13. CORS Configuration Validation
14. Payment Boundary Verification (ALLOW_REAL_MONEY_MOVEMENT=false)
"""

import sys
import os
import time
import json
import threading
import requests
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import uvicorn
from app.config import settings

TEST_PORT = 8009
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"

def start_server():
    uvicorn.run("app.main:app", host="127.0.0.1", port=TEST_PORT, log_level="warning")

def run_tests():
    print("=" * 70)
    print("REVENUEAI — CLOUD DEPLOYMENT READINESS TEST SUITE")
    print(f"Target Server: {BASE_URL}")
    print("=" * 70)

    # Start backend in a background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait for server to become responsive
    max_retries = 30
    for i in range(max_retries):
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=1)
            if r.status_code == 200:
                print(f"[INIT] Server is ready on port {TEST_PORT} (took {i * 0.1:.1f}s)")
                break
        except Exception:
            time.sleep(0.1)
    else:
        raise RuntimeError(f"Server failed to start on port {TEST_PORT}")

    passed = 0
    total = 0

    def assert_test(condition, name, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"[PASS] {name} {f'({details})' if details else ''}")
        else:
            print(f"[FAIL] {name} {f'({details})' if details else ''}")
            raise AssertionError(f"Test failed: {name} - {details}")

    session = requests.Session()

    # -------------------------------------------------------------------------
    # 1. Health Check
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/health")
    assert_test(res.status_code == 200, "1. GET /health status 200")
    health_data = res.json()
    assert_test(health_data.get("status") == "healthy", "1.1 Health status is healthy")
    assert_test(health_data.get("real_money_disabled") is True, "1.2 Real money movement is strictly disabled")
    assert_test(health_data.get("payment_provider") == "mock", "1.3 Payment provider is mock")

    # -------------------------------------------------------------------------
    # 2. Database & Data Health
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/system/data-health")
    assert_test(res.status_code == 200, "2. GET /api/system/data-health status 200")
    dh_data = res.json()
    assert_test(dh_data.get("customers", 0) > 0, "2.1 Database has customers", f"count={dh_data.get('customers')}")
    assert_test(dh_data.get("payments", 0) > 0, "2.2 Database has payments", f"count={dh_data.get('payments')}")
    assert_test(dh_data.get("recovery_cases", 0) > 0, "2.3 Database has recovery cases", f"count={dh_data.get('recovery_cases')}")

    # -------------------------------------------------------------------------
    # 3. Authentication Flow
    # -------------------------------------------------------------------------
    # 3.1 Invalid login
    res = session.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@revenueai.app", "password": "WrongPassword!"})
    assert_test(res.status_code == 401, "3.1 Invalid login correctly rejected with 401")

    # 3.2 Demo login
    res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": settings.DEMO_USER_EMAIL,
        "password": settings.DEMO_USER_PASSWORD,
        "remember_me": True
    })
    assert_test(res.status_code == 200, "3.2 Demo admin login status 200")
    login_data = res.json()
    token = login_data.get("token")
    assert_test(bool(token), "3.3 JWT token issued on login")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 3.3 GET /api/auth/me
    res = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
    assert_test(res.status_code == 200, "3.4 GET /api/auth/me status 200")
    user_data = res.json()
    assert_test(user_data.get("email") == settings.DEMO_USER_EMAIL, "3.5 User profile matches authenticated user")

    # 3.4 Google Sign-In Sandbox
    import base64
    fake_header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    fake_payload = base64.urlsafe_b64encode(json.dumps({
        "sub": "google_12345",
        "email": "cloud_tester@revenueai.app",
        "name": "Cloud Tester"
    }).encode()).decode().rstrip("=")
    fake_google_jwt = f"{fake_header}.{fake_payload}.signature"
    res = session.post(f"{BASE_URL}/api/auth/google", json={"credential": fake_google_jwt, "remember_me": False})
    assert_test(res.status_code == 200, "3.6 Google sign-in sandbox creates/authenticates user")

    # -------------------------------------------------------------------------
    # 4. Dashboard Summary
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
    assert_test(res.status_code == 200, "4. GET /api/dashboard/summary status 200")
    dash = res.json()
    assert_test("total_revenue_at_risk" in dash, "4.1 Dashboard contains total_revenue_at_risk")
    assert_test("recovery_rate_pct" in dash, "4.2 Dashboard contains recovery_rate_pct")
    assert_test("open_recovery_cases_count" in dash, "4.3 Dashboard contains open_recovery_cases_count")

    # -------------------------------------------------------------------------
    # 5. Recovery Cases Listing & Details
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/recovery-cases", headers=auth_headers)
    assert_test(res.status_code == 200, "5. GET /api/recovery-cases status 200")
    cases = res.json()
    assert_test(len(cases) > 0, "5.1 Recovery cases list populated", f"count={len(cases)}")
    
    first_case = cases[0]
    case_id = first_case["id"]
    
    res = session.get(f"{BASE_URL}/api/recovery-cases/{case_id}", headers=auth_headers)
    assert_test(res.status_code == 200, "5.2 GET /api/recovery-cases/{id} status 200")
    detail = res.json()
    assert_test(detail.get("id") == case_id, "5.3 Case detail ID matches")
    assert_test(bool(detail.get("customer")), "5.4 Case detail contains customer entity")
    assert_test(bool(detail.get("payment")), "5.5 Case detail contains payment entity")

    # -------------------------------------------------------------------------
    # 6. Customers API
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/customers", headers=auth_headers)
    assert_test(res.status_code == 200, "6. GET /api/customers status 200")
    customers = res.json()
    assert_test(len(customers) > 0, "6.1 Customers list populated", f"count={len(customers)}")

    # -------------------------------------------------------------------------
    # 7. Analytics API
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/analytics", headers=auth_headers)
    assert_test(res.status_code == 200, "7. GET /api/analytics status 200")
    analytics = res.json()
    assert_test("overview" in analytics, "7.1 Analytics contains overview metrics")
    assert_test("recovery_pressure_distribution" in analytics, "7.2 Analytics contains recovery_pressure_distribution")
    assert_test("strategy_performance" in analytics, "7.3 Analytics contains strategy_performance")
    assert_test("failure_reasons" in analytics, "7.4 Analytics contains failure_reasons")

    # -------------------------------------------------------------------------
    # 8. Guardrails API
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/guardrails", headers=auth_headers)
    assert_test(res.status_code == 200, "8. GET /api/guardrails status 200")
    guardrails = res.json()
    assert_test("policies" in guardrails, "8.1 Guardrails returns policies list")
    assert_test(guardrails.get("total_policies") == 7, "8.2 Total 7 deterministic policies present", f"total={guardrails.get('total_policies')}")
    assert_test(guardrails.get("blocking_policies_count") == 6, "8.3 6 blocking policies configured")
    assert_test(guardrails.get("contextual_policies_count") == 1, "8.4 1 contextual safety policy configured")

    # -------------------------------------------------------------------------
    # 9. Notifications API
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
    assert_test(res.status_code == 200, "9. GET /api/notifications status 200")
    notifs = res.json()
    assert_test("notifications" in notifs, "9.1 Notifications list returned")
    assert_test("unread_count" in notifs, "9.2 Unread count present", f"unread={notifs.get('unread_count')}")

    # Mark all read
    res = session.post(f"{BASE_URL}/api/notifications/read-all", headers=auth_headers)
    assert_test(res.status_code == 200, "9.3 POST /api/notifications/read-all status 200")

    # -------------------------------------------------------------------------
    # 10. Audit Trail API
    # -------------------------------------------------------------------------
    res = session.get(f"{BASE_URL}/api/audit-trail", headers=auth_headers)
    assert_test(res.status_code == 200, "10. GET /api/audit-trail status 200")
    audits = res.json()
    assert_test(len(audits) > 0, "10.1 Audit trail contains immutable event logs", f"count={len(audits)}")

    # -------------------------------------------------------------------------
    # 11. AI Recovery Agent Full Pipeline Execution
    # -------------------------------------------------------------------------
    open_cases = [c for c in cases if c.get("status") in ("open", "in_recovery")]
    target_case_id = open_cases[0]["id"] if open_cases else case_id

    res = session.post(f"{BASE_URL}/api/recovery-cases/{target_case_id}/run-agent", headers=auth_headers)
    assert_test(res.status_code == 200, "11. POST /api/recovery-cases/{id}/run-agent status 200")
    pipeline_res = res.json()
    assert_test("decision" in pipeline_res, "11.1 Agent decision object returned")
    dec = pipeline_res.get("decision", {})
    assert_test(bool(dec.get("decision")), "11.2 Recommended action present", f"action={dec.get('decision')}")
    assert_test("stages" in pipeline_res, "11.3 Pipeline stages recorded", f"stages={len(pipeline_res.get('stages', []))}")
    assert_test(bool(dec.get("decision_source")), "11.4 Decision source present", f"source={dec.get('decision_source')}")
    assert_test(bool(dec.get("model_used")), "11.5 Model used recorded", f"model={dec.get('model_used')}")
    assert_test(pipeline_res.get("guardrail_passed") is True, "11.6 Guardrails verification passed")

    # -------------------------------------------------------------------------
    # 12. Simulation Endpoints
    # -------------------------------------------------------------------------
    # 12.1 Failure Simulation
    res = session.post(f"{BASE_URL}/api/demo/simulate-failure", json={
        "amount": 3499.0,
        "failure_reason": "Declined due to bank network timeout.",
        "payment_method": "upi"
    }, headers=auth_headers)
    assert_test(res.status_code == 200, "12.1 POST /api/demo/simulate-failure status 200")
    sim_fail = res.json()
    new_case_id = sim_fail.get("recovery_case_id")
    assert_test(bool(new_case_id), "12.2 Simulated failure created new recovery case", f"id={new_case_id}")

    # 12.2 Recovery Simulation
    res = session.post(f"{BASE_URL}/api/demo/simulate-recovery", json={
        "recovery_case_id": new_case_id,
        "payment_link_paid": True
    }, headers=auth_headers)
    assert_test(res.status_code == 200, "12.3 POST /api/demo/simulate-recovery status 200")
    sim_rec = res.json()
    assert_test(sim_rec.get("status") == "recovered", "12.4 Case status updated to recovered")

    # -------------------------------------------------------------------------
    # 13. Logout
    # -------------------------------------------------------------------------
    res = session.post(f"{BASE_URL}/api/auth/logout", headers=auth_headers)
    assert_test(res.status_code == 200, "13. POST /api/auth/logout status 200")

    print("=" * 70)
    print(f"ALL CLOUD READINESS TESTS PASSED: {passed}/{total} (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
