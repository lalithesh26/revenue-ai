from typing import Optional
from pydantic import BaseModel

class SeedRequest(BaseModel):
    num_customers: int = 100
    num_payments: int = 300
    reset_existing: bool = True

class SeedResponse(BaseModel):
    message: str
    customers_created: int
    payments_created: int
    recovery_cases_created: int

class SimulateFailureRequest(BaseModel):
    customer_id: Optional[str] = None
    amount: Optional[float] = None
    failure_reason: Optional[str] = None
    payment_method: Optional[str] = None

class SimulateRecoveryRequest(BaseModel):
    recovery_case_id: str
    payment_link_paid: bool = True
