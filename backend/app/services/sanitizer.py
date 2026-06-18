import re

def sanitize_pii(text: str) -> str:
    """
    Sanitizes PII from user inputs/documents:
    - Redacts Aadhaar numbers (4 digits, space, 4 digits, space, 4 digits, or contiguous 12 digits)
    - Redacts Indian mobile numbers (+91 or 0 prefix, 10-digit numbers starting with 6-9)
    - Redacts bank account numbers (10-18 consecutive digits)
    """
    if not text:
        return text
    
    # 1. Redact Aadhaar numbers: 4 space 4 space 4
    text = re.sub(r'\b\d{4}\s\d{4}\s\d{4}\b', '[REDACTED_AADHAAR]', text)
    text = re.sub(r'\b\d{12}\b', '[REDACTED_AADHAAR]', text)

    # 2. Redacts Indian mobile numbers: optional +91 or 0, then 10 digits starting with 6-9
    text = re.sub(r'\b(?:\+91|0)?[6-9]\d{9}\b', '[REDACTED_PHONE]', text)

    # 3. Redacts bank account numbers: 10-18 digits
    # (Matches any numerical token with length between 10 and 18 digits that isn't already handled)
    text = re.sub(r'\b\d{10,18}\b', '[REDACTED_ACCOUNT]', text)

    return text

def detect_injection_signals(text: str) -> bool:
    """
    Identifies potential prompt injection attempts in the document text.
    """
    if not text:
        return False
    signals = [
        "ignore",
        "disregard",
        "override",
        "system:",
        "you are now",
        "new instruction",
        "forget previous"
    ]
    lower_text = text.lower()
    for signal in signals:
        if signal in lower_text:
            return True
    return False
