from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

# Initialize Limiter with per-IP rate-limiting and custom headers support
limiter = Limiter(key_func=get_remote_address, headers_enabled=True)

def get_rate_limit(rate_in_production: str) -> str:
    """
    Returns the rate limit string.
    In development mode (settings.environment == "development"), relaxed limits
    are used by multiplying the numeric rate limit value by 10.
    """
    if settings.environment == "development":
        parts = rate_in_production.split("/")
        if len(parts) == 2:
            try:
                num = int(parts[0])
                unit = parts[1]
                return f"{num * 10}/{unit}"
            except ValueError:
                pass
    return rate_in_production
