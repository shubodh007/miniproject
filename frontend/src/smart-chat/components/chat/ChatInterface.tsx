// ===== FILE: src/components/chat/ChatInterface.tsx =====
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, MessageSquare, Copy, Sparkles, Plus, PanelLeftClose, PanelLeftOpen, CornerDownRight, Trash2, Download, FileText, Scale, Globe } from 'lucide-react';
import { Message, ChatResponse, Block, Step, Metric, Criteria, TimelineEvent, Branch, Flashcard, Question } from '../../types/chat';
import { chatWithGemini, detectThinkingLevel } from '../../lib/gemini';
import { BlockRenderer } from '../blocks';
import { useLocation, router } from '../../../utils/router';
import { useTranslation } from '../../../i18n';
import { useChatSession } from '../../../hooks/useChatSession';
import { EmptyState } from '../../../components/EmptyState';
import { SchemeChecklistModal } from '../../../components/SchemeChecklistModal';
import { ArtifactSidebar } from '../../../components/ArtifactSidebar';
import { useChecklistGenerator } from '../../../hooks/useChecklistGenerator';
import { ThinkingStageStreamer } from '../../../components/ui/ThinkingStageStreamer';
import { Virtuoso } from 'react-virtuoso';
import { ProfilePayload, AuthUser } from '../../../types';

interface ChatInterfaceProps {
  attachedFile?: { name: string; content: string } | null;
  clearAttachedFile?: () => void;
  prepopulatedQuery?: string | null;
  clearPrepopulatedQuery?: () => void;
  profileSnapshot?: ProfilePayload | null;
  user?: AuthUser | null;
}

