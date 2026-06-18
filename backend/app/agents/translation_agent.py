import logging
from app.agents.state import AgentState
from app.services.gemini import gemini_service

logger = logging.getLogger("schemeconnect")

async def run_translation_agent(state: AgentState) -> AgentState:
    """
    Translation Agent Node:
    1. Loads standard multilingual translation system instructions.
    2. Recognizes the input query style and target language context.
    3. Executes clean translation via Gemini to ensure perfect native translations.
    """
    logger.info("Translation Agent activated...")
    try:
        text_to_translate = state.get("user_query") or ""
        
        # If there is already a response from a previous node, we might want to translate that instead of the query!
        # E.g. translating chatbot responses or documents
        if state.get("response") and "Translate" in (state.get("user_query") or ""):
            text_to_translate = state["response"]
            logger.info("Translating prior agent response text instead of core original query...")
            
        if not text_to_translate or len(text_to_translate.strip()) == 0:
            state["response"] = "Please supply some text, phrases, or paragraph templates to convert languages."
            state["sources"] = []
            return state

        # Determine target language from prompt
        target_lang = "Telugu"
        # Simple heuristic to detect if Telugu to English is requested
        query_lower = (state.get("user_query") or "").lower()
        if "to english" in query_lower or "in english" in query_lower:
            target_lang = "English"

        prompt = f"""
        Translate the following text into fluent, professional {target_lang}.
        Keep any technical policy terms, scheme names (like Amma Vodi, Pension Kanuka), and numbers accurate. 
        Ensure a compassionate, official civic tone.
        
        Text to translate:
        "{text_to_translate}"
        """
        
        logger.info(f"Issuing translation request for target language: {target_lang}...")
        translation_result = gemini_service.generate_response(
            prompt=prompt,
            system_instruction_file="multilingual_translation.txt",
            temperature=0.1
        )
        
        state["response"] = translation_result.strip()
        state["sources"] = []
        state["error"] = None
        state["structured_data"] = {
            "original_text": text_to_translate,
            "translated_text": translation_result.strip(),
            "target_language": target_lang
        }
        
    except Exception as e:
        logger.error(f"Translation Agent crashed: {str(e)}")
        state["error"] = str(e)
        state["response"] = f"Translation pipeline failed to convert characters: {str(e)}"
        
    return state
