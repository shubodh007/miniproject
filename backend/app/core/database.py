import logging
import threading
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("schemeconnect")

_supabase_client: Client | None = None
_lock = threading.Lock()

def get_supabase_client() -> Client:
    """
    Initializes and returns a connection client to the Supabase PostgreSQL backend.
    Uses a thread-safe singleton pattern to avoid repeated client instantiation.
    """
    global _supabase_client
    if _supabase_client is None:
        with _lock:
            if _supabase_client is None:
                try:
                    logger.info("Initializing Supabase client singleton...")
                    _supabase_client = create_client(
                        settings.supabase_url,
                        settings.supabase_service_key
                    )
                    logger.info("Supabase client singleton initialized successfully.")
                except Exception as e:
                    logger.error(f"Error initializing Supabase connection: {str(e)}")
                    raise e
    return _supabase_client

def reset_supabase_client():
    """
    Force re-initialization. Use only in tests. 
    WARNING: This is for test isolation only and should not be used in main application flow.
    """
    global _supabase_client
    with _lock:
        _supabase_client = None
