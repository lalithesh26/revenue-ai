from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.models.payment import Payment
from app.schemas.customer import CustomerResponse, CustomerDetailResponse

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    search: Optional[str] = Query(None, description="Search by customer name or email"),
    consent: Optional[bool] = Query(None, description="Filter by consent status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    if search:
        query = query.filter(Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%"))
    if consent is not None:
        query = query.filter(Customer.consent_status == consent)
    
    customers = query.order_by(Customer.created_at.desc()).offset(offset).limit(limit).all()
    if not customers:
        return []

    # Batch query payments for all retrieved customers for high-performance aggregation
    customer_ids = [c.id for c in customers]
    payments = db.query(Payment).filter(Payment.customer_id.in_(customer_ids)).all()
    
    payments_by_customer = {}
    for p in payments:
        if p.customer_id not in payments_by_customer:
            payments_by_customer[p.customer_id] = []
        payments_by_customer[p.customer_id].append(p)
        
    results = []
    for c in customers:
        c_payments = payments_by_customer.get(c.id, [])
        failed_count = sum(1 for p in c_payments if p.status == "failed")
        recovered_count = sum(1 for p in c_payments if p.status == "recovered")
        total_spend = sum(p.amount for p in c_payments if p.status in ["succeeded", "recovered"])
        
        results.append(CustomerResponse.model_validate({
            "id": str(c.id),
            "name": str(c.name),
            "email": str(c.email),
            "phone": str(c.phone) if c.phone else None,
            "consent_status": bool(c.consent_status),
            "risk_score": float(c.risk_score),
            "created_at": c.created_at,
            "payments_count": len(c_payments),
            "failed_count": failed_count,
            "recovered_count": recovered_count,
            "total_spend": round(total_spend, 2)
        }))
        
    return results

@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    payments = db.query(Payment).filter(Payment.customer_id == customer_id).all()
    failed_count = sum(1 for p in payments if p.status == "failed")
    recovered_count = sum(1 for p in payments if p.status == "recovered")
    total_spend = sum(p.amount for p in payments if p.status in ["succeeded", "recovered"])

    return CustomerDetailResponse.model_validate({
        "id": str(c.id),
        "name": str(c.name),
        "email": str(c.email),
        "phone": str(c.phone) if c.phone else None,
        "consent_status": bool(c.consent_status),
        # pyrefly: ignore [bad-argument-type]
        "risk_score": float(c.risk_score),
        "created_at": c.created_at,
        "payments_count": len(payments),
        "failed_count": failed_count,
        "recovered_count": recovered_count,
        "total_spend": round(total_spend, 2)
    })
