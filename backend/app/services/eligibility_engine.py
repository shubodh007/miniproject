import logging
from typing import List, Dict, Any, Optional
from app.models.eligibility import (
    CitizenProfilePayload,
    SchemeMatchScore,
    EligibilityReason,
    EligibilityReportResponse,
    EligibilityIntelligenceInput,
    MatchedSchemeIntelligence,
    EligibilityIntelligenceOutput
)
from app.core.database import get_supabase_client
from app.services.gemini import gemini_service

logger = logging.getLogger("schemeconnect")

class EligibilityEngineService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def evaluate_rules_local(self, citizen: CitizenProfilePayload, scheme_rules: Dict[str, Any]) -> tuple[str, float, List[EligibilityReason]]:
        """
        Executes strict, highly predictable rule evaluation locally inside the engine.
        Outputs: (Status, ConfidenceScore, ReasonBlocks)
        """
        reasons: List[EligibilityReason] = []
        passes_all = True
        critical_disqualify = False
        points_gained = 0
        total_checks = 0

        # 1. State Boundary Match
        # In multi-state systems, schemes can specify 'applicable_states': ["Andhra Pradesh", "Telangana", "Central"]
        allowed_states = scheme_rules.get("applicable_states", [scheme_rules.get("state", "Andhra Pradesh")])
        if citizen.state not in allowed_states and "Central" not in allowed_states:
            reasons.append(EligibilityReason(
                criteria="State Residency Status",
                passed=False,
                description=f"Scheme strictly applies to residents of {allowed_states}, but citizen resides in {citizen.state}."
            ))
            return "Ineligible", 0.0, reasons
        else:
            reasons.append(EligibilityReason(
                criteria="State Residency Status",
                passed=True,
                description=f"Residency verified. Scheme is applicable in {citizen.state}."
            ))
            points_gained += 1
            total_checks += 1

        # 2. Age Limits
        min_age = scheme_rules.get("min_age", 0)
        max_age = scheme_rules.get("max_age", 120)
        if citizen.age < min_age or citizen.age > max_age:
            reasons.append(EligibilityReason(
                criteria="Age Boundaries",
                passed=False,
                description=f"Age requirement is between {min_age} and {max_age} years. Citizen is {citizen.age} years old."
            ))
            critical_disqualify = True
            passes_all = False
        else:
            reasons.append(EligibilityReason(
                criteria="Age Boundaries",
                passed=True,
                description=f"Age check passed. Citizen age {citizen.age} matches required bracket ({min_age}-{max_age})."
            ))
            points_gained += 1
            total_checks += 1

        # 3. Income Caps (With Local Geographic Adjustment)
        # Rural vs Urban ceilings
        is_urban = citizen.district in ["Hyderabad", "Visakhapatnam", "Vijayawada", "Guntur Municipal"]
        max_income = scheme_rules.get("max_income_urban" if is_urban else "max_income_rural", scheme_rules.get("max_income", 150000.00))
        
        if citizen.income_annual > max_income:
            reasons.append(EligibilityReason(
                criteria="Household Income Cap",
                passed=False,
                description=f"Annual household income threshold of ₹{max_income:,.2f} exceeded. Citizen declares ₹{citizen.income_annual:,.2f}."
            ))
            passes_all = False
        else:
            reasons.append(EligibilityReason(
                criteria="Household Income Cap",
                passed=True,
                description=f"Household income ₹{citizen.income_annual:,.2f} is safely below the maximum cap of ₹{max_income:,.2f}."
            ))
            points_gained += 1
            total_checks += 1

        # 4. Land Limit Check
        max_land = scheme_rules.get("max_land_acres", 999.0)
        if citizen.land_acres > max_land:
            reasons.append(EligibilityReason(
                criteria="Landholding Limit",
                passed=False,
                description=f"Maximum agricultural land holding limits capped at {max_land} acres. Citizen holds {citizen.land_acres} acres."
            ))
            critical_disqualify = True
            passes_all = False
        else:
            if max_land < 999.0:
                reasons.append(EligibilityReason(
                    criteria="Landholding Limit",
                    passed=True,
                    description=f"Land ownership {citizen.land_acres} acres is compliant with limit of {max_land} acres."
                ))
                points_gained += 1
                total_checks += 1

        # 5. Occupation Restrictions
        allowed_occupations = scheme_rules.get("allowed_occupations", [])
        if allowed_occupations and citizen.occupation not in allowed_occupations and "All" not in allowed_occupations:
            reasons.append(EligibilityReason(
                criteria="Allowed Occupations",
                passed=False,
                description=f"Applicant occupation '{citizen.occupation}' is excluded. Matches restricted categories: {allowed_occupations}."
            ))
            passes_all = False
        else:
            reasons.append(EligibilityReason(
                criteria="Allowed Occupations",
                passed=True,
                description=f"Occupation '{citizen.occupation}' matches scheme parameters."
            ))
            points_gained += 1
            total_checks += 1

        # 6. Caste List
        allowed_castes = scheme_rules.get("allowed_castes", [])
        if allowed_castes and citizen.caste_category not in allowed_castes:
            reasons.append(EligibilityReason(
                criteria="Social Category Bounds",
                passed=False,
                description=f"Scheme strictly reserved for {allowed_castes}. Citizen is registered under '{citizen.caste_category}'."
            ))
            critical_disqualify = True
            passes_all = False
        else:
            if allowed_castes:
                reasons.append(EligibilityReason(
                    criteria="Social Category Bounds",
                    passed=True,
                    description=f"Applicant social class '{citizen.caste_category}' matches targeted scopes."
                ))
                points_gained += 1
                total_checks += 1

        # Aggregate Result
        if critical_disqualify:
            status = "Ineligible"
        elif passes_all:
            status = "Eligible"
        else:
            status = "Marginally Eligible" if points_gained >= (total_checks * 0.5) else "Ineligible"

        confidence_score = float(points_gained) / float(max(total_checks, 1))
        return status, confidence_score, reasons

    def analyze_eligibility_report(self, citizen: CitizenProfilePayload) -> EligibilityReportResponse:
        """
        Gathers all scheme records for the citizen's residency state, processes rule boundaries locally,
        and uses the Gemini AI compliance layers to synthesise human explanations.
        """
        try:
            # Query all schemes matching targeted state bounds or national central
            query_res = self.supabase.table("schemes").select("*").or_(f"state.eq.{citizen.state},state.eq.Central").execute()
            schemes_list = query_res.data or []

            matched_records: List[SchemeMatchScore] = []

            for scheme in schemes_list:
                rules = scheme.get("eligibility_rules", {})
                status, score, reasons = self.evaluate_rules_local(citizen, rules)

                # Synthesize explanation via Gemini
                prompt = f"""
                Analyze welfare qualification for:
                Citizen Snapshot: {citizen.model_dump_json()}
                Scheme Details: {scheme['name']} - {scheme['description']}
                Rule Checks Log: {[{"criteria": r.criteria, "passed": r.passed, "desc": r.description} for r in reasons]}
                Calculated Status: {status} (Score {score})

                Please write an elegant 3-sentence summary in plain, supportive terms detailing whether they qualify, the vital reasons why or why not, and what documentation they must supply. Include local contextual advice.
                """
                
                try:
                    explanation = gemini_service.generate_response(
                        prompt=prompt,
                        system_instruction_file="scheme_eligibility.txt",
                        temperature=0.1
                    )
                except Exception as ai_err:
                    logger.warning(f"Failed AI analysis for {scheme['name']}: {str(ai_err)}. Falling back to local descriptions.")
                    explanation = " ".join([r.description for r in reasons if not r.passed])
                    if not explanation:
                        explanation = "Citizen meets all core demographic thresholds programmatically analysed."

                matched_records.append(SchemeMatchScore(
                    scheme_id=str(scheme["id"]),
                    scheme_name=scheme["name"],
                    scheme_name_te=scheme.get("name_te"),
                    category=scheme["category"],
                    status=status,
                    match_score=score,
                    explanation=explanation,
                    missing_docs=scheme.get("docs_required", []) if status != "Eligible" else [],
                    eligible_reasons=reasons,
                    source_citation=f"Official GO: {scheme['name']} Policy Document"
                ))

            # Sort matches so Eligible/Marginal are listed on top
            status_weights = {"Eligible": 1, "Marginally Eligible": 2, "Ineligible": 3}
            matched_records.sort(key=lambda x: (status_weights.get(x.status, 4), -x.match_score))

            return EligibilityReportResponse(
                citizen_name=citizen.name,
                state_matching_grid=f"Matched {len(matched_records)} core schemes for state {citizen.state}",
                total_eligible_count=sum(1 for r in matched_records if r.status == "Eligible"),
                matches=matched_records
            )

        except Exception as e:
            logger.error(f"Error in eligibility evaluation compiler: {str(e)}")
            raise e

    def evaluate_eligibility_intelligence(self, profile: EligibilityIntelligenceInput) -> EligibilityIntelligenceOutput:
        """
        Eligibility Intelligence Layer:
        Performs 100% deterministic rule analysis, fetches real RAG context of verified policies,
        and uses the Gemini grounding endpoint to explain decisions, summarize benefits, and extract
        legal paper checklists.
        """
        from app.services.rag import rag_service
        logger.info(f"Evaluating eligibility intelligence for state: '{profile.state}' | occupation: '{profile.occupation}'")

        try:
            # 1. Transform raw profile inputs to standardized citizen entity
            citizen = CitizenProfilePayload(
                name="Anonymous Citizen",
                age=profile.age,
                gender=profile.gender,
                state=profile.state,
                district=profile.district,
                income_annual=profile.income,
                occupation=profile.occupation,
                land_acres=0.0,
                bpl_card="None" if profile.income > 120000.0 else "White",
                caste_category=profile.category
            )

            # 2. Fetch Schemes in residency area or National Central
            query_res = self.supabase.table("schemes")\
                .select("*")\
                .or_(f"state.eq.{citizen.state},state.eq.Central")\
                .execute()
            schemes_list = query_res.data or []

            matched_schemes: List[MatchedSchemeIntelligence] = []
            overall_eligible = False
            overall_reasons: List[str] = []
            overall_required_docs: List[str] = []
            overall_sources: List[Dict[str, Any]] = []
            max_confidence = 0.0

            for scheme in schemes_list:
                scheme_name = scheme["name"]
                rules = scheme.get("eligibility_rules", {})

                # A. Run Deterministic Rule Engine
                status, score, rule_reasons = self.evaluate_rules_local(citizen, rules)
                is_eligible = (status == "Eligible")

                # Track overall status
                if is_eligible:
                    overall_eligible = True

                # Generate reasons descriptions
                reasons_str_list = [r.description for r in rule_reasons]
                if is_eligible or status == "Marginally Eligible":
                    overall_reasons.extend(reasons_str_list)

                # B. Execute RAG Retrieval to find relevant policy guidelines
                rag_hits = rag_service.retrieve_context(
                    query=f"What are the eligibility criteria and benefits for {scheme_name}?",
                    state_filter=citizen.state,
                    top_k=3,
                    similarity_threshold=0.25
                )

                rag_text_block = ""
                scheme_sources = []
                for hit in rag_hits:
                    rag_text_block += f"- {hit.chunk_text}\n"
                    source_item = {
                        "title": hit.scheme_name,
                        "chunk_id": hit.id,
                        "source": f"Official GO: {hit.scheme_name} Reference Guidelines",
                        "similarity": hit.similarity
                    }
                    scheme_sources.append(source_item)
                    overall_sources.append(source_item)

                    if hit.similarity > max_confidence:
                        max_confidence = hit.similarity

                if not rag_text_block:
                    rag_text_block = "No direct chunks fetched. Rely upon standard system rules."

                # C. Combine Deterministic Rules with Gemini Explanation & Grounding
                reasons_log = "\n".join([f"* {r.criteria}: {'Passed' if r.passed else 'Failed'} - {r.description}" for r in rule_reasons])
                
                openai_style_prompt = f"""
                Strict Policy Rule Check Outcome:
                Citizen Status: {status}
                Citizen Profile:
                - Age: {citizen.age} years
                - State Residency: {citizen.state}
                - Annual Income: ₹{citizen.income_annual:,.2f}
                - Occupation: {citizen.occupation}
                - Caste Category: {citizen.caste_category}

                Deterministic Checks Log:
                {reasons_log}

                Policy Grounding Excerpts (RAG facts):
                {rag_text_block}

                Goal:
                Act as a senior high-precision counselor portal. Write an executive suit evaluation for '{scheme_name}'.
                You are FORBIDDEN from overriding the programmatic status: {status}.
                If the citizen is Ineligible, detail which requirements they failed in the EXPLANATION block.
                If they are Eligible, explain why they qualify and what they gain.

                Format your response EXACTLY as shown below. Keep the sections clear.

                EXPLANATION:
                [Write a compassionate, highly refined 2-3 sentence grounded explanation of why they qualify or got disqualified]

                BENEFITS SUMMARY:
                [Summary sentence detailing cash payouts, incentives, or school support funds from the policy]

                REQUIRED DOCUMENTS:
                - [Document 1]
                - [Document 2]
                """

                try:
                    ai_reply = gemini_service.generate_response(
                        prompt=openai_style_prompt,
                        system_instruction_file="scheme_eligibility.txt",
                        temperature=0.1
                    )
                except Exception as ai_err:
                    logger.warning(f"Gemini evaluation failure for '{scheme_name}': {str(ai_err)}")
                    ai_reply = f"EXPLANATION:\nBased on eligibility check, applicant is {status}. {', '.join(reasons_str_list)}\n\nBENEFITS SUMMARY:\nBenefits match scheme details category {scheme['category']}.\n\nREQUIRED DOCUMENTS:\n" + "\n".join([f"- {d}" for d in scheme.get("docs_required", [])])

                # Parse AI Reply
                explanation = "Analyzed dynamically."
                benefits_summary = "Refer to scheme rules."
                required_docs_list = []

                if "EXPLANATION:" in ai_reply:
                    parts = ai_reply.split("EXPLANATION:")
                    subparts = parts[1].split("BENEFITS SUMMARY:")
                    explanation = subparts[0].strip()
                    if len(subparts) > 1:
                        subparts2 = subparts[1].split("REQUIRED DOCUMENTS:")
                        benefits_summary = subparts2[0].strip()
                        if len(subparts2) > 1:
                            doc_lines = subparts2[1].strip().split("\n")
                            for line in doc_lines:
                                clean_line = line.strip().lstrip("-*• ").strip()
                                if clean_line:
                                    required_docs_list.append(clean_line)

                # Fallback on documents if AI missed them
                if not required_docs_list:
                    required_docs_list = scheme.get("docs_required", [])

                if is_eligible:
                    overall_required_docs.extend(required_docs_list)

                # Wrap into scheme intelligence response
                matched_schemes.append(MatchedSchemeIntelligence(
                    scheme_name=scheme_name,
                    eligible=is_eligible,
                    confidence=score,
                    explanation=explanation,
                    benefits_summary=benefits_summary,
                    reasons=reasons_str_list,
                    required_documents=required_docs_list,
                    sources=scheme_sources
                ))

            # Deduplicate lists
            overall_reasons = list(sorted(set(overall_reasons)))
            overall_required_docs = list(sorted(set(overall_required_docs)))

            # Deduplicate sources by chunk_id
            seen_chunks = set()
            unique_sources = []
            for src in overall_sources:
                cid = src["chunk_id"]
                if cid not in seen_chunks:
                    seen_chunks.add(cid)
                    unique_sources.append(src)

            # Default fallback if absolutely no schemes are stored yet
            if not matched_schemes:
                overall_reasons = ["No welfare schemes registered in this residency area."]
                max_confidence = 0.0

            return EligibilityIntelligenceOutput(
                matched_schemes=matched_schemes,
                eligible=overall_eligible,
                confidence=round(max_confidence, 2),
                reasons=overall_reasons,
                required_documents=overall_required_docs,
                sources=unique_sources
            )

        except Exception as err:
            logger.error(f"Eligibility Intelligence pipeline breakdown: {str(err)}")
            raise err

# Singleton Service Instance
eligibility_engine_service = EligibilityEngineService()

