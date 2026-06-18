import { parsePartialJson } from './gemini'; // Import resilient partial JSON repair parser to build stable streams

export interface VisitedSite {
  favicon?: string;
  domain: string;
  title: string;
  status: 'Visiting...' | 'Done';
}

export interface SearchCompleteData {
  sources: any[];
  widgets: any[];
  artifactHtml?: string;
  mermaidCode?: string;
}

export type SearchEventMap = {
  search_status: (status: string) => void;
  search_stage: (stage: string, message: string) => void;
  search_results: (queries: string[], sources: any[]) => void;
  query_formed: (query: string) => void;
  site_visited: (site: VisitedSite) => void;
  source_added: (count: number) => void;
  reasoning_token: (token: string) => void;
  response_token: (token: string) => void;
  search_complete: (data: SearchCompleteData) => void;
  error: (err: string) => void;
};

export class SearchStreamEmitter {
  private listeners: { [K in keyof SearchEventMap]?: Array<SearchEventMap[K]> } = {};

  public on<K extends keyof SearchEventMap>(event: K, listener: SearchEventMap[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  public off<K extends keyof SearchEventMap>(event: K, listener: SearchEventMap[K]) {
    if (!this.listeners[event]) return;
    this.listeners[event] = (this.listeners[event] as any).filter((l: any) => l !== listener);
  }

  public emit<K extends keyof SearchEventMap>(event: K, ...args: Parameters<SearchEventMap[K]>) {
    const list = this.listeners[event];
    if (list) {
      for (const listener of list) {
        (listener as any)(...args);
      }
    }
  }

  /**
   * Subscribes to SSE stream and dispatches event mapped callbacks.
   */
  public async handleStream(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) {
      this.emit('error', 'Unable to initialize reader stream.');
      return;
    }

    const decoder = new TextDecoder();
    let textBuffer = '';
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        textBuffer += decoder.decode(value, { stream: !done });
        const lines = textBuffer.split('\n');
        textBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const rawJson = trimmed.substring(6).trim();
            try {
              const data = parsePartialJson(rawJson); // Safely parse and reconstruct partial JSON streamed chunks using resilient partial parser
              if (!data) continue; // If parsing/repair returned null, continue to accumulate next chunks
              
              if (data.type === 'search_status') {
                this.emit('search_status', data.status);
              } else if (data.type === 'search_stage') {
                this.emit('search_stage', data.stage, data.message);
              } else if (data.type === 'search_results') {
                this.emit('search_results', data.queries || [], data.sources || []);
              } else if (data.type === 'query_formed' || data.query) {
                this.emit('query_formed', data.query || data.query_string);
              } else if (data.type === 'site_visited') {
                this.emit('site_visited', {
                  domain: data.domain || data.site,
                  title: data.title,
                  status: data.status || 'Visiting...',
                  favicon: data.favicon
                });
              } else if (data.type === 'source_added') {
                this.emit('source_added', data.count);
              } else if (data.type === 'reasoning_token') {
                this.emit('reasoning_token', data.token);
              } else if (data.token) {
                this.emit('response_token', data.token);
              }
              
              if (data.is_complete) {
                this.emit('search_complete', {
                  sources: data.sources || [],
                  widgets: data.widgets || [],
                  artifactHtml: data.artifactHtml,
                  mermaidCode: data.mermaidCode
                });
              }
            } catch (err) {
              // Ignore partial or malformed lines gracefully
            }
          }
        }
      }
    }
  }
}
