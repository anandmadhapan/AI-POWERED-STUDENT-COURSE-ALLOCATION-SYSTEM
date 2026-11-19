import os
import secrets


class BaseConfig(object):
    # No hardcoded fallback: a key committed to a public repo can be used to forge tokens.
    # Without SECRET_KEY set, a random key is generated per process (sessions reset on restart).
    SECRET_KEY: str = os.getenv('SECRET_KEY') or secrets.token_hex(32)
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google Gemini via ADK
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
