import React, { useState } from 'react';
import {
  Sparkles,
  X,
  BookOpen,
  Folder,
  Package,
  Tag,
  Square,
  Save,
  Trash2,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  DIELINE_CATEGORIES,
  ALL_DIELINE_PRESETS,
  generateBookCover,
  generatePocketFolder,
  generateTriFoldBrochure,
  generateHangtag,
  generateRTEBox
} from '../utils/dielineTemplates';

export default function NewDesignModal({
  isOpen,
  onClose,
  currentElements = [],
  sheetWidth = 635,
  sheetHeight = 457.2,
  onSaveCurrentDesign,
  onApplyNewDesign,
  onOpenSavedLibrary
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [saveCurrentFirst, setSaveCurrentFirst] = useState(true);
  const [designName, setDesignName] = useState(() => {
    return `Design Project #${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  if (!isOpen) return null;

  const filteredPresets = selectedCategory === 'ALL'
    ? ALL_DIELINE_PRESETS
    : ALL_DIELINE_PRESETS.filter((p) => p.category === selectedCategory);

  // Helper to handle saving and clearing/loading
  const handleProceed = (preset = null) => {
    if (saveCurrentFirst && currentElements.length > 0) {
      onSaveCurrentDesign(designName, currentElements);
    }

    if (!preset) {
      // Start completely blank canvas to draw anything
      onApplyNewDesign([], 'Blank Sheet (Draw Anything)');
    } else {
      const generated = preset.generator(sheetWidth, sheetHeight);
      onApplyNewDesign(generated.elements, preset.name);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#0D121F] border border-cyan-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/60 overflow-hidden font-sans text-slate-200">
        {/* ─── Top Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono m-0">
                  New Prepress Design / Save & Clear
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold">
                  Multi-Category Studio
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono m-0">
                Save your current work, clear the canvas, and draw books, folders, boxes, tags, or any custom vector design.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Save Current Design First Section ────────────────────────────── */}
        {currentElements.length > 0 && (
          <div className="p-4 bg-[#121827] border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCurrentFirst}
                  onChange={(e) => setSaveCurrentFirst(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                />
                <span>Save current design to Library before clearing ({currentElements.length} elements)</span>
              </label>

              {onOpenSavedLibrary && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSavedLibrary();
                  }}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  View Saved Library
                </button>
              )}
            </div>

            {saveCurrentFirst && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-mono text-slate-400">Design Title:</span>
                <input
                  type="text"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="flex-1 bg-[#10141D] border border-[#243048] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="Enter a name for this drawing..."
                />
              </div>
            )}
          </div>
        )}

        {/* ─── Main Selector: Blank Canvas or Template Categories ───────────── */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Action 1: Start Fresh Blank Canvas (Draw Anything) */}
          <div
            onClick={() => handleProceed(null)}
            className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 cursor-pointer transition-all shadow-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Square className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono m-0">
                    Blank Sheet (Draw Anything from Scratch)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-semibold">
                    Freeform Mode
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono m-0 pt-0.5">
                  Clean canvas to freely draw, drag, curve, color, and annotate any custom vector, book, or prepress layout.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start Blank</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div>
            <div className="text-xs font-mono font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Or Start from a Standard Prepress Category:
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {DIELINE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-sm'
                        : 'bg-[#151D2D] text-slate-400 hover:text-white border-[#243048]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleProceed(preset)}
                className="p-3.5 rounded-2xl bg-[#141C2A] hover:bg-slate-800/80 border border-[#233045] hover:border-cyan-500/50 transition-all cursor-pointer flex items-start gap-3 group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400 group-hover:text-cyan-300">
                  {preset.category === 'BOOKS' && <BookOpen className="w-4 h-4" />}
                  {preset.category === 'FOLDERS' && <Folder className="w-4 h-4" />}
                  {preset.category === 'PACKAGING' && <Package className="w-4 h-4 text-fuchsia-400" />}
                  {preset.category === 'TAGS' && <Tag className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors m-0 truncate">
                    {preset.name}
                  </h5>
                  <p className="text-[11px] text-slate-400 font-mono m-0 pt-0.5 line-clamp-2">
                    {preset.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Bottom Actions Bar ──────────────────────────────────────────── */}
        <div className="p-4 border-t border-white/10 bg-[#0C101A] flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            {currentElements.length > 0 && saveCurrentFirst ? (
              <span className="text-cyan-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Current design will be archived safely to your Library.</span>
              </span>
            ) : (
              <span>Select an option above to proceed.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleProceed(null)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-md shadow-cyan-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{saveCurrentFirst && currentElements.length > 0 ? 'Save & Clear Canvas' : 'Clear Canvas'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
