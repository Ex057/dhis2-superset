# /opt/superset/config/superset_config.py
from __future__ import annotations

import os
from celery.schedules import crontab


# ============================================================
# Helpers
# ============================================================
def env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def env_list(name: str, default: str = "") -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def redis_cache_config(redis_url: str, key_prefix: str, timeout: int) -> dict:
    return {
        "CACHE_TYPE": "RedisCache",
        "CACHE_DEFAULT_TIMEOUT": timeout,
        "CACHE_KEY_PREFIX": key_prefix,
        "CACHE_REDIS_URL": redis_url,
    }


# ============================================================
# Core environment
# ============================================================
SUPERSET_ENV = env("SUPERSET_ENV", "production")
SUPERSET_HOME = env("SUPERSET_HOME", "/home/superset/.superset")
VERSION_SHA = env("VERSION_SHA", "rev-hispug-20260306")

PUBLIC_URL = env("SUPERSET_PUBLIC_URL", "https://supersets.hispuganda.org")
PREFERRED_URL_SCHEME = env("PREFERRED_URL_SCHEME", "https")

# ============================================================
# Secrets
# ============================================================
SECRET_KEY = env("SUPERSET_SECRET_KEY", "change-me-in-production")
PREVIOUS_SECRET_KEY = env("SUPERSET_PREVIOUS_SECRET_KEY")

# Embedded / guest token settings
GUEST_ROLE_NAME = env("GUEST_ROLE_NAME", "Public")
GUEST_TOKEN_JWT_SECRET = env("GUEST_TOKEN_JWT_SECRET", SECRET_KEY)
GUEST_TOKEN_JWT_ALGO = env("GUEST_TOKEN_JWT_ALGO", "HS256")
GUEST_TOKEN_HEADER_NAME = env("GUEST_TOKEN_HEADER_NAME", "X-GuestToken")
GUEST_TOKEN_JWT_EXP_SECONDS = env_int("GUEST_TOKEN_JWT_EXP_SECONDS", 300)
GUEST_TOKEN_JWT_AUDIENCE = env("GUEST_TOKEN_JWT_AUDIENCE", "superset")

# ============================================================
# Metadata database
# ============================================================
SQLALCHEMY_DATABASE_URI = env("SUPERSET_DB_URI")
if not SQLALCHEMY_DATABASE_URI:
    raise RuntimeError("SUPERSET_DB_URI is not set")

SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_pre_ping": True,
    "pool_recycle": env_int("SQLALCHEMY_POOL_RECYCLE", 3600),
    "pool_size": env_int("SQLALCHEMY_POOL_SIZE", 20),
    "max_overflow": env_int("SQLALCHEMY_MAX_OVERFLOW", 40),
}

# ============================================================
# Reverse proxy / cookies / CSRF
# ============================================================
ENABLE_PROXY_FIX = env_bool("ENABLE_PROXY_FIX", True)
PROXY_FIX_CONFIG = {
    "x_for": 1,
    "x_proto": 1,
    "x_host": 1,
    "x_port": 1,
    "x_prefix": 1,
}

EMBEDDED_SUPERSET_ENABLED = env_bool("SUPERSET_FEATURE_EMBEDDED_SUPERSET", True)

# For embedded/SSO use, None + Secure is the correct default.
SESSION_COOKIE_SAMESITE = env(
    "SESSION_COOKIE_SAMESITE",
    "None" if EMBEDDED_SUPERSET_ENABLED else "Lax",
)
SESSION_COOKIE_SECURE = env_bool(
    "SESSION_COOKIE_SECURE",
    str(PUBLIC_URL).startswith("https://"),
)
SESSION_COOKIE_HTTPONLY = True
PERMANENT_SESSION_LIFETIME = env_int("SESSION_TTL_SECONDS", 60 * 60 * 8)

WTF_CSRF_ENABLED = env_bool("WTF_CSRF_ENABLED", True)
WTF_CSRF_TIME_LIMIT = None
WTF_CSRF_EXEMPT_LIST = [
    # Superset defaults
    "superset.charts.data.api.data",
    "superset.dashboards.api.cache_dashboard_screenshot",
    "superset.views.core.explore_json",
    "superset.views.core.log",
    "superset.views.datasource.views.samples",
]

