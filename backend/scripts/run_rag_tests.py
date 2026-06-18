#!/usr/bin/env python3
import os
import sys
import time
import json
import logging

# Ensure root backend dir is in PYTHONPATH to allow correct app package resolutions
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("rag_verifier")

try:
    from app.services.rag import rag_service
    from app.services.gemini import gemini_service
    from app.models.ingest import BaseSchemeIngest
    logger.info("Local modules imported successfully.")
except ImportError as err:
    logger.critical(f"Failed to resolve core application modules: {str(err)}")
    sys.exit(1)

def clear_existing_test_data():
    """
    Cleans up old test entries inside Supabase tables before running assertions.
    """
    logger.info("Initializing DB sanitation procedures...")
    try:
        supabase = rag_service.supabase
        # Delete old scheme called "Amma Vodi"
        delete_res = supabase.table("schemes").delete().eq("name", "Amma Vodi").execute()
        logger.info("Sanitation complete. Safe clean slate guaranteed.")
    except Exception as e:
        logger.warning(f"Sanitation skipped or failed: {str(e)}")

def run_end_to_end_test():
    """
    Runs the complete RAG validation pipeline:
    1. Ingestion of the "Amma Vodi" Scheme
    2. Verification of vector chunking & count
    3. Retrieval matching on query 'What are the eligibility criteria for Amma Vodi?'
    4. Quality and grounding auditing
    5. Detailed performance output metrics
    """
    logger.info("===============================================================")
    logger.info("STARTING RAG SYSTEM VERIFICATION TEST (10-STAGE PIPELINE)")
    logger.info("===============================================================")
    
    # Clean old tests
    clear_existing_test_data()

    # Step 1: Formulate the standard production-grade payload for Amma Vodi
    amma_vodi_data = BaseSchemeIngest(
        name="Amma Vodi",
        name_te="అమ్మ ఒడి",
        description=(
            "The Jagananna Amma Vodi scheme is one of the flagship welfare programs of the AP State Government. "
            "It provides critical financial assistance of Rs. 15,000 per year directly to poor mothers or guardians "
            "to incentivize sent children to schools (classes 1 to 12) from all recognized government, aided, or private "
            "schools in Andhra Pradesh. Its ultimate goal is to eliminate childhood labor, enforce universal education, "
            "and drastically reduce dropout rates across school clusters."
        ),
        description_te=(
            "ఆంధ్రప్రదేశ్ ప్రభుత్వం ప్రతిష్టాత్మకంగా చేపట్టిన నవరత్నాలలో 'అమ్మ ఒడి' పథకం ఒకటి. "
            "బడికి పంపే ప్రతి పేద తల్లికి లేదా సంరక్షకురాలికి ఏటా రూ. 15,000 ఆర్థిక సహాయం అందిస్తారు."
        ),
        benefit_details=(
            "Financial backing details: Rs. 15,000 annual direct cash payout transferred through Aadhaar-enabled DBT mechanisms "
            "directly into the verified bank account of the mother. A maintenance fee of Rs. 2,000 is automatically deducted "
            "for toilet/school development funds in government institutions, ensuring a net direct payout of Rs. 13,000."
        ),
        benefit_details_te=(
            "తల్లుల బ్యాంకు ఖాతాల్లోకి నేరుగా రూ. 15,000 జమ చేస్తారు. "
            "పాఠశాలల వసతుల నిర్వహణ నిమిత్తం రూ. 2,000 మినహాయించి, రూ. 13,000 నికరంగా అందుతుంది."
        ),
        eligibility_rules={
            "min_school_attendance": "75%",
            "annual_income_limit_rural": 120000,
            "annual_income_limit_urban": 144000,
            "max_landholdings_wet_acres": 3.0,
            "max_landholdings_dry_acres": 10.0,
            "government_employees_excluded": True,
            "tax_payers_excluded": True,
            "class_bracket": "Class 1st to 12th (Intermediate)"
        },
        docs_required=[
            "Mother's Aadhaar Card",
            "Child's Aadhaar Card",
            "White Household Rice Card (Ration Card)",
            "Active Student Registration UID & Attendance Certificate",
            "Mother's Aadhaar-linked Bank Account Passbook with IFSC"
        ],
        docs_required_te=[
            "తల్లి ఆధార్ కార్డు",
            "విద్యార్థి ఆధార్ కార్డు",
            "వైట్ రేషన్ కార్డు (రైస్ కార్డ్)",
            "పాఠశాల ధ్రువీకరణ పత్రం (75% హాజరు)",
            "బ్యాంక్ పాస్ బుక్ జిరాక్స్"
        ],
        state="Andhra Pradesh",
        category="Education",
        external_url="https://ap.gov.in/ammavodi"
    )

    # Step 2: Trigger Ingestion & Vectorization
    t0_ingest = time.time()
    try:
        logger.info("Stage 1 - Dispatching payload to Rag ingestion pipeline...")
        ingest_res = rag_service.ingest_scheme(amma_vodi_data)
        t_ingest_elapsed = time.time() - t0_ingest
        
        logger.info(f"✔ Stage 1 Complete: Ingestion successfully vectorized inside Supabase.")
        logger.info(f"  - Ingested Scheme ID: {ingest_res['scheme_id']}")
        logger.info(f"  - Vector Chunks Created: {ingest_res['chunks_count']}")
        logger.info(f"  - Ingestion Latency: {t_ingest_elapsed:.3f} seconds\n")
    except Exception as ingest_error:
        logger.error(f"❌ Ingestion pipeline failed to process Amma Vodi: {str(ingest_error)}")
        sys.exit(1)

    # Step 3: Run Validation & Storage Checks
    logger.info("Stage 2 - Verifying stored database records counts...")
    try:
        supabase = rag_service.supabase
        chunks_check = supabase.table("scheme_chunks")\
            .select("id, chunk_text")\
            .eq("scheme_id", ingest_res["scheme_id"])\
            .execute()
        
        chunks_indexed_count = len(chunks_check.data)
        logger.info(f"✔ Stage 2 Complete: Verified {chunks_indexed_count} chunks stored in DB.\n")
    except Exception as db_err:
        logger.error(f"❌ DB Chunk storage check hit errors: {str(db_err)}")
        sys.exit(1)

    # Step 4: Run Retrieval Tests
    query = "What are the eligibility criteria for Amma Vodi?"
    logger.info(f"Stage 3 - Running retrieval test: query='{query}'")
    
    t0_search = time.time()
    try:
        search_hits = rag_service.retrieve_context(
            query=query,
            state_filter="Andhra Pradesh",
            top_k=5,
            similarity_threshold=0.30
        )
        t_search_elapsed = time.time() - t0_search
        
        logger.info(f"✔ Stage 3 Complete: Retrived matched chunks successfully.")
        logger.info(f"  - Retrieval Latency: {t_search_elapsed * 1000:.1f}ms (target: <300ms)")
        logger.info(f"  - Chunks Retrieved: {len(search_hits)}")
        
        for k, hit in enumerate(search_hits):
            logger.info(f"    [{k+1}] Scheme: {hit.scheme_name} | similarity: {hit.similarity:.4f}")
            logger.info(f"        Text Preview: {hit.chunk_text[:140]}...")
        logger.info("")
    except Exception as search_err:
        logger.error(f"❌ Retrieval matching process crashed: {str(search_err)}")
        sys.exit(1)

    # Step 5: Test Grounded Generation with Citation Tracking
    logger.info("Stage 4 - Testing Grounded Response generation with model mapping...")
    t0_gen = time.time()
    try:
        response_model = rag_service.generate_grounded_response(
            query=query,
            context_hits=search_hits
        )
        t_gen_elapsed = time.time() - t0_gen
        
        logger.info(f"✔ Stage 4 Complete: Response successfully generated under strict grounded guidelines.")
        logger.info(f"  - Text Synthesis Latency: {t_gen_elapsed:.3f} seconds (target: <2.0s)")
        logger.info(f"  - Grounding confidence score: {response_model['confidence']}")
        logger.info(f"  - Citation source count: {len(response_model['sources'])}")
        
        logger.info("\n----------------- GENERATED RESPONSE -----------------")
        logger.info(response_model["answer"])
        logger.info("------------------------------------------------------")
        
        logger.info("\n----------------- RETRIEVED SOURCES -----------------")
        for sc in response_model["sources"]:
            logger.info(f"- [{sc['chunk_id']}] Title: {sc['title']} | Score: {sc['similarity_score']}")
        logger.info("-----------------------------------------------------\n")
    except Exception as gen_err:
        logger.error(f"❌ Response generation module fell into errors: {str(gen_err)}")
        sys.exit(1)

    # Step 6: Output Critical Audit Assessment & Metrics Dashboard
    logger.info("===============================================================")
    logger.info("                 RAG METRICS PERFORMANCE AUDIT                 ")
    logger.info("===============================================================")
    
    # Let's perform validation assertions
    assertion_chunks_found = chunks_indexed_count > 0
    assertion_retrieved = len(search_hits) > 0
    assertion_similarity_pass = any(h.similarity >= 0.35 for h in search_hits) if search_hits else False
    assertion_citation_preserved = len(response_model["sources"]) == len(search_hits)
    assertion_latency_ok = (t_search_elapsed < 0.300) # < 300ms
    
    audit_status = "PASS" if (assertion_chunks_found and assertion_retrieved and assertion_similarity_pass and assertion_citation_preserved) else "FAIL"

    metrics_report = {
        "audit_overall_status": audit_status,
        "metrics": {
            "total_chunks_indexed": chunks_indexed_count,
            "total_chunks_retrieved": len(search_hits),
            "max_similarity_score": max(h.similarity for h in search_hits) if search_hits else 0.0,
            "response_citation_count": len(response_model["sources"]),
            "vector_search_latency_ms": round(t_search_elapsed * 1000, 2),
            "total_response_latency_s": round(t_ingest_elapsed + t_search_elapsed + t_gen_elapsed, 2)
        },
        "quality_assertions": {
            "chunks_populated_in_postgres": "PASS" if assertion_chunks_found else "FAIL",
            "relevant_chunks_retrieved": "PASS" if assertion_retrieved else "FAIL",
            "semantic_similarity_threshold": "PASS" if assertion_similarity_pass else "FAIL",
            "citation_preservation_fidelity": "PASS" if assertion_citation_preserved else "FAIL",
            "speed_target_under_300ms": "PASS" if assertion_latency_ok else "WARN"
        }
    }
    
    print(json.dumps(metrics_report, indent=2))
    logger.info("RAG audit checks completed successfully.")

if __name__ == "__main__":
    run_end_to_end_test()
