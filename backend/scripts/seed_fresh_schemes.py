#!/usr/bin/env python3
import os
import sys
import json
import time
import logging

# Ensure root backend dir is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger("fresh_seeder")

try:
    from app.services.rag import rag_service
    from app.services.gemini import gemini_service
    from app.models.ingest import BaseSchemeIngest
    logger.info("Successfully imported core services and models for fresh schemes seeding.")
except ImportError as error:
    logger.critical(f"Failed to resolve imports. Check PYTHONPATH: {str(error)}")
    sys.exit(1)


def translate_text(text: str, target_lang: str = "Telugu") -> str:
    """
    On-the-fly text translation helper utilizing our Gemini service.
    """
    if not text:
        return ""
    prompt = f"Translate the following text to {target_lang}. Return ONLY the direct translation. Text: {text}"
    try:
        translated = gemini_service.generate_response(prompt=prompt, temperature=0.1)
        cleaned = translated.strip()
        if cleaned:
            return cleaned
    except Exception as e:
        logger.warning(f"Translation failed for '{text[:30]}...': {str(e)}")
    return text


def get_fresh_schemes():
    """
    Loads fresh_schemes.json and translates missing fields to Telugu using Gemini.
    """
    json_path = os.path.join(os.path.dirname(__file__), "fresh_schemes.json")
    if not os.path.exists(json_path):
        logger.critical(f"fresh_schemes.json not found at {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        raw_list = json.load(f)

    logger.info(f"Loaded {len(raw_list)} raw schemes from fresh_schemes.json.")

    parsed_schemes = []
    for idx, item in enumerate(raw_list):
        name = item["name"]
        logger.info(f"[{idx+1}/{len(raw_list)}] Processing translations for: {name}")

        # Map state correctly
        state_val = item.get("state", "Central")
        if state_val == "India":
            state_val = "Central"

        # Translate name, description, benefit_details to Telugu
        # Note: We append a tiny sleep to avoid rate limiting
        time.sleep(0.1)
        name_te = item.get("name_te") or translate_text(name)
        
        time.sleep(0.1)
        description_te = item.get("description_te") or translate_text(item["description"])
        
        time.sleep(0.1)
        benefit_details_te = item.get("benefit_details_te") or translate_text(item["benefit_details"])

        docs_te = []
        for d in item.get("docs_required", []):
            time.sleep(0.05)
            docs_te.append(translate_text(d))

        parsed_scheme = BaseSchemeIngest(
            name=name,
            name_te=name_te,
            description=item["description"],
            description_te=description_te,
            benefit_details=item["benefit_details"],
            benefit_details_te=benefit_details_te,
            eligibility_rules=item.get("eligibility_rules", {}),
            docs_required=item.get("docs_required", []),
            docs_required_te=docs_te,
            state=state_val,
            district=item.get("district"),
            category=item.get("category", "General Welfare"),
            external_url=item.get("external_url")
        )
        parsed_schemes.append(parsed_scheme)

    return parsed_schemes


def seed_database():
    logger.info("=============================================================")
    logger.info("       SEEDING FRESH WELFARE SCHEMES TO SUPABASE             ")
    logger.info("=============================================================")

    schemes = get_fresh_schemes()

    # Sanitise standard schemes
    try:
        supabase = rag_service.supabase
        logger.info("Sanitizing destination database for fresh overwrites...")
        for sc in schemes:
            supabase.table("schemes").delete().eq("name", sc.name).execute()
        logger.info("Database cleaning complete.")
    except Exception as e:
        logger.warning(f"DB sanitation warning (usually ok to ignore): {str(e)}")

    success_count = 0
    fail_count = 0

    for idx, sc_item in enumerate(schemes):
        logger.info(f"[{idx+1}/{len(schemes)}] Ingesting into vector store: '{sc_item.name}'...")
        try:
            res = rag_service.ingest_scheme(sc_item)
            logger.info(f"   ✔ Completed! ID: {res['scheme_id']} | Chunks: {res['chunks_count']}")
            success_count += 1
        except Exception as err:
            logger.error(f"   ❌ Failed to ingest '{sc_item.name}': {str(err)}")
            fail_count += 1

    logger.info("=============================================================")
    logger.info(f" SEEDING SUMMARY: {success_count} succeeded, {fail_count} failed out of {len(schemes)}.")
    logger.info("=============================================================")


if __name__ == "__main__":
    seed_database()
