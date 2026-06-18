-- ==========================================
-- SchemeConnect AP: Supabase PostgreSQL Schema with pgvector
-- ==========================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLOUD USERS TABLE (complements Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Andhra Pradesh',
    district VARCHAR(100),
    caste_category VARCHAR(50) DEFAULT 'General',
    income_annual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    occupation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. WELFARE SCHEMES REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    name_te VARCHAR(255),
    description TEXT NOT NULL,
    description_te TEXT,
    benefit_details TEXT,
    benefit_details_te TEXT,
    eligibility_rules JSONB NOT NULL, -- Logical matching criteria parsed by engine
    docs_required TEXT[] DEFAULT '{}',
    docs_required_te TEXT[] DEFAULT '{}',
    state VARCHAR(50) NOT NULL,       -- 'Andhra Pradesh', 'Telangana', or 'Central'
    district VARCHAR(100) DEFAULT NULL, -- Null if state-wide, otherwise district-specific
    category VARCHAR(100) NOT NULL,    -- 'Agriculture', 'Education', 'Social Welfare', etc.
    external_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SCHEME DOCUMENT CHUNKS TABLE (for Policy Document RAG)
CREATE TABLE IF NOT EXISTS public.scheme_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES public.schemes(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Gemini standard embedding model text-embedding-004 produces 768-dimension vectors
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CITIZEN UPLOADED LEGAL DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Rental Agreement',
    content_raw TEXT NOT NULL,
    risk_score INTEGER DEFAULT 100, -- Standardized clause quality rating
    analysis_report JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store dynamic clause issues and fixes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. LEGAL DOCUMENT CHUNKS (for Clause Matching RAG)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CHAT ACCOUNTS & SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CHAT MESSAGE LOGS
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    widgets JSONB DEFAULT NULL,         -- Interactive state-wise eligibility cards/tables
    sources JSONB DEFAULT NULL,         -- Document references / URLs cited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CITIZEN QUERY SEARCH HISTORY TRACKING
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    matched_scheme_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. BOOKMARKED/SAVED WELFARE SCHEMES FOR CITIZENS
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scheme_id)
);


-- ==========================================
-- DATABASE INDEXES FOR ENHANCED PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_scheme_chunks_scheme_id ON public.scheme_chunks(scheme_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON public.document_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_schemes_state_district ON public.schemes(state, district);

-- HNSW Vector Index on scheme embedding chunks (optimized for cosine distance matching)
CREATE INDEX IF NOT EXISTS idx_scheme_chunks_hnsw 
ON public.scheme_chunks 
USING hnsw (embedding vector_cosine_ops);


-- ==========================================
-- CUSTOM RPC STORAGE MATCHING FUNCTIONS
-- ==========================================

-- Similarity match for Scheme Chunks
CREATE OR REPLACE FUNCTION public.match_scheme_chunks(
    query_embedding vector(768),
    match_threshold FLOAT,
    match_count INT,
    filter_state VARCHAR DEFAULT NULL,
    filter_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    scheme_id UUID,
    chunk_text TEXT,
    metadata JSONB,
    similarity FLOAT,
    scheme_name VARCHAR,
    scheme_state VARCHAR,
    scheme_category VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.scheme_id,
        sc.chunk_text,
        sc.metadata,
        1 - (sc.embedding <=> query_embedding) AS similarity,
        s.name AS scheme_name,
        s.state AS scheme_state,
        s.category AS scheme_category
    FROM public.scheme_chunks sc
    JOIN public.schemes s ON sc.scheme_id = s.id
    WHERE (1 - (sc.embedding <=> query_embedding)) > match_threshold
      AND (filter_state IS NULL OR s.state = filter_state OR s.state = 'Central')
      AND (filter_category IS NULL OR s.category = filter_category)
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
