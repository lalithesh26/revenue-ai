import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.seed import seed_synthetic_data
from app.api.analytics import get_recovery_trend

def test_recovery_trend():
    print("==================================================")
    print("TESTING RECOVERY TREND ANALYTICS ENDPOINT & DATA")
    print("==================================================")

    db = SessionLocal()
    try:
        print("\n--- 1. Reseeding Database with Multi-Period 2026 Data ---")
        res = seed_synthetic_data(db, num_customers=100, num_payments=320, reset_existing=True)
        print(f"  [PASS] Seeded: {res['customers_created']} customers, {res['payments_created']} payments, {res['recovery_cases_created']} recovery cases.")

        print("\n--- 2. Testing 'month' Range ---")
        trend_month = get_recovery_trend(time_range="month", db=db)
        print(f"  Period Label: {trend_month.period_label}")
        print(f"  Points Count: {len(trend_month.points)}")
        print(f"  Total Recovered: INR {trend_month.total_recovered:,.2f}")
        print(f"  Total At Risk:   INR {trend_month.total_at_risk:,.2f}")
        for pt in trend_month.points:
            print(f"    - {pt.label}: Recovered=INR {pt.recovered:,.2f} ({pt.count_recovered} txs) | At Risk=INR {pt.at_risk:,.2f} ({pt.count_at_risk} txs)")
        assert len(trend_month.points) == 5
        assert trend_month.total_recovered > 0 or trend_month.total_at_risk > 0

        print("\n--- 3. Testing 'quarter' Range ---")
        trend_quarter = get_recovery_trend(time_range="quarter", db=db)
        print(f"  Period Label: {trend_quarter.period_label}")
        print(f"  Points Count: {len(trend_quarter.points)}")
        print(f"  Total Recovered: INR {trend_quarter.total_recovered:,.2f}")
        print(f"  Total At Risk:   INR {trend_quarter.total_at_risk:,.2f}")
        for pt in trend_quarter.points:
            print(f"    - {pt.label}: Recovered=INR {pt.recovered:,.2f} ({pt.count_recovered} txs) | At Risk=INR {pt.at_risk:,.2f} ({pt.count_at_risk} txs)")
        assert len(trend_quarter.points) == 6
        assert trend_quarter.total_recovered > 0 or trend_quarter.total_at_risk > 0

        print("\n--- 4. Testing 'year' Range ---")
        trend_year = get_recovery_trend(time_range="year", db=db)
        print(f"  Period Label: {trend_year.period_label}")
        print(f"  Points Count: {len(trend_year.points)}")
        print(f"  Total Recovered: INR {trend_year.total_recovered:,.2f}")
        print(f"  Total At Risk:   INR {trend_year.total_at_risk:,.2f}")
        for pt in trend_year.points:
            print(f"    - {pt.label}: Recovered=INR {pt.recovered:,.2f} ({pt.count_recovered} txs) | At Risk=INR {pt.at_risk:,.2f} ({pt.count_at_risk} txs)")
        assert len(trend_year.points) == 8  # Jan to Aug 2026
        assert trend_year.total_recovered > 0 or trend_year.total_at_risk > 0

        print("\n==================================================")
        print("RECOVERY TREND DATABASE AGGREGATION PASSED 100%!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_recovery_trend()
