from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "routing-search"
    env: str = "development"
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8010
    redis_url: str = "redis://localhost:6379/0"
    demo_mode: bool = False
    mapmyindia_client_id: str = ""
    mapmyindia_client_secret: str = ""
    mapmyindia_rest_api_key: str | None = None
    request_timeout_seconds: float = 8.0
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1

    model_config = SettingsConfigDict(env_file=".env", env_prefix="ROUTING_SEARCH_")


settings = Settings()
