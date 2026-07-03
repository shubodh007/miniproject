import React, { useState, useEffect } from 'react';
import { useSchemes } from '../hooks/useSchemes';
import { PinGate } from './admin/PinGate';
import { SchemeTable } from './admin/SchemeTable';
import { SchemeFormPanel } from './admin/SchemeFormPanel';
import { DeleteConfirmModal } from './admin/DeleteConfirmModal';
import { AnalyticsDashboard } from './admin/AnalyticsDashboard';
import { WelfareScheme } from '../types';
import { useToast } from './ToastProvider';
import { LayoutDashboard, Plus, ArrowLeft, LogOut, Database, Globe, Landmark, AlertCircle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { schemes, loading, error, refetch, createScheme, updateScheme, deleteScheme } = useSchemes();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<WelfareScheme | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [activeTab, setActiveTab] = useState<'schemes' | 'analytics'>('schemes');

  // Local state for stats
  const [stats, setStats] = useState({
    total: 0,
    ap: 0,
    ts: 0,
    central: 0,
  });

  // Check auth on mount
  useEffect(() => {
    const isAuth = localStorage.getItem('sc_admin_authorized') === 'true';
    if (isAuth) {
      setIsAuthorized(true);
    }
  }, []);

  // Compute stats whenever schemes change
  useEffect(() => {
    if (schemes.length > 0) {
      const apCount = schemes.filter((s) => s.state === 'Andhra Pradesh').length;
      const tsCount = schemes.filter((s) => s.state === 'Telangana').length;
      const centralCount = schemes.filter((s) => s.state === 'Central').length;

      setStats({
        total: schemes.length,
        ap: apCount,
        ts: tsCount,
        central: centralCount,
      });
    } else {
      setStats({ total: 0, ap: 0, ts: 0, central: 0 });
    }
  }, [schemes]);

  const handleLogout = () => {
    localStorage.removeItem('sc_admin_authorized');
    setIsAuthorized(false);
    toast.info('Logged out from Admin Panel');
  };

  const handleCreateNew = () => {
    setSelectedScheme(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (scheme: WelfareScheme) => {
    setSelectedScheme(scheme);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const scheme = schemes.find((s) => s.id === id);
    if (scheme) {
      setDeleteTargetId(id);
      setDeleteTargetName(scheme.name);
      setIsDeleteOpen(true);
    }
  };

  const handleSaveForm = async (payload: Omit<WelfareScheme, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
    try {
      if (payload.id) {
        // Edit flow
        await updateScheme(payload.id, payload);
        toast.success(`Successfully updated scheme: "${payload.name}"`);
      } else {
        // Create flow
        await createScheme(payload);
        toast.success(`Successfully created new scheme: "${payload.name}"`);
      }
      refetch(); // Reload live dataset
    } catch (err: any) {
      toast.error(err.message || 'Error saving welfare scheme');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteScheme(deleteTargetId);
      toast.success(`Successfully deleted scheme: "${deleteTargetName}"`);
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
      refetch(); // Reload live dataset
    } catch (err: any) {
      toast.error(err.message || 'Error deleting welfare scheme');
    }
  };

  if (!isAuthorized) {
    return <PinGate onSuccess={() => setIsAuthorized(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#080808] text-white overflow-hidden">
      {/* Sidebar Layout Component */}
      <div className="w-64 border-r border-white/5 bg-[#0d0d0d] flex flex-col justify-between select-none">
        <div>
          {/* Logo Brand Title */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-900/30">
              S
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">SchemeConnect AP</h1>
              <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Admin Engine</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('schemes')}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                activeTab === 'schemes'
                  ? 'bg-violet-600/10 border-violet-500/20 text-violet-300'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Manage Welfare Schemes</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-violet-600/10 border-violet-500/20 text-violet-300'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Activity size={16} />
              <span>Observability & Telemetry</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-zinc-400 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-transparent"
            >
              <Plus size={16} />
              <span>Add New Welfare Scheme</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 space-y-2 border-t border-white/5">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] text-zinc-400 hover:text-white text-xs rounded-lg transition-all cursor-pointer border border-transparent"
          >
            <ArrowLeft size={14} />
            <span>Return to Portal</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs rounded-lg transition-all cursor-pointer border border-transparent font-medium"
          >
            <LogOut size={14} />
            <span>Lock & Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <div className="h-16 border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-md font-bold text-white tracking-tight">
              {activeTab === 'analytics' ? 'Observability & Telemetry' : 'Scheme Matrix Core'}
            </h2>
            <span className="h-4 w-px bg-white/10" />
            <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 bg-black px-2.5 py-1 rounded-full border border-white/5">
              <Database size={12} className="text-violet-400" />
              {activeTab === 'analytics' ? 'Real-Time System Logs' : 'Live Supabase Tables'}
            </p>
          </div>

          {activeTab === 'schemes' && (
            <button
              onClick={handleCreateNew}
              className="py-2 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-xs font-bold rounded-lg text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-violet-900/10"
            >
              <Plus size={14} />
              <span>Create New Scheme</span>
            </button>
          )}
        </div>

        {/* Scrollable Dashboard Workspace Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="text-xs font-semibold text-red-200">Database connection issue detected:</span>
                <p className="text-[11px] text-red-400 mt-1 font-mono">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' ? (
            <AnalyticsDashboard />
          ) : (
            <>
              {/* Quick Metrics Statistics Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
                {/* Metric 1 */}
                <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Active Schemes</p>
                    <h3 className="text-2xl font-bold tracking-tight text-white mt-1 font-mono">
                      {loading ? '...' : stats.total}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Database size={16} />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Andhra Pradesh State</p>
                    <h3 className="text-2xl font-bold tracking-tight text-orange-400 mt-1 font-mono">
                      {loading ? '...' : stats.ap}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Globe size={16} />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Telangana State</p>
                    <h3 className="text-2xl font-bold tracking-tight text-teal-400 mt-1 font-mono">
                      {loading ? '...' : stats.ts}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Globe size={16} />
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="p-5 bg-[#111] border border-white/5 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Central Schemes</p>
                    <h3 className="text-2xl font-bold tracking-tight text-indigo-400 mt-1 font-mono">
                      {loading ? '...' : stats.central}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Landmark size={16} />
                  </div>
                </div>
              </div>

              {/* Table container view */}
              <SchemeTable
                schemes={schemes}
                loading={loading}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            </>
          )}
        </div>
      </div>

      {/* Side drawer create/edit overlay panel */}
      <SchemeFormPanel
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedScheme(null);
        }}
        onSave={handleSaveForm}
        scheme={selectedScheme}
      />

      {/* Warning/purging confirmation modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleConfirmDelete}
        schemeName={deleteTargetName}
      />
    </div>
  );
}