# ============================================================
# Rate limiting
# ============================================================
RATELIMIT_ENABLED = env_bool("RATELIMIT_ENABLED", SUPERSET_ENV == "production")
RATELIMIT_STORAGE_URI = env("RATELIMIT_STORAGE_URI", "redis://127.0.0.1:6379/5")
RATELIMIT_HEADERS_ENABLED = True
RATELIMIT_APPLICATION = env("RATELIMIT_APPLICATION", "50 per second")
AUTH_RATE_LIMITED = env_bool("AUTH_RATE_LIMITED", True)
AUTH_RATE_LIMIT = env("AUTH_RATE_LIMIT", "5 per second")

# ============================================================
# Redis / cache
# ============================================================
REDIS_BROKER_URL = env("REDIS_BROKER_URL", "redis://127.0.0.1:6379/0")
REDIS_RESULTS_URL = env("REDIS_RESULTS_URL", "redis://127.0.0.1:6379/1")
REDIS_CACHE_URL = env("REDIS_CACHE_URL", "redis://127.0.0.1:6379/2")

CACHE_CONFIG = redis_cache_config(
    REDIS_CACHE_URL,
    "superset_cache_",
    env_int("CACHE_DEFAULT_TIMEOUT", 300),
)

DATA_CACHE_CONFIG = redis_cache_config(
    REDIS_CACHE_URL,
    "superset_data_cache_",
    env_int("DATA_CACHE_DEFAULT_TIMEOUT", 300),
)

FILTER_STATE_CACHE_CONFIG = redis_cache_config(
    REDIS_CACHE_URL,
    "superset_filter_state_",
    env_int("FILTER_STATE_CACHE_DEFAULT_TIMEOUT", 86400),
)

EXPLORE_FORM_DATA_CACHE_CONFIG = redis_cache_config(
    REDIS_CACHE_URL,
    "superset_explore_form_data_",
    env_int("EXPLORE_FORM_DATA_CACHE_DEFAULT_TIMEOUT", 86400),
)

THUMBNAIL_CACHE_CONFIG = redis_cache_config(
    REDIS_CACHE_URL,
    "superset_thumbnail_",
    env_int("THUMBNAIL_CACHE_DEFAULT_TIMEOUT", 86400),
)

# ============================================================
# Celery / async / alerts & reports
# ============================================================
class CeleryConfig:
    broker_url = REDIS_BROKER_URL
    result_backend = REDIS_RESULTS_URL
    imports = (
        "superset.sql_lab",
        "superset.tasks.scheduler",
    )
    worker_prefetch_multiplier = 1
    task_acks_late = True
    task_annotations = {
        "sql_lab.get_sql_results": {
            "rate_limit": env("SQLLAB_ASYNC_RATE_LIMIT", "100/s"),
        },
    }
    beat_schedule = {
        "reports.scheduler": {
            "task": "reports.scheduler",
            "schedule": crontab(minute="*", hour="*"),
        },
        "reports.prune_log": {
            "task": "reports.prune_log",
            "schedule": crontab(minute=0, hour=0),
        },
    }


CELERY_CONFIG = CeleryConfig

# ============================================================
# Email / notifications
# ============================================================
EMAIL_NOTIFICATIONS = env_bool("EMAIL_NOTIFICATIONS", True)

SMTP_HOST = env("SMTP_HOST", "")
SMTP_PORT = env_int("SMTP_PORT", 587)
SMTP_USER = env("SMTP_USER", "")
SMTP_PASSWORD = env("SMTP_PASSWORD", "")
SMTP_MAIL_FROM = env("SMTP_MAIL_FROM", "no-reply@supersets.hispuganda.org")
SMTP_STARTTLS = env_bool("SMTP_STARTTLS", True)
SMTP_SSL = env_bool("SMTP_SSL", False)

# ============================================================
# Public / embedded access
# ============================================================
AUTH_ROLE_PUBLIC = env("AUTH_ROLE_PUBLIC", "Public")
PUBLIC_ROLE_LIKE = env("PUBLIC_ROLE_LIKE", "Public")

