from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class PaymentProvider(ABC):
    """
    Abstract base interface for payment operations and recovery execution.
    Allows transparent switching between MockPaymentProvider and RazorpayTestModeProvider
    without modifying the recovery agent or guardrail logic.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the provider identifier (e.g., 'mock', 'razorpay_test')."""
        pass

    @abstractmethod
    def create_payment(
        self, 
        customer_id: str, 
        amount: float, 
        currency: str = "INR", 
        payment_method: str = "credit_card",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates a payment request."""
        pass

    @abstractmethod
    def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Fetches payment status and details."""
        pass

    @abstractmethod
    def simulate_failure(
        self, 
        customer_id: str, 
        amount: float, 
        failure_reason: str,
        failure_code: Optional[str] = None,
        payment_method: str = "credit_card"
    ) -> Dict[str, Any]:
        """Simulates a failed transaction for demo/testing."""
        pass

    @abstractmethod
    def retry_payment(self, payment_id: str, payment_method: Optional[str] = None) -> Dict[str, Any]:
        """Executes a retry attempt on a failed payment."""
        pass

    @abstractmethod
    def create_payment_link(
        self, 
        payment_id: str, 
        amount: float, 
        customer_email: str, 
        description: str = "Payment Recovery Link"
    ) -> Dict[str, Any]:
        """Generates a dynamic payment recovery link."""
        pass

    @abstractmethod
    def simulate_recovery(self, payment_id: str, amount: float) -> Dict[str, Any]:
        """Simulates a successful customer recovery settlement."""
        pass
