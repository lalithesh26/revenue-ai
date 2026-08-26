from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.recovery_case import RecoveryCase
from app.models.customer import Customer
from app.models.payment import Payment
from app.schemas.search import SearchResponse, SearchItem

router = APIRouter(prefix="/search", tags=["Universal Search"])

@router.get("", response_model=SearchResponse)
def universal_search(
    q: str = Query("", description="Search term across cases, customers, and payments"),
    db: Session = Depends(get_db)
):
    """Performs unified search across Recovery Cases, Customers, and Payments."""
    query_str = q.strip()
    if not query_str:
        return {
            "query": "",
            "total_results": 0,
            "recovery_cases": [],
            "customers": [],
            "payments": []
        }
    
    search_pattern = f"%{query_str}%"
    
    # 1. Search Customers
    customers = db.query(Customer).filter(
        or_(
            Customer.name.ilike(search_pattern),
            Customer.email.ilike(search_pattern),
            Customer.phone.ilike(search_pattern),
            Customer.id.ilike(search_pattern)
        )
    ).limit(8).all()
    
    customer_items = []
    for c in customers:
        customer_items.append(
            SearchItem(
                id=c.id,
                title=c.name,
                subtitle=f"{c.email} · Risk: {int(c.risk_score * 100)}%",
                badge="Consent Active" if c.consent_status else "Consent Missing",
                badge_variant="success" if c.consent_status else "danger",
                type="customers",
                target_id=c.id
            )
        )

    # 2. Search Recovery Cases (joined with Customer and Payment)
    cases = db.query(RecoveryCase).join(Customer).join(Payment).filter(
        or_(
            RecoveryCase.id.ilike(search_pattern),
            RecoveryCase.payment_id.ilike(search_pattern),
            RecoveryCase.customer_id.ilike(search_pattern),
            RecoveryCase.status.ilike(search_pattern),
            Payment.failure_reason.ilike(search_pattern),
            Payment.payment_method.ilike(search_pattern),
            Customer.name.ilike(search_pattern),
            Customer.email.ilike(search_pattern)
        )
    ).limit(8).all()
    
    case_items = []
    for rc in cases:
        badge_variant = "success" if rc.status == "recovered" else ("danger" if rc.priority in ["high", "critical"] else "warning")
        cust_name = rc.customer.name if rc.customer else "Customer"
        fail_reason = (rc.payment.failure_reason if rc.payment else None) or "Payment Failure"
        case_items.append(
            SearchItem(
                id=rc.id,
                title=f"Case #{rc.id[:8]} · {cust_name}",
                subtitle=f"₹{int(rc.revenue_at_risk):,} · {fail_reason}",
                badge=rc.status.upper(),
                badge_variant=badge_variant,
                type="recovery-cases",
                target_id=rc.id
            )
        )

    # 3. Search Payments
    payments = db.query(Payment).join(Customer).filter(
        or_(
            Payment.id.ilike(search_pattern),
            Payment.failure_reason.ilike(search_pattern),
            Payment.payment_method.ilike(search_pattern),
            Payment.status.ilike(search_pattern),
            Customer.name.ilike(search_pattern)
        )
    ).limit(8).all()
    
    payment_items = []
    for p in payments:
        badge_variant = "success" if p.status in ["succeeded", "recovered"] else "danger"
        cust_name = p.customer.name if p.customer else "Customer"
        payment_items.append(
            SearchItem(
                id=p.id,
                title=f"Payment #{p.id[:8]} · {cust_name}",
                subtitle=f"₹{int(p.amount):,} · {p.payment_method.replace('_', ' ').title()}",
                badge=p.status.upper(),
                badge_variant=badge_variant,
                type="payments",
                target_id=p.id
            )
        )

    total = len(customer_items) + len(case_items) + len(payment_items)
    
    return {
        "query": query_str,
        "total_results": total,
        "recovery_cases": case_items,
        "customers": customer_items,
        "payments": payment_items
    }
