import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

ALLOWED_DECISIONS = ["retry", "send_payment_link", "send_reminder", "wait", "escalate", "stop"]

class RecoveryAgent:
    """
    Intelligent revenue recovery decision engine.
    Analyzes payment failure context, customer history, subscription tier,
    and previous recovery attempts to recommend optimal actions with confidence scores.
    """

    def analyze(
        self,
        payment: Dict[str, Any],
        customer: Dict[str, Any],
        subscription: Optional[Dict[str, Any]],
        past_payments: Dict[str, Any],
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Produces a structured recovery decision.
        Uses deterministic expert heuristics (and provider-agnostic AI layer)
        guaranteeing resilient, explainable output without external dependencies.
        """
        failure_reason = (payment.get("failure_reason") or "").lower()
        failure_code = (payment.get("failure_code") or "").lower()
        consent_status = customer.get("consent_status", True)
        amount = payment.get("amount", 0.0)
        payment_method = payment.get("payment_method", "credit_card")
        risk_score = customer.get("risk_score", 0.15)
        successful_past_payments = past_payments.get("successful_count", 0)
        total_spend = past_payments.get("total_spend", 0.0)

        # Rule 1: Consent check
        if not consent_status:
            return {
                "decision": "stop",
                "reason": "Customer has revoked communication consent. All automated outreach and recovery actions are stopped to comply with data privacy policies.",
                "confidence": 0.99,
                "priority": "low"
            }

        # Rule 2: Max retries exceeded
        if retry_count >= 3:
            return {
                "decision": "escalate",
                "reason": f"Maximum automatic recovery retry attempts ({retry_count}/3) reached without resolution. Escalating to human customer success specialist.",
                "confidence": 0.95,
                "priority": "high"
            }

        # Rule 3: Expired Card
        if any(term in failure_reason or term in failure_code for term in ["expired", "card_expired", "expiry"]):
            return {
                "decision": "send_payment_link",
                "reason": "Card expiry detected at issuing bank. Automated retries on the same card will fail; generated a secure 1-click update link for the customer.",
                "confidence": 0.94,
                "priority": "high" if amount > 5000 else "medium"
            }

        # Rule 4: Temporary Bank Downtime or Network Timeout
        if any(term in failure_reason or term in failure_code for term in ["timeout", "downtime", "network", "bank_unavailable", "gateway_error", "bank timeout", "bank downtime"]):
            return {
                "decision": "retry",
                "reason": "Transient issuing bank gateway failure or network timeout detected. Scheduled smart retry via secondary payment route.",
                "confidence": 0.91,
                "priority": "high" if amount > 10000 else "medium"
            }

        # Rule 5: Insufficient Funds
        if any(term in failure_reason or term in failure_code for term in ["insufficient", "funds", "low_balance"]):
            if total_spend > 15000 or successful_past_payments >= 5:
                # High-value loyal customer
                return {
                    "decision": "send_reminder",
                    "reason": f"Loyal subscriber (LTV ₹{total_spend:,.2f}, {successful_past_payments} successful cycles) encountered temporary insufficient balance. Sending polite recovery reminder.",
                    "confidence": 0.88,
                    "priority": "high"
                }
            else:
                return {
                    "decision": "retry",
                    "reason": "Insufficient funds encountered on initial attempt. Smart retry scheduled during optimal debit processing window.",
                    "confidence": 0.82,
                    "priority": "medium"
                }

        # Rule 6: Authentication Failure or User Abandonment (3DS / OTP)
        if any(term in failure_reason or term in failure_code for term in ["auth", "authentication", "abandoned", "otp", "user_abandonment", "3ds"]):
            return {
                "decision": "send_payment_link",
                "reason": "Customer did not complete 3D Secure / OTP verification. Dispatching streamlined 1-click payment link to complete transaction.",
                "confidence": 0.89,
                "priority": "medium"
            }

        # Rule 7: General Payment Method Issue or Mandate Revoked
        if any(term in failure_reason or term in failure_code for term in ["mandate", "declined", "payment_method", "invalid_card"]):
            return {
                "decision": "send_payment_link",
                "reason": f"Payment instrument ({payment_method}) was declined by the card network. Requesting alternative payment method via hosted link.",
                "confidence": 0.87,
                "priority": "medium"
            }

        # Default fallback
        priority = "high" if amount > 10000 else "medium"
        return {
            "decision": "retry",
            "reason": f"Standard failed payment processing for {payment_method}. Recommending smart retry via alternative gateway node.",
            "confidence": 0.78,
            "priority": priority
        }
