from typing import List, Dict, Any
from fastapi import APIRouter
from app.engine.guardrails import get_registered_policies

router = APIRouter(prefix="/guardrails", tags=["Guardrails"])


@router.get("")
def get_guardrails() -> Dict[str, Any]:
    """
    Returns the deterministic safety policies enforced by the GuardrailEngine.
    Policies 1-6 are authoritative HARD BLOCKERS.
    Policy 7 is CONTEXTUAL SAFETY (Warning/monitoring, non-blocking on pressure alone).
    """
    policies = get_registered_policies()
    
    return {
        "engine": "RevenueAI Deterministic Safety Guardrail Engine",
        "version": "2.0.0",
        "mode": "ENFORCING",
        "total_policies": len(policies),
        "blocking_policies_count": sum(1 for p in policies if p.get("severity") == "BLOCKING" or p.get("rule_type") == "BLOCKING"),
        "contextual_policies_count": sum(1 for p in policies if p.get("severity") == "WARNING" or p.get("rule_type") == "CONTEXTUAL_SAFETY"),
        "policies": policies,
        "philosophy": (
            "RevenueAI uses AI to recommend what to do, but deterministic safety systems "
            "decide whether the action is allowed. All blocking safety checks are arithmetic, "
            "auditable, and reproducible."
        )
    }
