from app.config import settings
from app.providers.base import PaymentProvider
from app.providers.mock_provider import MockPaymentProvider
from app.providers.razorpay_test_mode import RazorpayTestModeProvider

def get_payment_provider() -> PaymentProvider:
    if settings.PAYMENT_PROVIDER == "razorpay_test":
        return RazorpayTestModeProvider()
    return MockPaymentProvider()

__all__ = [
    "PaymentProvider",
    "MockPaymentProvider",
    "RazorpayTestModeProvider",
    "get_payment_provider"
]
