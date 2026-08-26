from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    consent_status: bool = True
    risk_score: float = 0.15

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: str
    created_at: datetime
    payments_count: int = 0
    failed_count: int = 0
    recovered_count: int = 0
    total_spend: float = 0.0

    class Config:
        from_attributes = True

class CustomerDetailResponse(CustomerResponse):
    pass
