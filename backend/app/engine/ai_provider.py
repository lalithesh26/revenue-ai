import os
import json
import logging
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ValidationError

from app.config import settings

logger = logging.getLogger(__name__)

class AgentActionEnum(str, Enum):
    RETRY = "retry"
    SEND_PAYMENT_LINK = "send_payment_link"
    SEND_REMINDER = "send_reminder"
    WAIT = "wait"
    ESCALATE = "escalate"
    STOP = "stop"

class AgentPriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AgentContext(BaseModel):
    """
    Rich, structured, read-only snapshot provided to the AI Agent.
    The AI Agent reasons across both Transaction Risk and Recovery Pressure signals to choose ONE optimal strategy.
    """
    payment_id: str
    amount: float
    currency: str = "INR"
    payment_method: str
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    
    # Customer Context
    customer_id: str
    customer_name: str
    customer_email: str
    consent_status: bool = True
    risk_score: float = 0.15
    customer_lifetime_value: float = 0.0
    customer_payment_success_rate: float = 100.0
    past_payments_count: int = 0
    
    # Subscription Context
    subscription_id: Optional[str] = None
    subscription_status: Optional[str] = None
    subscription_amount: Optional[float] = None
    billing_cycle: Optional[str] = None
    
    # Recovery Context
    retry_count: int = 0
    previous_recovery_actions: List[Dict[str, Any]] = []
    case_status: str = "open"

    # Current Transaction Risk Context (assessed by TransactionRiskEngine)
    transaction_risk: Optional[Dict[str, Any]] = None

    # Recovery Pressure Context (assessed by RecoveryPressureEngine)
    recovery_pressure: Optional[Dict[str, Any]] = None
    recovery_fatigue: Optional[Dict[str, Any]] = None  # backward-compatible alias
    
    # Read-only tool descriptors accessible by the agent
    read_only_tools: List[str] = [
        "get_payment_details",
        "get_customer_history",
        "get_subscription_details",
        "get_previous_recovery_attempts"
    ]

class AgentDecisionOutput(BaseModel):
    """
    Strict, validated JSON schema output returned by the AI Agent.
    Must be validated BEFORE reaching the GuardrailEngine.
    """
    action: AgentActionEnum = Field(description="The chosen recovery action")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in model recommendation (0.0 to 1.0)")
    reasoning: str = Field(description="Detailed contextual reasoning explaining the strategic choice")
    priority: AgentPriorityEnum = Field(default=AgentPriorityEnum.MEDIUM, description="Urgency priority level")
    decision_source: str = Field(default="REAL_LLM", description="Source of decision: 'REAL_LLM' or 'HEURISTIC_FALLBACK'")
    model_used: Optional[str] = Field(default=None, description="Exact AI model utilized")

