import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.providers.base import PaymentProvider

class MockPaymentProvider(PaymentProvider):
    """
    In-memory / synthetic payment provider simulating gateway behaviors,
    soft/hard failures, instant retries, simulated payment links, and recoveries
    without moving real money.
    """

    @property
    def provider_name(self) -> str:
        return "mock"

    def create_payment(
        self, 
        customer_id: str, 
        amount: float, 
        currency: str = "INR", 
        payment_method: str = "credit_card",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        payment_id = f"pay_mock_{uuid.uuid4().hex[:12]}"
        return {
            "id": payment_id,
            "customer_id": customer_id,
            "amount": amount,
            "currency": currency,
            "status": "succeeded",
            "payment_method": payment_method,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {},
            "provider": self.provider_name
        }

    def get_payment(self, payment_id: str) -> Dict[str, Any]:
        return {
            "id": payment_id,
            "status": "succeeded",
            "provider": self.provider_name
        }

    def simulate_failure(
        self, 
        customer_id: str, 
        amount: float, 
        failure_reason: str,
        failure_code: Optional[str] = None,
        payment_method: str = "credit_card"
    ) -> Dict[str, Any]:
        payment_id = f"pay_mock_{uuid.uuid4().hex[:12]}"
        return {
            "id": payment_id,
            "customer_id": customer_id,
            "amount": amount,
            "currency": "INR",
            "status": "failed",
            "failure_code": failure_code or "ERR_GATEWAY_DECLINE",
            "failure_reason": failure_reason,
            "payment_method": payment_method,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "provider": self.provider_name
        }

    def retry_payment(self, payment_id: str, payment_method: Optional[str] = None) -> Dict[str, Any]:
        retry_id = f"rtr_mock_{uuid.uuid4().hex[:10]}"
        return {
            "retry_id": retry_id,
            "original_payment_id": payment_id,
            "status": "success",
            "message": "Simulated retry executed successfully via secondary gateway routing.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "provider": self.provider_name
        }

    def create_payment_link(
        self, 
        payment_id: str, 
        amount: float, 
        customer_email: str, 
        description: str = "Payment Recovery Link"
    ) -> Dict[str, Any]:
        link_id = f"plink_{uuid.uuid4().hex[:10]}"
        short_url = f"https://pay.recoverai.demo/{link_id}"
        return {
            "payment_link_id": link_id,
            "short_url": short_url,
            "payment_id": payment_id,
            "amount": amount,
            "currency": "INR",
            "recipient": customer_email,
            "status": "issued",
            "expires_at": "in 7 days",
            "provider": self.provider_name
        }

    def simulate_recovery(self, payment_id: str, amount: float) -> Dict[str, Any]:
        return {
            "payment_id": payment_id,
            "amount_recovered": amount,
            "currency": "INR",
            "status": "recovered",
            "settlement_status": "simulated_settled",
            "recovered_at": datetime.now(timezone.utc).isoformat(),
            "provider": self.provider_name
        }
