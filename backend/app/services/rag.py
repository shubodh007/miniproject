import logging
import re
import time
import uuid
import random
import json
from typing import List, Optional, Dict, Any, Tuple
from app.core.database import get_supabase_client
from app.services.gemini import gemini_service
from app.models.ingest import SearchHit, BaseSchemeIngest

logger = logging.getLogger("schemeconnect")

class RAGService:
    def __init__(self):
        self._supabase = None

    @property
    def supabase(self):
        """
        Lazy-initialize Supabase connection to prevent startup dependency blocking.
        """
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    def detect_language(self, text: str) -> str:
        """
        Analyzes character blocks to identify text language.
        Telugu unicode block is U+0C00 to U+0C7F.
        """
        if not text:
            return "en"
        has_telugu = any(0x0C00 <= ord(char) <= 0x0C7F for char in text)
        has_english = any(char.isalnum() and ord(char) < 128 for char in text)
        if has_telugu and has_english:
            return "mixed"
        elif has_telugu:
            return "te"
        return "en"

    def clean_text(self, text: str) -> str:
        """
        Performs high-precision corporate semantic cleaning (removes excessive whitespace, double line breaks, etc.).
        """
        if not text:
            return ""
        # Collapse multiple spacing
        text = re.sub(r"[ \t]+", " ", text)
        # Collapse multi-newlines cleanly
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def recursive_character_chunker(
        self,
        text: str,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
        separators: Optional[List[str]] = None
    ) -> List[str]:
        """
        Recursive character-based semantic splitter.
        Attempts to slice context on structural separators to keep paragraphs and sentences whole.
        Optimized for English & Telugu danda periods or punctuation spacing.
        """
        if separators is None:
            # Traditional separators: double-newline, newline, periods, spaces, empty string
            separators = ["\n\n", "\n", ". ", "? ", "! ", "। ", "॥ ", " ", ""]

        if not text.strip():
            return []

        # Step 1: Recursively split down to token-parts
        def split(text_block: str, sep_idx: int) -> List[str]:
            if len(text_block) <= chunk_size:
                return [text_block]

            if sep_idx >= len(separators):
                # Hard binary chop if no boundaries remain
                return [text_block[i:i + chunk_size] for i in range(0, len(text_block), chunk_size - chunk_overlap)]

            separator = separators[sep_idx]
            if separator == "":
                splits = list(text_block)
            else:
                splits = text_block.split(separator)

            final_splits = []
            for item in splits:
                if not item:
                    continue
                if len(item) > chunk_size:
                    final_splits.extend(split(item, sep_idx + 1))
                else:
                    final_splits.append(item)
            return final_splits

        raw_parts = split(text, 0)

        # Step 2: Merge splits into elegant window blocks preserving overlap
        chunks = []
        current_chunk_parts = []
        current_len = 0

        for part in raw_parts:
            part_len = len(part)

            if current_len + part_len > chunk_size and current_chunk_parts:
                # Compile current segment
                block_content = " ".join(current_chunk_parts).strip()
                if block_content:
                    chunks.append(block_content)

                # Maintain overlap safely
                overlap_parts = []
                overlap_len = 0
                for candidate in reversed(current_chunk_parts):
                    if overlap_len + len(candidate) < chunk_overlap:
                        overlap_parts.insert(0, candidate)
                        overlap_len += len(candidate)
                    else:
                        break
                current_chunk_parts = overlap_parts
                current_len = sum(len(p) for p in current_chunk_parts) + len(current_chunk_parts)

            current_chunk_parts.append(part)
            current_len += part_len + (1 if current_chunk_parts else 0)

        if current_chunk_parts:
            block_content = " ".join(current_chunk_parts).strip()
            if block_content:
                chunks.append(block_content)

        return chunks

    def get_embeddings_batched(self, texts: List[str], batch_size: int = 16) -> List[List[float]]:
        """
        Generates 768-dimension embeddings using text-embedding-004.
        Implements chunk batched dispatch and robust rate-limit exponential backoff retry logic.
        """
        if not texts:
            return []

        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            max_retries = 3
            base_delay = 1.0
            attempt_success = False

            for attempt in range(max_retries):
                try:
                    # Issue batch call via the initialized Gemini SDK Client
                    from google.genai import types
                    res = gemini_service.client.models.embed_content(
                        model="gemini-embedding-2-preview",
                        contents=batch,
                        config=types.EmbedContentConfig(output_dimensionality=768)
                    )
                    for emb in res.embeddings:
                        embeddings.append(emb.values)
                    attempt_success = True
                    break
                except Exception as e:
                    logger.warning(f"Embedding batch retrieval attempt {attempt + 1} failed: {str(e)}")
                    if attempt == max_retries - 1:
                        # Fallback step: individual item-level retrieval with slow delay
                        logger.info("Attempting single-item fallback embedding loops to bypass API blockages...")
                        for single_text in batch:
                            embeddings.append(self._get_single_embedding_with_retry(single_text))
                        attempt_success = True
                        break
                    time.sleep(base_delay * (2 ** attempt) + random.uniform(0, 0.5))

        return embeddings

    def _get_single_embedding_with_retry(self, text: str, max_retries: int = 3) -> List[float]:
        """
        Retrieves a single text-embedding-004 structure with strict retry guards.
        """
        base_delay = 1.0
        for attempt in range(max_retries):
            try:
                return gemini_service.get_embedding(text)
            except Exception as e:
                logger.warning(f"Single fallback embedding attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    # Return 0-vector as emergency failover to prevent whole ingest breakdown
                    return [0.0] * 768
                time.sleep(base_delay * (2 ** attempt) + random.uniform(0, 0.5))
        return [0.0] * 768

    def ingest_scheme(self, scheme: BaseSchemeIngest) -> Dict[str, Any]:
        """
        Ingests or updates a welfare policy record:
        1. Encodes raw scheme entries into database registry tables.
        2. Segregates and cleans multi-lingual paragraph sections.
        3. Recursively chunks each text chapter individually to prevent semantic dilution.
        4. Bulk embeds chunks using text-embedding-004 and saves vector metadata in scheme_chunks.
        """
        logger.info(f"RAG: Registering welfare policy metadata for: {scheme.name}")
        try:
            # 1. Inspect existing scheme details
            existing = self.supabase.table("schemes").select("id").eq("name", scheme.name).execute()
            if existing.data:
                scheme_id = existing.data[0]["id"]
                # Clean old chunks from vector space first to maintain high hygiene
                self.supabase.table("scheme_chunks").delete().eq("scheme_id", scheme_id).execute()
                # Update core parameters
                self.supabase.table("schemes").update(scheme.model_dump(exclude_none=True)).eq("id", scheme_id).execute()
                logger.info(f"RAG: Updated existing scheme registry with persistent scheme_id={scheme_id}")
            else:
                inserted = self.supabase.table("schemes").insert(scheme.model_dump(exclude_none=True)).execute()
                if not inserted.data:
                    raise ValueError("Failed to insert scheme registration inside Supabase registry.")
                scheme_id = inserted.data[0]["id"]
                logger.info(f"RAG: Registered new scheme ID: {scheme_id}")

            # 2. Segregate schema elements into chapters/sections to ensure highly focused vector blocks
            sections: List[Tuple[str, str]] = []

            # Overview Section
            overview = f"Scheme Title / Name: {scheme.name}\n"
            if scheme.name_te:
                overview += f"Telugu Name / శీర్షిక: {scheme.name_te}\n"
            overview += f"Category: {scheme.category}\nState Boundaries: {scheme.state}\n"
            if scheme.district:
                overview += f"Geographic Scope / District: {scheme.district}\n"
            overview += f"Full Description Details: {scheme.description}\n"
            if scheme.description_te:
                overview += f"తెలుగు వివరణ: {scheme.description_te}\n"
            sections.append(("Overview & Detailed Description", overview))

            # Benefits Details Section
            benefits = f"Welfare Benefit Rules and Incentive Criteria for {scheme.name}:\n"
            benefits += f"Benefit Profile (English): {scheme.benefit_details}\n"
            if scheme.benefit_details_te:
                benefits += f"ప్రయోజనాలు (తెలుగు): {scheme.benefit_details_te}\n"
            sections.append(("Financial & Administrative Benefits", benefits))

            # Eligibility Rules Summary
            rules = f"Direct Eligibility Conditions / Threshold Criteria for {scheme.name}:\n"
            rules += f"Eligibility Logic Rules Setup: {json.dumps(scheme.eligibility_rules, indent=1, ensure_ascii=False)}\n"
            sections.append(("Eligibility Constraints and Conditions", rules))

            # Required Documentation Section
            docs_text = f"Required Credentials and Application Papers list to register under {scheme.name}:\n"
            if scheme.docs_required:
                docs_text += "Requirements checklist (English):\n" + "\n".join(f"- {item}" for item in scheme.docs_required) + "\n"
            if scheme.docs_required_te:
                docs_text += "కావలసిన పత్రాలు (తెలుగు):\n" + "\n".join(f"- {te_item}" for te_item in scheme.docs_required_te) + "\n"
            sections.append(("Required Papers Checklist", docs_text))

            # 3. Recursively Split sections and extract fine metadata
            chunk_texts: List[str] = []
            chunk_metadatas: List[Dict[str, Any]] = []

            for index, (section_title, text_content) in enumerate(sections):
                cleaned_text = self.clean_text(text_content)
                sub_chunks = self.recursive_character_chunker(
                    text=cleaned_text,
                    chunk_size=750,
                    chunk_overlap=120
                )

                for chunk_idx, chunk_txt in enumerate(sub_chunks):
                    lang = self.detect_language(chunk_txt)
                    meta = {
                        "scheme_name": scheme.name,
                        "name_te": scheme.name_te,
                        "category": scheme.category,
                        "state": scheme.state,
                        "district": scheme.district,
                        "language": lang,
                        "source_url": scheme.external_url,
                        "document_title": section_title,
                        "chunk_id": f"{scheme_id}_sec_{index}_chunk_{chunk_idx}",
                        "last_ingested": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    }
                    chunk_texts.append(chunk_txt)
                    chunk_metadatas.append(meta)

            # 4. Generate Embeddings using batched text-embedding-004 calls
            logger.info(f"RAG: Compiling embeddings for {len(chunk_texts)} recursive scheme segments...")
            embeddings = self.get_embeddings_batched(chunk_texts, batch_size=16)

            # 5. Insert structured records in scheme_chunks DB
            chunks_to_insert = []
            for j in range(len(chunk_texts)):
                chunks_to_insert.append({
                    "scheme_id": scheme_id,
                    "chunk_text": chunk_texts[j],
                    "metadata": chunk_metadatas[j],
                    "embedding": embeddings[j]
                })

            if chunks_to_insert:
                # Run bulk insert command on Supabase DB
                self.supabase.table("scheme_chunks").insert(chunks_to_insert).execute()
                logger.info(f"RAG: Successfully completed database ingestion. Inserted {len(chunks_to_insert)} chunks.")

            return {
                "success": True,
                "scheme_id": scheme_id,
                "chunks_count": len(chunks_to_insert)
            }
        except Exception as err:
            logger.error(f"RAG Error: Core document ingestion pipeline breakdown: {str(err)}")
            raise err

    def ingest_scheme_document(
        self,
        file_bytes: bytes,
        file_name: str,
        scheme_name: str,
        category: str = "General Welfare",
        state: str = "Andhra Pradesh",
        district: Optional[str] = None,
        external_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ingests a document file (PDF, DOCX, TXT, OCR-able Image) for a specific scheme:
        1. Extracts text from the file using ocr_service.
        2. Tries to find or register the scheme by name.
        3. Cleans, chunks, and embeds the extracted text.
        4. Inserts the embeddings into scheme_chunks database.
        """
        from app.services.ocr import ocr_service
        logger.info(f"RAG: File ingestion started for scheme '{scheme_name}' from file '{file_name}' ({len(file_bytes)} bytes)")
        
        # 1. Extract text from document
        extracted_text = ocr_service.process_document_extract(file_bytes, file_name)
        if not extracted_text or not extracted_text.strip():
            raise ValueError(f"Extracted content from file '{file_name}' is empty or invalid.")
            
        # 2. Get or create scheme
        existing = self.supabase.table("schemes").select("id").eq("name", scheme_name).execute()
        if existing.data:
            scheme_id = existing.data[0]["id"]
            logger.info(f"RAG: File linked to existing scheme_id={scheme_id}")
        else:
            # Register placeholder scheme with defaults since only file was provided
            new_scheme = {
                "name": scheme_name,
                "description": f"Extracted from document file '{file_name}' and automatically uploaded.",
                "benefit_details": "Refer to the attached document chunks and context transcripts.",
                "eligibility_rules": {},
                "state": state,
                "category": category,
                "district": district,
                "external_url": external_url
            }
            inserted = self.supabase.table("schemes").insert(new_scheme).execute()
            if not inserted.data:
                raise ValueError("Failed to create new scheme record.")
            scheme_id = inserted.data[0]["id"]
            logger.info(f"RAG: Created new scheme registry shell with scheme_id={scheme_id}")

        # 3. Clean and chunk the text
        cleaned_text = self.clean_text(extracted_text)
        sub_chunks = self.recursive_character_chunker(
            text=cleaned_text,
            chunk_size=750,
            chunk_overlap=120
        )
        
        if not sub_chunks:
            return {
                "success": True,
                "scheme_id": scheme_id,
                "chunks_count": 0,
                "message": "Document text loaded but no chunks were derived."
            }

        # 4. Generate Embeddings other than empty chunk vectors
        chunk_texts = []
        chunk_metadatas = []
        for i, chunk_txt in enumerate(sub_chunks):
            lang = self.detect_language(chunk_txt)
            meta = {
                "scheme_name": scheme_name,
                "category": category,
                "state": state,
                "district": district,
                "language": lang,
                "source_url": external_url or file_name,
                "document_title": file_name,
                "chunk_id": f"{scheme_id}_file_{uuid.uuid4().hex[:6]}_chunk_{i}",
                "last_ingested": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            chunk_texts.append(chunk_txt)
            chunk_metadatas.append(meta)

        logger.info(f"RAG: Compiling vector embeddings for {len(chunk_texts)} file segments...")
        embeddings = self.get_embeddings_batched(chunk_texts, batch_size=16)

        # 5. Insert chunk records
        chunks_to_insert = []
        for j in range(len(chunk_texts)):
            chunks_to_insert.append({
                "scheme_id": scheme_id,
                "chunk_text": chunk_texts[j],
                "metadata": chunk_metadatas[j],
                "embedding": embeddings[j]
            })

        if chunks_to_insert:
            self.supabase.table("scheme_chunks").insert(chunks_to_insert).execute()
            logger.info(f"RAG: Successfully completed file document ingestion. Saved {len(chunks_to_insert)} chunks.")

        return {
            "success": True,
            "scheme_id": scheme_id,
            "chunks_count": len(chunks_to_insert)
        }

    def retrieve_context(
        self,
        query: str,
        state_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.35,
        district_filter: Optional[str] = None,
        language_filter: Optional[str] = None
    ) -> List[SearchHit]:
        """
        Production-grade Hybrid Retrieval with precision score reranking:
        1. Encodes query into vector coordinates (<150ms).
        2. Executes HNSW Vector Similarity matching on scheme_chunks RPC page.
        3. Extracts lexical candidates using matching tokens.
        4. Integrates Semantic Similarity with Lexical Token Match Density.
        5. Performs post-retrieval Metadata Filters (District, Language boundaries).
        6. Implements exact scheme name or classification boosts.
        7. Returns compressed high-confidence citations (<300ms vector execution).
        """
        start_time = time.time()
        logger.info(f"Retrieving context for query: '{query}'")

        vector_hits: List[Dict[str, Any]] = []
        lexical_hits: List[Dict[str, Any]] = []

        # Step 1: Vector-Based Semantic Matching
        try:
            query_embedding = gemini_service.get_embedding(query)
            # Query match_scheme_chunks via supabase rpc
            rpc_res = self.supabase.rpc("match_scheme_chunks", {
                "query_embedding": query_embedding,
                "match_threshold": similarity_threshold,
                "match_count": max(top_k * 3, 20),
                "filter_state": state_filter,
                "filter_category": category_filter
            }).execute()

            if rpc_res.data:
                vector_hits = rpc_res.data
                logger.info(f"Hybrid retrieval fetched {len(vector_hits)} semantic candidates from DB.")
        except Exception as vector_err:
            logger.error(f"Hybrid Retrieval Warning: pgvector HNSW matcher failed: {str(vector_err)}")

        # Step 2: Lexical Token-Matching Search
        try:
            words = [w.lower().strip() for w in re.split(r"\s+", query) if len(w) > 2]
            if words:
                # Restrict candidate set via indexed schemes first to keep lexical queries lightning fast
                scheme_query = self.supabase.table("schemes").select("id, name, state, category")
                if state_filter:
                    scheme_query = scheme_query.or_(f"state.eq.{state_filter},state.eq.Central")
                if category_filter:
                    scheme_query = scheme_query.eq("category", category_filter)

                schemes_res = scheme_query.execute()
                if schemes_res.data:
                    matching_ids = [s["id"] for s in schemes_res.data]
                    
                    # Fetch chunks for matched schemes in safe batches
                    batch_size = 50
                    matched_db_chunks = []
                    for k in range(0, len(matching_ids), batch_size):
                        sub_ids = matching_ids[k : k + batch_size]
                        chunks_res = self.supabase.table("scheme_chunks")\
                            .select("id, scheme_id, chunk_text, metadata")\
                            .in_("scheme_id", sub_ids)\
                            .execute()
                        if chunks_res.data:
                            matched_db_chunks.extend(chunks_res.data)

                    # Compute keyword token matching density
                    for chunk in matched_db_chunks:
                        text_lower = chunk["chunk_text"].lower()
                        match_count = sum(1 for word in words if word in text_lower)
                        if match_count > 0:
                            lex_score = match_count / len(words)
                            meta = chunk.get("metadata") or {}
                            lexical_hits.append({
                                "id": chunk["id"],
                                "scheme_id": chunk["scheme_id"],
                                "chunk_text": chunk["chunk_text"],
                                "metadata": meta,
                                "lexical_score": lex_score,
                                "scheme_name": meta.get("scheme_name") or meta.get("parent_title") or "Welfare Scheme",
                                "state": meta.get("state") or meta.get("state_bound") or "",
                                "category": meta.get("category") or meta.get("category_bound") or ""
                            })
                    logger.info(f"Hybrid retrieval matched {len(lexical_hits)} lexical candidates.")
        except Exception as lex_err:
            logger.error(f"Hybrid Retrieval Warning: Lexical lookup pipeline hit failure: {str(lex_err)}")

        # Step 3: Reciprocal Rank Fusion & High Precision Integration
        combined_map: Dict[str, Dict[str, Any]] = {}

        # Add Vector Hits properties
        for v in vector_hits:
            cid = str(v["id"])
            metadata = v.get("metadata") or {}
            combined_map[cid] = {
                "id": cid,
                "scheme_id": str(v["scheme_id"]),
                "chunk_text": v["chunk_text"],
                "vector_similarity": float(v["similarity"]),
                "lexical_score": 0.0,
                "scheme_name": v.get("scheme_name") or metadata.get("scheme_name") or "",
                "category": v.get("scheme_category") or metadata.get("category") or "",
                "state": v.get("scheme_state") or metadata.get("state") or "",
                "metadata": metadata
            }

        # Override or Merge Lexical Hits properties
        for l in lexical_hits:
            cid = str(l["id"])
            if cid in combined_map:
                combined_map[cid]["lexical_score"] = float(l["lexical_score"])
            else:
                metadata = l.get("metadata") or {}
                combined_map[cid] = {
                    "id": cid,
                    "scheme_id": str(l["scheme_id"]),
                    "chunk_text": l["chunk_text"],
                    "vector_similarity": 0.0,
                    "lexical_score": float(l["lexical_score"]),
                    "scheme_name": l["scheme_name"],
                    "category": l["category"],
                    "state": l["state"],
                    "metadata": metadata
                }

        # Step 4: Calculate Fusion, Apply Exact Match Boosts, Keep Unique Items
        reranked_pool = []
        query_lower = query.lower()

        for item_id, item in combined_map.items():
            sim = item["vector_similarity"]
            lex = item["lexical_score"]

            # Mathematical fusion setup
            if sim > 0 and lex > 0:
                score = 0.65 * sim + 0.35 * lex
            elif sim > 0:
                score = sim
            else:
                score = 0.40 * lex  # Purely lexical hits are scaled lower

            # exact model boosts:
            # 1. Exact string match on parent scheme name
            sname = item["scheme_name"].lower()
            if sname and (sname in query_lower or query_lower in sname):
                score += 0.25

            # 2. Match on category terms
            cat = item["category"].lower()
            if cat and cat in query_lower:
                score += 0.10

            item["final_rerank_score"] = score
            reranked_pool.append(item)

        # Step 5: Post-Retrieval Metadata Filter (District boundaries, Languages)
        filtered_results = []
        for item in reranked_pool:
            meta = item.get("metadata") or {}

            # Geographic District boundary filters
            sc_district = meta.get("district") or item.get("district")
            if district_filter and sc_district:
                if district_filter.lower() != sc_district.lower():
                    continue

            # Language filters
            sc_language = meta.get("language")
            if language_filter and sc_language:
                if language_filter.lower() != sc_language.lower() and sc_language != "mixed":
                    continue

            filtered_results.append(item)

        # Sort descending by computed rerank_score
        filtered_results.sort(key=lambda x: x["final_rerank_score"], reverse=True)

        # Map to final SearchHit arrays
        hits: List[SearchHit] = []
        for item in filtered_results[:top_k]:
            clamped_similarity = min(max(item["final_rerank_score"], 0.01), 1.0)
            hits.append(SearchHit(
                id=item["id"],
                scheme_id=item["scheme_id"],
                chunk_text=item["chunk_text"],
                similarity=round(clamped_similarity, 4),
                scheme_name=item["scheme_name"],
                category=item["category"],
                state=item["state"]
            ))

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Hybrid Context retrieval executed in {elapsed_ms}ms. Found {len(hits)} matching chunks.")
        return hits

    def generate_grounded_response(
        self,
        query: str,
        context_hits: List[SearchHit],
        system_instruction_file: str = "chat_assistant.txt"
    ) -> Dict[str, Any]:
        """
        Core service pipeline: returns fully grounded answers framed under citations metadata:
        {
          "answer": " conversational grounded text ",
          "sources": [{"title": "", "chunk_id": "", "source": ""}],
          "confidence": 0.95
        }
        """
        if not context_hits:
            return {
                "answer": "నేను ఈ ప్రశ్నకు సంబంధించిన ప్రభుత్వ సంక్షేమ పథక సమాచారాన్ని కనుగొనలేకపోయాను. దయచేసి ప్రశ్నాంశాలను సరైన శీర్షికతో మార్చి ప్రయత్నించండి. (I could not locate factual policy criteria matching this query.)",
                "sources": [],
                "confidence": 0.0
            }

        # Group segments to retain source lineage
        context_statements = []
        sources_list = []

        for i, hit in enumerate(context_hits):
            context_statements.append(f"[Source {i+1}: {hit.scheme_name} | State: {hit.state}]\n{hit.chunk_text}")
            sources_list.append({
                "source": "Official Policy Blueprint Document",
                "title": hit.scheme_name,
                "chunk_id": hit.id,
                "similarity_score": hit.similarity,
                "category": hit.category
            })

        context_str = "\n\n".join(context_statements)

        # Frame absolute grounding instructions bounds to eliminate hallucination risks
        prompt = f"""
        Strict System Instruction: You are a high-precision corporate government counselor specializing in AP and TG welfares.
        Your answer must be highly precise, clear, and based strictly upon the grounded fact excerpts provided below.
        If the facts do not support a spec, tell the citizen that you do not hold those insights.

        [GROUNDING EXCERPTS]
        {context_str}

        [CITIZEN QUESTION]
        {query}
        """

        try:
            raw_answer = gemini_service.generate_response(
                prompt=prompt,
                system_instruction_file=system_instruction_file
            )

            # Compute normalized score representation
            mean_similarity = sum(h.similarity for h in context_hits) / len(context_hits)

            return {
                "answer": raw_answer,
                "sources": sources_list,
                "confidence": round(min(max(mean_similarity, 0.1), 1.0), 2)
            }
        except Exception as e:
            logger.error(f"Failed to generate structured grounded answer: {str(e)}")
            return {
                "answer": f"System encountered errors during response generation: {str(e)}",
                "sources": sources_list,
                "confidence": 0.1
            }

# Singleton Service Instance
rag_service = RAGService()
