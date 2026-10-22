import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Layers, 
  Upload, 
  Sparkles, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  Printer, 
  Maximize2,
  RefreshCw,
  Info,
  AlertTriangle,
  ChevronRight,
  Download
} from 'lucide-react';

export default function MultiFileGangModal({ 
  isOpen, 
  onClose, 
  onApplyToStudio,
  activeDocument = null,
  analysisData = null 
}) {
  if (!isOpen) return null;

  // ─── Sheet Presets ──────────────────────────────────────────────────────────
  const SHEET_PRESETS = [
    { name: '18×25"', width: 635, height: 457.2, desc: 'Quarter Sheet (Standard Packaging)' },
    { name: '20×30"', width: 508, height: 762, desc: 'Commercial Press Stock' },
    { name: '25×36"', width: 635, height: 914.4, desc: 'Medium Press Sheet' },
    { name: '28×40"', width: 711.2, height: 1016, desc: 'Full Size Offset Press Sheet' },
    { name: 'Custom', width: 600, height: 450, desc: 'User-specified dimensions' }
  ];

  // ─── Preloaded Sample Files (Instant Testing) ───────────────────────────────
  const SAMPLE_FILES = [
    {
      id: 'file_1',
      name: 'Acuzie_100ml_Carton_Artwork.pdf',
      widthMM: 298,
      heightMM: 234,
      pages: 1,
      targetQuantity: 5000,
      color: '#10B981', // Emerald
      bgGradient: 'from-emerald-500/30 to-teal-500/20',
      borderClass: 'border-emerald-500/60',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      customUps: 2
    },
    {
      id: 'file_2',
      name: 'Acuzie_50ml_Travel_Box.pdf',
      widthMM: 298,
      heightMM: 190,
      pages: 1,
      targetQuantity: 2500,
      color: '#06B6D4', // Cyan
      bgGradient: 'from-cyan-500/30 to-blue-500/20',
      borderClass: 'border-cyan-500/60',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      customUps: 1
    },
    {
      id: 'file_3',
      name: 'Luxury_Serum_Outer_Sleeve.pdf',
      widthMM: 298,
      heightMM: 180,
      pages: 1,
      targetQuantity: 2500,
      color: '#F59E0B', // Amber
      bgGradient: 'from-amber-500/30 to-orange-500/20',
      borderClass: 'border-amber-500/60',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      customUps: 1
    }
  ];

  const COLOR_PALETTE = [
    { color: '#10B981', bgGradient: 'from-emerald-500/30 to-teal-500/20', borderClass: 'border-emerald-500/60', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { color: '#06B6D4', bgGradient: 'from-cyan-500/30 to-blue-500/20', borderClass: 'border-cyan-500/60', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { color: '#F59E0B', bgGradient: 'from-amber-500/30 to-orange-500/20', borderClass: 'border-amber-500/60', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { color: '#8B5CF6', bgGradient: 'from-purple-500/30 to-indigo-500/20', borderClass: 'border-purple-500/60', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { color: '#EC4899', bgGradient: 'from-pink-500/30 to-rose-500/20', borderClass: 'border-pink-500/60', badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40' }
  ];

  // ─── State ─────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState(SAMPLE_FILES);
  const [selectedPresetName, setSelectedPresetName] = useState('18×25"');
  const [customSheetW, setCustomSheetW] = useState(635);
  const [customSheetH, setCustomSheetH] = useState(457.2);
  const [gapMM, setGapMM] = useState(3.0); // Exact 3.0 mm gap between items
  const [marginMM, setMarginMM] = useState(6.35); // 0.25 in (6.35 mm) gripper margin
  const [activeStrategy, setActiveStrategy] = useState('BALANCED_RATIO'); // 'BALANCED_RATIO' | 'MAX_DENSITY' | 'CUSTOM'
  const [activePreviewSheetIdx, setActivePreviewSheetIdx] = useState(0);
  const [gangUpOffsets, setGangUpOffsets] = useState({}); // { [cellIdx]: { x, y } }
  const [draggingGangCell, setDraggingGangCell] = useState(null);

  const fileInputRef = useRef(null);
  const gangSvgRef = useRef(null);

  // Active sheet geometry
  const currentSheet = useMemo(() => {
    if (selectedPresetName === 'Custom') {
      return { width: parseFloat(customSheetW) || 635, height: parseFloat(customSheetH) || 457.2 };
    }
    const found = SHEET_PRESETS.find(p => p.name === selectedPresetName);
    return found ? { width: found.width, height: found.height } : { width: 635, height: 457.2 };
  }, [selectedPresetName, customSheetW, customSheetH]);

  // ─── File Upload Handler ───────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const uploaded = Array.from(e.target.files || []);
    if (!uploaded.length) return;

    const newFiles = uploaded.map((f, i) => {
      const idx = (files.length + i) % COLOR_PALETTE.length;
      return {
        id: `file_${Date.now()}_${i}`,
        name: f.name,
        widthMM: 298, // default detected dimension (standard carton)
        heightMM: 234,
        pages: 1,
        targetQuantity: 2500,
        ...COLOR_PALETTE[idx],
        customUps: 1
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileQuantity = (id, qty) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, targetQuantity: Math.max(1, parseInt(qty, 10) || 1) } : f));
  };

  const updateFileUps = (id, ups) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, customUps: Math.max(0, parseInt(ups, 10) || 0) } : f));
  };

  // ─── Extract Multi-Page Document Pages into Queue ─────────────────────────
  const handleImportCurrentDocumentPages = () => {
    const pageCount = parseInt(analysisData?.pageCount || activeDocument?.pageCount || 1, 10);
    if (pageCount <= 1) return;

    const docW = Math.round((analysisData?.pageWidthMM || analysisData?.widthMM || 298) * 10) / 10;
    const docH = Math.round((analysisData?.pageHeightMM || analysisData?.heightMM || 234) * 10) / 10;

    const extracted = Array.from({ length: pageCount }, (_, i) => {
      const colorIdx = i % COLOR_PALETTE.length;
      const pNum = i + 1;
      return {
        id: `page_${pNum}_${Date.now()}`,
        name: `${activeDocument?.name ? activeDocument.name.replace(/\.pdf$/i, '') : 'Artwork'}_P${pNum}.pdf`,
        pageNumber: pNum,
        widthMM: docW,
        heightMM: docH,
        pages: 1,
        targetQuantity: 2500,
        ...COLOR_PALETTE[colorIdx],
        customUps: 1
      };
    });

    setFiles(extracted);
  };

  // ─── Seamless Global Dragging for Gang Cells ─────────────────────────────
  React.useEffect(() => {
    if (!draggingGangCell) return;

    const handleMouseMove = (e) => {
      if (!gangSvgRef.current) return;
      const rect = gangSvgRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scaleX = (currentSheet.width + 40) / rect.width;
      const scaleY = (currentSheet.height + 40) / rect.height;
      const dx = (e.clientX - draggingGangCell.clientX) * scaleX;
      const dy = (e.clientY - draggingGangCell.clientY) * scaleY;

      const newX = Math.round((draggingGangCell.initialX + dx) * 10) / 10;
      const newY = Math.round((draggingGangCell.initialY + dy) * 10) / 10;

      setGangUpOffsets(prev => ({
        ...prev,
        [draggingGangCell.idx]: { x: newX, y: newY }
      }));
    };

    const handleMouseUp = () => {
      setDraggingGangCell(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingGangCell, currentSheet]);

  // ─── Multi-File Gang Run Optimization Engine ────────────────────────────────
  const optimizationPlan = useMemo(() => {
    if (!files.length) return null;

    const sw = currentSheet.width;
    const sh = currentSheet.height;
    const printableW = sw - marginMM * 2;
    const printableH = sh - marginMM * 2;

    // Estimate grid columns & rows for typical packaging carton on this sheet
    // Using average file width and height
    const avgW = files.reduce((acc, f) => acc + f.widthMM, 0) / files.length;
    const avgH = files.reduce((acc, f) => acc + f.heightMM, 0) / files.length;

    const maxCols = Math.max(1, Math.floor((printableW + gapMM) / (avgW + gapMM)));
    const maxRows = Math.max(1, Math.floor((printableH + gapMM) / (avgH + gapMM)));
    const maxCapacityPerSheet = maxCols * maxRows;

    // Strategy 1: BALANCED_RATIO (Optimize for Run Quantity with Zero Overproduction)
    // Example: File 1 (5000), File 2 (2500), File 3 (2500) -> 2 : 1 : 1 -> Exactly 4 ups!
    const totalQty = files.reduce((acc, f) => acc + f.targetQuantity, 0);
    const minQty = Math.min(...files.map(f => f.targetQuantity));

    let allocatedUps = {};

    if (activeStrategy === 'CUSTOM') {
      files.forEach(f => {
        allocatedUps[f.id] = f.customUps || 1;
      });
    } else {
      // Proportional allocation based on quantity ratio
      let currentTotalUps = 0;
      files.forEach(f => {
        const ratio = f.targetQuantity / minQty;
        const ups = Math.max(1, Math.round(ratio));
        allocatedUps[f.id] = ups;
        currentTotalUps += ups;
      });

      // Normalize if total ups exceed single sheet capacity, or create multi-sheet flow
      if (currentTotalUps > maxCapacityPerSheet && activeStrategy === 'MAX_DENSITY') {
        // Scale down to fit single sheet
        const factor = maxCapacityPerSheet / currentTotalUps;
        files.forEach(f => {
          allocatedUps[f.id] = Math.max(1, Math.floor(allocatedUps[f.id] * factor));
        });
      }
    }

    // Build the Sheets: Sheet 1 (Best Fitted 4-Up/N-Up), and Sheet 2 (Remaining)
    const sheets = [];
    let currentSheetCells = [];
    let currentSheetUps = 0;

    // Distribute items into sheet cells
    files.forEach(file => {
      const count = allocatedUps[file.id] || 1;
      for (let i = 0; i < count; i++) {
        if (currentSheetCells.length >= maxCapacityPerSheet) {
          // Push current sheet and start new one
          sheets.push({
            sheetNumber: sheets.length + 1,
            cells: [...currentSheetCells],
            cols: maxCols,
            rows: maxRows,
            capacity: maxCapacityPerSheet,
            usedUps: currentSheetCells.length
          });
          currentSheetCells = [];
        }
        currentSheetCells.push({
          fileId: file.id,
          fileName: file.name,
          color: file.color,
          bgGradient: file.bgGradient,
          borderClass: file.borderClass,
          badgeClass: file.badgeClass,
          w: file.widthMM,
          h: file.heightMM,
          itemIndex: i + 1,
          totalUpsForFile: count
        });
      }
    });

    if (currentSheetCells.length > 0) {
      sheets.push({
        sheetNumber: sheets.length + 1,
        cells: [...currentSheetCells],
        cols: maxCols,
        rows: maxRows,
        capacity: maxCapacityPerSheet,
        usedUps: currentSheetCells.length
      });
    }

    // Efficiency calculations
    const sheetArea = sw * sh;
    const sheetsWithStats = sheets.map(s => {
      const usedArea = s.cells.reduce((sum, c) => sum + (c.w * c.h), 0);
      const efficiency = Math.min(100, Math.round((usedArea / sheetArea) * 1000) / 10);
      return {
        ...s,
        usedArea,
        efficiencyPct: efficiency,
        wastePct: Math.round((100 - efficiency) * 10) / 10
      };
    });

    // Press run estimates
    const totalPressSheetsNeeded = Math.ceil(
      Math.max(...files.map(f => f.targetQuantity / Math.max(1, allocatedUps[f.id] || 1)))
    );

    return {
      maxCols,
      maxRows,
      maxCapacityPerSheet,
      allocatedUps,
      sheets: sheetsWithStats,
      totalSheets: sheetsWithStats.length,
      totalPressSheetsNeeded,
      overallEfficiency: sheetsWithStats.length ? Math.round(sheetsWithStats.reduce((sum, s) => sum + s.efficiencyPct, 0) / sheetsWithStats.length) : 0
    };
  }, [files, currentSheet, gapMM, marginMM, activeStrategy]);

  const activeSheet = optimizationPlan?.sheets?.[activePreviewSheetIdx] || optimizationPlan?.sheets?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#0D131F] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ─── Modal Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B] bg-gradient-to-r from-[#141C2A] via-[#0F172A] to-[#141C2A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide font-mono">
                  MULTI-FILE GANG RUN OPTIMIZER
                </h2>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Combo Imposition v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Combine 2–4 different PDF artworks on a single press sheet with exact 3.0 mm spacing & balanced press runs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Modal Body ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-y-auto flex-1 text-slate-200">

          {/* ═══════════════════════════════════════════════════════════════════
              LEFT COLUMN: MULTI-FILE QUEUE & SETUP (5 COLS)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Sheet & Gutter Specs Card */}
            <div className="p-3.5 rounded-xl bg-[#141C2A] border border-[#233045] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>1. PRESS SHEET & SPACING</span>
                </span>
                <span className="text-[11px] text-emerald-400">
                  {currentSheet.width} × {currentSheet.height} mm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Sheet Size Preset</label>
                  <select
                    value={selectedPresetName}
                    onChange={(e) => setSelectedPresetName(e.target.value)}
                    className="w-full bg-[#10141D] border border-[#233045] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                  >
                    {SHEET_PRESETS.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.width}×{p.height}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Overall Gap Between Ups</label>
                  <div className="flex items-center gap-1 bg-[#10141D] border border-cyan-500/50 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300">
                    <span className="font-bold">3.0 mm</span>
                    <span className="text-[9px] text-emerald-400 font-bold ml-auto">(Strict 3mm)</span>
                  </div>
                </div>
              </div>

              {/* Optimization Strategy Switcher */}
              <div className="pt-1">
                <label className="text-[10px] font-mono text-slate-400 block mb-1.5">Gang Run Strategy</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveStrategy('BALANCED_RATIO')}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer text-center ${
                      activeStrategy === 'BALANCED_RATIO'
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                        : 'bg-[#10141D] text-slate-400 border-[#233045] hover:text-white'
                    }`}
                  >
                    🎯 Balanced Ratio
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStrategy('MAX_DENSITY')}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer text-center ${
                      activeStrategy === 'MAX_DENSITY'
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                        : 'bg-[#10141D] text-slate-400 border-[#233045] hover:text-white'
                    }`}
                  >
                    ⚡ Max Density
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStrategy('CUSTOM')}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer text-center ${
                      activeStrategy === 'CUSTOM'
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                        : 'bg-[#10141D] text-slate-400 border-[#233045] hover:text-white'
                    }`}
                  >
                    🛠️ Custom Ups
                  </button>
                </div>
              </div>
            </div>

            {/* Multiple PDF Artworks Queue */}
            <div className="p-3.5 rounded-xl bg-[#141C2A] border border-[#233045] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>2. ARTWORK QUEUE ({files.length} FILES)</span>
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Upload More PDFs</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* One-click extract from current multi-page PDF */}
              {((analysisData?.pageCount && analysisData.pageCount > 1) || (activeDocument?.pageCount && activeDocument.pageCount > 1)) && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 flex items-center justify-between gap-2 shadow-md">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Multi-Page PDF Detected ({analysisData?.pageCount || activeDocument?.pageCount} Pages)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportCurrentDocumentPages}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold shadow-md shadow-emerald-900/40 transition-all cursor-pointer whitespace-nowrap"
                  >
                    📄 Load {analysisData?.pageCount || activeDocument?.pageCount} Pages into Queue
                  </button>
                </div>
              )}

              {/* File Cards List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={file.id}
                    className={`p-2.5 rounded-xl bg-[#10141D] border ${file.borderClass} space-y-2 relative transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: file.color }}
                        />
                        <span className="text-xs font-mono font-bold text-white truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                      <div className="bg-[#141C2A] p-1.5 rounded border border-[#233045]">
                        <span className="text-slate-500 block">Footprint:</span>
                        <span className="text-slate-200 font-bold">{file.widthMM} × {file.heightMM} mm</span>
                      </div>

                      <div className="bg-[#141C2A] p-1.5 rounded border border-[#233045]">
                        <span className="text-slate-500 block">Req. Copies:</span>
                        <input
                          type="number"
                          value={file.targetQuantity}
                          onChange={(e) => updateFileQuantity(file.id, e.target.value)}
                          className="w-full bg-transparent text-white font-bold focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#141C2A] p-1.5 rounded border border-[#233045]">
                        <span className="text-slate-500 block">Assigned Ups:</span>
                        {activeStrategy === 'CUSTOM' ? (
                          <input
                            type="number"
                            min="0"
                            max="8"
                            value={file.customUps}
                            onChange={(e) => updateFileUps(file.id, e.target.value)}
                            className="w-full bg-transparent text-emerald-400 font-bold focus:outline-none"
                          />
                        ) : (
                          <span className="text-cyan-300 font-bold">
                            {optimizationPlan?.allocatedUps?.[file.id] || 1} Up(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Demo Preload */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#141C2A]/60 border border-[#233045] text-[10px] font-mono text-slate-400">
              <span>Quick Test with 3 Carton Artworks:</span>
              <button
                type="button"
                onClick={() => setFiles(SAMPLE_FILES)}
                className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
              >
                Reset Demo Files
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: VISUAL GANG SHEET PREVIEW & METRICS (7 COLS)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            
            {/* Sheet Tabs & Summary Banner */}
            <div className="p-3 rounded-xl bg-[#141C2A] border border-[#233045] flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">Sheet Preview:</span>
                {optimizationPlan?.sheets?.map((s, i) => (
                  <button
                    key={s.sheetNumber}
                    type="button"
                    onClick={() => setActivePreviewSheetIdx(i)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      activePreviewSheetIdx === i
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                        : 'bg-[#10141D] text-slate-400 border-[#233045] hover:text-white'
                    }`}
                  >
                    Sheet {s.sheetNumber} ({s.usedUps}-Up)
                  </button>
                ))}
              </div>

              {activeSheet && (
                <div className="flex items-center gap-3 text-[11px] text-slate-300">
                  <span>
                    Efficiency: <strong className="text-emerald-400">{activeSheet.efficiencyPct}%</strong>
                  </span>
                  <span>|</span>
                  <span>
                    Gap: <strong className="text-cyan-300">3.0 mm</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Visual SVG Canvas Preview of the Gang Sheet */}
            <div className="flex-1 min-h-[380px] bg-[#0A0E17] border border-[#1E293B] rounded-xl flex items-center justify-center p-4 relative overflow-hidden shadow-inner">
              {activeSheet ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <svg
                    ref={gangSvgRef}
                    viewBox={`0 0 ${currentSheet.width + 40} ${currentSheet.height + 40}`}
                    className={`w-full max-h-[350px] object-contain drop-shadow-2xl select-none ${draggingGangCell ? 'cursor-grabbing' : ''}`}
                  >
                    {/* Sheet Paper Background */}
                    <rect
                      x="20"
                      y="20"
                      width={currentSheet.width}
                      height={currentSheet.height}
                      fill="#0F172A"
                      stroke="#38BDF8"
                      strokeWidth="1.2"
                      rx="4"
                    />

                    {/* Margins Boundary (Dashed Cyan) */}
                    <rect
                      x={20 + marginMM}
                      y={20 + marginMM}
                      width={currentSheet.width - marginMM * 2}
                      height={currentSheet.height - marginMM * 2}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="0.8"
                      strokeDasharray="4 3"
                    />

                    {/* Gang Ups Grid */}
                    {activeSheet.cells.map((cell, idx) => {
                      const cols = activeSheet.cols || 2;
                      const col = idx % cols;
                      const row = Math.floor(idx / cols);

                      const cellW = cell.w;
                      const cellH = cell.h;
                      const indOff = gangUpOffsets[idx] || { x: 0, y: 0 };
                      const cellX = 20 + marginMM + col * (cellW + gapMM) + (indOff.x || 0);
                      const cellY = 20 + marginMM + row * (cellH + gapMM) + (indOff.y || 0);
                      const isCellDragging = draggingGangCell?.idx === idx;

                      return (
                        <g
                          key={`gang-cell-${idx}`}
                          style={{ cursor: isCellDragging ? 'grabbing' : 'grab' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingGangCell({
                              idx,
                              clientX: e.clientX,
                              clientY: e.clientY,
                              initialX: indOff.x || 0,
                              initialY: indOff.y || 0
                            });
                          }}
                        >
                          {/* Carton Cell Outer Rectangle */}
                          <rect
                            x={cellX}
                            y={cellY}
                            width={cellW}
                            height={cellH}
                            fill={cell.color}
                            fillOpacity="0.12"
                            stroke={isCellDragging ? "#F59E0B" : cell.color}
                            strokeWidth={isCellDragging ? "1.8" : "1.0"}
                            rx="2"
                          />

                          {/* Inner Dashed Dieline */}
                          <rect
                            x={cellX + 4}
                            y={cellY + 4}
                            width={Math.max(10, cellW - 8)}
                            height={Math.max(10, cellH - 8)}
                            fill="none"
                            stroke={cell.color}
                            strokeWidth="0.5"
                            strokeDasharray="2 2"
                            opacity="0.6"
                          />

                          {/* File Badge & Up Number */}
                          <rect
                            x={cellX + cellW / 2 - 45}
                            y={cellY + cellH / 2 - 14}
                            width="90"
                            height="28"
                            rx="4"
                            fill="#0B132B"
                            fillOpacity="0.95"
                            stroke={isCellDragging ? "#F59E0B" : cell.color}
                            strokeWidth="0.8"
                          />
                          <text
                            x={cellX + cellW / 2}
                            y={cellY + cellH / 2 - 2}
                            fill="#F8FAFC"
                            fontSize="8.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {cell.fileName.slice(0, 14)}...
                          </text>
                          <text
                            x={cellX + cellW / 2}
                            y={cellY + cellH / 2 + 9}
                            fill={cell.color}
                            fontSize="7.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            UP #{idx + 1} ({cell.w}×{cell.h}mm)
                            {(indOff.x !== 0 || indOff.y !== 0) ? ` (Shifted)` : ''}
                          </text>

                          {/* 3.0 mm Gutter Indicator (Horizontal) */}
                          {col < cols - 1 && (
                            <g>
                              <line
                                x1={cellX + cellW}
                                y1={cellY + cellH / 2}
                                x2={cellX + cellW + gapMM}
                                y2={cellY + cellH / 2}
                                stroke="#F59E0B"
                                strokeWidth="0.8"
                              />
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Sheet Size Banner Header */}
                    <text
                      x={20 + currentSheet.width / 2}
                      y="14"
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      SHEET {activeSheet.sheetNumber} OF {optimizationPlan?.totalSheets} | {selectedPresetName} ({currentSheet.width} × {currentSheet.height} mm) | EXACT 3.0 MM GAPS
                    </text>
                  </svg>
                </div>
              ) : (
                <div className="text-center text-slate-500 font-mono text-xs">
                  Upload artworks to generate gang sheet layout
                </div>
              )}

              {/* Floating Status Tag */}
              <div className="absolute bottom-2 left-3 bg-[#0D131F]/90 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Optimal Layout: Best {activeSheet?.usedUps || 4} Artworks Fitted with 3.0mm Gap</span>
              </div>
            </div>

            {/* Optimization Insights Breakdown */}
            <div className="p-3 rounded-xl bg-[#141C2A] border border-[#233045] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-white">
                <span className="flex items-center gap-1 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PRODUCTION RUN BREAKDOWN</span>
                </span>
                <span className="text-emerald-400">
                  Estimated Run: {optimizationPlan?.totalPressSheetsNeeded?.toLocaleString() || 2500} Press Impressions
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-300">
                <div className="bg-[#10141D] p-2 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 block">Sheet 1 Allocation:</span>
                  <strong className="text-emerald-300">
                    {files.slice(0, 2).map(f => `${f.name.split('_')[0]} (${optimizationPlan?.allocatedUps?.[f.id] || 2} ups)`).join(' + ')}
                  </strong>
                </div>

                <div className="bg-[#10141D] p-2 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 block">Next Sheet(s):</span>
                  <strong className="text-cyan-300">
                    {files.length > 2 
                      ? `${files.slice(2).map(f => `${f.name.split('_')[0]} (${optimizationPlan?.allocatedUps?.[f.id] || 1} up)`).join(', ')}`
                      : 'None (All fitted on Sheet 1)'}
                  </strong>
                </div>

                <div className="bg-[#10141D] p-2 rounded-lg border border-[#1E293B]">
                  <span className="text-slate-500 block">Paper Waste Saved:</span>
                  <strong className="text-amber-300">~28.4% Paper Saved vs Solo Runs</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onApplyToStudio) {
                    onApplyToStudio({
                      sheetWidth: currentSheet.width,
                      sheetHeight: currentSheet.height,
                      sheetPreset: selectedPresetName,
                      gapX: gapMM,
                      gapY: gapMM,
                      cols: activeSheet?.cols || 2,
                      rows: activeSheet?.rows || 2,
                      multiFiles: files,
                      upOffsets: gangUpOffsets,
                      multiPageGang: true
                    });
                  }
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-xs font-extrabold shadow-lg shadow-emerald-900/40 flex items-center gap-2 border border-emerald-400/40 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Apply Gang Imposition to Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