class AIRecoveryDecisionProvider(ABC):
    """Abstract interface for AI Recovery Strategy Decision Providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    def evaluate_recovery(self, context: AgentContext) -> AgentDecisionOutput:
        """Evaluates customer and payment context and returns a validated AgentDecisionOutput."""
        pass

class HeuristicFallbackProvider(AIRecoveryDecisionProvider):
    """
    Deterministic expert heuristic decision provider.
    Ensures 100% operational resilience, instant local execution, and zero external downtime.
    """

    @property
    def provider_name(self) -> str:
        return "heuristic_fallback"

    def evaluate_recovery(self, context: AgentContext) -> AgentDecisionOutput:
        failure_reason = (context.failure_reason or "").lower()
        failure_code = (context.failure_code or "").lower()
        consent_status = context.consent_status
        amount = context.amount
        retry_count = context.retry_count
        ltv = context.customer_lifetime_value
        success_rate = context.customer_payment_success_rate

        # Check transaction risk and recovery pressure
        risk_info = context.transaction_risk or {}
        risk_level = risk_info.get("level", "low")
        pressure_info = context.recovery_pressure or context.recovery_fatigue or {}
        pressure_level = pressure_info.get("level", "low")

        # Rule 1: Consent Revocation (Strict compliance)
        if not consent_status:
            return AgentDecisionOutput(
                action=AgentActionEnum.STOP,
                confidence=0.99,
                reasoning="Customer communication consent is revoked. In accordance with data privacy regulations, all automated recovery actions are stopped.",
                priority=AgentPriorityEnum.LOW,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Rule 2: Max Retries Exceeded (Strict velocity limit)
        if retry_count >= settings.MAX_RECOVERY_RETRIES:
            return AgentDecisionOutput(
                action=AgentActionEnum.ESCALATE,
                confidence=0.96,
                reasoning=f"Payment has reached the maximum allowable automated retry limit ({retry_count}/{settings.MAX_RECOVERY_RETRIES}). Escalating to operations specialists.",
                priority=AgentPriorityEnum.CRITICAL,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Rule 3: High Security / Fraud Risk Signals
        if risk_level in ("high", "critical") or any(term in failure_reason or term in failure_code for term in ["stolen", "lost", "fraud", "security", "unauthorized"]):
            return AgentDecisionOutput(
                action=AgentActionEnum.ESCALATE,
                confidence=0.95,
                reasoning="Elevated transaction risk or security decline signals detected on current payment. Escalating to human compliance team for manual review.",
                priority=AgentPriorityEnum.CRITICAL,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Rule 4: Expired Card
        if any(term in failure_reason or term in failure_code for term in ["expired", "card_expired", "expiry"]):
            return AgentDecisionOutput(
                action=AgentActionEnum.SEND_PAYMENT_LINK,
                confidence=0.94,
                reasoning="Card validity expired at issuing bank. Automated retries on the identical card token will fail; requesting updated payment method via secure hosted payment link.",
                priority=AgentPriorityEnum.HIGH if amount >= 8000 else AgentPriorityEnum.MEDIUM,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Rule 5: Transient Bank Outage / Network Timeout
        if any(term in failure_reason or term in failure_code for term in ["timeout", "downtime", "network", "bank_unavailable", "gateway_error", "bank timeout", "bank downtime", "temporary"]):
            if pressure_level == "critical":
                return AgentDecisionOutput(
                    action=AgentActionEnum.WAIT,
                    confidence=0.88,
                    reasoning="Temporary bank timeout with critical recovery pressure. Scheduling a 24-hour cooling period before executing controlled retry.",
                    priority=AgentPriorityEnum.MEDIUM,
                    decision_source="HEURISTIC_FALLBACK",
                    model_used="deterministic_rules_v1"
                )
            return AgentDecisionOutput(
                action=AgentActionEnum.RETRY,
                confidence=0.92,
                reasoning="Temporary issuing bank gateway downtime or connection timeout with low transaction risk. Scheduling smart retry via secondary route.",
                priority=AgentPriorityEnum.HIGH if amount >= 10000 else AgentPriorityEnum.MEDIUM,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Rule 6: Insufficient Funds
        if any(term in failure_reason or term in failure_code for term in ["insufficient", "funds", "low_balance"]):
            if ltv >= 15000 or success_rate >= 85:
                return AgentDecisionOutput(
                    action=AgentActionEnum.SEND_REMINDER,
                    confidence=0.88,
                    reasoning=f"High-value subscriber (LTV ₹{ltv:,.2f}, {success_rate:.0f}% past success rate) encountered temporary insufficient balance. Sending polite recovery reminder.",
                    priority=AgentPriorityEnum.HIGH,
                    decision_source="HEURISTIC_FALLBACK",
                    model_used="deterministic_rules_v1"
                )
            else:
                return AgentDecisionOutput(
                    action=AgentActionEnum.RETRY,
                    confidence=0.82,
                    reasoning="Insufficient funds encountered on initial attempt. Smart retry scheduled during optimal debit processing window.",
                    priority=AgentPriorityEnum.MEDIUM,
                    decision_source="HEURISTIC_FALLBACK",
                    model_used="deterministic_rules_v1"
                )

        # Rule 7: 3DS / OTP Authentication Abandonment
        if any(term in failure_reason or term in failure_code for term in ["auth", "authentication", "abandoned", "otp", "user_abandonment", "3ds"]):
            return AgentDecisionOutput(
                action=AgentActionEnum.SEND_PAYMENT_LINK,
                confidence=0.89,
                reasoning="Customer abandoned 3D Secure / OTP verification. Dispatching streamlined 1-click payment link to facilitate checkout completion.",
                priority=AgentPriorityEnum.MEDIUM,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Rule 8: Payment Method Decline / Mandate Revoked
        if any(term in failure_reason or term in failure_code for term in ["mandate", "declined", "payment_method", "invalid_card"]):
            return AgentDecisionOutput(
                action=AgentActionEnum.SEND_PAYMENT_LINK,
                confidence=0.87,
                reasoning=f"Payment instrument ({context.payment_method}) was declined by card network. Recommending alternative payment method hosted link.",
                priority=AgentPriorityEnum.MEDIUM,
                decision_source="HEURISTIC_FALLBACK",
                model_used="deterministic_rules_v1"
            )

        # Default Fallback Strategy
        priority = AgentPriorityEnum.HIGH if amount >= 15000 else AgentPriorityEnum.MEDIUM
        return AgentDecisionOutput(
            action=AgentActionEnum.RETRY,
            confidence=0.80,
            reasoning=f"Standard decline processed for {context.payment_method}. Recommending smart retry via alternative gateway node.",
            priority=priority,
            decision_source="HEURISTIC_FALLBACK",
            model_used="deterministic_rules_v1"
        )

class LLMRecoveryDecisionProvider(AIRecoveryDecisionProvider):
    """
    Provider-agnostic LLM Recovery Decision Provider.
    Connects to Groq, OpenAI, Gemini, or generic OpenAI-compatible API endpoints.
    Enforces strict Pydantic output validation and reports whether REAL_LLM or HEURISTIC_FALLBACK was used.
    """

    def __init__(self):
        self.fallback = HeuristicFallbackProvider()

    @property
    def provider_name(self) -> str:
        return f"llm_{settings.AI_PROVIDER}"

    def _build_system_prompt(self) -> str:
        return (
            "You are RecoverAI, an expert AI Revenue Recovery Decision Engine for a modern fintech platform.\n"
            "Your task is to analyze failed payment transactions, synthesize CURRENT transaction risk and recent recovery pressure, "
            "and choose ONE optimal recovery strategy from the allowed actions.\n\n"
            "ALLOWED ACTIONS:\n"
            "- retry: Smart automated retry via secondary gateway route (best for transient bank timeouts/network drops with low transaction risk).\n"
            "- send_payment_link: Generate 1-click hosted payment link (best for expired cards, 3DS abandonment, invalid payment methods).\n"
            "- send_reminder: Polite notification reminder (best for high LTV subscribers with temporary insufficient balance).\n"
            "- wait: Delay action / cooling-off period (best when recovery pressure is critical or transaction is under bank review).\n"
            "- escalate: Escalate to human operations specialist (best for high transaction risk, fraud flags, or retry limit threshold).\n"
            "- stop: Terminate recovery immediately (MANDATORY if consent_status is false or customer opted out).\n\n"
            "DECISION SIGNALS & REASONING PRINCIPLES:\n"
            "1. RECOVERY PRESSURE: Measures recent automated recovery activity and outreach density. It does NOT measure customer emotions.\n"
            "   - High or Critical pressure is a decision signal to avoid spamming, but does NOT unconditionally block legitimate retries.\n"
            "2. TRANSACTION RISK: Measures observable risk signals for the CURRENT transaction (amount anomalies, security codes, 3DS flags).\n"
            "   - High risk strongly favors 'escalate'. Low risk favors automated recovery.\n"
            "3. SYNTHESIZE BOTH SIGNALS:\n"
            "   - CASE A: High Pressure + Low Risk + Bank Timeout -> recommend 'retry' (or 'wait' if cooling off).\n"
            "   - CASE B: High Pressure + High Risk + Auth Failure -> recommend 'escalate'.\n"
            "   - CASE C: Low Pressure + Low Risk + Card Expired -> recommend 'send_payment_link'.\n"
            "   - CASE D: Critical Pressure + Low Risk + Bank Timeout -> consider 'wait' or controlled 'retry' (do NOT automatically block).\n\n"
            "STRICT RULES:\n"
            "1. You MUST NEVER choose an action outside the allowed actions list.\n"
            "2. You CANNOT execute transactions or modify amounts. You only reason and recommend.\n"
            "3. If consent_status is false, you MUST choose 'stop'.\n"
            "4. If retry_count >= 3, you MUST choose 'escalate'.\n"
            "5. Return ONLY a valid JSON object matching the requested schema:\n"
            "{\n"
            '  "action": "send_payment_link" | "retry" | "send_reminder" | "wait" | "escalate" | "stop",\n'
            '  "confidence": 0.0 - 1.0,\n'
            '  "reasoning": "...",\n'
            '  "priority": "low" | "medium" | "high" | "critical"\n'
            "}"
        )

    def evaluate_recovery(self, context: AgentContext) -> AgentDecisionOutput:
        api_key = settings.AI_API_KEY.strip()
        provider = settings.AI_PROVIDER
        model = settings.AI_MODEL
        base_url = (settings.AI_BASE_URL or "https://api.groq.com/openai/v1").rstrip("/")

        if not api_key or provider == "heuristic":
            logger.info("AI_API_KEY not configured or AI_PROVIDER=heuristic. Using HEURISTIC_FALLBACK.")
            return self.fallback.evaluate_recovery(context)

        system_prompt = self._build_system_prompt()
        user_prompt = f"Analyze this recovery case context and recommend the optimal strategy:\n\n{json.dumps(context.model_dump(), indent=2)}"

        url = f"{base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "RecoverAI-Agent/2.0 (Fintech-Revenue-Recovery)"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode("utf-8")
                res_data = json.loads(res_body)
                content = res_data["choices"][0]["message"]["content"]
                
                # Strict Pydantic schema validation
                parsed = json.loads(content)
                decision = AgentDecisionOutput(
                    action=parsed.get("action"),
                    confidence=float(parsed.get("confidence", 0.85)),
                    reasoning=parsed.get("reasoning", "LLM formulated recovery recommendation."),
                    priority=parsed.get("priority", "medium"),
                    decision_source="REAL_LLM",
                    model_used=model
                )
                logger.info(f"REAL_LLM ({model}) successfully evaluated case: action={decision.action}, confidence={decision.confidence}")
                return decision

        except urllib.error.HTTPError as e:
            error_category = "unknown_http_error"
            if e.code == 401:
                error_category = "authentication_failure (invalid API key)"
            elif e.code == 404:
                error_category = f"invalid_model or invalid_endpoint (model '{model}' not found)"
            elif e.code == 429:
                error_category = "rate_limit_exceeded"
            elif e.code == 400:
                error_category = "malformed_request"
            
            logger.warning(f"REAL_LLM call failed with HTTP {e.code} [{error_category}]. Falling back safely to HEURISTIC_FALLBACK.")
            fallback_res = self.fallback.evaluate_recovery(context)
            fallback_res.reasoning = f"[Fallback: {error_category}] {fallback_res.reasoning}"
            return fallback_res

        except urllib.error.URLError as e:
            logger.warning(f"REAL_LLM call failed with network error [{e.reason}]. Falling back safely to HEURISTIC_FALLBACK.")
            fallback_res = self.fallback.evaluate_recovery(context)
            fallback_res.reasoning = f"[Fallback: network_failure] {fallback_res.reasoning}"
            return fallback_res

        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"REAL_LLM response validation failed [structured_output_failure]. Falling back safely to HEURISTIC_FALLBACK.")
            fallback_res = self.fallback.evaluate_recovery(context)
            fallback_res.reasoning = f"[Fallback: structured_output_failure] {fallback_res.reasoning}"
            return fallback_res

        except Exception as e:
            logger.warning(f"REAL_LLM unexpected error [{type(e).__name__}]. Falling back safely to HEURISTIC_FALLBACK.")
            fallback_res = self.fallback.evaluate_recovery(context)
            return fallback_res

def get_ai_decision_provider() -> AIRecoveryDecisionProvider:
    if settings.AI_PROVIDER != "heuristic" and settings.AI_API_KEY:
        return LLMRecoveryDecisionProvider()
    return HeuristicFallbackProvider()
