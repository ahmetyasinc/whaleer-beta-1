# app/core/settings.py
import os
from datetime import timedelta

SIWS_JWT_SECRET = os.getenv("SIWS_JWT_SECRET", "CHANGE_ME")
SIWS_JWT_ALG = "HS256"
SIWS_JWT_EXPIRES = int(os.getenv("SIWS_JWT_EXPIRES_DAYS", "30"))  # gün
SIWS_COOKIE_NAME = "siws_session"
SIWS_COOKIE_SECURE = True  # prod'da True
SIWS_COOKIE_SAMESITE = "Lax"  # cross-site ise "None" + Secure True
SIWS_COOKIE_DOMAIN = os.getenv("SIWS_COOKIE_DOMAIN", None)  # ör: ".whaleer.com"
SIWS_COOKIE_PATH = "/"
SIWS_COOKIE_MAX_AGE = SIWS_JWT_EXPIRES * 24 * 60 * 60
