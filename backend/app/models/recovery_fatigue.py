"""
Backward compatibility proxy for recovery_fatigue model.
"""
from app.models.recovery_pressure import RecoveryPressureAssessment, RecoveryFatigueAssessment

__all__ = ["RecoveryPressureAssessment", "RecoveryFatigueAssessment"]

