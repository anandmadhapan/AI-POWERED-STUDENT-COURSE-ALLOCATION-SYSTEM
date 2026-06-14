import os


class BaseConfig(object):
    SECRET_KEY: str = os.getenv('SECRET_KEY', '691a03c2f0a7a449a00a394ca9deca08a3c4602f0995d8376bc60884c184c991')
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google Gemini via ADK
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
