from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = "http://localhost:54321"
    supabase_anon_key: str = "local-anon-key"
    supabase_service_role_key: str = ""
    gemini_api_key: str = ""
    site_url: str = "https://www.themodernstories.in"
    sitemap_articles_indexable: bool = False
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    log_http_requests: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()