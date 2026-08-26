from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from app.schemas.customer import CustomerResponse
from app.schemas.payment import PaymentResponse


# ------------------------------------------------------------------ #
# Recovery Pressure Schemas
# ------------------------------------------------------------------ #

class PressureFactorItem(BaseModel):
    label: str
    points: int
    detail: str


class RecoveryPressureResponse(BaseModel):
    case_id: str
    customer_id: str
    score: int
    level: str            # low | moderate | high | critical
    recommendation: str   # continue | reduce_frequency | pause | escalate
    factors: List[PressureFactorItem]
    assessed_at: Optional[datetime] = None


# Backward-compatible aliases
FatigueFactorItem = PressureFactorItem
FatigueAssessmentResponse = RecoveryPressureResponse


# ------------------------------------------------------------------ #
# Current Transaction Risk Schemas
# ------------------------------------------------------------------ #

class TransactionRiskSignalItem(BaseModel):
    category: str
    points: int
    detail: str


class TransactionRiskAssessmentResponse(BaseModel):
    payment_id: str
    customer_id: str
    score: int
    level: str            # low | moderate | high | critical
    signals: List[TransactionRiskSignalItem]
    explanation: str
    assessed_at: Optional[datetime] = None


# ------------------------------------------------------------------ #
# Agent Decision & Action Schemas
# ------------------------------------------------------------------ #

class AgentDecisionResponse(BaseModel):
    id: str
    recovery_case_id: str
    decision: str  # retry, send_payment_link, send_reminder, wait, escalate, stop
    reasoning: str
    confidence: float
    priority: str
    decision_source: Optional[str] = None
    model_used: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecoveryActionResponse(BaseModel):
    id: str
    recovery_case_id: str
    action_type: str
    status: str
    scheduled_for: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    result: Optional[str] = None
    amount_recovered: float = 0.0

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: str
    recovery_case_id: Optional[str] = None
    event_type: str
    actor: str
    description: str
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecoveryCaseBase(BaseModel):
    payment_id: str
    customer_id: str
    revenue_at_risk: float
    status: str = "open"
    assigned_action: Optional[str] = None
    priority: str = "medium"
    retry_count: int = 0


class RecoveryCaseResponse(RecoveryCaseBase):
    id: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    failure_reason: Optional[str] = None
    payment_method: Optional[str] = None
    latest_decision: Optional[str] = None
    latest_confidence: Optional[float] = None
    latest_action_status: Optional[str] = None
    amount_recovered: float = 0.0

    class Config:
        from_attributes = True


class SubscriptionInfo(BaseModel):
    id: str
    amount: float
    billing_cycle: str
    status: str
    next_billing_date: Optional[datetime] = None


class RecoveryCaseDetailResponse(RecoveryCaseResponse):
    customer: Optional[CustomerResponse] = None
    payment: Optional[PaymentResponse] = None
    subscription: Optional[SubscriptionInfo] = None
    customer_past_payments_summary: Optional[Dict[str, Any]] = None
    decisions: List[AgentDecisionResponse] = []
    actions: List[RecoveryActionResponse] = []
    audit_logs: List[AuditLogResponse] = []


class AnalyzeRequest(BaseModel):
    override_reason: Optional[str] = None


class AnalyzeResponse(BaseModel):
    recovery_case_id: str
    decision: str
    reasoning: str
    confidence: float
    priority: str
    suggested_action: str
    guardrails_precheck: Dict[str, Any]


class ExecuteRequest(BaseModel):
    action_type: Optional[str] = None  # if not provided, uses assigned_action
    force: bool = False  # override guardrail warnings if allowed (still blocks hard safety rules)


class GuardrailCheckResult(BaseModel):
    rule_name: str
    passed: bool
    message: str
    severity: str  # "BLOCKING" or "WARNING" or "INFO"


class ExecuteResponse(BaseModel):
    recovery_case_id: str
    action_type: str
    guardrail_passed: bool
    guardrail_results: List[GuardrailCheckResult]
    action_status: str
    result_message: str
    recovered_amount: float
    audit_log_id: Optional[str] = None


class PipelineStageResult(BaseModel):
    stage_id: str
    title: str
    status: str  # "completed", "blocked", "failed", "running"
    description: str
    duration_ms: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentPipelineResponse(BaseModel):
    recovery_case_id: str
    decision: AgentDecisionResponse
    guardrail_passed: bool
    guardrail_checks: List[GuardrailCheckResult]
    action_type: str
    action_status: str
    result_message: str
    recovered_amount: float
    case_final_status: str
    stages: List[PipelineStageResult]
    created_at: datetime


# ------------------------------------------------------------------ #
# Recovery Strategy Simulator Schemas
# ------------------------------------------------------------------ #

class StrategyEvaluation(BaseModel):
    strategy: str
    display_name: str
    suitability_score: int
    recovery_potential: str  # low | medium | high
    customer_impact: str    # low | medium | high
    execution_risk: str     # low | medium | high
    eligible: bool
    recommended: bool
    reasons: List[str] = []
    blockers: List[str] = []


class StrategyPressureSummary(BaseModel):
    score: int
    level: str
    recommendation: str


class StrategyRiskSummary(BaseModel):
    score: int
    level: str


class StrategySimulationRequest(BaseModel):
    strategies: Optional[List[str]] = None


class StrategySimulationResponse(BaseModel):
    case_id: str
    recovery_pressure: Optional[StrategyPressureSummary] = None
    transaction_risk: Optional[StrategyRiskSummary] = None
    fatigue: Optional[StrategyPressureSummary] = None  # backward compat
    strategies: List[StrategyEvaluation]
    recommended_strategy: Optional[str] = None
    simulation_note: str
