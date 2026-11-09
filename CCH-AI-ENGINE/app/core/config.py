import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Base paths
ai_engine_dir = Path(__file__).resolve().parent.parent.parent
root_dir = ai_engine_dir.parent.parent

# Detect environment: 'development', 'staging', or 'production'
active_env = os.getenv("ENVIRONMENT", "development").lower()

# Priority-based env loading:
# 1. Environment-specific file (e.g. .env.development, .env.staging, .env.production)
# 2. Local CCH-AI-ENGINE/.env
# 3. Root workspace .env
candidate_paths = [
    ai_engine_dir / f".env.{active_env}",
    ai_engine_dir / ".env",
    root_dir / f".env.{active_env}",
    root_dir / ".env",
]

for env_path in candidate_paths:
    if env_path.exists():
        load_dotenv(env_path, override=False)
        break


class Settings(BaseModel):
    # App General
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    APP_NAME: str = "CCH AI Engine (CS Virtual Omnichannel Agent)"
    APP_VERSION: str = "2.5.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Primary LLM Selection (openai | gemini | mistral | deepseek | ollama | rule_based)
    PRIMARY_LLM_PROVIDER: str = os.getenv("PRIMARY_LLM_PROVIDER", "openai").lower()

    # Dynamic AI Model Names & Keys (NO HARDCODING!)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", os.getenv("TIER1_OPENAI_API_KEY", ""))
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("TIER1_GEMINI_API_KEY", ""))
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    LOCAL_OLLAMA_URL: str = os.getenv("LOCAL_OLLAMA_URL", "http://localhost:11434/v1")
    LOCAL_OLLAMA_MODEL: str = os.getenv("LOCAL_OLLAMA_MODEL", "qwen2.5:7b")

    # Legacy / Router Support
    NINE_ROUTER_API_KEY: str = os.getenv("9ROUTER_API_KEY", "")
    NINE_ROUTER_URL: str = os.getenv("9ROUTER_URL", "http://localhost:20128/v1")

    # MariaDB / MySQL CCH Database Connection
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "cch")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))

    # CCH Backend API Connection
    CCH_BE_URL: str = os.getenv("CCH_BE_URL", "http://localhost:8081")
    SERVICE_TOKEN: str = os.getenv("AI_SERVICE_TOKEN", "cch-ai-virtual-cs-secret-key-2026")

    # Autonomous Agentic Scraper & Intake Worker
    AGENTIC_AUTO_POLL_ENABLED: bool = os.getenv("AGENTIC_AUTO_POLL_ENABLED", "true").lower() in ("true", "1", "yes")
    AGENTIC_POLL_INTERVAL_SECONDS: int = int(os.getenv("AGENTIC_POLL_INTERVAL_SECONDS", "60"))
    AGENTIC_AUTO_CREATE_TICKET: bool = os.getenv("AGENTIC_AUTO_CREATE_TICKET", "true").lower() in ("true", "1", "yes")
    AGENTIC_AUTO_REPLY: bool = os.getenv("AGENTIC_AUTO_REPLY", "true").lower() in ("true", "1", "yes")
    AGENTIC_DRY_RUN: bool = os.getenv("AGENTIC_DRY_RUN", "false").lower() in ("true", "1", "yes")
    AGENTIC_MIN_URGENCY_TO_TICKET: str = os.getenv("AGENTIC_MIN_URGENCY_TO_TICKET", "P2_TINGGI")

    # Medsos Webhook & Scraper Credentials
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_WEBHOOK_URL: str = os.getenv("TELEGRAM_WEBHOOK_URL", "")

    META_APP_ID: str = os.getenv("META_APP_ID", "")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET", "")
    META_ACCESS_TOKEN: str = os.getenv("META_ACCESS_TOKEN", "")
    META_VERIFY_TOKEN: str = os.getenv("META_VERIFY_TOKEN", "cch_posind_meta_verify_token_2026")

    TWITTER_BEARER_TOKEN: str = os.getenv("TWITTER_BEARER_TOKEN", "")
    TWITTER_API_KEY: str = os.getenv("TWITTER_API_KEY", "")
    TWITTER_API_SECRET: str = os.getenv("TWITTER_API_SECRET", "")


settings = Settings()
