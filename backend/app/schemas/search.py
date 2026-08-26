from pydantic import BaseModel
from typing import List, Optional

class SearchItem(BaseModel):
    id: str
    title: str
    subtitle: str
    badge: str
    badge_variant: str  # "success", "warning", "danger", "info", "purple"
    type: str  # "recovery-cases", "customers", "payments"
    target_id: str

class SearchResponse(BaseModel):
    query: str
    total_results: int
    recovery_cases: List[SearchItem]
    customers: List[SearchItem]
    payments: List[SearchItem]
