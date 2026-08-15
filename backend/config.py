from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    openai_api_key: str = "disabled"
    elevenlabs_api_key: str = "sk_96a11af5861acd556279cc5750bc0966227d977d1fefbdd8"
    gemini_api_key: str = "AQ.Ab8RN6Lix9o73hpNpxxXl1cHtV0G3AM3x2Hf7m1_RTV_9gEThQ"
    database_url: str = "sqlite:///./recruitment.db"
    secret_key: str ="pixel36"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    chroma_db_path: str = "./chroma_db"
    whisper_model: str = "base"
    max_questions: int = 10
    max_interview_minutes: int = 15

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()