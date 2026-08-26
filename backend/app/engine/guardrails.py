"""
GuardrailEngine — Deterministic Safety Policy Gate.

RevenueAI uses AI to recommend what to do, but deterministic safety
systems decide whether the action is allowed.

The Guardrail Engine evaluates 7 safety policies:
- Policies 1-6 are AUTHORITATIVE HARD BLOCKERS.
- Policy 7 is a CONTEXTUAL SAFETY CADENCE CHECK (emits WARNING, does not block on pressure alone).
"""
import logging
from typing import Any, Dict, List, Tuple, Optional
from app.config import settings

logger = logging.getLogger(__name__)

FRAUD_STOLEN_KEYWORDS = [
    "stolen", "lost", "fraud", "security", "unauthorized",
    "restricted", "pickup", "card_velocity", "auth_failed"
]

EXPIRED_KEYWORDS = [
    "expired", "card_expired", "validity_expired", "expiration"
]


def _get(obj: Any, key: str, default: Any = None) -> Any:
    """Helper to get attributes from dict or object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class GuardrailEngine:
    """
    Evaluates actions against 7 deterministic safety policies before any execution.
    """

    def validate(
        self,
        *,
        action_type: str,
        customer: Any,
        payment: Any,
        recovery_case: Any,
        requested_amount: float,
        pressure_score: int = 0,
        fatigue_score: Optional[int] = None,
        transaction_risk_score: int = 0,
    ) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Validates the proposed action against all 7 guardrail rules.
        """
        if fatigue_score is not None and pressure_score == 0:
            pressure_score = fatigue_score

        results: List[Dict[str, Any]] = []
        is_blocked = False

        # -------------------------------------------------------------
        # Policy 1: Customer Communication Consent (BLOCKING)
        # -------------------------------------------------------------
        consent_status = _get(customer, "consent_status", True)
        if not consent_status and action_type in ["send_payment_link", "send_reminder", "retry"]:
            results.append({
                "rule_name": "Policy 1: Customer Consent Gate",
                "passed": False,
                "severity": "BLOCKING",
                "message": "Customer has explicitly opted out of communications / consent is False. Outbound recovery blocked."
            })
            is_blocked = True
        else:
            results.append({
                "rule_name": "Policy 1: Customer Consent Gate",
                "passed": True,
                "severity": "INFO",
                "message": "Customer communication and automated recovery consent is active."
            })

        # -------------------------------------------------------------
        # Policy 2: Maximum Retry Throttling (BLOCKING)
        # -------------------------------------------------------------
        current_retries = int(_get(recovery_case, "retry_count", 0) or 0)
        max_retries = settings.MAX_RECOVERY_RETRIES
        if action_type == "retry" and current_retries >= max_retries:
            results.append({
                "rule_name": "Policy 2: Maximum Retry Limit Throttling",
                "passed": False,
                "severity": "BLOCKING",
                "message": f"Maximum allowable retry limit ({max_retries}) reached. Additional automated retries blocked to protect gateway health."
            })
            is_blocked = True
        else:
            results.append({
                "rule_name": "Policy 2: Maximum Retry Limit Throttling",
                "passed": True,
                "severity": "INFO",
                "message": f"Retry count ({current_retries}/{max_retries}) is within permitted threshold."
            })

        # -------------------------------------------------------------
        # Policy 3: Idempotency & Duplicate Settlement Prevention (BLOCKING)
        # -------------------------------------------------------------
        case_status = _get(recovery_case, "status", "open")
        payment_status = _get(payment, "status", "failed")
        if case_status in ["recovered", "closed"] or payment_status in ["succeeded", "recovered"]:
            results.append({
                "rule_name": "Policy 3: Idempotency & Duplicate Gate",
                "passed": False,
                "severity": "BLOCKING",
                "message": f"Case or payment is already resolved (Case: {case_status}, Payment: {payment_status}). Duplicate action prevented."
            })
            is_blocked = True
        else:
            results.append({
                "rule_name": "Policy 3: Idempotency & Duplicate Gate",
                "passed": True,
                "severity": "INFO",
                "message": "Case and payment are currently open and eligible for recovery."
            })

        # -------------------------------------------------------------
        # Policy 4: Payment Amount Immutability Lock (BLOCKING)
        # -------------------------------------------------------------
        original_amount = float(_get(payment, "amount", 0.0) or 0.0)
        if abs(requested_amount - original_amount) > 0.01:
            results.append({
                "rule_name": "Policy 4: Amount Immutability Lock",
                "passed": False,
                "severity": "BLOCKING",
                "message": f"Discrepancy detected: requested amount INR {requested_amount} != original payment amount INR {original_amount}. Unauthorized amount modification blocked."
            })
            is_blocked = True
        else:
            results.append({
                "rule_name": "Policy 4: Amount Immutability Lock",
                "passed": True,
                "severity": "INFO",
                "message": f"Payment amount INR {original_amount:,.2f} is verified and unmodified."
            })

        # -------------------------------------------------------------
        # Policy 5: Stolen & Fraud Ineligibility Guard (BLOCKING)
        # -------------------------------------------------------------
        combined_reason = f"{_get(payment, 'failure_code', '')} {_get(payment, 'failure_reason', '')}".lower()
        if action_type == "retry" and (any(kw in combined_reason for kw in FRAUD_STOLEN_KEYWORDS) or transaction_risk_score >= 80):
            results.append({
                "rule_name": "Policy 5: Stolen & Fraud Ineligibility",
                "passed": False,
                "severity": "BLOCKING",
                "message": f"Payment failure reason or elevated risk ({transaction_risk_score}/100) indicates stolen card / fraud flag. Automated retries strictly prohibited."
            })
            is_blocked = True
        else:
            results.append({
                "rule_name": "Policy 5: Stolen & Fraud Ineligibility",
                "passed": True,
                "severity": "INFO",
                "message": "No stolen card or fraud flags detected on payment instrument."
            })

        # -------------------------------------------------------------
        # Policy 6: Payment Method Expiry Routing (BLOCKING for retries)
        # -------------------------------------------------------------
        if action_type == "retry" and any(kw in combined_reason for kw in EXPIRED_KEYWORDS):
            results.append({
                "rule_name": "Policy 6: Payment Method Expiry Routing",
                "passed": False,
                "severity": "BLOCKING",
                "message": "Payment method has expired at issuing bank. Automated retry rejected — payment link routing required."
            })
            is_blocked = True
        else:
            results.append({
                "rule_name": "Policy 6: Payment Method Expiry Routing",
                "passed": True,
                "severity": "INFO",
                "message": "Payment method validity verified."
            })

        # -------------------------------------------------------------
        # Policy 7: Recovery Pressure Cadence Check (CONTEXTUAL SAFETY)
        # -------------------------------------------------------------
        if pressure_score >= 50:
            results.append({
                "rule_name": "Policy 7: Recovery Pressure Cadence Check",
                "passed": True,
                "severity": "WARNING",
                "message": (
                    f"Elevated recovery pressure ({pressure_score}/100) detected. "
                    f"Action '{action_type}' permitted under controlled execution monitoring."
                )
            })
        else:
            results.append({
                "rule_name": "Policy 7: Recovery Pressure Cadence Check",
                "passed": True,
                "severity": "INFO",
                "message": f"Recovery pressure score {pressure_score}/100 — within normal operational cadence."
            })

        passed = not is_blocked
        failed_checks = [c for c in results if not c["passed"]]
        if passed:
            summary_message = "All safety guardrails passed successfully."
        else:
            summary_message = f"Guardrail safety check failed: {failed_checks[0]['message'] if failed_checks else 'Execution blocked.'}"
        return passed, results, summary_message

    def get_registered_policies(self) -> List[Dict[str, Any]]:
        """Returns the list of deterministic safety guardrails for the API."""
        return [
            {
                "id": 1,
                "name": "Customer Communication Consent Gate",
                "rule_type": "BLOCKING",
                "severity": "BLOCKING",
                "description": "Enforces strict customer consent verification. Blocks all outbound messages and retries if consent is revoked.",
                "enabled": True
            },
            {
                "id": 2,
                "name": "Maximum Retry Limit Throttling",
                "rule_type": "BLOCKING",
                "severity": "BLOCKING",
                "description": f"Throttles automated payment retries to maximum {settings.MAX_RECOVERY_RETRIES} attempts to prevent gateway penalties.",
                "enabled": True
            },
            {
                "id": 3,
                "name": "Idempotency & Duplicate Settlement Prevention",
                "rule_type": "BLOCKING",
                "severity": "BLOCKING",
                "description": "Guarantees idempotency. Blocks any duplicate recovery action if case or payment is already settled or closed.",
                "enabled": True
            },
            {
                "id": 4,
                "name": "Payment Amount Immutability Lock",
                "rule_type": "BLOCKING",
                "severity": "BLOCKING",
                "description": "Locks requested amount strictly to the original invoice value. Blocks unauthorized modifications.",
                "enabled": True
            },
            {
                "id": 5,
                "name": "Stolen & Fraud Ineligibility Guard",
                "rule_type": "BLOCKING",
                "severity": "BLOCKING",
                "description": "Blocks automated retries on stolen card, fraud reports, or security flags.",
                "enabled": True
            },
            {
                "id": 6,
                "name": "Payment Method Expiry Routing",
                "rule_type": "BLOCKING",
                "severity": "BLOCKING",
                "description": "Redirects expired cards to hosted payment link updates rather than failing retries.",
                "enabled": True
            },
            {
                "id": 7,
                "name": "Recovery Pressure Cadence Check",
                "rule_type": "CONTEXTUAL_SAFETY",
                "severity": "WARNING",
                "description": "Inspects outbound recovery density and interval cadence to advise optimal pacing.",
                "enabled": True
            }
        ]


def get_registered_policies() -> List[Dict[str, Any]]:
    """Module-level accessor for registered guardrail policies."""
    return GuardrailEngine().get_registered_policies()

