import React, { useState, useMemo } from 'react';
import { Search, Filter, Edit, Trash2, Globe, FileText, Landmark, IndianRupee, MapPin } from 'lucide-react';
import { WelfareScheme } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface SchemeTableProps {
  schemes: WelfareScheme[];
  loading: boolean;
  onEdit: (scheme: WelfareScheme) => void;
  onDelete: (id: string) => void;
}

export function SchemeTable({ schemes, loading, onEdit, onDelete }: SchemeTableProps) {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const filteredSchemes = useMemo(() => {
    return schemes.filter((scheme) => {
      const matchesSearch =
        scheme.name.toLowerCase().includes(search.toLowerCase()) ||
        (scheme.name_te && scheme.name_te.toLowerCase().includes(search.toLowerCase())) ||
        scheme.description.toLowerCase().includes(search.toLowerCase()) ||
        (scheme.description_te && scheme.description_te.toLowerCase().includes(search.toLowerCase()));

      const matchesState = stateFilter === 'All' || scheme.state === stateFilter;
      const matchesCategory = categoryFilter === 'All' || scheme.category === categoryFilter;

      return matchesSearch && matchesState && matchesCategory;
    });
  }, [schemes, search, stateFilter, categoryFilter]);

  const categories = [
    'All',
    'Agriculture',
    'Education',
    'Social Welfare',
    'Housing',
    'Health',
    'Employment',
    'Women & Child',
  ];

  const states = ['All', 'Andhra Pradesh', 'Telangana', 'Central'];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Agriculture':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Education':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Social Welfare':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Housing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Health':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Employment':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Women & Child':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'Andhra Pradesh':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Telangana':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'Central':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search schemes by English or Telugu name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 bg-black border border-white/5 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 rounded-lg text-sm text-white placeholder-zinc-500 transition-all focus:outline-none"
          />
        </div>

        {/* State Filter */}
        <div className="relative min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-xs flex items-center gap-1.5 font-medium">
            <Globe className="w-3.5 h-3.5" />
            Region:
          </span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full py-2.5 pl-20 pr-3 bg-black border border-white/5 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 rounded-lg text-xs text-white appearance-none cursor-pointer focus:outline-none font-semibold text-right"
          >
            {states.map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All' : st.replace(' State', '')}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="relative min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-xs flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-2.5 pl-22 pr-3 bg-black border border-white/5 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 rounded-lg text-xs text-white appearance-none cursor-pointer focus:outline-none font-semibold text-right"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-6">Scheme Name</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Region</th>
                <th className="py-4 px-4">Benefits</th>
                <th className="py-4 px-4">Last Updated</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  // Loading skeleton rows
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse bg-white/[0.01]">
                      <td className="py-5 px-6">
                        <div className="h-4 bg-zinc-800 rounded w-48 mb-2" />
                        <div className="h-3 bg-zinc-800 rounded w-32" />
                      </td>
                      <td className="py-5 px-4">
                        <div className="h-6 bg-zinc-800 rounded-full w-24" />
                      </td>
                      <td className="py-5 px-4">
                        <div className="h-6 bg-zinc-800 rounded-full w-20" />
                      </td>
                      <td className="py-5 px-4">
                        <div className="h-4 bg-zinc-800 rounded w-24" />
                      </td>
                      <td className="py-5 px-4">
                        <div className="h-3 bg-zinc-800 rounded w-16" />
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="inline-flex gap-2">
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredSchemes.length === 0 ? (
                  // Empty state row
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="max-w-xs mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 mb-3">
                          <FileText size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-300">No schemes found</h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Try adjusting your filters or refine your search term.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Actual table data rows
                  filteredSchemes.map((scheme) => (
                    <motion.tr
                      key={scheme.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-6 max-w-sm">
                        <div className="font-semibold text-white tracking-tight leading-snug group-hover:text-violet-300 transition-colors">
                          {scheme.name}
                        </div>
                        {scheme.name_te && (
                          <div className="text-xs text-zinc-400 mt-0.5 font-medium">
                            {scheme.name_te}
                          </div>
                        )}
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1 leading-relaxed">
                          {scheme.description}
                        </p>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(scheme.category)}`}>
                          {scheme.category}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStateBadgeColor(scheme.state)}`}>
                          <Globe className="w-3 h-3" />
                          {scheme.state === 'Central' ? 'Central' : scheme.state.replace(' State', '')}
                        </span>
                        {scheme.district && (
                          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-0.5 mt-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {scheme.district}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-xs font-medium text-zinc-300 line-clamp-2 max-w-[180px]">
                          {scheme.benefit_details || 'N/A'}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-zinc-500 font-mono">
                        {scheme.updated_at
                          ? new Date(scheme.updated_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(scheme)}
                            className="p-1.5 bg-zinc-800/80 hover:bg-violet-600 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
                            aria-label="Edit Scheme"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (scheme.id) onDelete(scheme.id);
                            }}
                            className="p-1.5 bg-zinc-800/80 hover:bg-red-600 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
                            aria-label="Delete Scheme"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
