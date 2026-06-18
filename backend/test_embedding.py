import os
import sys

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.gemini import gemini_service

def test():
    try:
        print("Model in config:", os.environ.get("GEMINI_MODEL"))
        print("1. Testing single embedding...")
        emb = gemini_service.get_embedding("What is Rythu Bharosa?")
        print("Successfully generated single embedding!")
        print("Embedding length:", len(emb))
        print("First 10 values:", emb[:10])
    except Exception as e:
        print("Single embedding failed with:", type(e), str(e))

    try:
        print("\n2. Testing bulk embedding via client directly...")
        res = gemini_service.client.models.embed_content(
            model="gemini-embedding-2-preview",
            contents=["What is Rythu Bharosa?", "PMAY Gramin details"]
        )
        print("Bulk embedding response received!")
        print("Embeddings list length:", len(res.embeddings))
        print("First embedding dimension:", len(res.embeddings[0].values))
    except Exception as e:
        print("Bulk embedding failed with:", type(e), str(e))

if __name__ == "__main__":
    test()
