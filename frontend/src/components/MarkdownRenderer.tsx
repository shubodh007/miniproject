import React, { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  sources?: Array<{ title: string; url: string; snippet?: string; favicon?: string }>;
}

export function MarkdownRenderer({ content, sources = [] }: MarkdownRendererProps) {
  // First, strip custom action brackets and trailing whitespaces so they don't block layout flow
  const cleanedContent = content
    .replace(/\[ELIGIBILITY_CHECKER\]/g, '')
    .replace(/\[BENEFIT_CALCULATOR\]/g, '')
    .replace(/\[PAYMENT_STATUS_TRACKER\]/g, '')
    .replace(/\[SCHEME_COMPARISON\]/g, '')
    .replace(/\[DOCUMENT_CHECKLIST\]/g, '')
    .trim();

  if (!cleanedContent) return null;

  // Split by code blocks
  const blocks = cleanedContent.split(/(```[\s\S]*?```)/g);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="markdown-body space-y-4 select-text text-sm leading-relaxed text-text-primary/95 font-sans" id="markdown-renderer-content">
      {blocks.map((block, idx) => {
        if (block.startsWith('```')) {
          // Identify block code parameters
          const match = block.match(/```(\w*)\n([\s\S]*?)```/);
          const blockLang = match ? match[1] : '';
          const rawCode = match ? match[2].trim() : block.slice(3, -3).trim();

          // Omit HTML/Mermaid blocks since they are rendered separately as visual artifacts/interactive flowcharts
          if (blockLang === 'html' || blockLang === 'mermaid') {
            return null;
          }

          return (
            <div key={idx} className="my-4 overflow-hidden rounded-2xl border border-border-main bg-[#151520] shadow-2xl font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0b10] border-b border-border-subtle/40 text-[11px] leading-tight uppercase tracking-wider text-text-secondary font-bold font-heading">
                <span className="flex items-center gap-1">
                  <FileText size={12} className="text-accent-saffron" />
                  <span>{blockLang || 'code block'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(rawCode, idx)}
                  className="hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer select-none"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check size={11} className="text-success" />
                      <span className="text-success lowercase first-letter:uppercase">copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span className="lowercase first-letter:uppercase">copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[12.5px] leading-relaxed">
                <SyntaxHighlighter
                  language={blockLang || 'typescript'}
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    padding: '1.25rem',
                    background: 'transparent',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  {rawCode}
                </SyntaxHighlighter>
              </div>
            </div>
          );
        }

        // Parse lines in regular segments (handling custom tables, blockquotes, headings, lists)
        const lines = block.split('\n');
        const parsedElements: React.ReactNode[] = [];

        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          const trimmedLine = line.trim();

          if (trimmedLine === '') {
            i++;
            continue;
          }

          // 1. ADVANCED FEATURE: Table Detection & Parsing
          if (trimmedLine.startsWith('|')) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
              tableLines.push(lines[i].trim());
              i++;
            }

            if (tableLines.length >= 2) {
              const rawHeaders = tableLines[0].split('|').map(x => x.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
              const dividerLine = tableLines[1];
              // Check if second line is a layout divider (contains dashes or colons)
              const isValidTable = dividerLine.replace(/[|:\s-]/g, '') === '';

              if (isValidTable) {
                const rawRows = tableLines.slice(2).map(rowLine => {
                  return rowLine.split('|').map(x => x.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                });

                parsedElements.push(
                  <div key={`table-${idx}-${i}`} className="my-5 overflow-x-auto rounded-2xl border border-border-main shadow-lg">
                    <table className="w-full text-xs text-left border-collapse bg-bg-surface overflow-hidden">
                      <thead>
                        <tr className="bg-bg-elevated/70 border-b border-border-subtle">
                          {rawHeaders.map((head, hIdx) => (
                            <th key={hIdx} className="px-4 py-3.5 font-extrabold text-text-primary text-[11px] uppercase tracking-wider">
                              {parseInlineStyles(head, sources)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50">
                        {rawRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-bg-base/35 transition-colors duration-150">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-4 py-3.5 text-text-secondary leading-relaxed font-semibold text-[13px]">
                                {parseInlineStyles(cell, sources)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
                continue; // Skip standard paragraph render for these table lines
              }
            }

            // Fallback if not a valid table structure
            tableLines.forEach((tLine, tIdx) => {
              parsedElements.push(
                <p key={`p-fallback-${idx}-${i}-${tIdx}`} className="my-1.5 leading-relaxed text-text-primary/95 text-[15px] sm:text-[16px]">
                  {parseInlineStyles(tLine, sources)}
                </p>
              );
            });
            continue;
          }

          // 2. ADVANCED FEATURE: Blockquote Detection (> markup)
          if (trimmedLine.startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
              const cleanQuoteLine = lines[i].trim().substring(1).trim();
              quoteLines.push(cleanQuoteLine);
              i++;
            }
            parsedElements.push(
              <blockquote key={`quote-${idx}-${i}`} className="border-l-4 border-l-accent-saffron border border-border-subtle/40 bg-bg-surface/50 rounded-r-2xl px-5 py-4 my-4 text-text-secondary italic leading-relaxed text-[14.5px] text-left">
                {parseInlineStyles(quoteLines.join(' '), sources)}
              </blockquote>
            );
            continue;
          }

          // 3. Unordered list parsing
          if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            const listItems: string[] = [];
            while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
              listItems.push(lines[i].trim().substring(2));
              i++;
            }
            parsedElements.push(
              <ul key={`ul-${idx}-${i}`} className="list-disc pl-5 my-3.5 space-y-2 list-outside text-left">
                {listItems.map((li, liIdx) => (
                  <li key={liIdx} className="text-text-primary/95 leading-relaxed text-[14.5px] sm:text-[15.5px]">
                    {parseInlineStyles(li, sources)}
                  </li>
                ))}
              </ul>
            );
            continue;
          }

          // 4. Ordered list parsing
          if (/^\d+\.\s/.test(trimmedLine)) {
            const listItems: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
              const match = lines[i].trim().match(/^\d+\.\s([\s\S]*)/);
              listItems.push(match ? match[1] : lines[i].trim());
              i++;
            }
            parsedElements.push(
              <ol key={`ol-${idx}-${i}`} className="list-decimal pl-5 my-3.5 space-y-2 list-outside text-left">
                {listItems.map((li, liIdx) => (
                  <li key={liIdx} className="text-text-primary/95 leading-relaxed text-[14.5px] sm:text-[15.5px]">
                    {parseInlineStyles(li, sources)}
                  </li>
                ))}
              </ol>
            );
            continue;
          }

          // 5. Headings parsing
          if (trimmedLine.startsWith('# ')) {
            parsedElements.push(
              <h1 key={`h1-${idx}-${i}`} className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary mt-6 mb-3 font-heading text-left">
                {parseInlineStyles(trimmedLine.slice(2), sources)}
              </h1>
            );
          } else if (trimmedLine.startsWith('## ')) {
            parsedElements.push(
              <h2 key={`h2-${idx}-${i}`} className="text-lg sm:text-xl font-extrabold tracking-tight text-text-primary mt-5 mb-2 px-0.5 border-b border-border-subtle/30 pb-1 text-left">
                {parseInlineStyles(trimmedLine.slice(3), sources)}
              </h2>
            );
          } else if (trimmedLine.startsWith('### ')) {
            parsedElements.push(
              <h3 key={`h3-${idx}-${i}`} className="text-base sm:text-lg font-bold tracking-tight text-text-primary mt-4 mb-2 text-left">
                {parseInlineStyles(trimmedLine.slice(4), sources)}
              </h3>
            );
          }
          // 6. Normal text paragraph
          else {
            parsedElements.push(
              <p key={`p-${idx}-${i}`} className="my-2 leading-relaxed text-text-primary/95 text-[14.5px] sm:text-[15.5px] text-left">
                {parseInlineStyles(line, sources)}
              </p>
            );
          }

          i++;
        }

        return <React.Fragment key={idx}>{parsedElements}</React.Fragment>;
      })}
    </div>
  );
}

function parseInlineStyles(text: string, sources: Array<any> = []): React.ReactNode {
  // Add matching for citations: [1], [2], [¹], [²]
  const superscriptMap: Record<string, string> = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  
  const parts = text.split(/(\*\*[\s\S]*?\*\*|`[\s\S]*?`|\[\d+\]|\[[¹²³⁴⁵⁶⁷⁸⁹]\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-extrabold text-text-primary tracking-[0.01em]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-bg-base/80 border border-border-subtle/50 text-accent font-mono text-[12.5px] font-bold break-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.match(/^\[(\d+|[¹²³⁴⁵⁶⁷⁸⁹])\]$/)) {
      const match = part.match(/^\[(\d+|[¹²³⁴⁵⁶⁷⁸⁹])\]$/);
      if (match) {
        let numStr = match[1];
        if (superscriptMap[numStr]) numStr = superscriptMap[numStr];
        const num = parseInt(numStr, 10);
        const source = sources[num - 1]; // 0-indexed
        
        return (
          <span key={index} className="inline-block relative group mx-0.5 align-top cursor-pointer pt-0.5">
            <span className="text-[11px] leading-tight font-bold text-accent hover:text-text-primary transition-colors bg-white/8 px-1 rounded-sm">
              {num}
            </span>
            {source && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-bg-elevated/90 backdrop-blur-md border border-border-strong rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left pointer-events-none">
                <div className="flex items-center space-x-2 w-full truncate mb-1">
                  {source.favicon ? (
                    <img src={source.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-sm bg-white/10 shrink-0 border border-white/5" />
                  )}
                  <span className="text-xs font-bold text-text-primary truncate flex-1">{source.title || (source.url && new URL(source.url).hostname) || `Source ${num}`}</span>
                </div>
                {source.snippet && <p className="text-[11px] text-text-secondary line-clamp-3 leading-snug">{source.snippet}</p>}
                <div className="text-[11px] leading-tight text-accent font-mono truncate mt-1.5">{source.url && new URL(source.url).hostname}</div>
              </div>
            )}
          </span>
        );
      }
    }
    return part;
  });
}
