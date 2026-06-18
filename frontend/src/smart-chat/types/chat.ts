// ===== FILE: src/types/chat.ts =====

export interface Block<T = any> {
  type: 'text' | 'code' | 'table' | 'flowchart' | 'flashcards' | 'dashboard' | 'steps' | 'comparison' | 'callout' | 'timeline' | 'accordion' | 'quiz' | 'mindmap';
  data: T;
}

export interface TextData { content: string; size?: 'normal'|'large'; emphasis?: 'normal'|'muted'|'highlight'; }
export interface CodeData { language: string; code: string; filename?: string; explanation?: string; }
export interface TableData { title?: string; headers: string[]; rows: string[][]; caption?: string; }
export interface FlowchartData { title: string; mermaid: string; description: string; }
export interface Flashcard { front: string; back: string; tag?: string; }
export interface FlashcardsData { topic: string; cards: Flashcard[]; }
export interface Metric { label: string; value: string; unit?: string; trend: 'up'|'down'|'stable'|'null'; change: string; }
export interface DashboardData { title: string; metrics: Metric[]; insight: string; }
export interface Step { title: string; description: string; code?: string; tip?: string; }
export interface StepsData { title: string; style: 'numbered'|'checklist'; steps: Step[]; }
export interface Criteria { name: string; a: string; b: string; winner: 'a'|'b'|'tie'; }
export interface ComparisonData { title: string; labels: [string, string]; criteria: Criteria[]; verdict: string; }
export interface CalloutData { variant: 'info'|'warning'|'error'|'success'|'tip'|'important'; title: string; content: string; }
export interface TimelineEvent { date: string; title: string; description: string; milestone: boolean; }
export interface TimelineData { title: string; events: TimelineEvent[]; }
export interface AccordionSection { title: string; content: string; open: boolean; }
export interface AccordionData { sections: AccordionSection[]; }
export interface Question { question: string; options: string[]; answer: string; explanation: string; }
export interface QuizData { topic: string; questions: Question[]; }
export interface Branch { topic: string; subtopics: string[]; }
export interface MindmapData { center: string; branches: Branch[]; }

export interface Citation {
  id: number;
  text: string;
  url?: string;
}

export interface ChatResponse {
  loading_messages: string[];
  thinking_level: 'minimal'|'low'|'medium'|'high';
  blocks: Block[];
  citations: Citation[];
  follow_up_suggestions: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  blocks?: Block[];
  timestamp: number;
  thinking_level?: 'minimal'|'low'|'medium'|'high';
  citations?: Citation[];
  follow_up_suggestions?: string[];
  loading_messages?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}
