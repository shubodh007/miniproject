import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field, computed_field

# Base folder reference
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # App General Configs
    app_name: str = "SchemeConnect AP Backend"
    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")
    
    # API Integration Credentials (MUST be declared in .env)
    gemini_api_key: str = Field(..., validation_alias="GEMINI_API_KEY")
    supabase_url: str = Field(..., validation_alias="SUPABASE_URL")
    supabase_service_key: str = Field(..., validation_alias="SUPABASE_KEY")
    gemini_model: str = Field(default="gemini-3.5-flash", validation_alias="GEMINI_MODEL")
    
    # Prompts Location
    @computed_field
    @property
    def prompts_dir(self) -> Path:
        p_dir = BASE_DIR / "app" / "prompts"
        if not p_dir.exists():
            # Fallback to absolute or sibling directory depending on build launch path
            return BASE_DIR / "prompts"
        return p_dir

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

# Singleton Configuration Object
settings = Settings()
