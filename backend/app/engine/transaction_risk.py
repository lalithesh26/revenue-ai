"""
TransactionRiskEngine — Current Transaction Risk Evaluator.

Evaluates observable risk signals for the CURRENT payment transaction.
Does not claim to be an external fraud prediction model; instead,
computes an explainable, auditable risk score from actual observable data.

Risk Signals Evaluated:
1. Failure code severity (e.g. auth failed, stolen card, high-risk decline)
2. Amount anomalies vs typical baseline
3. Customer risk score & past chargeback/dispute flags
4. Rapid velocity / repeat attempts within short window
5. Payment instrument flags (e.g. international, unverified card)
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Failure keywords associated with elevated transaction risk
HIGH_RISK_FAILURE_KEYWORDS = [
    "stolen", "lost", "fraud", "security", "unauthorized",
    "restricted", "pickup", "card_velocity", "auth_failed", "authentication_failed", "flagged"
]

MODERATE_RISK_FAILURE_KEYWORDS = [
    "declined", "invalid_cvv", "do_not_honor", "limit_exceeded", "mandate_revoked"
]

TECHNICAL_LOW_RISK_KEYWORDS = [
    "timeout", "network", "gateway", "bank_error", "timed_out", "connection", "temporary"
]


def _get(obj: Any, key: str, default: Any = None) -> Any:
    """Helper to get attributes from dict or object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class TransactionRiskEngine:
    """
    Deterministic Current Transaction Risk Scorer.

    Produces an explainable TransactionRiskAssessment dict:
        score: int (0-100)
        level: str (low | moderate | high | critical)
        signals: list of dicts [{category, points, detail}]
        explanation: str
    """

    def assess(
        self,
        payment: Any = None,
        customer: Any = None,
        case: Any = None,
        past_payments_summary: Optional[Dict[str, Any]] = None,
        recent_actions: Optional[List[Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Compute transaction risk assessment for the current payment.
        """
        payment = payment or kwargs.get("payment")
        customer = customer or kwargs.get("customer")
        case = case or kwargs.get("case")
        past_payments_summary = past_payments_summary or kwargs.get("past_payments_summary")

        score = 0
        signals: List[Dict[str, Any]] = []

        amount = float(_get(payment, "amount", 0.0) or 0.0)
        failure_code = str(_get(payment, "failure_code", "") or "").lower()
        failure_reason = str(_get(payment, "failure_reason", "") or "").lower()
        payment_method = str(_get(payment, "payment_method", "") or "").lower()
        customer_risk_score = float(_get(customer, "risk_score", 0.15) or 0.15)
        retry_count = int(_get(case, "retry_count", 0) or 0)

        # -------------------------------------------------------------
        # Signal 1: Failure Code / Reason Pattern Analysis
        # -------------------------------------------------------------
        combined_failure = f"{failure_code} {failure_reason}"
        if any(kw in combined_failure for kw in HIGH_RISK_FAILURE_KEYWORDS):
            pts = 40
            signals.append({
                "category": "Failure Reason Signal",
                "label": "High-Risk Gateway Failure Signal",
                "points": pts,
                "detail": f"Gateway response '{failure_reason or failure_code}' indicates security, authentication, or fraud flag."
            })
            score += pts
        elif any(kw in combined_failure for kw in MODERATE_RISK_FAILURE_KEYWORDS):
            pts = 15
            signals.append({
                "category": "Failure Reason Signal",
                "label": "Card Network Decline Signal",
                "points": pts,
                "detail": f"Network decline signal detected ({failure_reason or failure_code})."
            })
            score += pts
        elif any(kw in combined_failure for kw in TECHNICAL_LOW_RISK_KEYWORDS):
            signals.append({
                "category": "Failure Reason Signal",
                "label": "Transient Technical / Network Issue",
                "points": 0,
                "detail": "Failure was caused by temporary bank downtime or connection timeout — zero inherent fraud risk."
            })

        # -------------------------------------------------------------
        # Signal 2: Transaction Amount vs Baseline
        # -------------------------------------------------------------
        if amount >= 50000:
            pts = 25
            signals.append({
                "category": "Amount Severity",
                "label": "Very High Transaction Value",
                "points": pts,
                "detail": f"Transaction amount (INR {amount:,.2f}) exceeds standard retail thresholds (>= INR 50,000)."
            })
            score += pts
        elif amount >= 20000:
            pts = 15
            signals.append({
                "category": "Amount Severity",
                "label": "Elevated Transaction Value",
                "points": pts,
                "detail": f"Transaction amount (INR {amount:,.2f}) is in the higher tier (>= INR 20,000)."
            })
            score += pts

        # Compare with customer historical average if available
        if past_payments_summary and past_payments_summary.get("successful_count", 0) > 0:
            avg_spend = past_payments_summary["total_spend"] / past_payments_summary["successful_count"]
            if avg_spend > 0 and amount > (avg_spend * 3):
                pts = 15
                signals.append({
                    "category": "Behavioral Anomaly",
                    "label": "Spend Spike vs Customer Baseline",
                    "points": pts,
                    "detail": f"Current amount (INR {amount:,.2f}) is 3x+ higher than customer's average successful payment (INR {avg_spend:,.2f})."
                })
                score += pts

        # -------------------------------------------------------------
        # Signal 3: Customer Profile Risk Score
        # -------------------------------------------------------------
        if customer_risk_score >= 0.7:
            pts = 20
            signals.append({
                "category": "Customer Profile",
                "label": "High Customer Profile Risk",
                "points": pts,
                "detail": f"Customer risk score ({customer_risk_score:.2f}) indicates elevated historical dispute or decline rate."
            })
            score += pts
        elif customer_risk_score >= 0.4:
            pts = 10
            signals.append({
                "category": "Customer Profile",
                "label": "Moderate Customer Profile Risk",
                "points": pts,
                "detail": f"Customer risk score ({customer_risk_score:.2f}) is moderately elevated."
            })
            score += pts

        # -------------------------------------------------------------
        # Signal 4: Rapid Velocity on Case
        # -------------------------------------------------------------
        if retry_count >= 2:
            pts = 10
            signals.append({
                "category": "Retry Velocity",
                "label": "Multiple Failed Retries Logged",
                "points": pts,
                "detail": f"{retry_count} retries have already failed for this invoice."
            })
            score += pts

        # -------------------------------------------------------------
        # Signal 5: Payment Instrument Characteristics
        # -------------------------------------------------------------
        if payment_method in ("international_card", "unverified_mandate"):
            pts = 10
            signals.append({
                "category": "Instrument Risk",
                "label": "Higher-Risk Payment Instrument",
                "points": pts,
                "detail": f"Payment method '{payment_method}' carries higher cross-border or settlement verification risk."
            })
            score += pts

        if not signals:
            signals.append({
                "category": "Baseline",
                "label": "Normal Baseline Transaction",
                "points": 5,
                "detail": "Standard transaction profile without observable risk indicators."
            })
            score = 5

        score = max(0, min(100, score))
        level = self._score_to_level(score)
        explanation = self._build_explanation(level, score, signals)

        return {
            "payment_id": _get(payment, "id", ""),
            "customer_id": _get(customer, "id", ""),
            "score": score,
            "level": level,
            "signals": signals,
            "explanation": explanation
        }

    @staticmethod
    def _score_to_level(score: int) -> str:
        if score >= 75:
            return "critical"
        if score >= 50:
            return "high"
        if score >= 25:
            return "moderate"
        return "low"

    @staticmethod
    def _build_explanation(level: str, score: int, signals: List[Dict[str, Any]]) -> str:
        if level == "low":
            return "Current payment transaction exhibits low observable risk across all inspected vectors. Safe for standard recovery workflow."
        if level == "moderate":
            return f"Moderate transaction risk ({score}/100) identified. Caution advised regarding automated retry cadence."
        if level == "high":
            return f"Elevated transaction risk ({score}/100) detected due to security decline signals or value anomalies. Human review recommended."
        return f"CRITICAL transaction risk ({score}/100) detected. Automated retries should be suspended to protect gateway health."
