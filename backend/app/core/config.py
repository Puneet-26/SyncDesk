from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator
import os
import json

class Settings(BaseSettings):
    model_config = ConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Integrated AICTE Institution Complaint Monitoring and Coordination System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aicte_sih_super_secret_production_ready_jwt_key_2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"
    
    # Database (SQLite default for local dev, PostgreSQL for Supabase)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aicte_complaints.db")
    AUTO_SEED: bool = os.getenv("AUTO_SEED", "true").lower() in ("true", "1", "yes")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        return v
    
    # Overlap Engine Thresholds
    DUPLICATE_TEXT_THRESHOLD: float = 0.82
    POTENTIAL_ISSUE_TEXT_THRESHOLD: float = 0.55
    INSTITUTION_FUZZY_THRESHOLD: float = 85.0
    
    # SLA Defaults (in days)
    DEFAULT_SLA_DAYS_CRITICAL: int = 15
    DEFAULT_SLA_DAYS_HIGH: int = 30
    DEFAULT_SLA_DAYS_MEDIUM: int = 45
    DEFAULT_SLA_DAYS_LOW: int = 60
    SLA_APPROACHING_DAYS: int = 7

settings = Settings()
