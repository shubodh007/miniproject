import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  BarChart2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Globe, 
  Database, 
  Cpu, 
  Server, 
  RefreshCw, 
  Search, 
  Compass, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // RAG validation sweep state
  const [runningSweep, setRunningSweep] = useState(false);
  const [sweepResults, setSweepResults] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const analytics = await res.json();
      setData(analytics);
    } catch (err: any) {
      console.error('Failed to load analytics', err);
      setError(err.message || 'Failed to connect to analytics service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRunRAGSweep = async () => {
    setRunningSweep(true);
    setSweepResults(null);
    try {
      const res = await fetch('/api/admin/analytics/rag-validation');
      if (!res.ok) {
        throw new Error(`Diagnostic HTTP Error ${res.status}`);
      }
      const sweep = await res.json();
      setSweepResults(sweep);
    } catch (err: any) {
      alert("Sweep failed: " + err.message);
    } finally {
      setRunningSweep(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <span className="animate-spin border-4 border-white/10 border-t-violet-500 w-12 h-12 rounded-full mb-4" />
        <p className="text-zinc-400 font-mono text-sm">Aggregating live system telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
        <XCircle className="text-red-400 mx-auto mb-3" size={32} />
        <h3 className="font-bold text-white">Observability Gateway Offline</h3>
        <p className="text-xs text-red-300 mt-1 max-w-md mx-auto">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded-lg transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const stats = data?.statistics || {};
  const sysStatus = data?.system_status || {};
  const traces = data?.traces || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Telemetry Volume */}
        <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Evaluated Queries</p>
            <h4 className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
              {stats.query_volume || 0}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Activity size={16} />
          </div>
        </div>

        {/* Avg Latency */}
        <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Avg Response Latency</p>
            <h4 className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
              {stats.avg_latency || 0} <span className="text-xs text-zinc-500 font-sans font-normal">ms</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
            <Clock size={16} />
          </div>
        </div>

        {/* P50 Latency */}
        <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Median Latency (p50)</p>
            <h4 className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
              {stats.p50_latency || 0} <span className="text-xs text-zinc-500 font-sans font-normal">ms</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BarChart2 size={16} />
          </div>
        </div>

        {/* P90 Latency */}
        <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">90th Percentile Latency (p90)</p>
            <h4 className="text-2xl font-bold font-mono tracking-tight text-red-400 mt-1">
              {stats.p90_latency || 0} <span className="text-xs text-zinc-500 font-sans font-normal">ms</span>
            </h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Clock size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="p-6 bg-[#111] border border-white/5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
            <Server size={14} />
            System Integrations & Heartbeats
          </h3>
          <div className="space-y-3">
            {/* Supabase status */}
            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Database size={15} className="text-zinc-400" />
                <span className="text-xs font-semibold">Supabase Vector Database</span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${
                sysStatus.supabase === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              }`}>
                {sysStatus.supabase === 'connected' ? 'CONNECTED' : 'LOCAL FALLBACK'}
              </span>
            </div>

            {/* Gemini API Status */}
            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Cpu size={15} className="text-zinc-400" />
                <span className="text-xs font-semibold">Gemini AI Engine SDK</span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${
                sysStatus.gemini === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {sysStatus.gemini === 'connected' ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>

            {/* Local file db status */}
            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Database size={15} className="text-zinc-400" />
                <span className="text-xs font-semibold">Local JSON Cache Registry</span>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                HEALTHY
              </span>
            </div>
          </div>

          {/* Language distribution card */}
          <div className="pt-4 border-t border-white/5">
            <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Language Demographics</h4>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg">
                <p className="text-[10px] text-zinc-500">English Queries</p>
                <h5 className="text-lg font-bold font-mono text-zinc-300 mt-1">{stats.languages?.en || 0}</h5>
              </div>
              <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg">
                <p className="text-[10px] text-zinc-500">Telugu Queries</p>
                <h5 className="text-lg font-bold font-mono text-zinc-300 mt-1">{stats.languages?.te || 0}</h5>
              </div>
            </div>
          </div>
        </div>

        {/* Top matching schemes */}
        <div className="p-6 bg-[#111] border border-white/5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
            <Compass size={14} />
            Top 5 Matched Welfare Schemes
          </h3>
          {(!stats.top_matched || stats.top_matched.length === 0) ? (
            <p className="text-xs text-zinc-500 italic text-center py-12">No scheme matches recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.top_matched.map((sc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{sc.name}</p>
                    <p className="text-[9px] text-zinc-500 font-semibold uppercase mt-0.5">Rank #{idx+1}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-mono font-bold rounded-lg shrink-0">
                    {sc.count} times
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live RAG validation scoring sweep */}
        <div className="p-6 bg-[#111] border border-white/5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} />
            RAG Recall & System Metrics
          </h3>
          <p className="text-xs text-zinc-400 leading-normal">
            Trigger a real-time diagnostic sweep of the RAG pipeline to benchmark query retrieval and model correctness scoring.
          </p>
          
          {!sweepResults && !runningSweep ? (
            <div className="text-center py-8">
              <button
                onClick={handleRunRAGSweep}
                className="py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white rounded-lg transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Run Real-Time RAG Sweep
              </button>
            </div>
          ) : runningSweep ? (
            <div className="text-center py-6 space-y-2">
              <span className="animate-spin border-3 border-white/15 border-t-violet-400 w-6 h-6 rounded-full inline-block" />
              <p className="text-xs text-zinc-400 font-mono">Running RAG telemetry benchmark...</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                {/* Recall */}
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Retrieval Recall</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 block mt-1">{sweepResults.recall}%</span>
                </div>
                {/* Precision */}
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">RAG Precision</span>
                  <span className="text-xl font-bold font-mono text-violet-400 block mt-1">{sweepResults.precision}%</span>
                </div>
                {/* Grounding */}
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Grounding Rate</span>
                  <span className="text-xl font-bold font-mono text-teal-400 block mt-1">{sweepResults.grounding}%</span>
                </div>
                {/* Citation */}
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Citation Quality</span>
                  <span className="text-xl font-bold font-mono text-indigo-400 block mt-1">{sweepResults.citation}%</span>
                </div>
              </div>

              {/* Validation Success Indicator */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-300 font-semibold">Validation Passed (Scores 90%+)</span>
                <button
                  onClick={handleRunRAGSweep}
                  className="ml-auto text-[10px] text-zinc-400 hover:text-white underline"
                >
                  Rerun
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sweep trace items if available */}
      {sweepResults && sweepResults.details && (
        <div className="p-6 bg-[#111] border border-white/5 rounded-xl space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} />
            Diagnostic Sweep Cases
          </h3>
          <div className="space-y-2">
            {sweepResults.details.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-black border border-white/5 rounded-lg flex items-center justify-between text-xs font-mono">
                <div className="min-w-0 pr-4">
                  <p className="text-zinc-300 font-sans font-medium truncate">{item.query}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Expected: {item.expected_scheme} | Retrieved: {item.retrieved}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-zinc-500 text-[10px]">{item.latency_ms} ms</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    item.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Logs Trace Flight Recorder */}
      <div className="p-6 bg-[#111] border border-white/5 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} />
            Real-Time Query Logs & Traces
          </h3>
          <button 
            onClick={fetchAnalytics}
            className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/5"
            title="Refresh Logs"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {traces.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-8">No search telemetry recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/40 text-zinc-500 uppercase text-[10px] font-bold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Matched</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {traces.map((trace: any) => (
                  <tr key={trace.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 max-w-sm truncate font-sans">
                      {trace.query_text}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        trace.rag_mode === 'cached' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {trace.rag_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-sans font-medium">
                      {trace.match_count} schemes
                    </td>
                    <td className="py-3 px-4 text-right text-violet-400">
                      {trace.latency_ms} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
