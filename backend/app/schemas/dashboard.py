from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.recovery import RecoveryCaseResponse, AuditLogResponse, AgentDecisionResponse

class DashboardSummaryResponse(BaseModel):
    total_revenue_at_risk: float
    total_revenue_recovered: float
    recovery_rate_pct: float
    open_recovery_cases_count: int
    total_failed_payments_count: int
    successful_recoveries_count: int
    total_payments_count: int
    total_customers_count: int
    
    # Distributions for UI charts
    failure_reasons_breakdown: List[Dict[str, Any]]
    recovery_by_method_breakdown: List[Dict[str, Any]]
    recent_agent_decisions: List[AgentDecisionResponse]
    recent_audit_logs: List[AuditLogResponse]
    recovery_fatigue_breakdown: Optional[Dict[str, int]] = None