FEATURE_FLAGS = {
    "ALERT_REPORTS": env_bool("FEATURE_ALERT_REPORTS", True),
    "ALERTS_ATTACH_REPORTS": env_bool("FEATURE_ALERTS_ATTACH_REPORTS", True),
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_RBAC": True,
    "EMBEDDABLE_CHARTS": env_bool("FEATURE_EMBEDDABLE_CHARTS", True),
    "DISABLE_EMBEDDED_SUPERSET_LOGOUT": env_bool(
        "FEATURE_DISABLE_EMBEDDED_SUPERSET_LOGOUT", True
    ),
    "DASHBOARD_RBAC": env_bool("FEATURE_DASHBOARD_RBAC", True),
    "GLOBAL_ASYNC_QUERIES": env_bool("FEATURE_GLOBAL_ASYNC_QUERIES", False),
    "ENABLE_DASHBOARD_SCREENSHOT_ENDPOINTS": env_bool(
        "FEATURE_ENABLE_DASHBOARD_SCREENSHOT_ENDPOINTS", True
    ),
    "ENABLE_DASHBOARD_DOWNLOAD_WEBDRIVER_SCREENSHOT": env_bool(
        "FEATURE_ENABLE_DASHBOARD_DOWNLOAD_WEBDRIVER_SCREENSHOT", True
    ),
    "PLAYWRIGHT_REPORTS_AND_THUMBNAILS": env_bool(
        "FEATURE_PLAYWRIGHT_REPORTS_AND_THUMBNAILS", False
    ),
    "ALLOW_FULL_CSV_EXPORT": env_bool("FEATURE_ALLOW_FULL_CSV_EXPORT", False),
    "DRILL_BY": env_bool("FEATURE_DRILL_BY", True),
}

ENABLE_PROXY_FIX=True
PREFERRED_URL_SCHEME="https"

ALERT_REPORTS = FEATURE_FLAGS["ALERT_REPORTS"]

# ============================================================
# Webdriver / reports / screenshots
# ============================================================
WEBDRIVER_TYPE = env("WEBDRIVER_TYPE", "chrome")
WEBDRIVER_BASEURL = env("WEBDRIVER_BASEURL", PUBLIC_URL)
SCREENSHOT_LOCATE_WAIT = env_int("SCREENSHOT_LOCATE_WAIT", 10)
SCREENSHOT_LOAD_WAIT = env_int("SCREENSHOT_LOAD_WAIT", 60)

# ============================================================
# CORS
# ============================================================
ENABLE_CORS = env_bool("ENABLE_CORS", True)
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "origins": env_list(
        "CORS_ORIGINS",
        "https://supersets.hispuganda.org",
    ),
}

# ============================================================
# Talisman / CSP
# ============================================================
TALISMAN_ENABLED = env_bool("TALISMAN_ENABLED", True)
FRAME_ANCESTORS = env_list(
    "TALISMAN_FRAME_ANCESTORS",
    "'self',https://supersets.hispuganda.org",
)
CSP_CONNECT_SRC_EXTRA = env_list("CSP_CONNECT_SRC_EXTRA", "")
CSP_IMG_SRC_EXTRA = env_list("CSP_IMG_SRC_EXTRA", "")

TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:", *CSP_IMG_SRC_EXTRA],
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "connect-src": ["'self'", "blob:", *CSP_CONNECT_SRC_EXTRA],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "frame-ancestors": FRAME_ANCESTORS,
    },
    "content_security_policy_nonce_in": ["script-src"],
    "force_https": False,
    "session_cookie_secure": SESSION_COOKIE_SECURE,
}

# Keep empty here; if Apache/Nginx injects X-Frame-Options upstream,
# remove/override it there instead of here.
HTTP_HEADERS = {}

# ============================================================
# Branding
# ============================================================
APP_NAME = env("APP_NAME", "HISP Uganda Analytics")
APP_ICON = env("APP_ICON", "/static/assets/images/hispug-logo.png")
LOGO_TARGET_PATH = env("LOGO_TARGET_PATH", "/")
LOGO_TOOLTIP = env("LOGO_TOOLTIP", "HISP Uganda")
LOGO_RIGHT_TEXT = env("LOGO_RIGHT_TEXT", "")

FAVICONS = [
    {
        "href": env(
            "FAVICON_HREF",
            "/static/assets/images/hispug-favicon.png",
        )
    }
]

FAB_API_SWAGGER_UI = env_bool("FAB_API_SWAGGER_UI", True)
FAB_ADD_SECURITY_API = env_bool("FAB_ADD_SECURITY_API", True)

# ============================================================
# Theme
# ============================================================
HISPUG_BLUE = env("HISPUG_BLUE", "#1B44B8")
HISPUG_RED = env("HISPUG_RED", "#D61322")
HISPUG_TEXT = env("HISPUG_TEXT", "#2F3B45")
HISPUG_BG = env("HISPUG_BG", "#FFFFFF")

