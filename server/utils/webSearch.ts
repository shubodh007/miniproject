import { logger } from '../../frontend/src/utils/logger';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  if (!tavilyKey && !serperKey) {
    logger.warn('[WebSearch] Neither TAVILY_API_KEY nor SERPER_API_KEY is configured in your environment. Web search skipped.');
    return [];
  }

  // Prioritize Tavily if both are available, or fallback to Serper
  if (tavilyKey) {
    try {
      logger.info(`[WebSearch] Querying Tavily Search API with query: "${query}"`);
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: query,
          search_depth: 'basic',
          include_answer: false
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API responded with status ${response.status}`);
      }

      const data: any = await response.json();
      if (data && Array.isArray(data.results)) {
        logger.info(`[WebSearch] Tavily search successful. Found ${data.results.length} results.`);
        return data.results.map((r: any) => ({
          title: r.title || 'Untitled Result',
          url: r.url || '',
          snippet: r.content || '',
          score: r.score
        }));
      }
    } catch (error) {
      logger.error('[WebSearch] Error during Tavily Search execution:', error);
    }
  }

  if (serperKey) {
    try {
      logger.info(`[WebSearch] Querying Serper API with query: "${query}"`);
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API responded with status ${response.status}`);
      }

      const data: any = await response.json();
      if (data && Array.isArray(data.organic)) {
        logger.info(`[WebSearch] Serper search successful. Found ${data.organic.length} results.`);
        return data.organic.map((r: any) => ({
          title: r.title || 'Untitled Result',
          url: r.link || '',
          snippet: r.snippet || ''
        }));
      }
    } catch (error) {
      logger.error('[WebSearch] Error during Serper Search execution:', error);
    }
  }

  return [];
}
