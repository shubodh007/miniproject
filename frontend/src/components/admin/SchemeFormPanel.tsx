import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, FileText, Settings, Layers, ListPlus, Plus, Minus } from 'lucide-react';
import { WelfareScheme, EligibilityRules } from '../../types';

interface SchemeFormPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scheme: Omit<WelfareScheme, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<void>;
  scheme: WelfareScheme | null; // Null if creating new
}

export function SchemeFormPanel({ isOpen, onClose, onSave, scheme }: SchemeFormPanelProps) {
  // Local state for all fields
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [category, setCategory] = useState<WelfareScheme['category']>('Agriculture');
  const [state, setState] = useState<WelfareScheme['state']>('Central');
  const [district, setDistrict] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const [description, setDescription] = useState('');
  const [descriptionTe, setDescriptionTe] = useState('');
  const [benefitDetails, setBenefitDetails] = useState('');
  const [benefitDetailsTe, setBenefitDetailsTe] = useState('');

  // Required documents (stored as array, but edited as list/inputs)
  const [docsRequired, setDocsRequired] = useState<string[]>([]);
  const [docsRequiredTe, setDocsRequiredTe] = useState<string[]>([]);

  // Eligibility Rules (edited as JSON text string with raw editor)
  const [rulesJson, setRulesJson] = useState('{\n  "min_age": 18\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Status and version states
  const [status, setStatus] = useState<WelfareScheme['status']>('DRAFT');
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);

  // Loading/saving state
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize fields if editing
  useEffect(() => {
    if (scheme) {
      setName(scheme.name || '');
      setNameTe(scheme.name_te || '');
      setCategory(scheme.category || 'Agriculture');
      setState(scheme.state || 'Central');
      setDistrict(scheme.district || '');
      setExternalUrl(scheme.external_url || '');
      setDescription(scheme.description || '');
      setDescriptionTe(scheme.description_te || '');
      setBenefitDetails(scheme.benefit_details || '');
      setBenefitDetailsTe(scheme.benefit_details_te || '');
      setDocsRequired(scheme.docs_required || []);
      setDocsRequiredTe(scheme.docs_required_te || []);
      setRulesJson(JSON.stringify(scheme.eligibility_rules || {}, null, 2));
      setStatus(scheme.status || 'DRAFT');
      setJsonError(null);

      // Fetch historical edits and logs for rollback and dynamic observability audit
      if (scheme.id) {
        setLoadingVersions(true);
        fetch(`/api/admin/schemes/${scheme.id}/versions`)
          .then(res => res.json())
          .then(data => setVersions(data || []))
          .catch(err => console.error("Error loading versions", err))
          .finally(() => setLoadingVersions(false));
      } else {
        setVersions([]);
      }
    } else {
      // Clear fields for new
      setName('');
      setNameTe('');
      setCategory('Agriculture');
      setState('Central');
      setDistrict('');
      setExternalUrl('');
      setDescription('');
      setDescriptionTe('');
      setBenefitDetails('');
      setBenefitDetailsTe('');
      setDocsRequired([]);
      setDocsRequiredTe([]);
      setRulesJson('{\n  "min_age": 18,\n  "max_age": 60,\n  "max_income": 250000\n}');
      setStatus('DRAFT');
      setVersions([]);
      setJsonError(null);
    }
    setValidationError(null);
  }, [scheme, isOpen]);

  // Hot rollback action
  const handleRollback = async (verId: string) => {
    if (!scheme || !scheme.id) return;
    if (!window.confirm("Are you sure you want to revert this scheme's configuration to this previous version? Current form inputs will be overwritten.")) return;
    try {
      const res = await fetch(`/api/admin/schemes/${scheme.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: verId })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Rollback failed");
      }
      const reverted = await res.json();
      
      // Overwrite the editor state instantly
      setName(reverted.name || '');
      setNameTe(reverted.name_te || '');
      setCategory(reverted.category || 'Agriculture');
      setState(reverted.state || 'Central');
      setDistrict(reverted.district || '');
      setExternalUrl(reverted.external_url || '');
      setDescription(reverted.description || '');
      setDescriptionTe(reverted.description_te || '');
      setBenefitDetails(reverted.benefit_details || '');
      setBenefitDetailsTe(reverted.benefit_details_te || '');
      setDocsRequired(reverted.docs_required || []);
      setDocsRequiredTe(reverted.docs_required_te || []);
      setRulesJson(JSON.stringify(reverted.eligibility_rules || {}, null, 2));
      setStatus(reverted.status || 'DRAFT');

      // Refresh list
      const versRes = await fetch(`/api/admin/schemes/${scheme.id}/versions`);
      const versData = await versRes.json();
      setVersions(versData || []);
    } catch (err: any) {
      alert("Error reverting scheme: " + err.message);
    }
  };

  // Handle JSON syntax validation on the fly
  const handleRulesChange = (value: string) => {
    setRulesJson(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleAddDoc = (isTe: boolean) => {
    if (isTe) {
      setDocsRequiredTe([...docsRequiredTe, '']);
    } else {
      setDocsRequired([...docsRequired, '']);
    }
  };

  const handleRemoveDoc = (index: number, isTe: boolean) => {
    if (isTe) {
      setDocsRequiredTe(docsRequiredTe.filter((_, i) => i !== index));
    } else {
      setDocsRequired(docsRequired.filter((_, i) => i !== index));
    }
  };

  const handleDocChange = (index: number, value: string, isTe: boolean) => {
    if (isTe) {
      const next = [...docsRequiredTe];
      next[index] = value;
      setDocsRequiredTe(next);
    } else {
      const next = [...docsRequired];
      next[index] = value;
      setDocsRequired(next);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic Validation
    if (!name.trim()) {
      setValidationError('Scheme Name (English) is required.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Description (English) is required.');
      return;
    }

    // JSON Validation
    let parsedRules: EligibilityRules = {};
    try {
      parsedRules = JSON.parse(rulesJson);
    } catch (err) {
      setValidationError('Please fix JSON syntax error in Eligibility Rules before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<WelfareScheme, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
        name: name.trim(),
        name_te: nameTe.trim() || undefined,
        category,
        state,
        district: district.trim() || null,
        external_url: externalUrl.trim() || undefined,
        description: description.trim(),
        description_te: descriptionTe.trim() || undefined,
        benefit_details: benefitDetails.trim() || undefined,
        benefit_details_te: benefitDetailsTe.trim() || undefined,
        docs_required: docsRequired.filter((d) => d.trim() !== ''),
        docs_required_te: docsRequiredTe.filter((d) => d.trim() !== ''),
        eligibility_rules: parsedRules,
        status: status,
      };

      if (scheme?.id) {
        payload.id = scheme.id;
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save scheme.');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryOptions = [
    'Agriculture',
    'Education',
    'Social Welfare',
    'Housing',
    'Health',
    'Employment',
    'Women & Child',
  ];

  const stateOptions = ['Central', 'Andhra Pradesh', 'Telangana'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Form Side-Panel Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0d0d0d] border-l border-white/5 z-50 shadow-2xl flex flex-col text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {scheme ? 'Edit Welfare Scheme' : 'Add New Welfare Scheme'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {scheme ? 'Update attributes & eligibility criteria' : 'Create a fresh welfare scheme entry'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {validationError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <span className="text-xs font-semibold text-red-200">{validationError}</span>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name EN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Scheme Name (English) *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. YSR Rythu Bharosa"
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none"
                      required
                    />
                  </div>

                  {/* Name TE */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Scheme Name (Telugu)</label>
                    <input
                      type="text"
                      value={nameTe}
                      onChange={(e) => setNameTe(e.target.value)}
                      placeholder="ఉదా: వైఎస్ఆర్ రైతు భరోసా"
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as WelfareScheme['category'])}
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none cursor-pointer"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region / State */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">State / Region *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value as WelfareScheme['state'])}
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none cursor-pointer"
                    >
                      {stateOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">District (Optional - null for State-wide)</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Visakhapatnam"
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none"
                    />
                  </div>

                  {/* External App Link */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">External Application URL</label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://ysrrythubharosa.ap.gov.in/"
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none"
                    />
                  </div>

                  {/* Lifecycle Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Lifecycle Status *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as WelfareScheme['status'])}
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none cursor-pointer font-bold text-violet-400"
                    >
                      <option value="DRAFT">DRAFT (Hidden from matching)</option>
                      <option value="PUBLISHED">PUBLISHED (Live matching active)</option>
                      <option value="ARCHIVED">ARCHIVED (Retired / Read-Only)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Descriptions & Benefits */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} />
                  Descriptions & Benefits
                </h3>
                <div className="space-y-4">
                  {/* Description EN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Description (English) *</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Provide a comprehensive English overview of the welfare scheme..."
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none resize-none"
                      required
                    />
                  </div>

                  {/* Description TE */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Description (Telugu)</label>
                    <textarea
                      value={descriptionTe}
                      onChange={(e) => setDescriptionTe(e.target.value)}
                      rows={3}
                      placeholder="పథకం గురించి వివరణ తెలుగులో..."
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none resize-none"
                    />
                  </div>

                  {/* Benefit Details EN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Benefit Details (English)</label>
                    <textarea
                      value={benefitDetails}
                      onChange={(e) => setBenefitDetails(e.target.value)}
                      rows={2}
                      placeholder="e.g. ₹13,500 annual investment support provided in three installments..."
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none resize-none"
                    />
                  </div>

                  {/* Benefit Details TE */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Benefit Details (Telugu)</label>
                    <textarea
                      value={benefitDetailsTe}
                      onChange={(e) => setBenefitDetailsTe(e.target.value)}
                      rows={2}
                      placeholder="పథకం ద్వారా కలిగే లబ్ధి వివరాలు తెలుగులో..."
                      className="w-full py-2 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-sm transition-all focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Required Documents */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                  <ListPlus size={14} />
                  Required Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* English Documents list */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-300">Documents (English)</label>
                      <button
                        type="button"
                        onClick={() => handleAddDoc(false)}
                        className="p-1 rounded bg-zinc-800/80 hover:bg-violet-600 hover:text-white text-zinc-400 cursor-pointer text-xs flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    {docsRequired.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic p-3 bg-black/40 border border-white/5 rounded-lg text-center">No documents added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {docsRequired.map((doc, idx) => (
                          <div key={`doc-en-${idx}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={doc}
                              onChange={(e) => handleDocChange(idx, e.target.value, false)}
                              placeholder="e.g. Aadhaar Card"
                              className="flex-grow py-1.5 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-xs transition-all focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(idx, false)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 rounded-md hover:bg-red-500/10 cursor-pointer transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Telugu Documents list */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-300">Documents (Telugu)</label>
                      <button
                        type="button"
                        onClick={() => handleAddDoc(true)}
                        className="p-1 rounded bg-zinc-800/80 hover:bg-violet-600 hover:text-white text-zinc-400 cursor-pointer text-xs flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    {docsRequiredTe.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic p-3 bg-black/40 border border-white/5 rounded-lg text-center">No documents added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {docsRequiredTe.map((doc, idx) => (
                          <div key={`doc-te-${idx}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={doc}
                              onChange={(e) => handleDocChange(idx, e.target.value, true)}
                              placeholder="ఉదా: ఆధార్ కార్డ్"
                              className="flex-grow py-1.5 px-3 bg-black border border-white/5 focus:border-violet-500/50 rounded-lg text-xs transition-all focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(idx, true)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 rounded-md hover:bg-red-500/10 cursor-pointer transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Eligibility Rules JSON Editor */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={14} />
                    Eligibility Rules (JSON Editor)
                  </h3>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Must be valid JSON object
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={rulesJson}
                      onChange={(e) => handleRulesChange(e.target.value)}
                      rows={10}
                      className={`w-full p-4 bg-black border font-mono text-xs rounded-xl transition-all focus:outline-none leading-relaxed ${
                        jsonError
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                          : 'border-white/5 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30'
                      }`}
                    />
                    {jsonError && (
                      <div className="absolute bottom-3 right-3 py-1 px-2.5 bg-red-500/15 border border-red-500/30 text-[10px] font-mono text-red-400 rounded">
                        JSON Error: Syntax Incorrect
                      </div>
                    )}
                  </div>

                  {/* Helpful Quick JSON Structure template helper hint */}
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-zinc-400 space-y-1">
                    <span className="font-semibold text-zinc-300">Supported JSON Fields:</span>
                    <p className="font-mono text-[10px] text-zinc-500 leading-normal">
                      min_age (num), max_age (num), max_income (num), applicable_states (array), caste_categories (array), occupation (str), gender (str: "Male"|"Female"|"Any"), has_pattadar_passbook (bool).
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5: Version History & Rollback Audit (Only in Edit mode) */}
              {scheme && scheme.id && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} />
                    Version History & Rollbacks
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Review past revisions of this welfare scheme. You can instantly hot-reload previous configurations onto the editor using the Rollback action.
                  </p>
                  
                  {loadingVersions ? (
                    <div className="text-center py-4">
                      <span className="animate-spin border-2 border-white/25 border-t-violet-400 w-5 h-5 rounded-full inline-block" />
                      <p className="text-xs text-zinc-500 mt-1">Loading revision logs...</p>
                    </div>
                  ) : versions.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic p-4 bg-white/[0.01] border border-white/5 rounded-lg text-center">
                      No previous historical edits found. Revisions are created automatically when edits are saved.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {versions.map((ver, index) => (
                        <div key={ver.id} className="p-3 bg-black border border-white/5 hover:border-violet-500/20 rounded-lg flex items-center justify-between gap-4 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono uppercase">
                                Revision {versions.length - index}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(ver.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 font-medium truncate mt-1">
                              Saved by system administrator
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRollback(ver.id)}
                            className="px-2.5 py-1.5 bg-violet-600/10 hover:bg-violet-600 hover:text-white border border-violet-500/20 text-violet-300 text-[10px] font-bold rounded transition-all cursor-pointer shrink-0"
                          >
                            Rollback
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Sticky Actions Footer */}
            <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3.5">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/25 text-sm font-semibold rounded-lg text-zinc-300 hover:text-white transition-all cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || jsonError !== null}
                className="py-2.5 px-5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-sm font-semibold rounded-lg text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:bg-violet-600/30"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin border-2 border-white border-t-transparent w-4 h-4 rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Scheme
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