THEME_DEFAULT = {
    "token": {
        "brandAppName": APP_NAME,
        "brandLogoAlt": LOGO_TOOLTIP or APP_NAME,
        "brandLogoUrl": APP_ICON,
        "brandLogoHref": LOGO_TARGET_PATH or "/",
        "brandLogoHeight": env("BRAND_LOGO_HEIGHT", "36px"),
        "brandIconMaxWidth": env_int("BRAND_ICON_MAX_WIDTH", 180),
        "colorPrimary": HISPUG_BLUE,
        "colorLink": HISPUG_BLUE,
        "colorError": "#DB4437",
        "colorWarning": "#F4B400",
        "colorSuccess": "#0F9D58",
        "colorInfo": "#5AA5E0",
        "fontUrls": [],
        "fontFamily": "Inter, Helvetica, Arial, sans-serif",
        "fontFamilyCode": "'IBM Plex Mono', 'Courier New', monospace",
        "transitionTiming": 0.3,
        "borderRadius": 6,
        "colorEditorSelection": "#E8EEF9",
    },
    "algorithm": "default",
}

THEME_DARK = {
    **THEME_DEFAULT,
    "token": {
        **THEME_DEFAULT["token"],
        "colorEditorSelection": "#5C4D1A",
    },
    "algorithm": "dark",
}

ENABLE_UI_THEME_ADMINISTRATION = env_bool("ENABLE_UI_THEME_ADMINISTRATION", True)

EXTRA_CATEGORICAL_COLOR_SCHEMES = [
    {
        "id": "hispug-brand",
        "label": "HISP Uganda Brand",
        "description": "Brand blue/red with accessible neutrals",
        "isDefault": True,
        "colors": [
            HISPUG_BLUE,
            "#0A6AA1",
            "#5AA5E0",
            HISPUG_RED,
            "#F04B3A",
            "#F4B400",
            "#0F9D58",
            "#DB4437",
            "#6A737D",
            "#AAB2BD",
        ],
    }
]

EXTRA_SEQUENTIAL_COLOR_SCHEMES = [
    {
        "id": "hispug-seq-blue",
        "label": "HISPUG Sequential (Blue)",
        "isDiverging": False,
        "colors": ["#E8EEF9", "#AFC2EE", "#6E93DE", HISPUG_BLUE],
    }
]

# ============================================================
# Query / UX limits
# ============================================================
ROW_LIMIT = env_int("ROW_LIMIT", 5000)
SAMPLES_ROW_LIMIT = env_int("SAMPLES_ROW_LIMIT", 1000)
NATIVE_FILTER_DEFAULT_ROW_LIMIT = env_int("NATIVE_FILTER_DEFAULT_ROW_LIMIT", 1000)
FILTER_SELECT_ROW_LIMIT = env_int("FILTER_SELECT_ROW_LIMIT", 10000)
QUERY_SEARCH_LIMIT = env_int("QUERY_SEARCH_LIMIT", 1000)

SUPERSET_CLIENT_RETRY_ATTEMPTS = env_int("SUPERSET_CLIENT_RETRY_ATTEMPTS", 3)
SUPERSET_CLIENT_RETRY_DELAY = env_int("SUPERSET_CLIENT_RETRY_DELAY", 1000)

# ============================================================
# Optional operational toggles
# ============================================================
SHOW_STACKTRACE = env_bool("SHOW_STACKTRACE", False)
DEBUG = env_bool("FLASK_DEBUG", False)
FLASK_USE_RELOAD = env_bool("FLASK_USE_RELOAD", False)
PROFILING = env_bool("PROFILING", False)

# ============================================================
# Misc
# ============================================================
# Keep this if you want app version / theme asset busting after rebranding updates.
# If you modify logos/theme and do not see changes, bump VERSION_SHA and restart.

# === MANAGED: SUPERSET_PUBLIC_FIX BEGIN ===
# Public dashboards endpoint: /api/v1/dashboard/public/<token>
PUBLIC_DASHBOARD_ENABLED = True
PUBLIC_DASHBOARD_ACCESS = True

# Embedded dashboards feature flag (preserve existing flags)
try:
    FEATURE_FLAGS
except NameError:
    FEATURE_FLAGS = {}
FEATURE_FLAGS.update({
    "EMBEDDED_SUPERSET": True,
})

# Reverse proxy correctness (Apache TLS termination)
ENABLE_PROXY_FIX = True
PREFERRED_URL_SCHEME = "https"

# CORS for production domain (+ optional localhost)
CORS_OPTIONS = {
  "supports_credentials": True,
  "origins": ['https://supersets.hispuganda.org'],
}

# Cache-busting for static assets (helps prevent ChunkLoadError)
STATIC_ASSETS_VERSION = os.environ.get("SUPERSET_STATIC_ASSETS_VERSION", "dev")
# === MANAGED: SUPERSET_PUBLIC_FIX END ===