"""
Application configuration.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-change-in-production"
    # Gemini (Google) — set GEMINI_API_KEY in .env for chat
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    # Legacy / optional: AI_API_KEY for other backends
    AI_API_KEY = os.environ.get("AI_API_KEY", "")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    ENV = "development"


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    ENV = "production"
