import logging
import json
import re
from typing import Dict, Any, Optional
from app.agents.state import AgentState
from app.services.eligibility_engine import eligibility_engine_service
from app.models.eligibility import EligibilityIntelligenceInput
from app.services.gemini import gemini_service

logger = logging.getLogger("schemeconnect")

def clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n", "", text)
        text = re.sub(r"\n```$", "", text)
    return text.strip()

async def run_eligibility_agent(state: AgentState) -> AgentState:
    """
    Scheme Eligibility Agent:
    1. If profile keys are missing, extract profile details from user_query via Gemini
    2. Runs deterministic eligibility engine calculations with RAG citations
    3. Populates state with results
    """
    logger.info("Eligibility Agent activated...")
    try:
        profile = state.get("profile") or {}
        
        # Check if we should extract from query text
        required_keys = ["age", "state", "district", "income", "occupation", "gender", "category"]
        is_missing_keys = not all(k in profile for k in required_keys)
        
        if is_missing_keys and state.get("user_query"):
            logger.info("Extracting citizen profile parameters via Gemini...")
            extraction_prompt = f"""
            You are a civic metadata extractor. Inspect the user query and extract a structured profile for scheme eligibility.
            User Query: "{state['user_query']}"

            Extract the following parameters and return/reply ONLY with a raw JSON object:
            - age (int, default to 30 if unknown)
            - state (string, default to "Andhra Pradesh" if unknown)
            - district (string, default to "Guntur" if unknown)
            - income (float/number, default to 100000.0 if unknown)
            - occupation (string, default to "Farmer" if unknown)
            - gender (string, default to "Male" if unknown)
            - category (string, SC/ST/BC/General, default to "General" if unknown)

            Response must be raw JSON only, matching this structure:
            {{
                "age": 30,
                "state": "Andhra Pradesh",
                "district": "Guntur",
                "income": 100000.0,
                "occupation": "Farmer",
                "gender": "Male",
                "category": "General"
            }}
            """
            try:
                raw_json_res = gemini_service.generate_response(
                    prompt=extraction_prompt,
                    temperature=0.1
                )
                clean_res = clean_json_text(raw_json_res)
                parsed_profile = json.loads(clean_res)
                # Merge with any existing partial details
                for k in required_keys:
                    if k not in profile and k in parsed_profile:
                        profile[k] = parsed_profile[k]
                logger.info(f"Extracted Profile: {profile}")
            except Exception as e:
                logger.error(f"Failed parsing profile parameters: {str(e)}")
                # Fill defaults safely
                defaults = {
                    "age": 30,
                    "state": "Andhra Pradesh",
                    "district": "Guntur",
                    "income": 100000.0,
                    "occupation": "Farmer",
                    "gender": "Male",
                    "category": "General"
                }
                for k, v in defaults.items():
                    if k not in profile:
                        profile[k] = v

        # Validate we have all fields instantiated with core standard defaults
        validated_profile = {
            "age": int(profile.get("age", 30)),
            "state": str(profile.get("state", "Andhra Pradesh")),
            "district": str(profile.get("district", "Guntur")),
            "income": float(profile.get("income", 100000.0)),
            "occupation": str(profile.get("occupation", "Farmer")),
            "gender": str(profile.get("gender", "Male")),
            "category": str(profile.get("category", "General"))
        }

        # Structure input for service layer
        service_input = EligibilityIntelligenceInput(**validated_profile)
        
        # Execute eligibility calculation
        report = eligibility_engine_service.evaluate_eligibility_intelligence(service_input)
        
        # Format a professional response string
        summary_lines = []
        if report.eligible:
            summary_lines.append(f"Based on our evaluation rules, you are **ELIGIBLE** for welfare support schemes in {validated_profile['state']}.")
        else:
            summary_lines.append(f"Based on our evaluation rules, you are currently **NOT ELIGIBLE** for the available schemes.")
            
        if report.reasons:
            summary_lines.append("\n**Key Assessment Reasons:**")
            for r in report.reasons:
                summary_lines.append(f"- {r}")

        if report.required_documents:
            summary_lines.append("\n**Required Documents Checklist:**")
            for d in report.required_documents:
                summary_lines.append(f"- {d}")

        response_text = "\n".join(summary_lines)
        
        # Prepare structured payload for react client
        structured_output = {
            "matched_schemes": [m.model_dump() for m in report.matched_schemes],
            "eligible": report.eligible,
            "confidence": report.confidence,
            "reasons": report.reasons,
            "required_documents": report.required_documents,
            "sources": report.sources
        }

        # Update output inside state
        state["profile"] = validated_profile
        state["response"] = response_text
        state["structured_data"] = structured_output
        state["sources"] = report.sources
        state["reasons"] = report.reasons
        state["required_documents"] = report.required_documents
        state["eligible"] = report.eligible
        state["confidence"] = report.confidence
        state["error"] = None
        
    except Exception as e:
        logger.error(f"Eligibility Agent crashed: {str(e)}")
        state["error"] = str(e)
        
    return state
