import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.api.analytics import get_recovery_trend
from app.engine.orchestrator import orchestrator
from app.api.demo import simulate_predefined_scenario

def test_realtime_recovery_trend():
    db = SessionLocal()
    try:
        print("1. Fetch initial trend for 'month', 'quarter', 'year'...")
        initial_month = get_recovery_trend(time_range="month", db=db)
        initial_quarter = get_recovery_trend(time_range="quarter", db=db)
        initial_year = get_recovery_trend(time_range="year", db=db)
        
        print(f"  Initial Month Total Recovered: {initial_month.total_recovered}")
        print(f"  Initial Quarter Total Recovered: {initial_quarter.total_recovered}")
        print(f"  Initial Year Total Recovered: {initial_year.total_recovered}")

        print("\n2. Execute a new real recovery action NOW...")
        # Trigger demo retry scenario (Aarav Verma, amount ₹6,999)
        demo_info = simulate_predefined_scenario("demo_retry", db=db)
        case_id = demo_info["recovery_case_id"]
        expected_recovered_amt = demo_info["amount"]
        print(f"  Created case {case_id} for amount INR {expected_recovered_amt:,.2f}")

        # Run AI recovery agent
        agent_result = orchestrator.run_agent_pipeline(db, case_id)
        print(f"  Agent action: {agent_result['action_type']}, status: {agent_result['action_status']}, recovered_amount: {agent_result['recovered_amount']}")

        print("\n3. Fetch updated trends...")
        updated_month = get_recovery_trend(time_range="month", db=db)
        updated_quarter = get_recovery_trend(time_range="quarter", db=db)
        updated_year = get_recovery_trend(time_range="year", db=db)

        month_diff = updated_month.total_recovered - initial_month.total_recovered
        quarter_diff = updated_quarter.total_recovered - initial_quarter.total_recovered
        year_diff = updated_year.total_recovered - initial_year.total_recovered

        print(f"  Updated Month Total Recovered: {updated_month.total_recovered} (Diff: +{month_diff})")
        print(f"  Updated Quarter Total Recovered: {updated_quarter.total_recovered} (Diff: +{quarter_diff})")
        print(f"  Updated Year Total Recovered: {updated_year.total_recovered} (Diff: +{year_diff})")

        print("\n4. Inspect Month points:")
        for pt in updated_month.points:
            print(f"   {pt.label}: Recovered={pt.recovered}, At Risk={pt.at_risk}")

        if month_diff != expected_recovered_amt:
            print(f"  [FAIL] Month diff {month_diff} does not match expected {expected_recovered_amt}")
        else:
            print(f"  [PASS] Month diff matches exactly +INR {expected_recovered_amt:,.2f}")

        if quarter_diff != expected_recovered_amt:
            print(f"  [FAIL] Quarter diff {quarter_diff} does not match expected {expected_recovered_amt}")
        else:
            print(f"  [PASS] Quarter diff matches exactly +INR {expected_recovered_amt:,.2f}")

        if year_diff != expected_recovered_amt:
            print(f"  [FAIL] Year diff {year_diff} does not match expected {expected_recovered_amt}")
        else:
            print(f"  [PASS] Year diff matches exactly +INR {expected_recovered_amt:,.2f}")

    finally:
        db.close()

if __name__ == "__main__":
    test_realtime_recovery_trend()
