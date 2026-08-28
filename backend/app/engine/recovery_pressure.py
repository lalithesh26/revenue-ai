"""
RecoveryPressureEngine — Deterministic Recovery Pressure Evaluator.

Measures observable recovery activity and outreach velocity for a customer/case.
NOTE: Recovery Pressure measures recent automated recovery activity and frequency.
It does NOT claim to measure the customer's internal emotional state.

All arithmetic is deterministic, explainable, and auditable.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Outreach actions subject to recovery pressure tracking
OUTREACH_ACTIONS = {"retry", "send_payment_link", "send_reminder"}


def _utc(dt: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """Ensure a datetime is timezone-aware (UTC)."""
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt_parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            return dt_parsed.replace(tzinfo=timezone.utc) if dt_parsed.tzinfo is None else dt_parsed
        except Exception:
            return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _get(obj: Any, key: str, default: Any = None) -> Any:
    """Helper to get attributes from dict or object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class RecoveryPressureEngine:
    """
    Deterministic Recovery Pressure Scorer.

    Produces an explainable PressureResult dict:
        score: int 0-100
        level: str (low | moderate | high | critical)
        recommendation: str (continue | reduce_frequency | pause | escalate)
        factors: list [{label, points, detail}]

    Scoring weights (additive, capped at 100):
        +5 per recovery attempt (cap: +15)
        +10 per payment link sent (cap: +20)
        +5 per reminder sent (cap: +10)
        +5 per automated retry count (cap: +15)
        +15 / +10 / +5 for recency (<6h / <12h / <24h)
        +10 / +5 for short cadence (<2h / <6h avg interval)
        +10 / +5 for consecutive failed attempts

    Override rules:
        consent_status = False -> score 100, level critical, recommendation pause
        case.status in recovered/closed -> score 0, level low, recommendation continue
    """

    def assess(
        self,
        case: Any,
        actions: List[Any],
        customer: Any,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)

        # Override 1: Consent Revoked
        if not _get(customer, "consent_status", True):
            return self._result(
                case_id=_get(case, "id", ""),
                customer_id=_get(customer, "id", ""),
                score=100,
                factors=[{
                    "label": "Customer consent revoked",
                    "points": 100,
                    "detail": "Automated communications opted out by customer. Pressure set to maximum (100)."
                }]
            )

        # Override 2: Case Resolved
        if _get(case, "status", "") in ("recovered", "closed"):
            return self._result(
                case_id=_get(case, "id", ""),
                customer_id=_get(customer, "id", ""),
                score=0,
                factors=[{
                    "label": "Case already resolved",
                    "points": 0,
                    "detail": f"Case status is '{_get(case, 'status', '')}'. No active recovery pressure."
                }]
            )

        score = 0
        factors: List[Dict[str, Any]] = []

        # Signal 1: Total recovery actions
        n_actions = len(actions)
        pts = min(n_actions * 5, 15)
        if pts > 0:
            factors.append({
                "label": f"{n_actions} recent recovery attempt{'s' if n_actions != 1 else ''}",
                "points": pts,
                "detail": f"{n_actions} automated recovery actions logged on this case."
            })
        score += pts

        # Signal 2: Payment links sent
        link_actions = [a for a in actions if _get(a, "action_type", "") == "send_payment_link"]
        pts = min(len(link_actions) * 10, 20)
        if pts > 0:
            factors.append({
                "label": f"{len(link_actions)} payment link{'s' if len(link_actions) != 1 else ''} dispatched",
                "points": pts,
                "detail": "Multiple payment link dispatches increase outbound contact density."
            })
        score += pts

        # Signal 3: Reminders sent
        reminder_actions = [a for a in actions if _get(a, "action_type", "") == "send_reminder"]
        pts = min(len(reminder_actions) * 5, 10)
        if pts > 0:
            factors.append({
                "label": f"{len(reminder_actions)} reminder notification{'s' if len(reminder_actions) != 1 else ''}",
                "points": pts,
                "detail": "Frequent reminders elevate customer communication frequency."
            })
        score += pts

        # Signal 4: Automated retries
        retry_count = _get(case, "retry_count", 0) or 0
        pts = min(retry_count * 5, 15)
        if pts > 0:
            factors.append({
                "label": f"{retry_count} automated gateway retr{'ies' if retry_count != 1 else 'y'}",
                "points": pts,
                "detail": "Repeated gateway retries consume retry velocity limits."
            })
        score += pts

        # Signal 5: Recency of last action
        executed_times: List[datetime] = [
            t
            for a in actions
            if (t := _utc(_get(a, "executed_at", None))) is not None
        ]
        if executed_times:
            latest_at = max(executed_times)
            hours_since = (now - latest_at).total_seconds() / 3600
            if hours_since < 6:
                pts = 15
                recency_label = f"Last action {hours_since:.1f}h ago (< 6h)"
                recency_detail = "Recent automated action logged. Recommend spacing out next event."
            elif hours_since < 12:
                pts = 10
                recency_label = f"Last action {hours_since:.1f}h ago (< 12h)"
                recency_detail = "Moderate recency. Consider cooling period."
            elif hours_since < 24:
                pts = 5
                recency_label = f"Last action {hours_since:.1f}h ago (< 24h)"
                recency_detail = "Action within last 24 hours."
            else:
                pts = 0
                recency_label = ""
                recency_detail = ""
            if pts > 0:
                factors.append({"label": recency_label, "points": pts, "detail": recency_detail})
            score += pts

        # Signal 6: Cadence / intervals
        if len(actions) >= 2:
            sorted_times = sorted([t for t in executed_times if t is not None])
            if len(sorted_times) >= 2:
                intervals_h = [
                    (sorted_times[i] - sorted_times[i - 1]).total_seconds() / 3600
                    for i in range(1, len(sorted_times))
                ]
                avg_interval = sum(intervals_h) / len(intervals_h)
                if avg_interval < 2:
                    pts = 10
                    factors.append({
                        "label": f"High action cadence (avg {avg_interval:.1f}h interval)",
                        "points": pts,
                        "detail": "Consecutive actions fired < 2 hours apart."
                    })
                    score += pts
                elif avg_interval < 6:
                    pts = 5
                    factors.append({
                        "label": f"Dense action cadence (avg {avg_interval:.1f}h interval)",
                        "points": pts,
                        "detail": "Actions fired < 6 hours apart."
                    })
                    score += pts

        # Signal 7: Outcome quality
        if actions:
            failed = [a for a in actions if _get(a, "status", "") in ("failed", "blocked_by_guardrail")]
            if len(failed) == len(actions):
                pts = 10
                factors.append({
                    "label": "All previous recovery attempts failed",
                    "points": pts,
                    "detail": "Zero successful recoveries on prior attempts for this case."
                })
                score += pts
            elif failed:
                pts = 5
                factors.append({
                    "label": f"{len(failed)} of {len(actions)} attempts unsuccessful",
                    "points": pts,
                    "detail": "Mixed recovery outcomes observed."
                })
                score += pts

        # Baseline point if any actions exist
        if not factors:
            factors.append({
                "label": "Minimal recovery history",
                "points": 5,
                "detail": "No significant recent recovery attempts detected."
            })
            score = 5

        score = max(0, min(100, score))
        return self._result(
            case_id=_get(case, "id", ""),
            customer_id=_get(customer, "id", ""),
            score=score,
            factors=factors
        )

    def _result(
        self,
        *,
        case_id: str,
        customer_id: str,
        score: int,
        factors: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        level = self._score_to_level(score)
        recommendation = self._level_to_recommendation(level)
        return {
            "case_id": case_id,
            "customer_id": customer_id,
            "score": score,
            "level": level,
            "recommendation": recommendation,
            "factors": factors,
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
    def _level_to_recommendation(level: str) -> str:
        mapping = {
            "low": "continue",
            "moderate": "reduce_frequency",
            "high": "pause",
            "critical": "escalate",
        }
        return mapping.get(level, "continue")
