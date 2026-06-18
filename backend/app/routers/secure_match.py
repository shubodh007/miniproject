import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Request
from app.models.eligibility import (
    CitizenProfilePayload,
    EligibilityReportResponse,
    EligibilityIntelligenceInput,
    EligibilityIntelligenceOutput,
    SchemeMatchScore
)
from app.services.eligibility_engine import eligibility_engine_service
from app.core.database import get_supabase_client
from app.services.gemini import gemini_service
from app.core.config import settings
from app.core.limiter import limiter, get_rate_limit

logger = logging.getLogger("schemeconnect")
router = APIRouter()


@router.post("/match/evaluate", response_model=EligibilityIntelligenceOutput, status_code=status.HTTP_200_OK)
def evaluate_eligibility_intelligence_api(payload: EligibilityIntelligenceInput):
    """
    Unified Eligibility Intelligence Endpoint.
    Combines direct deterministic calculations, semantic RAG matching, and Gemini explanations.
    """
    logger.info(f"API intelligence assessment requested for state={payload.state}, age={payload.age}")
    try:
        report = eligibility_engine_service.evaluate_eligibility_intelligence(payload)
        return report
    except Exception as e:
        logger.error(f"Intelligence evaluation API trigger failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Eligibility Intelligence pipeline failure: {str(e)}"
        )


@router.post("/match", response_model=EligibilityReportResponse, status_code=status.HTTP_200_OK)
@limiter.limit(get_rate_limit("10/minute"))
def determine_profile_matching(request: Request, payload: CitizenProfilePayload):
    """
    Core wizard match engine, refactored to reside in this dedicated secure router.
    Concurrently pulls sensitive eligibility criteria (schemes information) via the server-side
    Supabase client (using the service key), processes rules boundaries locally, and creates
    the final evaluation prompts on the server side using key parameters.
    """
    logger.info(f"Secure custom matching request received for citizen: {payload.name}, state: {payload.state}")
    try:
        # 1. Fetch sensitive schemas eligibility criteria using server-side client
        supabase = get_supabase_client()
        query_res = supabase.table("schemes").select("*").or_(f"state.eq.{payload.state},state.eq.Central").execute()
        schemes_list = query_res.data or []

        matched_records: List[SchemeMatchScore] = []

        # 2. Iterate through criteria, run local rule analysis, and build Gemini prompt context on the server
        for scheme in schemes_list:
            rules = scheme.get("eligibility_rules", {})
            status_calc, score, reasons = eligibility_engine_service.evaluate_rules_local(payload, rules)

            # Construct the final evaluation prompt on the backend
            prompt = f"""
            Analyze welfare qualification for:
            Citizen Snapshot: {payload.model_dump_json()}
            Scheme Details: {scheme['name']} - {scheme['description']}
            Rule Checks Log: {[{"criteria": r.criteria, "passed": r.passed, "desc": r.description} for r in reasons]}
            Calculated Status: {status_calc} (Score {score})

            Please write an elegant 3-sentence summary in plain, supportive terms detailing whether they qualify, the vital reasons why or why not, and what documentation they must supply. Include local contextual advice.
            """

            try:
                # Query Gemini dynamically using backend settings model & API key safely
                explanation = gemini_service.generate_response(
                    prompt=prompt,
                    system_instruction_file="scheme_eligibility.txt",
                    temperature=0.1
                )
            except Exception as ai_err:
                logger.warning(f"Failed AI evaluation for {scheme['name']}: {str(ai_err)}. Falling back to deterministic details.")
                explanation = " ".join([r.description for r in reasons if not r.passed])
                if not explanation:
                    explanation = "Citizen matches all core demographic parameters checked dynamically."

            matched_records.append(SchemeMatchScore(
                scheme_id=str(scheme["id"]),
                scheme_name=scheme["name"],
                scheme_name_te=scheme.get("name_te"),
                category=scheme["category"],
                status=status_calc,
                match_score=score,
                explanation=explanation,
                missing_docs=scheme.get("docs_required", []) if status_calc != "Eligible" else [],
                eligible_reasons=reasons,
                source_citation=f"Official GO: {scheme['name']} Policy Document"
            ))

        # Sort matches: Eligible/Marginal on top
        status_weights = {"Eligible": 1, "Marginally Eligible": 2, "Ineligible": 3}
        matched_records.sort(key=lambda x: (status_weights.get(x.status, 4), -x.match_score))

        # 3. Append to search history in Supabase securely (Fail-safe, non-blocking)
        try:
            matched_ids = [m.scheme_id for m in matched_records if m.status in ["Eligible", "Marginally Eligible"]]
            supabase.table("search_history").insert({
                "query_text": f"Wizard Match: {payload.occupation} age {payload.age} income ₹{payload.income_annual}",
                "matched_scheme_ids": matched_ids
            }).execute()
        except Exception as db_err:
            logger.warning(f"Failed to record audit search history item: {str(db_err)}")

        return EligibilityReportResponse(
            citizen_name=payload.name,
            state_matching_grid=f"Matched {len(matched_records)} core schemes for state {payload.state}",
            total_eligible_count=sum(1 for r in matched_records if r.status == "Eligible"),
            matches=matched_records
        )

    except Exception as e:
        logger.error(f"Secure eligibility match compiler failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Secure eligibility engine failure: {str(e)}"
        )
