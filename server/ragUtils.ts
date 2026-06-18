import crypto from 'crypto';
import { logger } from '../frontend/src/utils/logger';
import { generateContentWithRetryAndFallback } from '../frontend/src/utils/gemini';

export interface ParentChunk {
  id: string;
  text: string;
  page_number: number;
  sequence_index: number;
  clause_type: string;
}

export interface ChildChunk {
  id: string;
  parent_id: string;
  text: string;
  page_number: number;
  clause_type: string;
}

/**
 * Creates two-tier Hierarchical Chunking.
 * - Parent chunk: split by logical double newlines / paragraph boundaries
 * - Child chunk size: 600 characters, overlap: 120 characters
 */
export function segmentHierarchically(text: string): { parents: ParentChunk[]; children: ChildChunk[] } {
  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];

  const normalized = text.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n\s*\n+/);
  
  let parentIndex = 1;
  const childSize = 600;
  const childOverlap = 120;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const parentId = crypto.randomUUID();
    const charIndex = normalized.indexOf(trimmed);
    const pageNum = charIndex !== -1 ? Math.floor(charIndex / 3000) + 1 : 1;

    let clauseType = 'general_covenant';
    if (/payment|rent|deposit|₹|rupees|amount/i.test(trimmed)) clauseType = 'payment';
    else if (/terminate|expiration|notice|evict/i.test(trimmed)) clauseType = 'termination';
    else if (/liability|indemnity|hold harmless/i.test(trimmed)) clauseType = 'liability';
    else if (/arbitrate|mediat|dispute/i.test(trimmed)) clauseType = 'dispute_resolution';

    const parent: ParentChunk = {
      id: parentId,
      text: trimmed,
      page_number: pageNum,
      sequence_index: parentIndex,
      clause_type: clauseType
    };
    parents.push(parent);

    if (trimmed.length <= childSize) {
      children.push({
        id: crypto.randomUUID(),
        parent_id: parentId,
        text: trimmed,
        page_number: pageNum,
        clause_type: clauseType
      });
    } else {
      let childStartIndex = 0;
      while (childStartIndex < trimmed.length) {
        const childText = trimmed.substring(childStartIndex, childStartIndex + childSize);
        children.push({
          id: crypto.randomUUID(),
          parent_id: parentId,
          text: childText,
          page_number: pageNum,
          clause_type: clauseType
        });
        childStartIndex += (childSize - childOverlap);
        if (childSize - childOverlap <= 0) break;
      }
    }

    parentIndex++;
  }

  return { parents, children };
}

/**
 * Executes standard BM25 Keyword Search over a set of document chunks.
 */
export function bm25Search(query: string, docs: { id: string; text: string }[]): { id: string; score: number }[] {
  const cleanTerms = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const docCount = docs.length;
  if (docCount === 0 || cleanTerms.length === 0) {
    return docs.map(d => ({ id: d.id, score: 0 }));
  }

  // Calculate Document Frequency (DF) for each query term
  const df: Record<string, number> = {};
  const docTokens = docs.map(d => {
    const terms = d.text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const termSet = new Set(terms);
    termSet.forEach(t => {
      df[t] = (df[t] || 0) + 1;
    });
    return { id: d.id, terms, length: terms.length };
  });

  const avgDocLength = docTokens.reduce((sum, d) => sum + d.length, 0) / docCount;

  // BM25 tuning factors
  const k1 = 1.2;
  const b = 0.75;

  const hits = docs.map((doc, idx) => {
    const info = docTokens[idx];
    let score = 0;

    cleanTerms.forEach(term => {
      const termDf = df[term] || 0;
      if (termDf === 0) return;

      // Log-scaled inverse document frequency (IDF)
      const idf = Math.log(1 + (docCount - termDf + 0.5) / (termDf + 0.5));
      const tf = info.terms.filter(t => t === term).length;

      // BM25 standard scaling
      const termScore = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (info.length / avgDocLength)));
      score += termScore;
    });

    return { id: doc.id, score };
  });

  return hits.sort((a, b) => b.score - a.score);
}

/**
 * Reciprocal Rank Fusion (RRF) to consolidate vector search & lexical search ranks.
 */
export function rrfConsolidate(
  vectorHits: { id: string; score: number }[],
  bm25Hits: { id: string; score: number }[]
): { id: string; rrfScore: number }[] {
  const rrfMap = new Map<string, number>();

  // Consolidate ranks using standard formula: Score = 1 / (60 + VectorRank) + 1 / (60 + BM25Rank)
  vectorHits.forEach((hit, index) => {
    const rank = index + 1;
    const score = 1 / (60 + rank);
    rrfMap.set(hit.id, (rrfMap.get(hit.id) || 0) + score);
  });

  bm25Hits.forEach((hit, index) => {
    const rank = index + 1;
    const score = 1 / (60 + rank);
    rrfMap.set(hit.id, (rrfMap.get(hit.id) || 0) + score);
  });

  return Array.from(rrfMap.entries())
    .map(([id, rrfScore]) => ({ id, rrfScore }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * HyDE (Hypothetical Document Embeddings) query expansion helper.
 */
export async function expandQueryWithHyDE(query: string): Promise<string> {
  try {
    logger.info(`[RAG-HyDE] Expanding semantic query with HyDE mapping`);
    const res = await generateContentWithRetryAndFallback({
      contents: `Generate a short hypothetical legal policy clause or government order detail matching this user request/document excerpt to improve search recall: "${query}"`,
      fallbackModel: 'gemini-3.1-flash-lite',
      config: {
        systemInstruction: "You are an elite legal policy author. Provide only a hypothetical 1-2 sentence scheme entitlement text.",
        temperature: 0.7
      }
    });
    if (res && (res as any).text) {
      const hydeText = (res as any).text.trim();
      logger.info(`[RAG-HyDE] Successfully generated hypothetical text: "${hydeText.substring(0, 100)}..."`);
      return hydeText;
    }
  } catch (error) {
    logger.warn('[RAG-HyDE] HyDE generation failed, falling back to raw query', error);
  }
  return query;
}
