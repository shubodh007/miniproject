// ===== FILE: src/components/blocks/index.tsx =====
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { 
  Info, AlertTriangle, XCircle, CheckCircle, Lightbulb, Star, ChevronDown, Check, Copy,
  Sparkles, Coins, CreditCard, TrendingUp, Clock, ShieldAlert, Calendar, BadgeInfo 
} from 'lucide-react';
import { 
  Block, TextData, CodeData, TableData, FlowchartData, FlashcardsData, 
  DashboardData, StepsData, ComparisonData, CalloutData, TimelineData, 
  AccordionData, QuizData, MindmapData 
} from '../../types/chat';

mermaid.initialize({ startOnLoad: false, theme: 'dark', darkMode: true, securityLevel: 'loose' });

export function BlockRenderer({ 
  blocks, 
  isTyping, 
  onTypeProgress, 
  onTypeComplete 
}: { 
  blocks: Block[]; 
  isTyping?: boolean; 
  onTypeProgress?: () => void; 
  onTypeComplete?: () => void; 
}) {
  const [visibleChars, setVisibleChars] = useState(isTyping ? 0 : Infinity);

  // Buffer callbacks in refs to prevent useEffect cycles on parent state changes
  const onTypeProgressRef = useRef(onTypeProgress);
  const onTypeCompleteRef = useRef(onTypeComplete);

  useEffect(() => {
    onTypeProgressRef.current = onTypeProgress;
  }, [onTypeProgress]);

  useEffect(() => {
    onTypeCompleteRef.current = onTypeComplete;
  }, [onTypeComplete]);

  useEffect(() => {
    if (isTyping) {
      setVisibleChars(0);
      let curr = 0;
      const totalChars = blocks.reduce((acc, b) => {
        if (b.type === 'text') return acc + (b.data as TextData).content.length;
        if (b.type === 'code') return acc + (b.data as CodeData).code.length;
        return acc + 100;
      }, 0);
      
      // Dynamic typing step: aims to complete in 1.2 to 2.0s based on overall response payload size.
      const baseStep = Math.max(3, Math.ceil(totalChars / 85));
      
      const interval = setInterval(() => {
        // Human-like layout variance in step size
        const step = Math.floor(Math.random() * (baseStep * 1.5)) + Math.ceil(baseStep * 0.5);
        curr += step;
        
        if (curr >= totalChars + 50) {
          setVisibleChars(Infinity);
          clearInterval(interval);
          onTypeCompleteRef.current?.();
        } else {
          setVisibleChars(curr);
          onTypeProgressRef.current?.();
        }
      }, 20);
      return () => clearInterval(interval);
    } else {
      setVisibleChars(Infinity);
    }
  }, [blocks, isTyping]);

  let charsLeft = visibleChars;
  const renderedBlocks: Block[] = [];
  
  for (const b of blocks) {
    if (charsLeft <= 0) break;
    
    if (b.type === 'text') {
      const text = (b.data as TextData).content;
      if (charsLeft < text.length) {
        renderedBlocks.push({ ...b, data: { ...b.data, content: text.slice(0, charsLeft) + '▋' } } as Block);
        charsLeft = 0;
      } else {
        renderedBlocks.push(b);
        charsLeft -= text.length;
      }
    } else if (b.type === 'code') {
      const code = (b.data as CodeData).code;
      if (charsLeft < code.length) {
        renderedBlocks.push({ ...b, data: { ...b.data, code: code.slice(0, charsLeft) + '▋' } } as Block);
        charsLeft = 0;
      } else {
        renderedBlocks.push(b);
        charsLeft -= code.length;
      }
    } else {
      const cost = 100;
      if (charsLeft < cost) {
         charsLeft = 0;
      } else {
         renderedBlocks.push(b);
         charsLeft -= cost;
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {renderedBlocks.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: (isTyping && i === renderedBlocks.length - 1) ? 0 : i * 0.02, ease: "easeOut" }}
          className="w-full"
        >
          {b.type === 'text' && <TextBlock data={b.data as TextData} />}
          {b.type === 'code' && <CodeBlock data={b.data as CodeData} />}
          {b.type === 'table' && <TableBlock data={b.data as TableData} />}
          {b.type === 'flowchart' && <FlowchartBlock data={b.data as FlowchartData} />}
          {b.type === 'flashcards' && <FlashcardsBlock data={b.data as FlashcardsData} />}
          {b.type === 'dashboard' && <DashboardBlock data={b.data as DashboardData} />}
          {b.type === 'steps' && <StepsBlock data={b.data as StepsData} />}
          {b.type === 'comparison' && <ComparisonBlock data={b.data as ComparisonData} />}
          {b.type === 'callout' && <CalloutBlock data={b.data as CalloutData} />}
          {b.type === 'timeline' && <TimelineBlock data={b.data as TimelineData} />}
          {b.type === 'accordion' && <AccordionBlock data={b.data as AccordionData} />}
          {b.type === 'quiz' && <QuizBlock data={b.data as QuizData} />}
          {b.type === 'mindmap' && <MindmapBlock data={b.data as MindmapData} />}
        </motion.div>
      ))}
    </div>
  );
}

