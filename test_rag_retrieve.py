import sys
import os
import logging

# Ensure logging is routed to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Set python path
sys.path.insert(0, './backend')

print("Loading settings...")
from app.core.config import settings
print("Gemini API Key defined?", bool(settings.gemini_api_key))

print("Loading rag_service...")
from app.services.rag import rag_service

print("Calling retrieve_context with query 'Amma Vodi'...")
try:
    hits = rag_service.retrieve_context(query="Amma Vodi", top_k=2)
    print(f"Sucessfully retrieved {len(hits)} hits!")
    for i, h in enumerate(hits):
        print(f"Hit {i+1}:")
        print(f"  Scheme ID: {h.scheme_id}")
        print(f"  Scheme Name: {h.scheme_name}")
        print(f"  Similarity: {h.similarity}")
        print(f"  Text: {h.chunk_text[:100]}...")
except Exception as e:
    import traceback
    print("Failed to retrieve context!")
    traceback.print_exc()