export function ChatInterface({
  attachedFile = null,
  clearAttachedFile,
  prepopulatedQuery = null,
  clearPrepopulatedQuery,
  profileSnapshot = null,
  user = null,
}: ChatInterfaceProps = {}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [artifactTemplateId, setArtifactTemplateId] = useState<string>('generic');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const consumedQueryRef = useRef<string | null>(null);
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
  
  const location = useLocation();
  const { language } = useTranslation();
  const [activeScheme, setActiveScheme] = useState<any>(null);
  const {
    handleGenerateChecklist,
    checklistModal,
    setChecklistModal
  } = useChecklistGenerator(profileSnapshot);

  const normalizedActiveScheme = activeScheme ? {
    scheme_id: activeScheme.scheme_id || activeScheme.id || 'unknown',
    name_en: activeScheme.name_en || activeScheme.scheme_name || 'Scheme',
    name_te: activeScheme.name_te || activeScheme.scheme_name || 'పథకం',
    documents_required: activeScheme.documents_required || activeScheme.documents_needed || [],
    apply_link: activeScheme.apply_link || activeScheme.apply_url || 'https://www.myscheme.gov.in',
    ...activeScheme
  } : null;

  const [localAttachedFile, setLocalAttachedFile] = useState<{ name: string; content: string } | null>(null);

  // Sync external attachedFile prop into local state
  useEffect(() => {
    if (attachedFile) {
      setLocalAttachedFile(attachedFile);
    }
  }, [attachedFile]);

  // Sync artifact template ID based on active scheme or attached file
  useEffect(() => {
    if (localAttachedFile?.name) {
      const n = localAttachedFile.name.toLowerCase();
      if (n.includes('rent') || n.includes('lease')) {
        setArtifactTemplateId('rental');
      } else if (n.includes('land') || n.includes('agri')) {
        setArtifactTemplateId('land-lease');
      } else if (n.includes('income') || n.includes('cert')) {
        setArtifactTemplateId('income');
      } else if (n.includes('grievance') || n.includes('letter')) {
        setArtifactTemplateId('grievance');
      } else {
        setArtifactTemplateId('generic');
      }
    } else if (activeScheme) {
      const sName = (activeScheme.scheme_name || activeScheme.name_en || "").toLowerCase();
      if (sName.includes('land') || sName.includes('agri') || sName.includes('farmer') || sName.includes('rythu')) {
        setArtifactTemplateId('land-lease');
      } else if (sName.includes('rent') || sName.includes('house')) {
        setArtifactTemplateId('rental');
      } else if (sName.includes('grievance') || sName.includes('support')) {
        setArtifactTemplateId('grievance');
      } else {
        setArtifactTemplateId('generic');
      }
    }
  }, [localAttachedFile, activeScheme]);

  const {
    sessions,
    currentSessionId,
    messages,
    setMessages,
    createSession,
    loadSessionMessages,
    saveMessage,
    deleteSession
  } = useChatSession();

  // Automatically initialize scheme details if coming from Results with a handoff
  useEffect(() => {
    if (location.state?.schemeHandoff) {
      const scheme = location.state.schemeHandoff;
      setActiveScheme(scheme);
      
      const titleLabel = scheme.scheme_name || 'Scheme Details';
      const isTe = scheme.scheme_name && /[\u0c00-\u0c7f]/.test(scheme.scheme_name);
      
      const welcomeCallout: Block = {
        type: 'callout',
        data: {
          variant: 'success',
          title: isTe ? `సహాయ్ సమాచార నివేదిక: ${titleLabel}` : `Sahay AI Advisory: ${titleLabel}`,
          content: isTe 
            ? `మీ అర్హతల ఆధారంగా ఈ క్రింది పథకం యొక్క సమగ్ర వివరాలను సహాయ్ సిద్ధం చేసింది. సందేహాల నివృత్తి కోసం ప్రశ్నలను అడగవచ్చు.`
            : `I have compiled the comprehensive structural parameters for **${titleLabel}** based on your profile details. You can ask follow-up questions below for clarification.`
        }
      };

      const dashboardBlock: Block = {
        type: 'dashboard',
        data: {
          title: isTe ? 'పథకం ప్రయోజన సూచిక' : 'Scheme Parameters & Benefits',
          metrics: [
            {
              label: isTe ? 'ఆర్థిక సహాయాలు' : 'Benefit Capital',
              value: scheme.benefit_amount || 'N/A',
              trend: 'stable',
              change: 'Verified'
            },
            {
              label: isTe ? 'అర్హత నిశ్చయత' : 'Eligibility Metric',
              value: `${scheme.eligibility_match}%`,
              trend: 'up',
              change: scheme.match_certainty || 'Match'
            }
          ],
          insight: isTe
            ? `శాఖ: ${scheme.department} | వర్గం: ${scheme.category} | పరిధి: ${scheme.state}`
            : `Department: ${scheme.department} | Category: ${scheme.category} | Domain: ${scheme.state}`
        }
      };

      const eligibilityBlock: Block = {
        type: 'steps',
        data: {
          title: isTe ? 'అర్హత కారణాలు & నిబంధనలు' : 'Eligibility & Reasoning Chain Checklist',
          style: 'checklist',
          steps: (scheme.reasoning_chain || []).map((reason: string) => ({
            title: reason,
            description: isTe ? 'ధృవీకరించబడింది' : 'Verification passed'
          }))
        }
      };

      const docsBlock: Block = {
        type: 'steps',
        data: {
          title: isTe ? 'సమర్పించవలసిన సరుకులు / పత్రాలు' : 'Required Verification Documents',
          style: 'numbered',
          steps: (scheme.documents_needed || []).map((doc: string) => ({
            title: doc,
            description: isTe ? 'సచివాలయం సమర్పణకు కావాలి' : 'Required for official registration'
          }))
        }
      };

      const applyCallout: Block = {
        type: 'callout',
        data: {
          variant: 'info',
          title: isTe ? 'దరఖాస్తు విధానం' : 'Application Process',
          content: isTe
            ? `పథకానికి దరఖాస్తు చేయుటకు ఇక్కడ నొక్కండి: [అప్లికేషన్ లింక్](${scheme.apply_url})`
            : `To proceed with registration, visit the official portal: [Portal Application Link](${scheme.apply_url})`
        }
      };

      const followUpSuggestions = isTe 
        ? [
            `ఈ పథకానికి ఏయే పత్రాలు అవసరమవుతాయి?`,
            `ఈ పథకం యొక్క దరఖాస్తు గడువు ఎంత?`,
            `పథకం దరఖాస్తు విధానాన్ని వివరించండి`
          ]
        : [
            `What are the major document guidelines?`,
            `What is the benefit disbursement timeline?`,
            `Explain the application process step-by-step`
          ];

      const initialBlocks = [
        welcomeCallout,
        dashboardBlock,
        eligibilityBlock,
        docsBlock,
        applyCallout
      ];

      const initHandoff = async () => {
        try {
          await createSession(`${titleLabel}`);
          await saveMessage('assistant', `Scheme Details for ${titleLabel}`, initialBlocks, [], followUpSuggestions);
        } catch (err) {
          console.error('Error during initial scheme handoff session registration:', err);
        }
      };

      initHandoff();
      router.clearHandoff();
    }
  }, [location.state, createSession, saveMessage]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    try {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth'
      });
    } catch (e) {
      // Safe boundary check
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, typingMsgId]);

  const handleSend = async (override?: string) => {
    const text = override ?? input;
    if (!text.trim() || loading) return;

    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setTypingMsgId(null);

    // Contextually attach files if present
    let finalContent = text;
    if (localAttachedFile) {
      finalContent = `Please analyze this attached document:\n\n---\nFile: ${localAttachedFile.name}\n\n${localAttachedFile.content}\n---\n\nMy query: ${text}`;
      setLocalAttachedFile(null);
      clearAttachedFile?.();
    }

    const userMsgId = Date.now().toString();
    const userMsg: Message = { id: userMsgId, role: 'user', content: finalContent, timestamp: Date.now() };
    
    // Optimistic user payload rendering
    setMessages(prev => [...prev, userMsg]);
    
    // Save User message
    await saveMessage('user', finalContent, undefined, undefined, undefined, userMsgId);

    const computedThinkingLevel = webSearchEnabled ? 'web_search' : detectThinkingLevel(text);

    let loadingMsgs = ["Initializing AI environment...", "Parsing structure...", "Generating intelligent response..."];
    if (webSearchEnabled) {
      loadingMsgs = [
        "Connecting to live search API...",
        "Searching web via Tavily/Serper...",
        "Retrieving latest state regulations...",
        "Analyzing real-time policy guidelines...",
        "Grounding response in verified web results...",
        "Constructing complete answers..."
      ];
    } else if (computedThinkingLevel === 'high') {
      loadingMsgs = ["Initializing AI environment...", "Processing complex eligibility rules...", "Analyzing dependencies...", "Generating intelligent response..."];
    }

    const astId = (Date.now() + 1).toString();
    const tempAst: Message = {
      id: astId,
      role: 'assistant',
      loading_messages: loadingMsgs,
      thinking_steps: loadingMsgs,
      timestamp: Date.now(),
      thinking_level: computedThinkingLevel
    };
    
    // Add assistant placeholder to show typing indicator
    setMessages(prev => [...prev, tempAst]);
    setLoading(true);
    
    try {
      // Fetch response with active citizen profile snapshot context
      if (profileSnapshot) {
        console.info('[Chat] Sending profile context for state:', profileSnapshot?.state);
      }
      const contextMessages = [...messages, userMsg];
      const response = await chatWithGemini(contextMessages, computedThinkingLevel, activeScheme, profileSnapshot, webSearchEnabled);
      
      // Instantly update UI element to render blocks and clear loaders
      setMessages(prev => prev.map(m => m.id === astId ? {
        ...m,
        loading_messages: undefined,
        blocks: response.blocks,
        citations: response.citations,
        follow_up_suggestions: response.follow_up_suggestions,
        thinking_level: response.thinking_level
      } : m));

      // Save Assistant message to Database asynchronously
      await saveMessage(
        'assistant',
        response.blocks.map(b => b.data?.content || '').join('\n') || 'AI Response',
        response.blocks,
        response.citations,
        response.follow_up_suggestions,
        astId
      );

      setTypingMsgId(astId);
    } catch (err) {
      console.error('Failed to process stream response:', err);
      setMessages(prev => prev.map(m => m.id === astId ? {
        ...m,
        loading_messages: undefined,
        blocks: [{ type: 'callout', data: { variant: 'error', title: 'Error', content: 'Connection failure. Please retry.' } }],
      } : m));
    } finally {
      setLoading(false);
    }
  };

  // Consume prepopulatedQuery on mount/update
  useEffect(() => {
    if (prepopulatedQuery && consumedQueryRef.current !== prepopulatedQuery) {
      consumedQueryRef.current = prepopulatedQuery;
      handleSend(prepopulatedQuery);
      clearPrepopulatedQuery?.();
    }
  }, [prepopulatedQuery, clearPrepopulatedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const formatMessagesToMarkdown = (messagesList: Message[]): string => {
    let md = "# Conversation History\n\n";
    messagesList.forEach((msg) => {
      const roleLabel = msg.role === 'user' ? '### User' : '### Assistant';
      md += `${roleLabel}\n`;
      
      if (msg.role === 'user' || !msg.blocks || msg.blocks.length === 0) {
        if (msg.content) {
          md += `${msg.content}\n\n`;
        } else {
          md += `*(Empty message)*\n\n`;
        }
        return;
      }
      
      msg.blocks.forEach((block) => {
        const { type, data } = block;
        if (!data) return;
        
        switch (type) {
          case 'text':
            if (data.content) md += `${data.content}\n\n`;
            break;
          case 'code':
            md += `\`\`\`${data.language || 'plaintext'}\n${data.code || ''}\n\`\`\`\n`;
            if (data.explanation) md += `*Explanation:* ${data.explanation}\n\n`;
            break;
          case 'callout':
            md += `> **[${(data.variant || 'Notice').toUpperCase()}] ${data.title || ''}**\n> ${data.content || ''}\n\n`;
            break;
          case 'steps':
            md += `#### ${data.title || 'Steps'}\n`;
            if (Array.isArray(data.steps)) {
              data.steps.forEach((step: Step, sIdx: number) => {
                const num = data.style === 'numbered' ? `${sIdx + 1}.` : '-';
                md += `${num} **${step.title || ''}**${step.description ? `: ${step.description}` : ''}\n`;
                if (step.tip) md += `   *Tip:* ${step.tip}\n`;
              });
            }
            md += '\n';
            break;
          case 'table':
            md += `#### ${data.title || 'Table'}\n\n`;
            if (Array.isArray(data.headers)) {
              md += `| ${data.headers.join(' | ')} |\n`;
              md += `| ${data.headers.map(() => '---').join(' | ')} |\n`;
            }
            if (Array.isArray(data.rows)) {
              data.rows.forEach((row: string[]) => {
                md += `| ${row.join(' | ')} |\n`;
              });
            }
            md += '\n';
            break;
          case 'dashboard':
            md += `#### ${data.title || 'Dashboard'}\n\n`;
            if (Array.isArray(data.metrics)) {
              data.metrics.forEach((m: Metric) => {
                md += `- **${m.label || ''}**: ${m.value || ''} (${m.change || ''})\n`;
              });
            }
            if (data.insight) md += `\n*Insight:* ${data.insight}\n\n`;
            break;
          case 'comparison':
            md += `#### ${data.title || 'Comparison'}\n\n`;
            const labels = data.labels || ['A', 'B'];
            md += `| Criterion | ${labels[0]} | ${labels[1]} | Win |\n`;
            md += `| --- | --- | --- | --- |\n`;
            if (Array.isArray(data.criteria)) {
              data.criteria.forEach((c: Criteria) => {
                md += `| ${c.name || ''} | ${c.a || ''} | ${c.b || ''} | ${c.winner || ''} |\n`;
              });
            }
            if (data.verdict) md += `\n*Verdict:* ${data.verdict}\n\n`;
            break;
          case 'timeline':
            md += `#### ${data.title || 'Timeline'}\n\n`;
            if (Array.isArray(data.events)) {
              data.events.forEach((evt: TimelineEvent) => {
                md += `- **${evt.date || ''}** - **${evt.title || ''}**: ${evt.description || ''}\n`;
              });
            }
            md += '\n';
            break;
          case 'mindmap':
            md += `#### Mind Map: ${data.center || ''}\n\n`;
            if (Array.isArray(data.branches)) {
              data.branches.forEach((b: Branch) => {
                md += `- **${b.topic || ''}**\n`;
                if (Array.isArray(b.subtopics)) {
                  b.subtopics.forEach((sub: string) => {
                    md += `  - ${sub}\n`;
                  });
                }
              });
            }
            md += '\n';
            break;
          case 'flashcards':
            md += `#### Flashcards: ${data.topic || ''}\n\n`;
            if (Array.isArray(data.cards)) {
              data.cards.forEach((card: Flashcard, cIdx: number) => {
                md += `${cIdx + 1}. **Q:** ${card.front}\n   **A:** ${card.back}\n\n`;
              });
            }
            break;
          case 'quiz':
            md += `#### Quiz: ${data.topic || ''}\n\n`;
            if (Array.isArray(data.questions)) {
              data.questions.forEach((q: Question, qIdx: number) => {
                md += `**Q${qIdx + 1}: ${q.question}**\n`;
                if (Array.isArray(q.options)) {
                  q.options.forEach((opt: string, oIdx: number) => {
                    md += `   ${String.fromCharCode(97 + oIdx)}) ${opt}\n`;
                  });
                }
                md += `   *Correct Answer:* ${q.answer}\n`;
                if (q.explanation) md += `   *Explanation:* ${q.explanation}\n`;
                md += '\n';
              });
            }
            break;
          default:
            const fallbackText = typeof data === 'string' ? data : JSON.stringify(data);
            md += `${fallbackText}\n\n`;
            break;
        }
      });

      if (msg.citations && msg.citations.length > 0) {
        md += `*Sources:*\n`;
        msg.citations.forEach((cite, cIdx) => {
          md += `[${cIdx + 1}] ${cite.text}${cite.url ? ` (${cite.url})` : ''}\n`;
        });
        md += '\n';
      }

      if (msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0) {
        md += `*Suggested Queries:*\n`;
        msg.follow_up_suggestions.forEach((sug) => {
          md += `- ${sug}\n`;
        });
        md += '\n';
      }
      md += `---\n\n`;
    });
    return md;
  };

  const handleDownload = () => {
    if (messages.length === 0) return;
    
    const activeSession = sessions.find(s => s.id === currentSessionId);
    const title = activeSession?.title || 'conversation-history';
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
      
    const markdownContent = formatMessagesToMarkdown(messages);
    
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sanitizedTitle || 'chat-history'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full bg-bg-base text-text-primary font-sans overflow-hidden">
      
      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-r border-border-subtle bg-bg-surface flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-border-subtle">
              <button 
                onClick={async () => {
                  try {
                    await createSession();
                  } catch (err) {
                    console.error('Failed to create session on-the-fly:', err);
                  }
                }} 
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-accent-saffron hover:bg-accent-saffron/90 hover:scale-[1.02] active:scale-[0.98] rounded-xl font-medium transition-all duration-200 text-white hover:text-white cursor-pointer justify-center shadow-sm select-none focus:outline-none focus:ring-2 focus:ring-accent-saffron/50"
              >
                <Plus size={16} /> New Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              <div className="px-3.5 py-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-1 select-none">Conversations</div>
              {sessions.length === 0 ? (
                <div className="px-3.5 py-6 text-xs text-text-muted text-center italic border border-dashed border-border-subtle/55 rounded-xl bg-bg-base/30">No active conversations</div>
              ) : (
                sessions.map(s => {
                  const isActive = s.id === currentSessionId;
                  return (
                    <div 
                      key={s.id} 
                      role="button"
                      tabIndex={0}
                      aria-current={isActive ? 'true' : undefined}
                      className={`relative w-full pl-7 pr-3.5 py-3 flex items-center justify-between rounded-xl text-sm transition-all duration-200 ease-in-out group cursor-pointer border border-transparent select-none focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 ${
                        isActive 
                          ? 'bg-bg-elevated text-accent-saffron font-semibold border-border-subtle shadow-xs translate-x-1' 
                          : 'text-text-secondary hover:bg-bg-base/60 hover:text-text-primary hover:border-border-subtle/30 hover:translate-x-1'
                      }`}
                      onClick={() => loadSessionMessages(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          loadSessionMessages(s.id);
                        }
                      }}
                    >
                      {/* Premium dynamic left vertical indicator bar */}
                      <span className={`absolute left-2.5 top-3.5 bottom-3.5 w-[3.5px] rounded-full bg-accent-saffron transition-all duration-200 origin-center ${
                        isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 group-hover:scale-y-60 group-hover:opacity-40'
                      }`} />

                      <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                        <MessageSquare size={15} className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-accent-saffron' : 'text-text-muted group-hover:text-text-primary'}`} />
                        <span className="truncate">{s.title || 'Conversation'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-text-muted hover:text-red-500 transition-all duration-150 p-1 rounded-lg cursor-pointer hover:bg-red-500/10 focus:ring-1 focus:ring-red-400 focus:outline-none"
                        title="Delete Session"
                        aria-label={`Delete conversation ${s.title || 'Conversation'}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 border-t border-border-subtle text-xs text-text-muted flex justify-between items-center bg-bg-base/40">
              <div className="flex items-center gap-1.5"><Sparkles size={13} className="text-accent-saffron animate-pulse"/> Flash 3.5 Ready</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <motion.div 
        layout
        className={`flex flex-col min-w-0 bg-bg-base transition-all duration-350 ${
          isArtifactOpen ? 'w-full lg:w-[60%] lg:flex-none shrink-0 border-r border-border-subtle' : 'flex-1'
        }`}
      >
        
        {/* Header */}
        <div className="h-14 flex items-center px-4 border-b border-border-subtle bg-bg-surface/50 backdrop-blur shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-text-secondary hover:text-text-primary transition p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 rounded-lg"
              title={isOpen ? "Close Sidebar" : "Open Sidebar"}
              aria-label={isOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              {isOpen ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}
            </button>
            <span className="font-medium text-sm text-text-primary">Smart Chat Engine</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsArtifactOpen(!isArtifactOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-xl cursor-pointer transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 select-none active:scale-95 border ${
                isArtifactOpen 
                  ? 'bg-accent-saffron text-white border-accent-saffron'
                  : 'text-accent-saffron bg-accent-saffron/10 hover:bg-accent-saffron/20 border-accent-saffron/30'
              }`}
              title="Toggle Legal Artifact Sidebar"
              aria-label="Toggle Legal Artifact Sidebar"
              id="chat-toggle-artifact-panel"
            >
              <Scale size={13} className="animate-pulse shrink-0 text-current" />
              <span>Deeds &amp; Maps View</span>
            </button>

            {messages.length > 0 && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-bg-elevated border border-border-default hover:border-border-hover rounded-xl cursor-pointer transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 select-none active:scale-95"
                title="Download Conversation"
                aria-label="Download Conversation"
              >
                <Download size={14} className="text-text-muted" />
                <span className="hidden sm:inline">Download Chat</span>
              </button>
            )}
          </div>
        </div>

        {activeScheme && (
          <div className="bg-accent-saffron/10 border-b border-accent-saffron/20 px-4 py-2.5 flex items-center justify-between shrink-0 select-none animate-fade-in">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="text-accent-saffron shrink-0" size={14} />
              <div className="flex flex-col truncate col-span-1">
                <span className="text-[10px] leading-none font-bold text-accent-saffron/70 uppercase text-left">Inquiring About</span>
                <span className="text-xs font-bold text-accent-saffron truncate text-left">
                  {language === 'te' ? activeScheme.name_te || activeScheme.scheme_name : activeScheme.name_en || activeScheme.scheme_name}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleGenerateChecklist(activeScheme)}
              className="flex items-center gap-1.5 text-xs font-bold text-accent-saffron bg-accent-saffron/10 hover:bg-accent-saffron/20 px-3.5 py-1.5 rounded-xl transition-all border border-accent-saffron/20 cursor-pointer"
            >
              <FileText size={13} />
              <span>{language === 'te' ? 'నా జాబితా (AI)' : 'My Checklist (AI)'}</span>
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 ? (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8">
            <div 
              className="max-w-[760px] mx-auto flex flex-col gap-6 relative"
              aria-live="polite"
              aria-atomic="false"
            >
              <EmptyState 
                onSelectSuggestion={(prompt) => handleSend(prompt)} 
                profileSnapshot={profileSnapshot}
                user={user}
              />
            </div>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            followOutput="smooth"
            useWindowScroll={false}
            style={{ height: '100%', width: '100%' }}
            className="flex-1 scrollbar-thin"
            itemContent={(index, msg) => (
              <div className="max-w-[760px] mx-auto px-4 md:px-8 py-4 flex flex-col gap-6 relative" key={msg.id}>
                <MessageBubble 
                  msg={msg} 
                  onSend={handleSend} 
                  isTyping={msg.id === typingMsgId} 
                  onTypeProgress={scrollToBottom}
                  onTypeComplete={() => setTypingMsgId(null)}
                />
              </div>
            )}
            components={{
              Footer: () => <div className="h-4" />
            }}
          />
        )}

        {/* Input */}
        <div className="p-4 bg-bg-surface border-t border-border-subtle shrink-0">
          <div className="max-w-[760px] mx-auto relative group">
            
            {/* Visual File Attachment Badge */}
            {localAttachedFile && (
              <div 
                className="mb-3 flex items-center justify-between gap-3 px-4 py-2.5 bg-accent-saffron/10 border border-accent-saffron/30 rounded-xl w-fit text-xs text-accent-saffron shadow-xs animate-fade-in transition-all duration-200 select-none"
                role="status"
                aria-label={`Attached file: ${localAttachedFile.name}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-accent-saffron">📎</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-text-primary text-[11px] truncate max-w-[240px]">{localAttachedFile.name}</span>
                    <span className="text-[11px] leading-tight text-text-muted font-mono">{Math.round(localAttachedFile.content.length / 102.4) / 10} KB • Ready to analyze</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setLocalAttachedFile(null);
                    clearAttachedFile?.();
                  }}
                  className="hover:bg-accent-saffron/20 p-1.5 rounded-lg cursor-pointer transition-all duration-150 text-accent-saffron focus:outline-none focus:ring-1 focus:ring-accent-saffron/40"
                  title="Remove Attachment"
                  aria-label="Remove attached document"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={localAttachedFile ? "Ask a question about this document..." : "Ask anything..."}
              className="w-full bg-bg-base border border-border-default group-focus-within:border-accent-saffron/50 rounded-[10px] pl-4 pr-12 py-3.5 text-sm outline-none resize-none overflow-hidden text-text-primary placeholder:text-text-muted leading-relaxed shadow-lg block animate-fade-in duration-200"
              rows={1}
              aria-label="Type your message" // Changed: Added descriptive aria-label for accessibility screen reader compliance
              aria-describedby="chat-helper-text" // Changed: Linked with the helper text below using aria-describedby
            />
            <button 
              onClick={() => handleSend()}
              disabled={loading || (!input.trim() && !localAttachedFile)}
              className="absolute right-2 bottom-2 p-2 bg-accent-saffron hover:brightness-110 disabled:bg-bg-surface disabled:opacity-20 rounded-lg text-white transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
          <div id="chat-helper-text" className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-2 text-[11px] leading-tight text-text-muted"> {/* Changed: Added unique id parameter for input description reference */}
            <div>
              Smart Chat Engine responses may be inaccurate. Press Shift+Enter for newline.
            </div>
            {/* Real-time Web Search Capability Activation */}
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all duration-150 font-medium ${
                webSearchEnabled 
                  ? 'bg-accent-saffron/10 border-accent-saffron/30 text-accent-saffron shadow-xs' 
                  : 'bg-bg-base border-border-default hover:border-text-muted text-text-muted cursor-pointer'
              }`}
              title="Toggle live Web Search via Tavily/Serper API"
              aria-label="Toggle web search ability"
            >
              <Globe size={11} className={`${webSearchEnabled ? 'text-accent-saffron' : 'text-text-muted animate-pulse'}`} />
              <span>Web Search Ability: {webSearchEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

      </motion.div>

      {checklistModal && (
        <SchemeChecklistModal
          isOpen={!!checklistModal}
          onClose={() => setChecklistModal(null)}
          scheme={normalizedActiveScheme}
          checklist={checklistModal.checklist}
          loading={checklistModal.loading}
          profileSnapshot={profileSnapshot}
          language={language}
        />
      )}

      <ArtifactSidebar
        isOpen={isArtifactOpen}
        onClose={() => setIsArtifactOpen(false)}
        documentName={localAttachedFile ? localAttachedFile.name : (activeScheme ? `${activeScheme.scheme_name || 'Scheme'}_Deed.txt` : "WelfareAdvisory.txt")}
        documentContent={localAttachedFile ? localAttachedFile.content : (activeScheme ? `AGRICULTURAL LAND LEASE DEED COVENANT\n\nThis deed details structural parameters for ${activeScheme.scheme_name || 'welfare schema'}. It was verified on eligibility rules for beneficiary state limits. The lease agreement details specific landlord responsibilities for irrigation pump sub-station repair as certified by authorized Mandal Revenue officer under Indian Tenancy protection frameworks.` : "")}
        templateId={artifactTemplateId}
      />
    </div>
  );
}

function MessageBubble({ 
  msg, 
  onSend, 
  isTyping, 
  onTypeProgress, 
  onTypeComplete 
}: { 
  msg: Message; 
  onSend: (s: string) => void; 
  isTyping?: boolean; 
  onTypeProgress?: () => void; 
  onTypeComplete?: () => void; 
}) {
  const isUser = msg.role === 'user';
  const { language } = useTranslation();
  const isTe = language === 'te';

  const defaultSuggestions = isTe 
    ? [
        'ఈ పథకానికి ఏయే పత్రాలు అవసరమవుతాయి?',
        'నేను ఎలా దరఖాస్తు చేసుకోవాలి?',
        'ఈ పథకానికి అర్హత నిబంధనలు ఏమిటి?',
        'ఆర్థిక సహాయం ఎప్పుడు అందుతుంది?'
      ]
    : [
        'What documents do I need?',
        'How do I apply?',
        'What are the eligibility criteria?',
        'How are the benefits disbursed?'
      ];

  const suggestionsToShow = (msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0)
    ? msg.follow_up_suggestions
    : defaultSuggestions;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`w-full max-w-[760px] ${isUser ? 'ml-12' : 'mr-12'}`}>
        {isUser ? (
          <div className="bg-bg-surface text-text-primary px-5 py-3.5 rounded-2xl rounded-tr-sm border border-border-subtle shadow-md flex-none self-end ml-auto w-fit max-w-full float-right break-words border-l-[3px] border-l-accent-saffron">
            {msg.content}
          </div>
        ) : (
          <div className="w-full relative group/msg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-accent-saffron flex items-center justify-center text-white font-bold text-xs">
                G
              </div>
              <span className="font-semibold text-sm text-text-primary">Assistant</span>
              {msg.thinking_level && msg.thinking_level !== 'minimal' && (
                <span className="bg-bg-elevated text-text-secondary px-2 py-0.5 rounded text-[11px] leading-tight uppercase font-bold tracking-wider ml-2 border border-border-subtle">
                  {msg.thinking_level} THOUGHT
                </span>
              )}
              
              <button 
                onClick={() => navigator.clipboard.writeText(JSON.stringify(msg.blocks, null, 2))}
                className="ml-auto opacity-0 group-hover/msg:opacity-100 p-1.5 hover:bg-bg-elevated rounded-md text-text-secondary hover:text-text-primary transition cursor-pointer"
                title="Copy raw JSON"
              >
                <Copy size={14} />
              </button>
            </div>
            
            <AnimatePresence mode="wait">
              {msg.loading_messages ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {msg.thinking_steps && msg.thinking_steps.length > 0 ? (
                    <ThinkingStageStreamer 
                      thinkingSteps={msg.thinking_steps} 
                      isLive={true} 
                    />
                  ) : (
                    <LoadingWidget messages={msg.loading_messages} level={msg.thinking_level} />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {msg.thinking_steps && msg.thinking_steps.length > 0 && (
                    <ThinkingStageStreamer 
                      thinkingSteps={msg.thinking_steps} 
                      isLive={false} 
                    />
                  )}
                  {msg.blocks && (
                    <BlockRenderer 
                      blocks={msg.blocks} 
                      isTyping={isTyping} 
                      onTypeProgress={onTypeProgress}
                      onTypeComplete={onTypeComplete}
                    />
                  )}
                  
                  {suggestionsToShow && suggestionsToShow.length > 0 && !isTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: 0.3, duration: 0.3 }}
                      className="mt-6 border-t border-[var(--border-subtle)]/40 pt-4"
                    >
                      <span className="text-[11px] leading-tight font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3 flex items-center gap-1.5 select-none text-left">
                        <Sparkles size={11} className="text-[var(--accent-saffron)] animate-pulse" />
                        {isTe ? 'సూచించబడిన తదుపరి ప్రశ్నలు' : 'Suggested Follow-up Questions'}
                      </span>
                      <div className="flex flex-wrap gap-2 text-left justify-start">
                        {suggestionsToShow.map((s, i) => (
                          <button 
                            key={i} 
                            onClick={() => onSend(s)}
                            className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent-saffron)] hover:bg-[var(--accent-saffron-bg)] px-3.5 py-1.5 rounded-full text-xs text-[var(--accent-saffron)] font-semibold transition cursor-pointer shadow-sm hover:shadow-md animate-fade-in"
                          >
                            <CornerDownRight size={12} className="shrink-0 text-[var(--accent-saffron)]" /> {s}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <CitationsFooter citations={msg.citations} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingWidget({ messages, level }: { messages: string[], level?: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(prev => (prev + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div 
      className="flex items-center gap-4 text-sm text-text-secondary p-4 border border-border-subtle rounded-xl bg-bg-surface"
      role="status" // Changed: Defined ARIA status role for dynamic loading information
      aria-label="Assistant is thinking" // Changed: Described the active thinking state for screen readers
    >
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 bg-accent-saffron rounded-full"
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.span 
          key={idx}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          className="font-mono text-xs"
        >
          {level === 'high' && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-accent-saffron mr-2 font-bold inline-flex items-center gap-1"
            >
              <Sparkles size={12} /> Deep thinking...
            </motion.span>
          )}
          {level === 'web_search' && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-accent-saffron mr-2 font-bold inline-flex items-center gap-1"
            >
              <Globe size={12} className="animate-spin" /> Searching web...
            </motion.span>
          )}
          {messages[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function CitationsFooter({ citations }: { citations: {id:number, text:string, url?:string}[] }) {
  return (
    <div className="mt-6 pt-4 border-t border-border-subtle">
      <div className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wide">Sources</div>
      <ol className="text-xs text-text-secondary space-y-1 font-mono">
        {citations.map(c => (
          <li key={c.id}>
            <span className="text-text-muted mr-2">[{c.id}]</span>
            {c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-saffron hover:underline">
                {c.text}
              </a>
            ) : (
              <span>{c.text}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
