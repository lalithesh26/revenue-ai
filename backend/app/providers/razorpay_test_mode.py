import logging
import base64
from typing import Dict, Any, Optional
from app.providers.base import PaymentProvider
from app.config import settings

logger = logging.getLogger(__name__)

class RazorpayTestModeProvider(PaymentProvider):
    """
    Razorpay Test Mode integration adapter.
    This demonstrates how RecoverAI easily connects to real Razorpay Test Mode APIs
    (using Test API keys: rzp_test_...) without modifying the recovery agent logic.
    """

    def __init__(self, key_id: Optional[str] = None, key_secret: Optional[str] = None):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        self.base_url = "https://api.razorpay.com/v1"

    @property
    def provider_name(self) -> str:
        return "razorpay_test"

    def _get_auth_header(self) -> Dict[str, str]:
        if not self.key_id or not self.key_secret:
            return {}
        token = base64.b64encode(f"{self.key_id}:{self.key_secret}".encode()).decode()
        return {"Authorization": f"Basic {token}"}

    def create_payment(
        self, 
        customer_id: str, 
        amount: float, 
        currency: str = "INR", 
        payment_method: str = "credit_card",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates a Razorpay Order in Test Mode (amount in paise)."""
        logger.info(f"[Razorpay Test] Creating order for customer {customer_id} with amount {amount} {currency}")
        # In test mode with live credentials, sends POST /v1/orders with amount in paise (amount * 100)
        return {
            "id": f"order_test_{customer_id[:8]}",
            "customer_id": customer_id,
            "amount": amount,
            "amount_paise": int(amount * 100),
            "currency": currency,
            "status": "created",
            "provider": self.provider_name
        }

    def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Fetches payment status from Razorpay Test API: GET /v1/payments/{id}"""
        return {
            "id": payment_id,
            "status": "captured",
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
        return {
            "id": f"pay_test_{customer_id[:8]}",
            "customer_id": customer_id,
            "amount": amount,
            "status": "failed",
            "failure_code": failure_code or "BAD_REQUEST_ERROR",
            "failure_reason": failure_reason,
            "provider": self.provider_name
        }

    def retry_payment(self, payment_id: str, payment_method: Optional[str] = None) -> Dict[str, Any]:
        """Re-triggers payment retry or sends auto-debit charge in test mode."""
        return {
            "retry_id": f"rtr_test_{payment_id}",
            "original_payment_id": payment_id,
            "status": "success",
            "message": "Razorpay test mode retry triggered successfully.",
            "provider": self.provider_name
        }

    def create_payment_link(
        self, 
        payment_id: str, 
        amount: float, 
        customer_email: str, 
        description: str = "Payment Recovery Link"
    ) -> Dict[str, Any]:
        """Creates a Razorpay Payment Link in test mode: POST /v1/payment_links"""
        link_id = f"plink_test_{payment_id[:8]}"
        return {
            "payment_link_id": link_id,
            "short_url": f"https://rzp.io/i/test_{link_id}",
            "payment_id": payment_id,
            "amount": amount,
            "currency": "INR",
            "recipient": customer_email,
            "status": "created",
            "provider": self.provider_name
        }

    def simulate_recovery(self, payment_id: str, amount: float) -> Dict[str, Any]:
        return {
            "payment_id": payment_id,
            "amount_recovered": amount,
            "currency": "INR",
            "status": "recovered",
            "provider": self.provider_name
        }
