import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Loader2, Cpu } from 'lucide-react';

export type RagStage = 'extracting' | 'chunking' | 'embedding' | 'retrieving' | 'analyzing' | 'done';

interface RagStageState {
  stage: RagStage;
  detail: string;
  progress?: number; // 0-100
}

interface AnalysisProgressProps {
  currentStage: RagStageState;
  activeLanguage: 'en' | 'te';
  perfTimings?: any[];
  perfSummary?: any | null;
}

export default function AnalysisProgress({ currentStage, activeLanguage, perfTimings = [], perfSummary = null }: AnalysisProgressProps) {
  const isTe = activeLanguage === 'te';

  const stagesDef = [
    {
      key: 'extracting',
      titleEn: 'Text Extraction & OCR Normalization',
      titleTe: 'నివేదిక సేకరణ & అమరిక',
      operations: ['file_ingestion', 'text_extraction']
    },
    {
      key: 'chunking',
      titleEn: 'Logical Segment Chunking',
      titleTe: 'భాగాలుగా విభజన',
      operations: ['chunking', 'clause_classification']
    },
    {
      key: 'embedding',
      titleEn: 'Multi-threaded Vector Embeddings',
      titleTe: 'సమాంతర ఎంబెడ్డింగ్‌ల గుర్తింపు',
      operations: ['cache_lookup', 'embedding_total', 'db_storage']
    },
    {
      key: 'retrieving',
      titleEn: 'Hybrid Contract Database Grounding (RAG)',
      titleTe: 'హైబ్రిడ్ న్యాయ డేటాబేస్ శోధన',
      operations: ['hyde_expansion', 'query_embedding', 'vector_search', 'bm25_search', 'rrf_fusion', 'chunk_expansion']
    },
    {
      key: 'analyzing',
      titleEn: 'Nyaya AI Core Inference Analyser',
      titleTe: 'న్యాయ AI కోర్ పరస్పర పరిశీలన',
      operations: ['context_injection', 'llm_first_token', 'llm_full_response', 'flag_validation', 'risk_score']
    }
  ];

  const getStageIndex = (stage: RagStage) => {
    if (stage === 'done') return 6;
    const idx = stagesDef.findIndex(s => s.key === stage);
    return idx === -1 ? 0 : idx;
  };

  const currentIndex = getStageIndex(currentStage.stage);

  // Compute accumulated times for each visual stage from the real-time perfTimings
  const getStageElapsedTime = (ops: string[]) => {
    return perfTimings
      .filter(pt => ops.includes(pt.operation))
      .reduce((sum, pt) => sum + pt.duration_ms, 0);
  };

  return (
    <div className="max-w-md mx-auto bg-bg-surface border border-border-main p-8 rounded-2xl shadow-2xl text-center space-y-6" id="analysis-progress-card">
      <div className="w-12 h-12 rounded-full bg-accent/5 text-accent flex items-center justify-center mx-auto mb-2 border border-accent/15">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
      <div>
        <h3 className="text-lg font-heading font-black text-text-primary tracking-tight">
          {isTe ? 'శ్రీ న్యాయ AI విశ్లేషిస్తోంది...' : 'Sri Nyaya AI processing...'}
        </h3>
        <p className="text-xs text-text-secondary mt-1 font-semibold">
          {isTe ? 'అనుకూల చట్ట నిబంధనలు మరియు లోపాల స్కానింగ్ సాగుతోంది' : 'Scanning rules engine and compiling RAG contextual pipelines'}
        </p>
      </div>

      {/* Dynamic Detailed Info Alert Box */}
      {currentStage.detail && (
        <div className="bg-bg-base/60 border border-border-subtle p-3.5 rounded-xl text-left text-xs font-semibold text-text-secondary flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping shrink-0" />
          <span className="font-mono text-[11px] leading-relaxed select-all truncate">
            {currentStage.detail}
          </span>
        </div>
      )}

      {/* Embedded Progress bar (only visible if embedding) */}
      {currentStage.stage === 'embedding' && typeof currentStage.progress === 'number' && (
        <div className="space-y-1.5 text-left" id="embedding-progress-layer">
          <div className="flex justify-between text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider">
            <span>Embedding Progress</span>
            <span>{currentStage.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-bg-base rounded-full overflow-hidden border border-border-subtle">
            <div 
              className="h-full bg-accent transition-all duration-300" 
              style={{ width: `${currentStage.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* List layout steps representation */}
      <div className="space-y-3.5 text-left bg-bg-base/30 p-5 rounded-xl border border-border-subtle" id="progress-stages-timeline">
        {stagesDef.map((s, idx) => {
          const isCompleted = currentIndex > idx;
          const isActive = currentIndex === idx;
          const stageTime = getStageElapsedTime(s.operations);
          const blockIsSlow = stageTime >= 1500;

          return (
            <div key={s.key} className="flex items-start justify-between space-x-3">
              <div className="flex items-start space-x-3 truncate">
                <div className="mt-0.5 select-none shrink-0" id={`progress-marker-${s.key}`}>
                  {isCompleted ? (
                    <CheckCircle2 size={15} className="text-success" />
                  ) : isActive ? (
                    <Loader2 size={15} className="text-accent animate-spin" />
                  ) : (
                    <Circle size={15} className="text-text-muted" />
                  )}
                </div>
                <div className="space-y-0.5 truncate">
                  <span className={`text-xs font-bold ${isActive ? 'text-accent' : isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>
                    {isTe ? s.titleTe : s.titleEn}
                  </span>
                  {isActive && currentStage.detail && (
                    <p className="text-[11px] leading-tight text-text-secondary font-mono leading-tight truncate">
                      {currentStage.detail}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Completed Stage High-Precision Timing Badge */}
              {stageTime > 0 && (
                <div className="shrink-0 flex items-center space-x-1 font-mono text-[9.5px]">
                  <span className={`font-semibold align-middle ${blockIsSlow ? 'text-warning' : 'text-text-muted'}`}>
                    {blockIsSlow ? '⚠️ ' : ''}{stageTime}ms
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-time Operation Timing Log */}
      {perfTimings && perfTimings.length > 0 && (
        <div className="mt-6 border-t border-border-subtle pt-4 text-left space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] leading-tight font-black uppercase text-text-secondary tracking-wider">
              {isTe ? 'నిజ సమయ సమయాలు (Real-time Operations)' : 'Real-time Operation Timings'}
            </h4>
            <span className="text-[11px] leading-tight font-mono text-text-muted font-bold uppercase pb-0.5 border-b border-border-subtle/50">
              {perfTimings.length} completed
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-border-main" id="perf-timings-log">
            {perfTimings.map((pt, i) => {
              const isSlow = pt.duration_ms >= 1500;
              return (
                <div key={i} className="flex justify-between items-center text-[11px] leading-tight font-mono p-1.5 rounded-lg bg-bg-base/40 border border-border-subtle/40">
                  <span className="text-text-secondary truncate max-w-[200px]" title={pt.operation}>
                    {pt.operation}
                  </span>
                  <span className={`font-semibold flex items-center gap-1 shrink-0 ${isSlow ? 'text-warning font-extrabold' : 'text-text-primary'}`}>
                    {isSlow && <span>⚠️</span>}
                    {pt.duration_ms} ms
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Summary Dashboard */}
      {perfSummary && (
        <div className="mt-6 border-t border-border-subtle pt-4 text-left space-y-3" id="perf-summary-overlay">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] leading-tight font-black uppercase text-text-primary tracking-wider">
              {isTe ? 'పనితీరు నివేదిక (Pipeline Speed Summary)' : 'Pipeline Speed Summary'}
            </h4>
            <span className={`text-[11px] leading-tight font-mono font-black border px-2 py-0.5 rounded ${perfSummary.total_ms >= 4500 ? 'bg-error/10 text-error border-error/15' : 'bg-success/10 text-success border-success/15'}`}>
              {perfSummary.total_ms >= 4500 && '🚨 '}
              {perfSummary.total_ms} ms
            </span>
          </div>

          {perfSummary.total_ms >= 4500 && (
            <div className="p-3 bg-error/5 border border-error/15 rounded-xl text-[10.5px] font-semibold text-error leading-normal flex items-start gap-2">
              <span className="text-sm">🚨</span>
              <div>
                <p className="font-bold text-error">Critical Pipeline Delay Flagged</p>
                <p className="mt-0.5 opacity-85">Sri Nyaya AI detected pipeline duration exceeding 4,500ms threshold limit. Inference latency is highly throttled.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(perfSummary.breakdown).map(([key, val]: any) => {
              const pct = Math.round((val / perfSummary.total_ms) * 100) || 0;
              const titleMap: Record<string, string> = {
                ingestion_ms: 'Ingestion & OCR Normalization',
                chunking_ms: 'Hierarchical Segmentation',
                embedding_ms: 'Vector Index Embeddings',
                retrieval_ms: 'Hybrid RAG retrieval',
                llm_ms: 'Sri Nyaya LLM Inference',
                validation_ms: 'Post-Validation & Scoring'
              };
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[11px] leading-tight font-bold text-text-secondary w-full">
                    <span className="truncate max-w-[200px]">{titleMap[key] || key}</span>
                    <span className="font-mono text-text-muted">{val}ms ({pct}%)</span>
                  </div>
                  <div className="w-full h-1 bg-bg-base rounded-full overflow-hidden border border-border-subtle/30">
                    <div 
                      className={`h-full transition-all duration-500 ${val >= 1500 ? 'bg-warning' : 'bg-accent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[11px] leading-tight font-bold text-text-muted font-mono leading-none pt-1">
            <span>Slowest block:</span>
            <span className="text-warning bg-warning/5 px-2 py-0.5 rounded border border-warning/10">{perfSummary.slowest_operation}</span>
          </div>
        </div>
      )}
    </div>
  );
}
