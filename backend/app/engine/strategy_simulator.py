"""
StrategySimulatorEngine — Deterministic Recovery Strategy Scorer.

Evaluates multiple possible recovery strategies for a given case context
and returns ranked, explainable suitability scores (0-100).

KEY SAFETY PROPERTIES:
  - This engine is PURELY READ-ONLY. It never executes any action.
  - Eligibility and safety rules are 100% deterministic (no LLM).
  - The LLM cannot override consent, retry limits, or idempotency.
  - Suitability scores reflect strategic appropriateness, NOT recovery probabilities.
  - Recovery Pressure is a decision signal, NOT an automatic hard blocker.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

STRATEGIES = ["retry", "send_payment_link", "send_reminder", "wait", "escalate"]
OUTREACH_ACTIONS = {"retry", "send_payment_link", "send_reminder"}

FAILURE_PATTERN_SCORES: List[Tuple[List[str], Dict[str, int]]] = [
    (["expired", "validity", "card expir"], {"retry": 20, "send_payment_link": 90, "send_reminder": 55, "wait": 30, "escalate": 20}),
    (["insufficient", "balance", "low balance"], {"retry": 55, "send_payment_link": 55, "send_reminder": 80, "wait": 50, "escalate": 30}),
    (["timeout", "network", "gateway", "bank error", "timed out", "connection", "temporary"], {"retry": 85, "send_payment_link": 35, "send_reminder": 20, "wait": 50, "escalate": 20}),
    (["otp", "3ds", "two-factor", "authentication", "navigated away", "submitted otp"], {"retry": 40, "send_payment_link": 85, "send_reminder": 45, "wait": 40, "escalate": 25}),
    (["mandate", "token invalid", "mandate inactive", "declined or mandate"], {"retry": 30, "send_payment_link": 88, "send_reminder": 50, "wait": 35, "escalate": 28}),
    (["stolen", "lost", "fraud", "suspicious", "flagged", "blocked by bank", "unauthorized"], {"retry": 10, "send_payment_link": 20, "send_reminder": 20, "wait": 40, "escalate": 95}),
]

DEFAULT_SCORES: Dict[str, int] = {"retry": 60, "send_payment_link": 65, "send_reminder": 55, "wait": 40, "escalate": 30}

STRATEGY_DISPLAY_NAMES: Dict[str, str] = {
    "retry": "Retry Payment",
    "send_payment_link": "Send Payment Link",
    "send_reminder": "Send Reminder",
    "wait": "Wait 24 Hours",
    "escalate": "Escalate to Human",
}


class StrategySimulatorEngine:
    """
    Deterministic Recovery Strategy Simulator.
    Read-only. Evaluates strategy suitability across observable risk and pressure signals.
    """

    def simulate(
        self,
        *,
        case_id: str,
        case_status: str,
        amount: float,
        currency: str,
        payment_method: str,
        failure_reason: Optional[str],
        failure_code: Optional[str],
        customer_id: str,
        consent_status: bool,
        customer_lifetime_value: float,
        customer_payment_success_rate: float,
        risk_score: float,
        retry_count: int,
        max_retries: int,
        previous_recovery_actions: List[Dict[str, Any]],
        pressure_score: int = 0,
        pressure_level: str = "low",
        pressure_recommendation: str = "continue",
        fatigue_score: Optional[int] = None,
        fatigue_level: Optional[str] = None,
        fatigue_recommendation: Optional[str] = None,
        transaction_risk_score: int = 0,
        transaction_risk_level: str = "low",
        strategies_requested: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        # Handle backward compatibility parameters
        if fatigue_score is not None and pressure_score == 0:
            pressure_score = fatigue_score
        if fatigue_level is not None and pressure_level == "low":
            pressure_level = fatigue_level
        if fatigue_recommendation is not None and pressure_recommendation == "continue":
            pressure_recommendation = fatigue_recommendation

        strategies_to_eval = strategies_requested or STRATEGIES
        base_scores = self._get_base_scores(failure_reason)
        base_scores = self._apply_ltv_adjustment(base_scores, failure_reason, customer_lifetime_value, customer_payment_success_rate)

        results: List[Dict[str, Any]] = []
        for strategy in strategies_to_eval:
            if strategy not in STRATEGIES:
                continue
            result = self._evaluate_strategy(
                strategy=strategy,
                base_score=base_scores.get(strategy, 50),
                case_status=case_status,
                consent_status=consent_status,
                retry_count=retry_count,
                max_retries=max_retries,
                pressure_score=pressure_score,
                pressure_level=pressure_level,
                transaction_risk_score=transaction_risk_score,
                transaction_risk_level=transaction_risk_level,
                failure_reason=failure_reason or "",
                failure_code=failure_code or "",
                customer_lifetime_value=customer_lifetime_value,
                customer_payment_success_rate=customer_payment_success_rate,
                risk_score=risk_score,
                previous_recovery_actions=previous_recovery_actions,
            )
            results.append(result)

        recommended_strategy = self._pick_recommended(results)
        if recommended_strategy:
            for r in results:
                if r["strategy"] == recommended_strategy:
                    r["recommended"] = True

        results.sort(key=lambda r: (0 if r.get("recommended") else (1 if r["eligible"] else 2), -r["suitability_score"]))

        return {
            "case_id": case_id,
            "recovery_pressure": {
                "score": pressure_score,
                "level": pressure_level,
                "recommendation": pressure_recommendation
            },
            "transaction_risk": {
                "score": transaction_risk_score,
                "level": transaction_risk_level
            },
            "fatigue": {
                "score": pressure_score,
                "level": pressure_level,
                "recommendation": pressure_recommendation
            },
            "strategies": results,
            "recommended_strategy": recommended_strategy,
            "simulation_note": (
                "This simulation evaluates strategy suitability (0-100) based on observable signals. "
                "Suitability scores reflect contextual appropriateness, not a calibrated predictive probability of recovery. "
                "Use 'Run Selected Strategy' to execute through the deterministic GuardrailEngine pipeline."
            ),
        }

    def _get_base_scores(self, failure_reason: Optional[str]) -> Dict[str, int]:
        if not failure_reason:
            return dict(DEFAULT_SCORES)
        reason_lower = failure_reason.lower()
        for keywords, scores in FAILURE_PATTERN_SCORES:
            if any(kw in reason_lower for kw in keywords):
                return dict(scores)
        return dict(DEFAULT_SCORES)

    def _apply_ltv_adjustment(self, scores: Dict[str, int], failure_reason: Optional[str], ltv: float, success_rate: float) -> Dict[str, int]:
        if not failure_reason:
            return scores
        if any(kw in failure_reason.lower() for kw in ["insufficient", "balance"]):
            adjusted = dict(scores)
            if ltv > 50000 and success_rate > 70:
                adjusted["send_reminder"] = min(90, adjusted.get("send_reminder", 80) + 10)
                adjusted["retry"] = max(adjusted.get("retry", 55) - 10, 30)
            elif ltv < 10000:
                adjusted["retry"] = min(75, adjusted.get("retry", 55) + 15)
            return adjusted
        return scores

    def _evaluate_strategy(
        self,
        *,
        strategy: str,
        base_score: int,
        case_status: str,
        consent_status: bool,
        retry_count: int,
        max_retries: int,
        pressure_score: int,
        pressure_level: str,
        transaction_risk_score: int,
        transaction_risk_level: str,
        failure_reason: str,
        failure_code: str,
        customer_lifetime_value: float,
        customer_payment_success_rate: float,
        risk_score: float,
        previous_recovery_actions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        score = base_score
        reasons: List[str] = []
        blockers: List[str] = []
        eligible = True

        # DETERMINISTIC HARD BLOCKS (Authoritative safety boundaries)
        # 1. Case already resolved
        if case_status in ("recovered", "closed", "succeeded"):
            eligible = False
            blockers.append(f"Case is already resolved (status: {case_status}). No further recovery action is needed.")
            score = 0

        # 2. Customer consent revoked -> blocks outbound communications & retries
        if eligible and not consent_status and strategy in OUTREACH_ACTIONS:
            eligible = False
            blockers.append("Customer communication consent is revoked. Outbound actions are blocked by compliance guardrails.")
            score = 0

        # 3. Maximum retry limit reached -> blocks automated gateway retries
        if eligible and strategy == "retry" and retry_count >= max_retries:
            eligible = False
            blockers.append(f"Maximum automated retry limit reached ({retry_count}/{max_retries}). Additional retries are blocked to prevent gateway penalties.")
            score = 0

        # 4. Explicit security / stolen card / fraud flag -> blocks retry, strongly favors escalation
        if eligible and strategy == "retry":
            if any(kw in (failure_reason + " " + failure_code).lower() for kw in ["stolen", "lost", "fraud", "security", "unauthorized"]):
                eligible = False
                blockers.append("Payment failure indicates a security or stolen card flag. Automated retry is blocked. Escalation required.")
                score = 0

        # NOTE: Recovery Pressure alone does NOT hard-block eligibility.
        # It informs score adjustments and recommendations.

        # ADJUSTMENTS (eligible only)
        if eligible:
            score, reasons = self._apply_adjustments(
                strategy=strategy, score=score, reasons=reasons,
                pressure_score=pressure_score, pressure_level=pressure_level,
                transaction_risk_score=transaction_risk_score, transaction_risk_level=transaction_risk_level,
                failure_reason=failure_reason, consent_status=consent_status,
                customer_lifetime_value=customer_lifetime_value,
                customer_payment_success_rate=customer_payment_success_rate,
                risk_score=risk_score, retry_count=retry_count,
                max_retries=max_retries, previous_recovery_actions=previous_recovery_actions,
            )

        score = max(0, min(100, score))

        recovery_potential = self._score_to_level(score if eligible else 0, (40, 70))
        customer_impact = self._customer_impact(strategy, pressure_score, consent_status, eligible)
        execution_risk = self._execution_risk(strategy, retry_count, risk_score, pressure_score, transaction_risk_score, eligible)

        return {
            "strategy": strategy,
            "display_name": STRATEGY_DISPLAY_NAMES.get(strategy, strategy),
            "suitability_score": score if eligible else 0,
            "recovery_potential": recovery_potential,
            "customer_impact": customer_impact,
            "execution_risk": execution_risk,
            "eligible": eligible,
            "recommended": False,
            "reasons": reasons,
            "blockers": blockers,
        }

    def _apply_adjustments(
        self,
        *,
        strategy: str,
        score: int,
        reasons: List[str],
        pressure_score: int,
        pressure_level: str,
        transaction_risk_score: int,
        transaction_risk_level: str,
        failure_reason: str,
        consent_status: bool,
        customer_lifetime_value: float,
        customer_payment_success_rate: float,
        risk_score: float,
        retry_count: int,
        max_retries: int,
        previous_recovery_actions: List[Dict[str, Any]]
    ) -> Tuple[int, List[str]]:
        fr_lower = failure_reason.lower()

        # 1. Failure Code Specific Reasoning
        if "expired" in fr_lower or "validity" in fr_lower:
            if strategy == "send_payment_link":
                reasons.append("Card expiry requires updated payment details — hosted payment link provides direct resolution.")
            elif strategy == "retry":
                reasons.append("Retrying an expired card token without updates will fail at the gateway level.")
            elif strategy == "send_reminder":
                reasons.append("A reminder can prompt the customer to update their card details.")

        if "insufficient" in fr_lower or "balance" in fr_lower:
            if strategy == "send_reminder":
                reasons.append("Reminder gives customer time to top up their account before next charge.")
            elif strategy == "retry":
                reasons.append("Immediate retry on insufficient balance has reduced likelihood of instant success.")
            if customer_lifetime_value > 50000:
                reasons.append(f"High LTV customer (INR {customer_lifetime_value:,.0f}) — polite reminder preserves relationship.")

        if any(kw in fr_lower for kw in ["timeout", "network", "gateway", "connection", "bank error", "temporary"]):
            if strategy == "retry":
                reasons.append("Transient bank or network timeout detected — retry has high recovery probability.")

        if any(kw in fr_lower for kw in ["otp", "3ds", "navigated away", "submitted otp", "auth_failed"]):
            if strategy == "send_payment_link":
                reasons.append("3DS / OTP abandonment — fresh payment link enables easy checkout completion.")

        if any(kw in fr_lower for kw in ["mandate", "token invalid", "declined or mandate"]):
            if strategy == "send_payment_link":
                reasons.append("Mandate renewal requires re-authorization — payment link is the standard route.")

        # 2. Transaction Risk Adjustments
        if transaction_risk_level in ("high", "critical"):
            if strategy == "escalate":
                score += 25
                reasons.append(f"Elevated transaction risk ({transaction_risk_score}/100) — human escalation strongly recommended.")
            elif strategy == "retry":
                score -= 25
                reasons.append(f"High transaction risk ({transaction_risk_score}/100) — caution advised for automated retries.")
            elif strategy in ("send_payment_link", "send_reminder"):
                score -= 10
        elif transaction_risk_level == "low":
            if strategy in ("retry", "send_payment_link"):
                reasons.append(f"Low transaction risk ({transaction_risk_score}/100) — safe for automated workflow.")

        # 3. Recovery Pressure Adjustments (Contextual signal, not hard blocker)
        if pressure_level == "moderate":
            if strategy == "retry":
                score -= 10
                reasons.append(f"Moderate recovery pressure ({pressure_score}/100) — pacing recommended.")
            elif strategy == "wait":
                score += 10
                reasons.append("Moderate recovery pressure suggests a brief cooling window.")
        elif pressure_level == "high":
            if strategy == "retry":
                score -= 20
                reasons.append(f"High recovery pressure ({pressure_score}/100) — consider spacing next retry attempt.")
            elif strategy in ("send_payment_link", "send_reminder"):
                score -= 15
                reasons.append(f"High recovery pressure ({pressure_score}/100) — avoid excessive notification cadence.")
            elif strategy == "wait":
                score += 20
                reasons.append("High recovery pressure strongly favors a 24h waiting period.")
            elif strategy == "escalate":
                score += 15
                reasons.append("High recovery pressure with multiple prior attempts increases escalation value.")
        elif pressure_level == "critical":
            if strategy == "wait":
                score += 25
                reasons.append(f"Critical recovery pressure ({pressure_score}/100) — cooling period is highly appropriate.")
            elif strategy == "escalate":
                score += 25
                reasons.append(f"Critical recovery pressure ({pressure_score}/100) — manual human review recommended.")
            elif strategy in ("retry", "send_payment_link"):
                score -= 25
                reasons.append(f"Critical recovery pressure ({pressure_score}/100) — evaluate current payment context before reattempting.")

        # 4. Customer Context & Retry History
        if consent_status and strategy in OUTREACH_ACTIONS:
            reasons.append("Customer communication consent is active.")

        if customer_payment_success_rate >= 85 and strategy != "escalate":
            reasons.append(f"Strong historical reliability ({customer_payment_success_rate:.0f}% payment success rate).")
        elif customer_payment_success_rate < 50 and strategy == "escalate":
            reasons.append(f"Lower payment success rate ({customer_payment_success_rate:.0f}%) suggests high-touch handling.")

        if strategy == "retry" and max_retries > 0:
            retries_remaining = max_retries - retry_count
            if retries_remaining == 1:
                score -= 10
                reasons.append(f"Only {retries_remaining} retry remaining before limit — use strategically.")
            elif retries_remaining > 1:
                reasons.append(f"{retries_remaining} retries remaining out of {max_retries} allowed.")

        prior_types = [a.get("action_type", "") for a in previous_recovery_actions]
        if "send_payment_link" in prior_types and strategy == "send_payment_link":
            score -= 10
            reasons.append("Payment link previously dispatched — consider secondary channel.")
        if "send_reminder" in prior_types and strategy == "send_reminder":
            score -= 8
            reasons.append("Payment reminder previously sent.")

        return score, reasons

    def _pick_recommended(self, results: List[Dict[str, Any]]) -> Optional[str]:
        eligible_results = [r for r in results if r["eligible"]]
        if not eligible_results:
            return None
        best = max(eligible_results, key=lambda r: r["suitability_score"])
        return best["strategy"] if best["suitability_score"] > 0 else None

    @staticmethod
    def _score_to_level(score: int, thresholds: Tuple[int, int] = (35, 65)) -> str:
        lo, hi = thresholds
        if score >= hi:
            return "high"
        if score >= lo:
            return "medium"
        return "low"

    @staticmethod
    def _customer_impact(strategy: str, pressure_score: int, consent_status: bool, eligible: bool) -> str:
        if not eligible:
            return "low"
        if strategy in ("wait", "escalate"):
            return "low" if strategy == "wait" else "medium"
        if pressure_score >= 50:
            return "high"
        if pressure_score >= 25:
            return "medium"
        return "low"

    @staticmethod
    def _execution_risk(strategy: str, retry_count: int, risk_score: float, pressure_score: int, transaction_risk_score: int, eligible: bool) -> str:
        if not eligible:
            return "low"
        if strategy in ("wait", "escalate"):
            return "low"
        if strategy == "retry":
            if risk_score > 0.6 or retry_count >= 2 or transaction_risk_score >= 50:
                return "high"
            return "medium"
        if pressure_score >= 50 or transaction_risk_score >= 50:
            return "medium"
        return "low"

