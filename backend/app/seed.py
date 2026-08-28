import os
import sys
# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import uuid
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.config import settings
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.recovery_case import RecoveryCase
from app.models.agent_decision import AgentDecision
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.notification import Notification
from app.services.auth import hash_password

FIRST_NAMES = [
    "Aarav", "Aditi", "Rohan", "Priya", "Vikram", "Neha", "Rahul", "Ananya", "Karan", "Pooja",
    "Siddharth", "Sneha", "Arjun", "Tanvi", "Aditya", "Ishaan", "Kavya", "Manish", "Divya", "Suresh",
    "Deepak", "Swati", "Nikhil", "Meera", "Varun", "Riya", "Rajesh", "Shruti", "Gaurav", "Nisha",
    "Akash", "Simran", "Amit", "Kritika", "Sanjay", "Preeti", "Harsh", "Radhika", "Vivek", "Payal",
    "Tarun", "Shikha", "Alok", "Aarti", "Sameer", "Juhi", "Prateek", "Bhavna", "Mohit", "Aayushi"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Mehta", "Iyer", "Rao", "Gupta", "Nair", "Reddy", "Singh",
    "Kulkarni", "Deshmukh", "Choudhury", "Bose", "Menon", "Joshi", "Kapoor", "Bhat", "Saxena", "Malhotra",
    "Agarwal", "Bansal", "Mishra", "Pandey", "Chatterjee", "Dutta", "Das", "Sen", "Pillai", "Nambiar"
]

COMPANIES_OR_PLANS = [
    ("Fintech Pro Subscription", 2499.0, "monthly"),
    ("Enterprise Cloud Suite", 18500.0, "monthly"),
    ("SaaS Starter Plan", 999.0, "monthly"),
    ("Growth Marketing Stack", 6999.0, "monthly"),
    ("Developer API Tier", 3499.0, "monthly"),
    ("Annual Analytics Pass", 48000.0, "yearly"),
    ("E-commerce Booster", 8999.0, "monthly"),
    ("Security & Compliance Addon", 12500.0, "monthly"),
    ("Custom Enterprise License", 50000.0, "yearly"),
]

PAYMENT_METHODS = ["credit_card", "debit_card", "upi", "netbanking", "mandate"]

# Exact 4-Band Amount Distribution for realistic fintech data
AMOUNT_BANDS = {
    "band_a": [500.0, 999.0, 1499.0, 2499.0, 3499.0, 4999.0],       # ₹500–₹4,999
    "band_b": [5499.0, 6999.0, 7500.0, 8499.0, 8999.0, 9999.0],     # ₹5,000–₹9,999
    "band_c": [10500.0, 11999.0, 12500.0, 13499.0, 14500.0],         # ₹10,000–₹14,999
    "band_d": [16500.0, 18500.0, 22000.0, 28500.0, 34000.0, 45000.0, 48000.0],  # ₹15,000–₹49,999
    "upper_bound": [50000.0]                                          # ₹50,000 exactly
}

def generate_realistic_amount() -> float:
    """Generates a realistic payment amount across the 4 standard fintech bands."""
    band_choice = random.choices(
        ["band_a", "band_b", "band_c", "band_d", "upper_bound"],
        weights=[0.35, 0.30, 0.20, 0.13, 0.02]
    )[0]
    return float(random.choice(AMOUNT_BANDS[band_choice]))

FAILURE_CATEGORIES = [
    ("insufficient_funds", "ERR_INSUFFICIENT_FUNDS", "Declined due to insufficient account balance."),
    ("expired_card", "ERR_CARD_EXPIRED", "Card expired or validity date mismatch."),
    ("bank_timeout", "ERR_BANK_TIMEOUT", "Issuing bank processing timeout during 3DS verification."),
    ("bank_downtime", "ERR_BANK_DOWNTIME", "Issuing bank core banking system currently unavailable."),
    ("authentication_failure", "ERR_AUTH_FAILED", "3D Secure authentication failed or incorrect OTP entered."),
    ("payment_method_issue", "ERR_PAYMENT_METHOD_INVALID", "Payment method declined or mandate token invalid."),
    ("user_abandonment", "ERR_USER_DROPOFF", "Customer navigated away without submitting OTP approval.")
]