export function TextBlock({ data }: { data: TextData }) {
  const isHighlight = data.emphasis === 'highlight';
  const isMuted = data.emphasis === 'muted';
  const isLarge = data.size === 'large';
  return (
    <div className={`p-4 rounded-xl ${isHighlight ? 'bg-accent-saffron-bg border-l-4 border-accent-saffron' : ''} ${isMuted ? 'text-text-muted text-sm' : 'text-text-primary'} ${isLarge ? 'text-lg' : ''}`}>
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {data.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export function CodeBlock({ data }: { data: CodeData }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl overflow-hidden bg-bg-surface border border-border-default my-2">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border-subtle">
        <div className="flex gap-2 items-center text-xs text-text-secondary font-mono">
          <span className="px-2 py-1 rounded bg-accent-saffron-bg text-accent-saffron">{data.language}</span>
          {data.filename && <span>{data.filename}</span>}
        </div>
        <button onClick={handleCopy} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1 text-xs">
          {copied ? <><Check size={14} className="text-low" /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter language={data.language} style={vscDarkPlus} showLineNumbers customStyle={{ margin: 0, background: 'transparent', fontSize: '12.5px', fontFamily: "'JetBrains Mono', monospace" }}>
        {data.code}
      </SyntaxHighlighter>
      {data.explanation && <div className="px-4 py-2 text-xs text-text-muted bg-bg-base border-t border-border-subtle">{data.explanation}</div>}
    </div>
  );
}

export function TableBlock({ data }: { data: TableData }) {
  return (
    <div className="overflow-x-auto my-2 rounded-xl border border-border-default">
      {data.title && <div className="px-4 py-2 font-bold bg-bg-elevated border-b border-border-default">{data.title}</div>}
      <table className="w-full text-sm text-left">
        <thead className="bg-[#1a1a1a] text-text-secondary">
          <tr>{data.headers.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows.map((row, r) => (
            <tr key={r} className="border-b border-border-subtle even:bg-bg-surface odd:bg-bg-base">
              {row.map((cell, c) => <td key={c} className="px-4 py-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {data.caption && <div className="px-4 py-2 text-xs text-text-muted bg-bg-surface">{data.caption}</div>}
    </div>
  );
}

export function FlowchartBlock({ data }: { data: FlowchartData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, data.mermaid).then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      }).catch(e => console.error("Mermaid error", e));
    }
  }, [data.mermaid]);
  return (
    <div className="p-4 bg-bg-surface rounded-xl border border-border-default my-2 flex flex-col items-center">
      {data.title && <h4 className="font-bold mb-4">{data.title}</h4>}
      <div ref={containerRef} className="w-full flex justify-center overflow-auto" />
      {data.description && <p className="text-xs text-text-secondary mt-4">{data.description}</p>}
    </div>
  );
}

export function FlashcardsBlock({ data }: { data: FlashcardsData }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const next = new Set(flipped);
    if (next.has(i)) next.delete(i); else next.add(i);
    setFlipped(next);
  };
  const flipAll = () => {
    if (flipped.size === data.cards.length) setFlipped(new Set());
    else setFlipped(new Set(data.cards.map((_, i) => i)));
  };
  return (
    <div className="my-4">
      <h3 className="font-bold mb-4 text-accent-saffron">{data.topic}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.cards.map((c, i) => {
          const isFlipped = flipped.has(i);
          return (
            <div key={i} className="relative h-40 cursor-pointer [perspective:1200px]" onClick={() => toggle(i)}>
              <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.45 }} className="w-full h-full [transform-style:preserve-3d] relative">
                {/* Front */}
                <div className="absolute inset-0 [backface-visibility:hidden] bg-bg-surface rounded-xl border border-border-default p-4 flex flex-col justify-center items-center text-center">
                  {c.tag && <span className="absolute top-3 left-3 text-[11px] leading-tight bg-bg-elevated px-2 py-1 rounded text-text-secondary">{c.tag}</span>}
                  <p className="font-semibold">{c.front}</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-accent-saffron-bg rounded-xl border border-accent-saffron/30 p-4 flex flex-col justify-center items-center text-center">
                  <p className="text-text-primary">{c.back}</p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex-1 bg-border-default h-2 rounded-full overflow-hidden mr-4">
          <motion.div className="bg-accent-saffron h-full" animate={{ width: `${(flipped.size / data.cards.length) * 100}%` }} />
        </div>
        <span className="text-xs text-text-secondary w-24 text-right mb-1">{flipped.size} of {data.cards.length} reviewed</span>
        <button onClick={flipAll} className="ml-4 text-xs bg-bg-elevated hover:bg-border-default px-3 py-1.5 rounded transition cursor-pointer text-text-primary">
          Flip All
        </button>
      </div>
    </div>
  );
}

function Counter({ to }: { to: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * to));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [to]);
  return <span>{count.toLocaleString('en-IN')}</span>;
}

export function DashboardBlock({ data }: { data: DashboardData }) {
  return (
    <div className="p-5 bg-bg-surface rounded-2xl border border-border-default my-5 shadow-xl">
      {data.title && (
        <div className="flex items-center gap-2 mb-4 border-b border-border-subtle pb-3">
          <Sparkles size={16} className="text-accent-saffron animate-pulse" />
          <h3 className="font-heading font-extrabold text-base md:text-lg tracking-tight text-text-primary">
            {data.title}
          </h3>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {data.metrics.map((m, i) => {
          // Robust, layout-friendly numeric scanning
          const cleanValue = m.value.replace(/,/g, '');
          const numMatch = cleanValue.match(/^(\d+)(.*)$/);
          const isNum = numMatch !== null;
          const numValue = isNum ? parseInt(numMatch[1], 10) : 0;
          const suffix = isNum ? numMatch[2] : m.value;

          // Diagnostic alert levels based on text markers for high-intent UX design
          const isCriticalAlert = 
            m.change.toLowerCase().includes('illegal') || 
            m.change.toLowerCase().includes('usurious') || 
            m.change.toLowerCase().includes('violation');
            
          const isWarningAlert = 
            m.change.toLowerCase().includes('short') || 
            m.label.toLowerCase().includes('penalty') || 
            m.label.toLowerCase().includes('unfair');

          const iconColorClass = isCriticalAlert 
            ? 'text-critical' 
            : isWarningAlert 
              ? 'text-warning' 
              : 'text-accent-primary';

          const cardBorderClass = isCriticalAlert 
            ? 'border-critical/30 bg-critical-bg hover:border-critical/50 shadow-[0_4px_16px_rgba(239,68,68,0.05)]' 
            : isWarningAlert 
              ? 'border-warning/30 bg-high-bg hover:border-warning/50 shadow-[0_4px_16px_rgba(249,115,22,0.05)]' 
              : 'border-border-strong hover:border-accent-saffron/40 bg-bg-elevated/40 hover:bg-bg-elevated/70 shadow-sm';

          const labelLower = m.label.toLowerCase();
          let IconComp = BadgeInfo;
          if (labelLower.includes('upfront') || labelLower.includes('cost')) {
            IconComp = Coins;
          } else if (labelLower.includes('refundable')) {
            IconComp = CreditCard;
          } else if (labelLower.includes('monthly') || labelLower.includes('outflow')) {
            IconComp = CreditCard;
          } else if (labelLower.includes('escalation')) {
            IconComp = TrendingUp;
          } else if (labelLower.includes('penalty') || labelLower.includes('late')) {
            IconComp = Clock;
          } else if (labelLower.includes('clause') || labelLower.includes('unfair') || labelLower.includes('illegal')) {
            IconComp = ShieldAlert;
          } else if (labelLower.includes('notice') || labelLower.includes('entry') || labelLower.includes('eviction')) {
            IconComp = Calendar;
          }

          return (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 ${cardBorderClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold tracking-wide uppercase text-text-secondary line-clamp-2 text-left shrink-1">
                    {m.label}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-bg-base border border-border-subtle shrink-0 ${iconColorClass}`}>
                    <IconComp size={14} />
                  </div>
                </div>

                <div className="text-xl md:text-2xl font-bold font-heading text-text-primary flex items-baseline gap-1 tracking-tight text-left">
                  {isNum ? <Counter to={numValue} /> : <span className="text-base sm:text-lg md:text-xl font-bold">{m.value}</span>}
                  {isNum && suffix && <span className="text-sm font-semibold text-text-secondary">{suffix}</span>}
                  {m.unit && <span className="text-xs font-semibold text-text-muted ml-0.5">{m.unit}</span>}
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-border-subtle/50">
                <div className="flex items-start gap-1.5 text-left text-[11px] leading-snug">
                  {m.trend === 'up' && <span className="text-critical shrink-0 mt-0.5">↑</span>}
                  {m.trend === 'down' && <span className="text-low shrink-0 mt-0.5">↓</span>}
                  {m.trend === 'stable' && <span className="text-text-muted shrink-0 mt-0.5">—</span>}
                  <span className={`font-semibold ${
                    isCriticalAlert 
                      ? 'text-critical' 
                      : isWarningAlert 
                        ? 'text-warning' 
                        : 'text-text-secondary'
                  }`}>
                    {m.change}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {data.insight && (
        <div className="text-xs md:text-sm text-text-secondary bg-bg-base/70 border border-border-subtle p-3.5 rounded-xl flex items-start gap-2.5 shadow-inner mt-2 text-left">
          <Info size={16} className="text-accent-saffron shrink-0 mt-0.5" />
          <p className="leading-relaxed font-semibold">
            {data.insight}
          </p>
        </div>
      )}
    </div>
  );
}

export function StepsBlock({ data }: { data: StepsData }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i); else next.add(i);
    setChecked(next);
  };
  return (
    <div className="my-4 p-4 bg-bg-surface rounded-xl border border-border-default">
      <h3 className="font-bold mb-6 text-lg">{data.title}</h3>
      <div className="space-y-6 relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border-default hidden md:block" />
        {data.steps.map((s, i) => {
          const isChecked = checked.has(i);
          return (
            <div key={i} className="flex gap-4 relative z-10">
              <div className="shrink-0 mt-1">
                {data.style === 'checklist' ? (
                  <button onClick={() => toggle(i)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${isChecked ? 'bg-green-500 border-green-500' : 'border-border-strong hover:border-accent-saffron'}`}>
                    {isChecked && <Check size={16} className="text-white" />}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-saffron flex items-center justify-center font-bold text-sm shadow-[0_0_0_4px_var(--bg-surface)] text-white">
                    {i + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <h4 className={`font-bold text-md mb-1 ${isChecked ? 'line-through text-text-muted' : 'text-text-primary'}`}>{s.title}</h4>
                <p className={`text-sm ${isChecked ? 'text-text-muted' : 'text-text-secondary'}`}>{s.description}</p>
                {s.code && <div className="mt-2"><CodeBlock data={{ language: 'text', code: s.code }} /></div>}
                {s.tip && <div className="mt-2 text-xs bg-accent-primary-bg text-accent-primary p-2 rounded-md flex items-start gap-2"><Lightbulb size={14} className="shrink-0 mt-0.5" /><span>{s.tip}</span></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComparisonBlock({ data }: { data: ComparisonData }) {
  return (
    <div className="my-4 bg-bg-surface rounded-xl border border-border-default overflow-hidden">
      <div className="p-4 bg-bg-elevated border-b border-border-default font-bold">{data.title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#1a1a1a] border-b border-border-default">
            <tr>
              <th className="px-4 py-3 text-text-muted font-semibold w-1/3">Criteria</th>
              <th className="px-4 py-3"><span className="bg-accent-primary-bg text-accent-primary px-2 py-1 rounded">{data.labels[0]}</span></th>
              <th className="px-4 py-3"><span className="bg-accent-saffron-bg text-accent-saffron px-2 py-1 rounded">{data.labels[1]}</span></th>
            </tr>
          </thead>
          <tbody>
            {data.criteria.map((c, i) => (
              <tr key={i} className="border-b border-border-subtle bg-bg-base">
                <td className="px-4 py-3 font-medium text-text-secondary">{c.name}</td>
                <td className={`px-4 py-3 ${c.winner === 'a' ? 'bg-accent-primary-bg font-bold text-accent-primary' : c.winner === 'tie' ? 'bg-medium-bg' : 'text-text-muted'}`}>{c.a}</td>
                <td className={`px-4 py-3 ${c.winner === 'b' ? 'bg-accent-saffron-bg font-bold text-accent-saffron' : c.winner === 'tie' ? 'bg-medium-bg' : 'text-text-muted'}`}>{c.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-accent-saffron-bg border-t border-accent-saffron/20 text-sm">
        <span className="font-bold text-accent-saffron block mb-1">Verdict</span>
        {data.verdict}
      </div>
    </div>
  );
}

const calloutConfig = {
  info: { color: 'border-accent-primary', bg: 'bg-accent-primary-bg', iconColor: 'text-accent-primary', Icon: Info },
  warning: { color: 'border-warning', bg: 'var(--high-bg)', iconColor: 'text-warning', Icon: AlertTriangle },
  error: { color: 'border-error', bg: 'var(--critical-bg)', iconColor: 'text-error', Icon: XCircle },
  success: { color: 'border-success', bg: 'var(--low-bg)', iconColor: 'text-success', Icon: CheckCircle },
  tip: { color: 'border-accent-saffron', bg: 'bg-accent-saffron-bg', iconColor: 'text-accent-saffron', Icon: Lightbulb },
  important: { color: 'border-error', bg: 'var(--critical-bg)', iconColor: 'text-error', Icon: Star },
};

export function CalloutBlock({ data }: { data: CalloutData }) {
  const conf = calloutConfig[data.variant] || calloutConfig.info;
  const { Icon } = conf;
  return (
    <div className={`my-2 p-4 rounded-r-xl border-l-4 ${conf.color} ${conf.bg} flex gap-3`}>
      <Icon className={`shrink-0 mt-0.5 ${conf.iconColor}`} size={20} />
      <div>
        <h4 className="font-bold mb-1 text-gray-200">{data.title}</h4>
        <div className="text-sm text-gray-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function TimelineBlock({ data }: { data: TimelineData }) {
  return (
    <div className="my-4 p-4 bg-bg-surface rounded-xl border border-border-default">
      <h3 className="font-bold mb-4 text-text-primary">{data.title}</h3>
      <div className="pl-4 border-l-2 border-border-default ml-2 space-y-6">
        {data.events.map((e, i) => (
          <div key={i} className="relative">
            <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full ${e.milestone ? 'bg-accent-saffron shadow-[0_0_8px_rgba(228,122,34,0.8)] scale-125' : 'bg-border-strong'}`} />
            <div className="ml-4">
              <span className="text-xs text-text-muted font-mono block mb-1">{e.date}</span>
              <h4 className={`${e.milestone ? 'font-bold text-[15px] text-text-primary' : 'font-medium text-sm text-text-secondary'}`}>{e.title}</h4>
              {e.description && <p className="text-sm text-text-muted mt-1">{e.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccordionBlock({ data }: { data: AccordionData }) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set(data.sections.map((s,i) => s.open ? i : -1).filter(i => i!==-1)));
  const toggle = (i: number) => {
    const next = new Set(openIdx);
    if (next.has(i)) next.delete(i); else next.add(i);
    setOpenIdx(next);
  };
  return (
    <div className="my-2 border border-border-default rounded-xl overflow-hidden">
      {data.sections.map((s, i) => {
        const isOpen = openIdx.has(i);
        return (
          <div key={i} className="border-b border-border-default last:border-0 bg-bg-surface">
            <button onClick={() => toggle(i)} className="w-full px-4 py-3 flex justify-between items-center text-left hover:bg-bg-elevated transition cursor-pointer text-text-primary">
              <span className="font-medium">{s.title}</span>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={18} className="text-text-secondary" /></motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-bg-base">
                  <div className="p-4 text-sm text-text-secondary prose prose-invert max-w-none">
                    <ReactMarkdown>{s.content}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function QuizBlock({ data }: { data: QuizData }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const selectAns = (qIdx: number, ans: string) => {
    if (answers[qIdx]) return;
    setAnswers(prev => ({ ...prev, [qIdx]: ans }));
  };
  const reset = () => setAnswers({});
  const correctCount = Object.keys(answers).filter(k => answers[Number(k)] === data.questions[Number(k)].answer).length;
  
  return (
    <div className="my-4 p-4 bg-bg-surface rounded-xl border border-border-default">
      <div className="flex justify-between items-center mb-6 border-b border-border-subtle pb-4">
        <h3 className="font-bold text-lg text-text-primary">{data.topic}</h3>
        <div className="flex items-center gap-4">
          <span className="bg-accent-saffron-bg text-accent-saffron px-3 py-1 rounded-full text-sm font-bold border border-accent-saffron/20">
            Score: {correctCount} / {data.questions.length}
          </span>
          <button onClick={reset} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer">Reset</button>
        </div>
      </div>
      <div className="space-y-8">
        {data.questions.map((q, i) => {
          const userAns = answers[i];
          return (
            <div key={i}>
              <p className="font-medium mb-3 text-text-primary">{i+1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  let btnClass = "w-full text-left px-4 py-2 rounded-lg border transition cursor-pointer text-sm ";
                  const isOptSelected = userAns === opt;
                  const isActualCorrect = q.answer === opt;
                  
                  if (!userAns) btnClass += "border-border-default hover:border-accent-saffron hover:bg-bg-elevated text-text-primary";
                  else if (isActualCorrect) btnClass += "bg-low-bg border-low text-low font-medium";
                  else if (isOptSelected && !isActualCorrect) btnClass += "bg-critical-bg border-critical text-critical font-medium";
                  else btnClass += "border-border-subtle opacity-50 cursor-not-allowed text-text-muted";
                  
                  return (
                    <button key={oi} disabled={!!userAns} onClick={() => selectAns(i, opt)} className={btnClass}>
                      <span className="font-mono text-text-muted mr-2">{['A','B','C','D','E'][oi]}.</span> {opt}
                      {userAns && isActualCorrect && <Check size={16} className="inline ml-2 text-low" />}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {userAns && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 overflow-hidden">
                    <div className="p-3 bg-bg-elevated rounded-lg text-sm text-text-secondary border-l-2 border-accent-saffron">
                      {q.explanation}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MindmapBlock({ data }: { data: MindmapData }) {
  const width = 600, height = 400;
  const cx = width / 2, cy = height / 2;
  const radius = 140;
  const branches = data.branches;
  const numBranches = branches.length;

  return (
    <div className="my-4 p-4 bg-bg-surface rounded-xl border border-border-default overflow-auto">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto min-w-[500px]">
        <g stroke="var(--border-strong)" strokeWidth="1">
          {branches.map((b, i) => {
            const angle = (i / numBranches) * Math.PI * 2;
            const bx = cx + Math.cos(angle) * radius;
            const by = cy + Math.sin(angle) * (radius * 0.7);
            const subs = b.subtopics;
            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={bx} y2={by} />
                {subs.map((s, j) => {
                  const sAngle = angle + (j - (subs.length - 1)/2) * 0.4;
                  const sx = bx + Math.cos(sAngle) * 90;
                  const sy = by + Math.sin(sAngle) * 60;
                  return (
                    <g key={`s${j}`}>
                      <line x1={bx} y1={by} x2={sx} y2={sy} />
                      <circle cx={sx} cy={sy} r="6" fill="var(--bg-surface)" stroke="var(--border-strong)" />
                      <text x={sx + (Math.cos(sAngle)>0?10:-10)} y={sy + 4} fill="var(--text-secondary)" fontSize="10" textAnchor={Math.cos(sAngle)>0?'start':'end'}>{s}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
        <g>
          {branches.map((b, i) => {
            const angle = (i / numBranches) * Math.PI * 2;
            const bx = cx + Math.cos(angle) * radius;
            const by = cy + Math.sin(angle) * (radius * 0.7);
            return (
              <g key={`b${i}`}>
                <circle cx={bx} cy={by} r="20" fill="var(--bg-surface)" stroke="var(--border-strong)" />
                <text x={bx} y={by + 35} fill="var(--text-primary)" fontSize="12" textAnchor="middle" className="font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{b.topic}</text>
              </g>
            );
          })}
        </g>
        <circle cx={cx} cy={cy} r="40" fill="var(--accent-saffron)" />
        <text x={cx} y={cy + 4} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">{data.center}</text>
      </svg>
    </div>
  );
}
