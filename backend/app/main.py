import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

from app.core.config import settings

# Setup standard structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s:%(lineno)d) - %(message)s"
)
logger = logging.getLogger("schemeconnect")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous Lifespan Management.
    Performs startup environment checks, resource checks, and graceful shutdown logs.
    """
    logger.info("Initializing SchemeConnect FastAPI application lifespan...")
    
    # Environment & Settings validation checks
    try:
        if not settings.supabase_url or "example.com" in settings.supabase_url:
            logger.warning("SUPABASE_URL may not be configured with a valid instance endpoint.")
        else:
            logger.info("SUPABASE_URL validation passed.")
            
        if not settings.gemini_api_key:
            logger.error("GEMINI_API_KEY is missing! Gemini operations will fail.")
        else:
            logger.info("GEMINI_API_KEY exists in settings config.")
            
        logger.info(f"Application environment registered as: '{settings.environment}'")
        
        # Trigger automated datastore seeding
        from app.core.seeder import seed_initial_schemes
        seed_initial_schemes()
        
        # Warm up and verify Supabase client connection singleton
        try:
            from app.core.database import get_supabase_client
            client = get_supabase_client()
            # Perform a light verification query
            client.table("schemes").select("id").limit(1).execute()
            logger.info("Supabase connection warmed up and verified successfully.")
        except Exception as warmup_error:
            logger.warning(f"Supabase database connection warmup failed: {warmup_error}")
        
    except Exception as env_error:
        logger.critical(f"Critical environment validation failure: {str(env_error)}")
        raise env_error

    yield

    logger.info("Shutting down SchemeConnect FastAPI application lifespan...")


# Instantiate FastAPI application
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="A senior-grade high-precision counselor portal engine for AP & TG Welfare Schemes Discovery & Legal Documents Audits.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Bind CORS Security Middlewares
import os

# Step 1: Read ALLOWED_ORIGINS comma-separated values from the environment
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins_list = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

# Step 2: Determine allowed CORS origins based on settings.environment
if settings.environment == "development":
    # Development mode: allow localhost dev URLs
    dev_defaults = [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "https://localhost:8080",
        "http://127.0.0.1:8080",
    ]
    if allowed_origins_list:
        allowed_origins = allowed_origins_list
    else:
        allowed_origins = dev_defaults
else:
    # Step 3: Production mode - only allow origins from the ALLOWED_ORIGINS env variable
    if not allowed_origins_raw:
        # If ALLOWED_ORIGINS env var is not set in production, log a CRITICAL warning but don't crash
        logger.critical(
            "CORS SEVERITY CRITICAL: ALLOWED_ORIGINS environment variable is not set in production! "
            "This will block all external client-side calls."
        )
        allowed_origins = []
    else:
        allowed_origins = allowed_origins_list

# Step 7: Add a startup log that prints allowed origins so devs can verify on deploy
logger.info(f"CORS allowed origins configured for environment '{settings.environment}': {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True, # Keep allow_credentials=True (needed for auth)
    allow_methods=["GET", "POST", "OPTIONS", "DELETE"], # Step 5: Change allow_methods to only allow used methods
    allow_headers=["Content-Type", "Authorization", "X-Session-ID"], # Step 6: Change allow_headers to only needed headers
)

# Initialize slowapi rate limiting architecture
app.state.limiter = limiter

async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Returns custom localized error response when rate limit thresholds are violated.
    Integrates Telugu and English advisory texts.
    """
    response = JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a moment. / అభ్యర్థనలు మించాయి. దయచేసి కొంత సేపు వేచి ఉండండి."}
    )
    try:
        # Re-inject standard CORS/Rate limiting headers if the request flow populated them
        if hasattr(request.state, "view_rate_limit"):
            response = request.app.state.limiter._inject_headers(response, request.state.view_rate_limit)
    except Exception:
        pass
    return response

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# ----------------------------------------------------
# IMPORT & MOUNT ROUTE MODULES
# ----------------------------------------------------
from app.routers.health import router as health_router
from app.routers.ingest import router as ingest_router
from app.routers.search import router as search_router
from app.routers.secure_match import router as secure_match_router
from app.routers.chat import router as chat_router
from app.routers.chat_sessions import router as chat_sessions_router
from app.routers.legal import router as legal_router
from app.routers.history import router as history_router
from app.routers.sensitive_eligibility import router as sensitive_eligibility_router

# Prefix bindings to map clean contracts
app.include_router(health_router, prefix="/api", tags=["General Diagnostics"])
app.include_router(ingest_router, prefix="/api", tags=["Welfare Database Ingestion"])
app.include_router(search_router, prefix="/api", tags=["Knowledge Retrieval (RAG)"])
app.include_router(secure_match_router, prefix="/api", tags=["Citizen Match Algorithm"])
app.include_router(chat_router, prefix="/api", tags=["Interactive Grounded Chat Bot"])
app.include_router(chat_sessions_router, prefix="/api", tags=["Chat Session Persistence"])
app.include_router(legal_router, prefix="/api", tags=["Contract Risk Auditing"])
app.include_router(history_router, prefix="/api", tags=["Citizen Audit Timelines"])
app.include_router(sensitive_eligibility_router, prefix="/api", tags=["Secure Sensitive Eligibility Evaluation"])

@app.get("/", include_in_schema=False)
def index_main_redirect():
    """
    Redirects index requests to FastAPI Swagger documentations for convenient developer onboarding.
    """
    return RedirectResponse(url="/docs")

logger.info("SchemeConnect Python FastAPI Backend modules registered successfully.")