def seed_synthetic_data(db: Session, num_customers: int = 100, num_payments: int = 320, reset_existing: bool = True):
    if reset_existing:
        # Drop and re-create all tables cleanly
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("Database schema reset successfully.")

    now = datetime.now(timezone.utc)
    
    # 0. Seed Demo User
    demo_email = settings.DEMO_USER_EMAIL.strip().lower()
    demo_user = db.query(User).filter(User.email == demo_email).first()
    if not demo_user:
        demo_user = User(
            id=f"usr_{uuid.uuid4().hex[:12]}",
            name=settings.DEMO_USER_NAME,
            email=demo_email,
            password_hash=hash_password(settings.DEMO_USER_PASSWORD),
            role="admin",
            is_active=True,
            created_at=now - timedelta(days=30)
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print(f"Created demo user: {demo_email}")
    
    # 1. Generate Customers
    customers = []
    for i in range(num_customers):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{random.randint(10, 999)}@example.com"
        phone = f"+9198{random.randint(10000000, 99999999)}"
        # 8% of customers have revoked consent for safety testing
        consent = random.random() > 0.08
        risk_score = round(random.uniform(0.05, 0.45), 2)
        created_at = now - timedelta(days=random.randint(30, 365))

        c = Customer(
            id=f"cust_{uuid.uuid4().hex[:12]}",
            name=name,
            email=email,
            phone=phone,
            consent_status=consent,
            risk_score=risk_score,
            created_at=created_at
        )
        db.add(c)
        customers.append(c)

    db.commit()
    print(f"Created {len(customers)} synthetic customers.")

    # 2. Generate Subscriptions
    subscriptions = []
    for c in customers:
        plan_name, amount, cycle = random.choice(COMPANIES_OR_PLANS)
        sub_status = random.choices(["active", "past_due", "canceled"], weights=[0.8, 0.15, 0.05])[0]
        sub = Subscription(
            id=f"sub_{uuid.uuid4().hex[:12]}",
            customer_id=c.id,
            amount=amount,
            billing_cycle=cycle,
            status=sub_status,
            next_billing_date=now + timedelta(days=random.randint(1, 28)),
            created_at=c.created_at
        )
        db.add(sub)
        subscriptions.append(sub)

    db.commit()
    print(f"Created {len(subscriptions)} subscriptions.")

    # 3. Generate Payments & Recovery Cases
    payments = []
    recovery_cases = []
    
    # 3a. First seed 1-3 baseline historical successful subscription payments for EVERY customer
    for c in customers:
        num_baseline = random.randint(1, 4)
        for b_idx in range(num_baseline):
            base_amount = generate_realistic_amount()
            base_pm = random.choice(PAYMENT_METHODS)
            # Spread payment dates between customer signup and now
            days_ago = random.randint(5, 60)
            c_created = c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at
            base_date = max(c_created, now - timedelta(days=days_ago, hours=random.randint(1, 23)))
            
            p_base = Payment(
                id=f"pay_{uuid.uuid4().hex[:12]}",
                customer_id=c.id,
                amount=base_amount,
                currency="INR",
                status="succeeded",
                payment_method=base_pm,
                created_at=base_date,
                updated_at=base_date
            )
            db.add(p_base)
            payments.append(p_base)

    # 3b. Generate targeted mix of Succeeded (~40%), Recovered (~35%), and Active Failed (~25%)
    for i in range(num_payments):
        c = random.choice(customers)
        amount = generate_realistic_amount()
        pm = random.choice(PAYMENT_METHODS)
        
        # Distribute across Jan to Aug 2026: ~45% in current month August, ~55% across Jan-July
        if random.random() < 0.45:
            days_ago = random.randint(0, min(27, max(1, now.day - 1)))
        else:
            days_ago = random.randint(28, 235)
            
        c_created = c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at
        created_date = max(c_created, now - timedelta(days=days_ago, hours=random.randint(1, 23)))

        status_roll = random.random()
        if status_roll < 0.55:
            # Succeeded
            p = Payment(
                id=f"pay_{uuid.uuid4().hex[:12]}",
                customer_id=c.id,
                amount=amount,
                currency="INR",
                status="succeeded",
                payment_method=pm,
                created_at=created_date,
                updated_at=created_date
            )
            db.add(p)
            payments.append(p)
        elif status_roll < 0.75:
            # Recovered Payment
            fail_cat, fail_code, fail_msg = random.choice(FAILURE_CATEGORIES)
            p = Payment(
                id=f"pay_{uuid.uuid4().hex[:12]}",
                customer_id=c.id,
                amount=amount,
                currency="INR",
                status="recovered",
                failure_code=fail_code,
                failure_reason=fail_msg,
                payment_method=pm,
                created_at=created_date - timedelta(days=2),
                updated_at=created_date
            )
            db.add(p)
            payments.append(p)

            # Create resolved recovery case
            case = RecoveryCase(
                id=f"rc_{uuid.uuid4().hex[:12]}",
                payment_id=p.id,
                customer_id=c.id,
                revenue_at_risk=amount,
                status="recovered",
                detected_at=created_date - timedelta(days=2),
                assigned_action="retry",
                priority="high" if amount > 10000 else "medium",
                retry_count=1,
                resolved_at=created_date
            )
            db.add(case)
            recovery_cases.append(case)

            dec = AgentDecision(
                recovery_case_id=case.id,
                decision="retry",
                reasoning=f"Automatic retry executed following {fail_cat} resolution.",
                confidence=0.92,
                priority=case.priority,
                created_at=created_date - timedelta(days=1)
            )
            act = RecoveryAction(
                recovery_case_id=case.id,
                action_type="retry",
                status="completed",
                result=f"Smart retry successful. Captured ₹{amount:,.2f}.",
                amount_recovered=amount,
                executed_at=created_date
            )
            audit = AuditLog(
                recovery_case_id=case.id,
                event_type="payment_recovered",
                actor="mock_payment_provider",
                description=f"Revenue recovered: ₹{amount:,.2f} captured.",
                metadata_json=json.dumps({"amount": amount, "method": pm}),
                created_at=created_date
            )
            db.add_all([dec, act, audit])

        else:
            # Active Failed Payment requiring Recovery
            fail_cat, fail_code, fail_msg = random.choice(FAILURE_CATEGORIES)
            p = Payment(
                id=f"pay_{uuid.uuid4().hex[:12]}",
                customer_id=c.id,
                amount=amount,
                currency="INR",
                status="failed",
                failure_code=fail_code,
                failure_reason=fail_msg,
                payment_method=pm,
                created_at=created_date,
                updated_at=created_date
            )
            db.add(p)
            payments.append(p)

            initial_status = random.choice(["open", "open", "in_recovery"])
            priority = "critical" if amount >= 18500 else ("high" if amount >= 8000 else "medium")
            case = RecoveryCase(
                id=f"rc_{uuid.uuid4().hex[:12]}",
                payment_id=p.id,
                customer_id=c.id,
                revenue_at_risk=amount,
                status=initial_status,
                detected_at=created_date,
                priority=priority,
                retry_count=0
            )
            db.add(case)
            recovery_cases.append(case)

            audit = AuditLog(
                recovery_case_id=case.id,
                event_type="case_detected",
                actor="system",
                description=f"Failed payment detected for ₹{amount:,.2f} ({fail_cat}). Recovery case created.",
                metadata_json=json.dumps({"failure_code": fail_code, "reason": fail_msg, "amount": amount}),
                created_at=created_date
            )
            db.add(audit)

    db.commit()

    # 4. Generate Real System Notifications
    sample_notifications = [
        Notification(
            user_id=demo_user.id,
            title="High-Value Recovery Case Detected",
            message="Payment of ₹45,000 failed for Annual Analytics Pass. AI agent prioritized case.",
            type="alert",
            is_read=False,
            created_at=now - timedelta(minutes=15)
        ),
        Notification(
            user_id=demo_user.id,
            title="Revenue Recovered: ₹18,500",
            message="Smart payment link successfully settled by Alok Menon for Enterprise Cloud Suite.",
            type="success",
            is_read=False,
            created_at=now - timedelta(hours=2)
        ),
        Notification(
            user_id=demo_user.id,
            title="Guardrail Policy Enforced",
            message="Deterministic Consent Policy blocked automated WhatsApp dispatch for un-consented subscriber.",
            type="warning",
            is_read=False,
            created_at=now - timedelta(hours=5)
        ),
        Notification(
            user_id=demo_user.id,
            title="AI Recovery Model Active",
            message="Groq openai/gpt-oss-120b inference engine running with 99.4% optimal decision score.",
            type="info",
            is_read=True,
            created_at=now - timedelta(days=1)
        ),
        Notification(
            user_id=demo_user.id,
            title="Weekly Recovery Milestone",
            message="Total recovered revenue crossed ₹4.5L across 48 resolved customer cases.",
            type="success",
            is_read=True,
            created_at=now - timedelta(days=3)
        )
    ]
    db.add_all(sample_notifications)
    db.commit()

    print(f"Created {len(payments)} payments, {len(recovery_cases)} cases, and {len(sample_notifications)} notifications.")
    return {
        "customers_created": len(customers),
        "payments_created": len(payments),
        "recovery_cases_created": len(recovery_cases),
        "demo_user": demo_email
    }

if __name__ == "__main__":
    db = SessionLocal()
    try:
        res = seed_synthetic_data(db)
        print(f"Seed finished successfully: {res}")
    finally:
        db.close()
