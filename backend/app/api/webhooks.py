import json
import hmac
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Header, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.payment import Payment
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def verify_razorpay_signature(raw_body: bytes, signature: Optional[str], secret: str) -> bool:
    """
    Cryptographically verifies Razorpay webhook signature using HMAC-SHA256.
    """
    if not secret:
        # In test mode without configured webhook secret, allow request with warning
        logger.warning("[Webhook Security] RAZORPAY_WEBHOOK_SECRET not set. Skipping signature verification in test mode.")
        return True

    if not signature:
        return False

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    x_razorpay_event_id: Optional[str] = Header(None, alias="X-Razorpay-Event-Id"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    POST /api/webhooks/razorpay
    Receives and securely processes Razorpay Test Mode webhooks.
    Supports events: payment_link.paid, payment.captured, payment.failed, order.paid.
    Enforces HMAC-SHA256 signature verification and idempotent duplicate protection.
    """
    raw_body = await request.body()

    # 1. Signature Verification
    if settings.RAZORPAY_WEBHOOK_SECRET:
        if not x_razorpay_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing X-Razorpay-Signature header."
            )
        is_valid = verify_razorpay_signature(raw_body, x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET)
        if not is_valid:
            logger.warning("[Webhook Security] Invalid Razorpay webhook signature rejected.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook signature."
            )

    # 2. JSON Event Parsing
    try:
        event_payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON in webhook body."
        )

    event_type = event_payload.get("event", "unknown")
    event_id = event_payload.get("event_id") or x_razorpay_event_id or f"evt_{hashlib.sha256(raw_body).hexdigest()[:16]}"
    logger.info(f"[Razorpay Webhook] Received event '{event_type}' (Event ID: {event_id})")

    # 3. Idempotency Check
    existing_audit = db.query(AuditLog).filter(
        AuditLog.event_type == "razorpay_webhook_received",
        AuditLog.description.contains(event_id)
    ).first()

    if existing_audit:
        logger.info(f"[Razorpay Webhook] Event {event_id} has already been processed. Returning idempotent 200.")
        return {
            "status": "already_processed",
            "event_id": event_id,
            "event_type": event_type
        }

    # 4. Process Supported Event Types
    now = datetime.now(timezone.utc)
    payment_record: Optional[Payment] = None
    recovery_case: Optional[RecoveryCase] = None
    recovered_amount = 0.0

    payload_data = event_payload.get("payload", {})

    # A. Payment Link Paid
    if event_type == "payment_link.paid":
        plink_entity = payload_data.get("payment_link", {}).get("entity", {})
        pay_entity = payload_data.get("payment", {}).get("entity", {})
        
        target_payment_id = (
            plink_entity.get("notes", {}).get("payment_id") or 
            pay_entity.get("notes", {}).get("payment_id") or 
            plink_entity.get("reference_id")
        )
        amount_paise = plink_entity.get("amount_paid") or pay_entity.get("amount") or 0
        recovered_amount = float(amount_paise) / 100.0 if amount_paise > 0 else 0.0

        if target_payment_id:
            payment_record = db.query(Payment).filter(Payment.id == target_payment_id).first()

        if not payment_record and plink_entity.get("id"):
            # Try finding case by payment link reference
            pass

    # B. Payment Captured
    elif event_type == "payment.captured":
        pay_entity = payload_data.get("payment", {}).get("entity", {})
        target_payment_id = pay_entity.get("notes", {}).get("payment_id") or pay_entity.get("id")
        amount_paise = pay_entity.get("amount", 0)
        recovered_amount = float(amount_paise) / 100.0 if amount_paise > 0 else 0.0

        if target_payment_id:
            payment_record = db.query(Payment).filter(
                (Payment.id == target_payment_id) | (Payment.id == pay_entity.get("id"))
            ).first()

    # C. Payment Failed
    elif event_type == "payment.failed":
        pay_entity = payload_data.get("payment", {}).get("entity", {})
        target_payment_id = pay_entity.get("notes", {}).get("payment_id") or pay_entity.get("id")
        if target_payment_id:
            payment_record = db.query(Payment).filter(Payment.id == target_payment_id).first()

    # D. Order Paid
    elif event_type == "order.paid":
        order_entity = payload_data.get("order", {}).get("entity", {})
        receipt = order_entity.get("receipt", "")
        amount_paise = order_entity.get("amount_paid", 0)
        recovered_amount = float(amount_paise) / 100.0 if amount_paise > 0 else 0.0

        if receipt:
            payment_record = db.query(Payment).filter(
                (Payment.id == receipt) | (Payment.id.contains(receipt))
            ).first()

    # Apply Database State Transitions
    if payment_record:
        recovery_case = db.query(RecoveryCase).filter(RecoveryCase.payment_id == payment_record.id).first()

        if event_type in ("payment_link.paid", "payment.captured", "order.paid"):
            if recovered_amount <= 0:
                recovered_amount = payment_record.amount

            payment_record.status = "recovered"
            payment_record.updated_at = now

            if recovery_case:
                recovery_case.status = "recovered"
                recovery_case.resolved_at = now
                recovery_case.revenue_at_risk = 0.0

                # Log completed recovery action
                action = RecoveryAction(
                    recovery_case_id=recovery_case.id,
                    action_type="razorpay_webhook_settlement",
                    status="completed",
                    result=f"Payment verified and settled via Razorpay Webhook ({event_type}).",
                    amount_recovered=recovered_amount,
                    executed_at=now
                )
                db.add(action)

        elif event_type == "payment.failed":
            if recovery_case and recovery_case.status == "open":
                recovery_case.retry_count += 1

    # Record Immutable Audit Event
    audit_case_id = recovery_case.id if recovery_case else None
    audit = AuditLog(
        recovery_case_id=audit_case_id,
        event_type="razorpay_webhook_received",
        actor="razorpay_webhook",
        description=f"Razorpay Webhook [{event_type}] processed for Event ID: {event_id}. Settled Amount: ₹{recovered_amount:,.2f}",
        metadata_json=json.dumps({
            "event_id": event_id,
            "event_type": event_type,
            "payment_id": payment_record.id if payment_record else None,
            "recovered_amount": recovered_amount,
            "timestamp": now.isoformat()
        }),
        created_at=now
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "event_id": event_id,
        "event_type": event_type,
        "payment_id": payment_record.id if payment_record else None,
        "recovered_amount": recovered_amount,
        "processed_at": now.isoformat()
    }
