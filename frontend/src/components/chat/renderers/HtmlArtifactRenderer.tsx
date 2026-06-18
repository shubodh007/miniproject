import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Maximize2, Minimize2, Copy, Check, Terminal, ExternalLink, Loader2 } from 'lucide-react';

interface HtmlArtifactRendererProps {
  htmlContent: string;
}

export const HtmlArtifactRenderer: React.FC<HtmlArtifactRendererProps> = ({ htmlContent }) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restart loading state if content changes
  useEffect(() => {
    setIsLoading(true);
  }, [htmlContent]);

  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNewTab = () => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  return (
    <div 
      className={`relative border border-border-main rounded-2xl bg-[#0e0e15] overflow-hidden my-5 shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'w-full min-h-[460px]'
      }`}
      id="html-artifact-renderer-outer"
    >
      {/* Dark Chrome Chrome Window Border Toolbar */}
      <div className="flex items-center justify-between bg-[#07070b] border-b border-border-subtle px-4.5 py-3.5 shrink-0">
        <div className="flex items-center space-x-3">
          {/* macOS traffic light buttons */}
          <div className="flex space-x-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-error/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent-gold/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
          </div>
          
          <div className="h-4 w-px bg-border-subtle" />
          
          <div className="flex items-center space-x-1.5 opacity-80">
            <Layout size={13} className="text-accent-blue" />
            <span className="text-[11px] font-mono font-bold tracking-tight text-text-secondary select-none">artifact_sandbox.html</span>
          </div>
        </div>

        {/* Action button deck */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleCopySource}
            className="p-1.5 bg-[#0e0e16] hover:bg-[#151522] border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer"
            title="Copy Static HTML Source"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>
          
          <button
            onClick={handleOpenNewTab}
            className="p-1.5 bg-[#0e0e16] hover:bg-[#151522] border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer"
            title="Open Sandbox in New Browser Window"
          >
            <ExternalLink size={14} />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-[#0e0e16] hover:bg-[#151522] border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Maximize view"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Frame body workspace area */}
      <div className="relative flex-1 bg-white w-full h-full overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0e0e15] flex flex-col items-center justify-center space-y-3 z-10">
            <Loader2 size={32} className="animate-spin text-accent-blue" />
            <span className="text-xs font-mono text-text-muted font-bold select-none tracking-widest animate-pulse uppercase">
              provisioning workspace container...
            </span>
          </div>
        )}

        <iframe
          srcDoc={htmlContent}
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0"
          style={{ minHeight: isFullscreen ? 'auto' : '400px' }}
          title="Interactive HTML Sandbox"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
