import React, { useState } from 'react';
import {
  FolderOpen,
  X,
  Trash2,
  Download,
  Upload,
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  FileText,
  Search,
  BookOpen,
  Package,
  Folder,
  Tag,
  PenTool,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SavedDesignsModal({
  isOpen,
  onClose,
  savedDesigns = [],
  onLoadDesign,
  onDeleteDesign,
  onOpenNewDesignModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  if (!isOpen) return null;

  // Filter saved designs
  const filteredDesigns = savedDesigns.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedFilter === 'ALL' || item.category === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'BOOKS':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'FOLDERS':
        return <Folder className="w-4 h-4 text-blue-400" />;
      case 'PACKAGING':
        return <Package className="w-4 h-4 text-fuchsia-400" />;
      case 'TAGS':
        return <Tag className="w-4 h-4 text-amber-400" />;
      default:
        return <PenTool className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'BOOKS':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'FOLDERS':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'PACKAGING':
        return 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-700/60';
      case 'TAGS':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      default:
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
    }
  };

  // Export standalone SVG for a saved project
  const handleExportSavedSVG = (design) => {
    const w = design.sheetWidth || 635;
    const h = design.sheetHeight || 457.2;
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <title>${design.title}</title>
  <defs>
    <pattern id="cadHatchDiagonal" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#8B5CF6" stroke-width="1.2" opacity="0.75" />
    </pattern>
  </defs>
  <g id="KEYLINE_LAYER">
`;

    (design.elements || []).forEach((el) => {
      const mode = el.fillMode || 'none';
      let fillAttr = 'fill="none"';
      if (mode === 'solid') fillAttr = `fill="${el.fillColor || '#FCE7F3'}" fill-opacity="1"`;
      else if (mode === 'tint') fillAttr = `fill="${el.fillColor || '#FCE7F3'}" fill-opacity="${el.fillOpacity ?? 0.25}"`;
      else if (mode === 'hatch_diagonal') fillAttr = 'fill="url(#cadHatchDiagonal)" fill-opacity="1"';

      const strokeDashAttr = el.strokeDash ? `stroke-dasharray="${el.strokeDash}"` : '';

      if (el.type === 'rect') {
        svgContent += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'roundrect') {
        svgContent += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.rx || 6}" ry="${el.rx || 6}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'line') {
        svgContent += `    <line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} />\n`;
      } else if (el.type === 'curve') {
        svgContent += `    <path d="M ${el.x1} ${el.y1} Q ${el.cx} ${el.cy} ${el.x2} ${el.y2}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} stroke-linecap="round" />\n`;
      } else if (el.type === 'circle') {
        svgContent += `    <circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      }
    });

    svgContent += `  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${design.title.replace(/[^a-z0-9_-]/gi, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#0D121F] border border-cyan-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-950/60 overflow-hidden font-sans text-slate-200">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono m-0">
                  Saved Keyline Designs Library
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold">
                  {savedDesigns.length} Projects Saved
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono m-0">
                Browse, restore, or export previously saved boxes, books, folders, and custom drawings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewDesignModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ New Design</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Search & Filters Bar ────────────────────────────────────────── */}
        <div className="p-3 bg-[#121827] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved designs by name or category..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#090D16] border border-white/10 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {['ALL', 'PACKAGING', 'BOOKS', 'FOLDERS', 'TAGS', 'CUSTOM'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  selectedFilter === cat
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Projects Grid / List ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredDesigns.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-300 font-mono m-0">No Saved Designs Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
                {savedDesigns.length === 0
                  ? 'Whenever you click "✨ New / Save & Clear", your current drawing is automatically archived here so you never lose any work!'
                  : 'No designs match your search filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewDesignModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-950/40 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start a New Drawing</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDesigns.map((design) => {
                const formattedDate = design.createdAt
                  ? new Date(design.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Recent';

                return (
                  <div
                    key={design.id}
                    className="p-3.5 rounded-2xl bg-[#141C2A] border border-[#222C3E] hover:border-cyan-500/50 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${getCategoryBadgeClass(
                            design.category
                          )}`}
                        >
                          {getCategoryIcon(design.category)}
                          <span>{design.category || 'CUSTOM'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>

                      {/* Title & Dimension */}
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors font-mono line-clamp-1 m-0">
                        {design.title}
                      </h4>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                        <span>
                          {design.sheetWidth || 635} × {design.sheetHeight || 457.2} mm
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-400 font-semibold">
                          {design.elementCount || (design.elements || []).length} vectors
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExportSavedSVG(design)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Download standalone SVG vector"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${design.title}"?`)) {
                              onDeleteDesign(design.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 transition-all cursor-pointer"
                          title="Delete from saved designs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onLoadDesign(design)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
                      >
                        <span>Restore to Canvas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Footer ──────────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-white/10 bg-[#090D16] flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Stored locally in browser persistence storage</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
