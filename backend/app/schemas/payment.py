from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class PaymentBase(BaseModel):
    customer_id: str
    amount: float
    currency: str = "INR"
    status: str = "pending"
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    payment_method: str = "credit_card"

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    created_at: datetime
    updated_at: datetime
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

    class Config:
        from_attributes = True
