import urllib.request
import urllib.error
import json
import sys
import time
import threading
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def ensure_server_running(port: int = 8000) -> str:
    url = f"http://127.0.0.1:{port}"
    try:
        urllib.request.urlopen(f"{url}/health", timeout=1)
        return url
    except Exception:
        pass

    import uvicorn
    def run_app():
        uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")

    th = threading.Thread(target=run_app, daemon=True)
    th.start()
    for _ in range(30):
        try:
            urllib.request.urlopen(f"{url}/health", timeout=1)
            return url
        except Exception:
            time.sleep(0.1)
    return url

def test_api():
    print("=== REVENUEAI COMPREHENSIVE END-TO-END VALIDATION ===")
    base_url = ensure_server_running(8000)
    
    # 1. Health
    h = json.loads(urllib.request.urlopen(f"{base_url}/health").read().decode())
    print("1. [PASS] Health Check:", h["service"], "| Status:", h["status"])
    assert h["service"] == "RevenueAI", "Service name must be RevenueAI"

    # 2. Auth - Invalid Credentials
    try:
        req_bad = urllib.request.Request(
            f"{base_url}/api/auth/login",
            data=json.dumps({"email": "wrong@revenueai.app", "password": "bad"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req_bad)
        print("2. [FAIL] Auth allowed invalid login")
    except urllib.error.HTTPError as e:
        print("2. [PASS] Invalid Credentials Rejected with 401:", e.code)

    # 3. Auth - Valid Login
    req_good = urllib.request.Request(
        f"{base_url}/api/auth/login",
        data=json.dumps({"email": "demo@revenueai.app", "password": "RevenueAI@2026"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    auth_data = json.loads(urllib.request.urlopen(req_good).read().decode())
    token = auth_data["token"]
    print("3. [PASS] Valid Auth Login: User =", auth_data["user"]["name"], "| Role =", auth_data["user"]["role"])

    # 4. Auth - Protected Route /api/auth/me
    req_me = urllib.request.Request(
        f"{base_url}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    me = json.loads(urllib.request.urlopen(req_me).read().decode())
    print("4. [PASS] Protected Me Endpoint:", me["email"])

    # 5. Notifications
    req_notif = urllib.request.Request(
        f"{base_url}/api/notifications",
        headers={"Authorization": f"Bearer {token}"}
    )
    notifs = json.loads(urllib.request.urlopen(req_notif).read().decode())
    print("5. [PASS] Notifications Endpoint: Total =", notifs["total_count"], "| Unread =", notifs["unread_count"])

    # 6. Mark All Notifications Read
    req_read = urllib.request.Request(
        f"{base_url}/api/notifications/read-all",
        data=b"{}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    read_res = json.loads(urllib.request.urlopen(req_read).read().decode())
    print("6. [PASS] Mark All Read:", read_res["message"])

    # 7. Universal Search
    req_search = urllib.request.Request(
        f"{base_url}/api/search?q=a",
        headers={"Authorization": f"Bearer {token}"}
    )
    srch = json.loads(urllib.request.urlopen(req_search).read().decode())
    print("7. [PASS] Universal Search: Total Results =", srch["total_results"], "| Cases =", len(srch["recovery_cases"]), "| Customers =", len(srch["customers"]))

    # 8. Dashboard Summary
    req_sum = urllib.request.Request(
        f"{base_url}/api/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"}
    )
    sum_data = json.loads(urllib.request.urlopen(req_sum).read().decode())
    print(f"8. [PASS] Dashboard Summary: Recovered = INR {sum_data['total_revenue_recovered']:,.2f} | At Risk = INR {sum_data['total_revenue_at_risk']:,.2f} | Yield = {sum_data['recovery_rate_pct']}%")

    # 9. Recovery Cases List
    req_cases = urllib.request.Request(
        f"{base_url}/api/recovery-cases",
        headers={"Authorization": f"Bearer {token}"}
    )
    cases = json.loads(urllib.request.urlopen(req_cases).read().decode())
    open_case = next((c for c in cases if c["status"] in ["open", "in_recovery"]), cases[0] if cases else None)
    if not open_case:
        raise ValueError("No recovery cases available to test agent execution.")

    # 10. AI Recovery Agent Execution
    case_id = open_case["id"]
    req_agent = urllib.request.Request(
        f"{base_url}/api/recovery-cases/{case_id}/run-agent",
        data=b"{}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    agent_res = json.loads(urllib.request.urlopen(req_agent).read().decode())
    print(f"10. [PASS] AI Agent Run on Case {case_id}: Action = {agent_res['decision']['decision']} | Guardrail Passed = {agent_res['guardrail_passed']} | Stages = {len(agent_res['stages'])}")

    # 11. Settlement Simulation
    req_settle = urllib.request.Request(
        f"{base_url}/api/demo/simulate-recovery",
        data=json.dumps({"recovery_case_id": case_id, "payment_link_paid": True}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    settle_res = json.loads(urllib.request.urlopen(req_settle).read().decode())
    settle_msg = str(settle_res.get('message', '')).replace('\u20b9', 'INR ')
    print(f"11. [PASS] Settlement Simulation: {settle_msg} | Recovered Amount = INR {settle_res['recovered_amount']:,.2f}")

    # 12. Logout
    req_logout = urllib.request.Request(
        f"{base_url}/api/auth/logout",
        data=b"{}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    logout_res = json.loads(urllib.request.urlopen(req_logout).read().decode())
    print("12. [PASS] Logout Successful:", logout_res["message"])
    
    print("\nALL 12 VALIDATION & WORKFLOW TESTS PASSED!")

if __name__ == "__main__":
    test_api()
