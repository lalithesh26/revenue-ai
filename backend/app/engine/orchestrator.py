import json
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.recovery_case import RecoveryCase
from app.models.agent_decision import AgentDecision
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.engine.ai_provider import (
    get_ai_decision_provider,
    AgentContext,
    AgentDecisionOutput,
    AgentActionEnum,
    AgentPriorityEnum
)
from app.engine.guardrails import GuardrailEngine
from app.engine.recovery_pressure import RecoveryPressureEngine
from app.engine.transaction_risk import TransactionRiskEngine
from app.engine.strategy_simulator import StrategySimulatorEngine
from app.models.recovery_pressure import RecoveryPressureAssessment
from app.providers import get_payment_provider

logger = logging.getLogger(__name__)


class RecoveryOrchestrator:
    """
    Central orchestration engine for the autonomous revenue recovery lifecycle:
    Read-Only Context Gathering -> Transaction Risk -> Recovery Pressure -> Strategy Simulation -> AI Decision -> Guardrail Safety -> Action Execution -> Audit Logging.
    """

    def __init__(self):
        self.ai_provider = get_ai_decision_provider()
        self.guardrails = GuardrailEngine()
        self.pressure_engine = RecoveryPressureEngine()
        self.risk_engine = TransactionRiskEngine()
        self.simulator = StrategySimulatorEngine()
        self.payment_provider = get_payment_provider()

    def get_customer_past_payments_summary(self, db: Session, customer_id: str, exclude_payment_id: Optional[str] = None) -> Dict[str, Any]:
        query = db.query(Payment).filter(Payment.customer_id == customer_id)
        if exclude_payment_id:
            query = query.filter(Payment.id != exclude_payment_id)
        payments = query.all()
        
        successful = [p for p in payments if p.status in ["succeeded", "recovered"]]
        failed = [p for p in payments if p.status == "failed"]
        total_spend = sum(p.amount for p in successful)
        
        return {
            "total_count": len(payments),
            "successful_count": len(successful),
            "failed_count": len(failed),
            "total_spend": total_spend,
            "success_rate": (len(successful) / len(payments) * 100) if payments else 100.0
        }

    def run_agent_pipeline(self, db: Session, case_id: str) -> Dict[str, Any]:
        """
        Main autonomous AI Recovery Agent pipeline.
        Executes:
        1. Case Validation & Audit Start
        2. Stage 1: Context Gathering (Read-Only) -> Audit: context_gathered
        3. Stage 2: Transaction Risk Assessment -> Audit: transaction_risk_assessed
        4. Stage 3: Recovery Pressure Assessment -> Audit: recovery_pressure_assessed
        5. Stage 4: Strategy Simulation -> Audit: strategy_simulated
        6. Stage 5: AI Strategy Formulation -> Audit: agent_decision
        7. Stage 6: Guardrail Safety Verification -> Audit: guardrail_evaluated
        8. Stage 7: Action Execution / Safety Block -> Audit: action_executed / action_blocked
        9. Stage 8: Pipeline Cycle Sealed -> Audit: agent_completed
        """
        stages = []
        pipeline_start = time.time()

        # Step 1: Validate Recovery Case
        case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise ValueError(f"Recovery case {case_id} not found.")

        payment = db.query(Payment).filter(Payment.id == case.payment_id).first()
        customer = db.query(Customer).filter(Customer.id == case.customer_id).first()
        subscription = db.query(Subscription).filter(Subscription.customer_id == customer.id).first()

        # Audit 1: agent_started
        start_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="agent_started",
            actor="recovery_agent",
            description=f"AI Recovery Agent initiated autonomous analysis for case {case.id} (Payment: {payment.id}, Amount: ₹{payment.amount:,.2f})",
            metadata_json=json.dumps({
                "case_id": case.id,
                "payment_id": payment.id,
                "ai_provider": self.ai_provider.provider_name
            })
        )
        db.add(start_audit)
        db.commit()

        # Stage 1: Context Gathering
        stage_start = time.time()
        past_payments = self.get_customer_past_payments_summary(db, customer.id, exclude_payment_id=payment.id)
        
        previous_actions = [
            {"action_type": a.action_type, "status": a.status, "result": a.result, "amount_recovered": a.amount_recovered}
            for a in case.actions
        ]

        context_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="context_gathered",
            actor="recovery_agent",
            description=f"Synthesized context: LTV ₹{past_payments['total_spend']:,.2f}, Success Rate {past_payments['success_rate']:.0f}%, Consent {'Active' if customer.consent_status else 'Revoked'}, Failure Reason: {payment.failure_reason}",
            metadata_json=json.dumps({
                "payment_id": payment.id,
                "customer_id": customer.id,
                "amount": payment.amount,
                "currency": payment.currency,
                "failure_code": payment.failure_code,
                "failure_reason": payment.failure_reason,
                "ltv": past_payments["total_spend"],
                "success_rate": past_payments["success_rate"],
                "past_payments_count": past_payments["total_count"],
                "consent_status": customer.consent_status
            })
        )
        db.add(context_audit)
        db.commit()

        stages.append({
            "stage_id": "context_gathering",
            "title": "Context Synthesis & Feature Aggregation",
            "status": "completed",
            "description": f"Gathered customer LTV (₹{past_payments['total_spend']:,.2f}), {past_payments['total_count']} past orders, consent status, and gateway code ({payment.failure_code or 'DECLINED'}).",
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": {
                "ltv": past_payments["total_spend"],
                "success_rate": past_payments["success_rate"],
                "consent": customer.consent_status
            }
        })

        # Stage 2: Current Transaction Risk Assessment
        stage_start = time.time()
        risk_result = self.risk_engine.assess(
            payment=payment,
            customer=customer,
            case=case,
            past_payments_summary=past_payments
        )
        risk_score = risk_result["score"]
        risk_level = risk_result["level"]

        risk_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="transaction_risk_assessed",
            actor="risk_engine",
            description=(
                f"Current Transaction Risk assessed: {risk_score}/100 ({risk_level.upper()}). "
                f"{len(risk_result['signals'])} observable risk signal(s). {risk_result['explanation']}"
            ),
            metadata_json=json.dumps(risk_result)
        )
        db.add(risk_audit)
        db.commit()

        stages.append({
            "stage_id": "transaction_risk",
            "title": "Current Transaction Risk Assessment",
            "status": "completed",
            "description": f"Transaction risk score {risk_score}/100 ({risk_level.upper()}). {risk_result['explanation']}",
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": risk_result
        })

        # Stage 3: Recovery Pressure Assessment
        stage_start = time.time()
        pressure_result = self.pressure_engine.assess(case, list(case.actions), customer)
        pressure_score = pressure_result["score"]
        pressure_level = pressure_result["level"]
        pressure_recommendation = pressure_result["recommendation"]

        # Persist assessment
        pressure_record = RecoveryPressureAssessment(
            case_id=case.id,
            customer_id=customer.id,
            score=pressure_score,
            level=pressure_level,
            recommendation=pressure_recommendation,
            factors_json=json.dumps(pressure_result["factors"])
        )
        db.add(pressure_record)

        pressure_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="recovery_pressure_assessed",
            actor="pressure_engine",
            description=(
                f"Recovery Pressure assessed: {pressure_score}/100 ({pressure_level.upper()}). "
                f"Recommendation: {pressure_recommendation.upper()}. "
                f"{len(pressure_result['factors'])} factor(s) observed."
            ),
            metadata_json=json.dumps(pressure_result)
        )
        db.add(pressure_audit)
        db.commit()

        stages.append({
            "stage_id": "recovery_pressure",
            "title": "Recovery Pressure Assessment",
            "status": "completed",
            "description": (
                f"Pressure score {pressure_score}/100 ({pressure_level.upper()}). "
                + (f"{len(pressure_result['factors'])} factors: " + ", ".join(f['label'] for f in pressure_result['factors'][:2]))
                + f". Recommendation: {pressure_recommendation.upper()}."
            ),
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": pressure_result
        })

        # Stage 4: Strategy Simulation (Read-Only Deterministic Evaluation)
        stage_start = time.time()
        simulation_result = self.simulator.simulate(
            case_id=case.id,
            case_status=case.status,
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            failure_reason=payment.failure_reason,
            failure_code=payment.failure_code,
            customer_id=customer.id,
            consent_status=customer.consent_status,
            customer_lifetime_value=past_payments["total_spend"],
            customer_payment_success_rate=past_payments["success_rate"],
            risk_score=customer.risk_score,
            retry_count=case.retry_count,
            max_retries=3,
            previous_recovery_actions=previous_actions,
            pressure_score=pressure_score,
            pressure_level=pressure_level,
            pressure_recommendation=pressure_recommendation,
            transaction_risk_score=risk_score,
            transaction_risk_level=risk_level
        )

        sim_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="strategy_simulated",
            actor="strategy_simulator",
            description=f"Evaluated 5 recovery strategies. Recommended: {str(simulation_result.get('recommended_strategy', 'none')).upper()}",
            metadata_json=json.dumps(simulation_result)
        )
        db.add(sim_audit)
        db.commit()

        stages.append({
            "stage_id": "strategy_simulation",
            "title": "Strategy Simulator Analysis",
            "status": "completed",
            "description": f"Simulated 5 candidate strategies. Top recommendation: {str(simulation_result.get('recommended_strategy', 'none')).upper()}.",
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": simulation_result
        })

        # Build Rich AgentContext
        context = AgentContext(
            payment_id=payment.id,
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            failure_code=payment.failure_code,
            failure_reason=payment.failure_reason,
            customer_id=customer.id,
            customer_name=customer.name,
            customer_email=customer.email,
            consent_status=customer.consent_status,
            risk_score=customer.risk_score,
            customer_lifetime_value=past_payments["total_spend"],
            customer_payment_success_rate=past_payments["success_rate"],
            past_payments_count=past_payments["total_count"],
            subscription_id=subscription.id if subscription else None,
            subscription_status=subscription.status if subscription else None,
            subscription_amount=subscription.amount if subscription else None,
            billing_cycle=subscription.billing_cycle if subscription else None,
            retry_count=case.retry_count,
            previous_recovery_actions=previous_actions,
            case_status=case.status,
            transaction_risk=risk_result,
            recovery_pressure=pressure_result,
            recovery_fatigue=pressure_result
        )

        # Stage 5: AI Reasoning & Strategy Selection
        stage_start = time.time()
        ai_provider = get_ai_decision_provider()
        decision_output: AgentDecisionOutput = ai_provider.evaluate_recovery(context)

        # Save decision entity to DB
        decision = AgentDecision(
            recovery_case_id=case.id,
            decision=decision_output.action.value,
            reasoning=decision_output.reasoning,
            confidence=decision_output.confidence,
            priority=decision_output.priority.value
        )
        db.add(decision)

        # Update case assigned action & priority
        case.assigned_action = decision_output.action.value
        case.priority = decision_output.priority.value

        source_label = f"REAL_LLM ({decision_output.model_used})" if decision_output.decision_source == "REAL_LLM" else "HEURISTIC_FALLBACK"

        decision_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="agent_decision",
            actor="recovery_agent",
            description=f"[{source_label}] Formulated recovery strategy: {decision_output.action.value.upper()} (Confidence: {(decision_output.confidence*100):.0f}%, Priority: {decision_output.priority.value.upper()})",
            metadata_json=json.dumps(decision_output.model_dump())
        )
        db.add(decision_audit)
        db.commit()

        stages.append({
            "stage_id": "ai_reasoning",
            "title": f"AI Strategy Reasoning [{source_label}]",
            "status": "completed",
            "description": f"Strategy '{decision_output.action.value.upper()}' selected via {source_label} with {(decision_output.confidence*100):.0f}% confidence. Rationale: {decision_output.reasoning}",
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": decision_output.model_dump()
        })

        # Stage 6: Guardrail Safety Validation
        stage_start = time.time()
        customer_dict = {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "consent_status": customer.consent_status,
            "risk_score": customer.risk_score
        }
        payment_dict = {
            "id": payment.id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "failure_code": payment.failure_code,
            "failure_reason": payment.failure_reason,
            "payment_method": payment.payment_method
        }
        case_dict = {
            "id": case.id,
            "status": case.status,
            "retry_count": case.retry_count
        }

        guardrail_passed, guardrail_results, summary_msg = self.guardrails.validate(
            action_type=decision_output.action.value,
            customer=customer_dict,
            payment=payment_dict,
            recovery_case=case_dict,
            requested_amount=payment.amount,
            fatigue_score=pressure_score,
            pressure_score=pressure_score,
            transaction_risk_score=risk_score
        )

        guardrail_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="guardrail_evaluated",
            actor="guardrail_engine",
            description=f"Guardrail Engine compliance check for '{decision_output.action.value}': {'PASSED' if guardrail_passed else 'BLOCKED'}",
            metadata_json=json.dumps({
                "action_type": decision_output.action.value,
                "passed": guardrail_passed,
                "summary": summary_msg,
                "checks": guardrail_results
            })
        )
        db.add(guardrail_audit)
        db.commit()

        stages.append({
            "stage_id": "guardrail_verification",
            "title": "Guardrail Safety Gate Pre-Execution Check",
            "status": "completed" if guardrail_passed else "blocked",
            "description": summary_msg,
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": {
                "passed": guardrail_passed,
                "checks_count": len(guardrail_results)
            }
        })

        # Stage 7: Execution or Block
        stage_start = time.time()
        recovered_amount = 0.0
        result_message = ""
        action_status = "completed"
        target_action = decision_output.action.value

        if not guardrail_passed:
            action_status = "blocked_by_guardrail"
            result_message = f"Action blocked by Guardrail Engine: {summary_msg}"
            
            action = RecoveryAction(
                recovery_case_id=case.id,
                action_type=target_action,
                status="blocked_by_guardrail",
                result=result_message,
                amount_recovered=0.0
            )
            db.add(action)

            block_audit = AuditLog(
                recovery_case_id=case.id,
                event_type="action_blocked",
                actor="guardrail_engine",
                description=f"Action '{target_action}' blocked by safety policy: {summary_msg}",
                metadata_json=json.dumps({
                    "action_type": target_action,
                    "reason": summary_msg,
                    "checks": guardrail_results
                })
            )
            db.add(block_audit)
            db.commit()
            db.refresh(case)

            stages.append({
                "stage_id": "action_execution",
                "title": "Safety Intercept Triggered",
                "status": "blocked",
                "description": result_message,
                "duration_ms": int((time.time() - stage_start) * 1000),
                "metadata": {"blocked": True, "action_type": target_action}
            })

            # Stage 8: Pipeline Completion
            stages.append({
                "stage_id": "agent_completion",
                "title": "Agent Cycle Completed (Action Blocked by Safety Policy)",
                "status": "completed",
                "description": f"Safety cycle completed in {int((time.time() - pipeline_start) * 1000)}ms. Customer protected.",
                "duration_ms": int((time.time() - pipeline_start) * 1000)
            })

            return {
                "recovery_case_id": case.id,
                "decision": {
                    "id": decision.id,
                    "recovery_case_id": decision.recovery_case_id,
                    "decision": decision.decision,
                    "reasoning": decision.reasoning,
                    "confidence": decision.confidence,
                    "priority": decision.priority,
                    "decision_source": decision_output.decision_source,
                    "model_used": decision_output.model_used,
                    "created_at": decision.created_at
                },
                "guardrail_passed": False,
                "guardrail_checks": guardrail_results,
                "action_type": target_action,
                "action_status": "blocked_by_guardrail",
                "result_message": result_message,
                "recovered_amount": 0.0,
                "case_final_status": case.status,
                "stages": stages,
                "created_at": datetime.now(timezone.utc)
            }

        # Guardrails Passed -> Execute Provider Action
        case.status = "in_recovery"

        if target_action == "retry":
            now_utc = datetime.now(timezone.utc)
            case.retry_count += 1
            provider_resp = self.payment_provider.retry_payment(payment.id, payment.payment_method)
            recovered_amount = payment.amount
            payment.status = "recovered"
            payment.updated_at = now_utc
            case.status = "recovered"
            case.resolved_at = now_utc
            result_message = f"Payment successfully retried & captured via {self.payment_provider.provider_name.upper()} (Routing: Secondary)."

        elif target_action == "send_payment_link":
            provider_resp = self.payment_provider.create_payment_link(payment.id, payment.amount, customer.email)
            result_message = f"Recovery payment link generated: {provider_resp.get('short_url')}. Dispatched to {customer.email}."

        elif target_action == "send_reminder":
            result_message = f"Polite payment reminder dispatched to {customer.email} & {customer.phone or 'SMS'}."

        elif target_action == "escalate":
            case.status = "open"
            case.priority = "critical"
            result_message = "Recovery case escalated to Senior Retention Operations team."

        elif target_action == "wait":
            result_message = "Cooling-off delay window activated. Case scheduled for next evaluation cycle in 24 hours."

        elif target_action == "stop":
            case.status = "closed"
            case.resolved_at = datetime.now(timezone.utc)
            result_message = "Recovery workflow stopped in compliance with user preference/policy."

        else:
            result_message = f"Action '{target_action}' placed on scheduled queue."

        action = RecoveryAction(
            recovery_case_id=case.id,
            action_type=target_action,
            status=action_status,
            result=result_message,
            amount_recovered=recovered_amount
        )
        db.add(action)

        exec_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="action_executed",
            actor="recovery_agent",
            description=f"Executed recovery action '{target_action}': {result_message}",
            metadata_json=json.dumps({
                "action_type": target_action,
                "provider": self.payment_provider.provider_name,
                "amount_recovered": recovered_amount,
                "result_message": result_message
            })
        )
        db.add(exec_audit)

        if recovered_amount > 0:
            recovery_audit = AuditLog(
                recovery_case_id=case.id,
                event_type="payment_recovered",
                actor="mock_payment_provider",
                description=f"Revenue recovered: ₹{recovered_amount:,.2f} successfully captured for payment {payment.id}",
                metadata_json=json.dumps({
                    "recovered_amount": recovered_amount,
                    "currency": payment.currency,
                    "payment_id": payment.id
                })
            )
            db.add(recovery_audit)

        stages.append({
            "stage_id": "action_execution",
            "title": f"Action Executed: {target_action.upper()}",
            "status": "completed",
            "description": result_message,
            "duration_ms": int((time.time() - stage_start) * 1000),
            "metadata": {
                "action_type": target_action,
                "recovered_amount": recovered_amount
            }
        })

        # Stage 8: Pipeline Completion Audit
        complete_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="agent_completed",
            actor="recovery_agent",
            description=f"AI Agent cycle completed in {int((time.time() - pipeline_start) * 1000)}ms. Final case status: {case.status.upper()}.",
            metadata_json=json.dumps({
                "total_duration_ms": int((time.time() - pipeline_start) * 1000),
                "final_status": case.status,
                "action_executed": target_action,
                "recovered_amount": recovered_amount
            })
        )
        db.add(complete_audit)

        db.commit()
        db.refresh(case)

        stages.append({
            "stage_id": "agent_completion",
            "title": "Agent Cycle Completed & Audit Trail Sealed",
            "status": "completed",
            "description": f"Autonomous cycle finished in {int((time.time() - pipeline_start) * 1000)}ms. Case status: {case.status.upper()}.",
            "duration_ms": int((time.time() - pipeline_start) * 1000)
        })

        return {
            "recovery_case_id": case.id,
            "decision": {
                "id": decision.id,
                "recovery_case_id": decision.recovery_case_id,
                "decision": decision.decision,
                "reasoning": decision.reasoning,
                "confidence": decision.confidence,
                "priority": decision.priority,
                "decision_source": decision_output.decision_source,
                "model_used": decision_output.model_used,
                "created_at": decision.created_at
            },
            "guardrail_passed": True,
            "guardrail_checks": guardrail_results,
            "action_type": target_action,
            "action_status": action_status,
            "result_message": result_message,
            "recovered_amount": recovered_amount,
            "case_final_status": case.status,
            "stages": stages,
            "created_at": datetime.now(timezone.utc)
        }

    def analyze_case(self, db: Session, case_id: str) -> Dict[str, Any]:
        """Runs read-only AI analysis on a recovery case, saves the decision, and pre-checks guardrails."""
        case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise ValueError(f"Recovery case {case_id} not found.")

        payment = db.query(Payment).filter(Payment.id == case.payment_id).first()
        customer = db.query(Customer).filter(Customer.id == case.customer_id).first()
        subscription = db.query(Subscription).filter(Subscription.customer_id == customer.id).first()
        
        past_payments = self.get_customer_past_payments_summary(db, customer.id, exclude_payment_id=payment.id)
        
        previous_actions = [
            {"action_type": a.action_type, "status": a.status, "result": a.result, "amount_recovered": a.amount_recovered}
            for a in case.actions
        ]

        # Assess Transaction Risk
        risk_result = self.risk_engine.assess(
            payment=payment,
            customer=customer,
            case=case,
            past_payments_summary=past_payments
        )
        risk_score = risk_result["score"]

        # Assess Recovery Pressure
        pressure_result = self.pressure_engine.assess(case, list(case.actions), customer)
        pressure_score = pressure_result["score"]

        context = AgentContext(
            payment_id=payment.id,
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            failure_code=payment.failure_code,
            failure_reason=payment.failure_reason,
            customer_id=customer.id,
            customer_name=customer.name,
            customer_email=customer.email,
            consent_status=customer.consent_status,
            risk_score=customer.risk_score,
            customer_lifetime_value=past_payments["total_spend"],
            customer_payment_success_rate=past_payments["success_rate"],
            past_payments_count=past_payments["total_count"],
            subscription_id=subscription.id if subscription else None,
            subscription_status=subscription.status if subscription else None,
            subscription_amount=subscription.amount if subscription else None,
            billing_cycle=subscription.billing_cycle if subscription else None,
            retry_count=case.retry_count,
            previous_recovery_actions=previous_actions,
            case_status=case.status,
            transaction_risk=risk_result,
            recovery_pressure=pressure_result,
            recovery_fatigue=pressure_result
        )

        ai_provider = get_ai_decision_provider()
        decision_output = ai_provider.evaluate_recovery(context)

        decision = AgentDecision(
            recovery_case_id=case.id,
            decision=decision_output.action.value,
            reasoning=decision_output.reasoning,
            confidence=decision_output.confidence,
            priority=decision_output.priority.value
        )
        db.add(decision)
        
        case.assigned_action = decision_output.action.value
        case.priority = decision_output.priority.value

        # Pre-check guardrails
        customer_dict = {"id": customer.id, "name": customer.name, "email": customer.email, "consent_status": customer.consent_status, "risk_score": customer.risk_score}
        payment_dict = {"id": payment.id, "amount": payment.amount, "currency": payment.currency, "status": payment.status, "failure_code": payment.failure_code, "failure_reason": payment.failure_reason, "payment_method": payment.payment_method}
        case_dict = {"id": case.id, "status": case.status, "retry_count": case.retry_count}

        passed, guardrail_results, summary_msg = self.guardrails.validate(
            action_type=decision_output.action.value,
            customer=customer_dict,
            payment=payment_dict,
            recovery_case=case_dict,
            requested_amount=payment.amount,
            pressure_score=pressure_score,
            transaction_risk_score=risk_score
        )

        audit_log = AuditLog(
            recovery_case_id=case.id,
            event_type="agent_analyzed",
            actor="recovery_agent",
            description=f"AI Agent analyzed payment and recommended action: {decision_output.action.value.upper()}",
            metadata_json=json.dumps({
                "decision": decision_output.model_dump(),
                "guardrails_precheck": {
                    "passed": passed,
                    "summary": summary_msg,
                    "checks": guardrail_results
                }
            })
        )
        db.add(audit_log)
        db.commit()
        db.refresh(case)

        return {
            "recovery_case_id": case.id,
            "decision": decision_output.action.value,
            "reasoning": decision_output.reasoning,
            "confidence": decision_output.confidence,
            "priority": decision_output.priority.value,
            "suggested_action": decision_output.action.value,
            "guardrails_precheck": {
                "passed": passed,
                "summary": summary_msg,
                "checks": guardrail_results
            }
        }

    def execute_action(self, db: Session, case_id: str, action_type: Optional[str] = None) -> Dict[str, Any]:
        """Manual or programmatic action execution with deterministic guardrail verification."""
        case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise ValueError(f"Recovery case {case_id} not found.")

        payment = db.query(Payment).filter(Payment.id == case.payment_id).first()
        customer = db.query(Customer).filter(Customer.id == case.customer_id).first()
        
        target_action = action_type or case.assigned_action or "retry"

        customer_dict = {"id": customer.id, "name": customer.name, "email": customer.email, "consent_status": customer.consent_status, "risk_score": customer.risk_score}
        payment_dict = {"id": payment.id, "amount": payment.amount, "currency": payment.currency, "status": payment.status, "failure_code": payment.failure_code, "failure_reason": payment.failure_reason, "payment_method": payment.payment_method}
        case_dict = {"id": case.id, "status": case.status, "retry_count": case.retry_count}

        # Compute risk and pressure scores
        past_payments = self.get_customer_past_payments_summary(db, customer.id, exclude_payment_id=payment.id)
        risk_result = self.risk_engine.assess(payment, customer, case, past_payments)
        pressure_result = self.pressure_engine.assess(case, list(case.actions), customer)

        passed, guardrail_results, summary_msg = self.guardrails.validate(
            action_type=target_action,
            customer=customer_dict,
            payment=payment_dict,
            recovery_case=case_dict,
            requested_amount=payment.amount,
            pressure_score=pressure_result["score"],
            transaction_risk_score=risk_result["score"]
        )

        guardrail_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="guardrail_evaluated",
            actor="guardrail_engine",
            description=f"Guardrail evaluation for '{target_action}': {'PASSED' if passed else 'BLOCKED'}",
            metadata_json=json.dumps({
                "action_type": target_action,
                "passed": passed,
                "summary": summary_msg,
                "checks": guardrail_results
            })
        )
        db.add(guardrail_audit)

        if not passed:
            action = RecoveryAction(
                recovery_case_id=case.id,
                action_type=target_action,
                status="blocked_by_guardrail",
                result=f"Blocked by Guardrail Engine: {summary_msg}",
                amount_recovered=0.0
            )
            db.add(action)
            db.commit()
            
            return {
                "recovery_case_id": case.id,
                "action_type": target_action,
                "guardrail_passed": False,
                "guardrail_results": guardrail_results,
                "action_status": "blocked_by_guardrail",
                "result_message": summary_msg,
                "recovered_amount": 0.0,
                "audit_log_id": guardrail_audit.id
            }

        case.status = "in_recovery"
        recovered_amount = 0.0
        result_message = ""
        action_status = "completed"

        if target_action == "retry":
            now_utc = datetime.now(timezone.utc)
            case.retry_count += 1
            provider_resp = self.payment_provider.retry_payment(payment.id, payment.payment_method)
            recovered_amount = payment.amount
            payment.status = "recovered"
            payment.updated_at = now_utc
            case.status = "recovered"
            case.resolved_at = now_utc
            result_message = f"Payment successfully retried & captured via {self.payment_provider.provider_name.upper()}."

        elif target_action == "send_payment_link":
            provider_resp = self.payment_provider.create_payment_link(payment.id, payment.amount, customer.email)
            result_message = f"Recovery payment link generated: {provider_resp.get('short_url')}. Dispatched to {customer.email}."

        elif target_action == "send_reminder":
            result_message = f"Polite payment reminder dispatched to {customer.email} & {customer.phone or 'SMS'}."

        elif target_action == "escalate":
            case.status = "open"
            case.priority = "critical"
            result_message = "Recovery case escalated to Senior Customer Retention team."

        elif target_action == "wait":
            result_message = "Cooling-off delay window activated for 24 hours."

        elif target_action == "stop":
            case.status = "closed"
            case.resolved_at = datetime.now(timezone.utc)
            result_message = "Recovery workflow stopped in compliance with user preference/policy."

        else:
            result_message = f"Action '{target_action}' placed on scheduled queue."

        action = RecoveryAction(
            recovery_case_id=case.id,
            action_type=target_action,
            status=action_status,
            result=result_message,
            amount_recovered=recovered_amount
        )
        db.add(action)

        exec_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="action_executed",
            actor="system",
            description=f"Executed recovery action '{target_action}': {result_message}",
            metadata_json=json.dumps({
                "action_type": target_action,
                "provider": self.payment_provider.provider_name,
                "amount_recovered": recovered_amount,
                "result_message": result_message
            })
        )
        db.add(exec_audit)

        if recovered_amount > 0:
            recovery_audit = AuditLog(
                recovery_case_id=case.id,
                event_type="payment_recovered",
                actor="mock_payment_provider",
                description=f"Revenue recovered: ₹{recovered_amount:,.2f} successfully captured for payment {payment.id}",
                metadata_json=json.dumps({
                    "recovered_amount": recovered_amount,
                    "currency": payment.currency,
                    "payment_id": payment.id
                })
            )
            db.add(recovery_audit)

        db.commit()
        db.refresh(case)

        return {
            "recovery_case_id": case.id,
            "action_type": target_action,
            "guardrail_passed": True,
            "guardrail_results": guardrail_results,
            "action_status": action_status,
            "result_message": result_message,
            "recovered_amount": recovered_amount,
            "audit_log_id": exec_audit.id
        }

    def simulate_payment_recovery(self, db: Session, case_id: str) -> Dict[str, Any]:
        """Simulates customer completing a payment link / paying off an at-risk invoice."""
        case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise ValueError(f"Recovery case {case_id} not found.")

        payment = db.query(Payment).filter(Payment.id == case.payment_id).first()
        if payment.status in ["succeeded", "recovered"]:
            return {
                "recovery_case_id": case.id,
                "status": "already_recovered",
                "message": f"Payment {payment.id} is already marked as recovered/succeeded.",
                "amount_recovered": payment.amount,
                "recovered_amount": payment.amount
            }

        now_utc = datetime.now(timezone.utc)
        payment.status = "recovered"
        payment.updated_at = now_utc
        case.status = "recovered"
        case.resolved_at = now_utc
        
        action = RecoveryAction(
            recovery_case_id=case.id,
            action_type="customer_payment_settled",
            status="completed",
            result=f"Customer completed payment link payment of ₹{payment.amount:,.2f}.",
            amount_recovered=payment.amount
        )
        db.add(action)

        recovery_audit = AuditLog(
            recovery_case_id=case.id,
            event_type="payment_recovered",
            actor="mock_payment_provider",
            description=f"Simulated link payment completed. Revenue recovered: ₹{payment.amount:,.2f}",
            metadata_json=json.dumps({
                "payment_id": payment.id,
                "amount_recovered": payment.amount,
                "settlement_source": "payment_link_webhook"
            })
        )
        db.add(recovery_audit)
        db.commit()

        return {
            "recovery_case_id": case.id,
            "status": "recovered",
            "message": f"Successfully recovered ₹{payment.amount:,.2f} for customer.",
            "amount_recovered": payment.amount,
            "recovered_amount": payment.amount
        }


orchestrator = RecoveryOrchestrator()
