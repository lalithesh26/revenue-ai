from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.payment import Payment
from app.models.customer import Customer
from app.schemas.payment import PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])

def _format_payment_response(p: Payment) -> PaymentResponse:
    customer_name = p.customer.name if p.customer else None
    customer_email = p.customer.email if p.customer else None
    return PaymentResponse.model_validate({
        "id": str(p.id),
        "customer_id": str(p.customer_id),
        "amount": float(p.amount),
        "currency": str(p.currency),
        "status": str(p.status),
        "failure_code": str(p.failure_code) if p.failure_code else None,
        "failure_reason": str(p.failure_reason) if p.failure_reason else None,
        "payment_method": str(p.payment_method),
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "customer_name": customer_name,
        "customer_email": customer_email,
    })

@router.get("", response_model=List[PaymentResponse])
def get_payments(
    status: Optional[str] = Query(None, description="Filter by payment status (succeeded, failed, pending, recovered)"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Payment).join(Customer)
    if status:
        query = query.filter(Payment.status == status)
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)
    
    payments = query.order_by(Payment.created_at.desc()).offset(offset).limit(limit).all()
    
    return [_format_payment_response(p) for p in payments]

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return _format_payment_response(p)
