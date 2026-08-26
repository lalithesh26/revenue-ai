"""
Backward-compatibility wrapper for FatigueEngine.
Points to the authoritative RecoveryPressureEngine.
"""
from app.engine.recovery_pressure import (
    RecoveryPressureEngine,
    RecoveryPressureEngine as FatigueEngine,
    OUTREACH_ACTIONS,
)

__all__ = ["RecoveryPressureEngine", "FatigueEngine", "OUTREACH_ACTIONS"]

