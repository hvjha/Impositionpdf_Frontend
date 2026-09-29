import React, { useState, useMemo, useEffect } from 'react';
import { 
  Grid, 
  Layers, 
  Printer, 
  ArrowRight,
  AlertCircle,
  Maximize2,
  FileCheck,
  Scissors,
  BookOpen,
  Copy,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Hash,
  Info,
  Calculator,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { imposePdfJob, getSourcePdfUrl, getOutputPdfUrl } from '../services/api';
import usePdfThumbnails from '../hooks/usePdfThumbnails';
import SheetPreview from './SheetPreview';

/* ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURATION CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════ */

// Standard page layout presets — maps pages-per-sheet to grid dimensions
const LAYOUT_PRESETS = [
  { pages: 2,  label: '2PP',  desc: '2-Page Layout',  cols: 2, rows: 1, icon: '▯▯' },
  { pages: 4,  label: '4PP',  desc: '4-Page Layout',  cols: 2, rows: 2, icon: '▦' },
  { pages: 8,  label: '8PP',  desc: '8-Page Layout',  cols: 4, rows: 2, icon: '⊞⊞' },
  { pages: 16, label: '16PP', desc: '16-Page Layout', cols: 4, rows: 4, icon: '⊞⊞⊞⊞' },
  { pages: 32, label: '32PP', desc: '32-Page Layout', cols: 8, rows: 4, icon: '⊞⊞⊞⊞⊞' },
];

const SHEET_PRESETS = [
  { name: 'SRA3',           label: 'SRA3 (320 × 450 mm)',       width: 320, height: 450 },
  { name: 'A3+',            label: 'A3+ (329 × 483 mm)',        width: 329, height: 483 },
  { name: 'A3',             label: 'A3 (297 × 420 mm)',         width: 297, height: 420 },
  { name: 'A4',             label: 'A4 (210 × 297 mm)',         width: 210, height: 297 },
  { name: 'B2',             label: 'B2 (500 × 707 mm)',         width: 500, height: 707 },
  { name: '20×26"',         label: '20 × 26 in (508 × 660 mm)', width: 508, height: 660 },
  { name: '23×36"',         label: '23 × 36 in (584 × 914 mm)', width: 584, height: 914 },
  { name: '25×38"',         label: '25 × 38 in (635 × 965 mm)', width: 635, height: 965 },
];

const IMPOSITION_MODES = [
  { value: 'N_UP',           label: 'N-Up',           icon: LayoutGrid, desc: 'Sequential pages in grid order — most common for repeat/gang printing' },
  { value: 'SADDLE_STITCH',  label: 'Saddle Stitch',  icon: BookOpen,   desc: 'Booklet mode with center-staple binding — pages auto-ordered for folding' },
  { value: 'PERFECT_BINDING',label: 'Perfect Binding', icon: Layers,    desc: 'Signature-based layout for glue-bound spine binding' },
  { value: 'CUT_AND_STACK',  label: 'Cut & Stack',    icon: Scissors,   desc: 'Pages ordered so when cut apart and stacked, they are in sequence' },
  { value: 'STEP_AND_REPEAT',label: 'Step & Repeat',  icon: Copy,       desc: 'Same page repeated in every position — business cards, labels, etc.' },
];

const WORK_STYLES = [
  { value: 'SIMPLEX',          label: 'Simplex (Single-Sided)',  desc: 'Print on front side only' },
  { value: 'SHEETWISE',        label: 'Sheetwise (Front & Back)', desc: 'Different plates for front and back' },
  { value: 'WORK_AND_TURN',    label: 'Work and Turn',           desc: 'Same gripper edge, flip horizontally' },
  { value: 'WORK_AND_TUMBLE',  label: 'Work and Tumble',         desc: 'Same gripper edge, flip vertically' },
  { value: 'PERFECTOR',        label: 'Perfector',               desc: 'Simultaneous front & back printing' },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * HELPER: Compute all sheets breakdown
 * ═══════════════════════════════════════════════════════════════════════════ */
function computeSheetsBreakdown(totalPages, perSide, isDuplex) {
  const pagesPerSheet = isDuplex ? perSide * 2 : perSide;
  const totalSheets = Math.max(1, Math.ceil(totalPages / pagesPerSheet));
  const sheets = [];

  for (let s = 0; s < totalSheets; s++) {
    const frontStart = s * pagesPerSheet + 1;
    const frontEnd = Math.min(frontStart + perSide - 1, totalPages);
    let backStart = null, backEnd = null;
    if (isDuplex) {
      backStart = frontStart + perSide;
      backEnd = Math.min(backStart + perSide - 1, totalPages);
      if (backStart > totalPages) { backStart = null; backEnd = null; }
    }
    const usedFront = Math.max(0, frontEnd - frontStart + 1);
    const usedBack = backStart ? Math.max(0, backEnd - backStart + 1) : 0;
    const blankFront = perSide - usedFront;
    const blankBack = isDuplex ? perSide - usedBack : 0;

    sheets.push({
      index: s,
      frontPages: `${frontStart}–${frontEnd}`,
      backPages: backStart ? `${backStart}–${backEnd}` : '—',
      blankCount: blankFront + blankBack,
      usedCount: usedFront + usedBack,
    });
  }

  return { totalSheets, pagesPerSheet, sheets };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function ImpositionSection({ jobId, analysisData, uploadedFile, activeJob, onImpositionSuccess, onProceedToOutput }) {
  
  const activeOutputFileId = activeJob?.outputFileId;
  const pdfSource = useMemo(() => {
    if (uploadedFile) return uploadedFile;
    if (activeOutputFileId) return getOutputPdfUrl(activeOutputFileId);
    if (jobId) return getSourcePdfUrl(jobId);
    return null;
  }, [uploadedFile, activeOutputFileId, jobId]);

  const {
    thumbnails,
    loading: thumbnailsLoading,
    progress: thumbnailsProgress
  } = usePdfThumbnails(pdfSource, Math.min(64, parseInt(analysisData?.pageCount || 16, 10)));

  // ─── Layout Preset ──────────────────────────────────────────────────────
  const [selectedLayout, setSelectedLayout] = useState(4); // pages per layout (2, 4, 8, 16, 32)
  const activeLayoutPreset = LAYOUT_PRESETS.find(l => l.pages === selectedLayout) || LAYOUT_PRESETS[1];
  const columns = activeLayoutPreset.cols;
  const rows = activeLayoutPreset.rows;

  // ─── Sheet Dimensions ──────────────────────────────────────────────────
  const [sheetPreset, setSheetPreset] = useState('SRA3');
  const [sheetWidth, setSheetWidth] = useState(320);
  const [sheetHeight, setSheetHeight] = useState(450);
  const [customSheet, setCustomSheet] = useState(false);

  // ─── Margins (4-sided) ─────────────────────────────────────────────────
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);
  const [marginLinked, setMarginLinked] = useState(true);

  // ─── Bleed (4-sided) ──────────────────────────────────────────────────
  const [bleedTop, setBleedTop] = useState(3);
  const [bleedBottom, setBleedBottom] = useState(3);
  const [bleedLeft, setBleedLeft] = useState(3);
  const [bleedRight, setBleedRight] = useState(3);
  const [bleedLinked, setBleedLinked] = useState(true);

  // ─── Gutters ──────────────────────────────────────────────────────────
  const [gutterX, setGutterX] = useState(3);
  const [gutterY, setGutterY] = useState(3);

  // ─── Crop Marks ────────────────────────────────────────────────────────
  const [cropMarks, setCropMarks] = useState(true);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);
  const [registrationMarks, setRegistrationMarks] = useState(true);
  const [colorBars, setColorBars] = useState(true);
  const [jobSlug, setJobSlug] = useState(true);

  // ─── Mode & Work Style ─────────────────────────────────────────────────
  const [workStyle, setWorkStyle] = useState('SHEETWISE');
  const [impositionMode, setImpositionMode] = useState('N_UP');

  // ─── Document & Navigation ─────────────────────────────────────────────
  const [totalPages, setTotalPages] = useState(analysisData?.pageCount || 16);
  const [sheetIndex, setSheetIndex] = useState(0);

  // ─── Execution State ───────────────────────────────────────────────────
  const [imposing, setImposing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Sync with analysisData when it changes
  useEffect(() => {
    if (analysisData?.pageCount) {
      setTotalPages(analysisData.pageCount);
    }
  }, [analysisData?.pageCount]);

  // ─── Derived calculations ──────────────────────────────────────────────
  const perSide = columns * rows;
  const isDuplex = workStyle !== 'SIMPLEX' && workStyle !== 'SINGLE_SIDED';
  const { totalSheets, pagesPerSheet, sheets } = useMemo(
    () => computeSheetsBreakdown(parseInt(totalPages) || 1, perSide, isDuplex),
    [totalPages, perSide, isDuplex]
  );
  const blankPages = useMemo(() => {
    const tp = parseInt(totalPages) || 1;
    const totalSlots = totalSheets * pagesPerSheet;
    return totalSlots - tp;
  }, [totalPages, totalSheets, pagesPerSheet]);

  // ─── Cell size computed from sheet ─────────────────────────────────────
  const cellSizeMM = useMemo(() => {
    const sw = parseFloat(sheetWidth) || 320;
    const sh = parseFloat(sheetHeight) || 450;
    const mt = parseFloat(marginTop) || 0;
    const mb = parseFloat(marginBottom) || 0;
    const ml = parseFloat(marginLeft) || 0;
    const mr = parseFloat(marginRight) || 0;
    const gx = parseFloat(gutterX) || 0;
    const gy = parseFloat(gutterY) || 0;
    const printW = sw - ml - mr;
    const printH = sh - mt - mb;
    const cellW = (printW - gx * (columns - 1)) / columns;
    const cellH = (printH - gy * (rows - 1)) / rows;
    return { cellW: Math.round(cellW * 10) / 10, cellH: Math.round(cellH * 10) / 10 };
  }, [sheetWidth, sheetHeight, marginTop, marginBottom, marginLeft, marginRight, gutterX, gutterY, columns, rows]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleSelectSheetPreset = (preset) => {
    setSheetPreset(preset.name);
    setSheetWidth(preset.width);
    setSheetHeight(preset.height);
    setCustomSheet(false);
  };

  const handleSetMargin = (side, value) => {
    const v = value;
    if (marginLinked) {
      setMarginTop(v); setMarginBottom(v); setMarginLeft(v); setMarginRight(v);
    } else {
      ({ top: setMarginTop, bottom: setMarginBottom, left: setMarginLeft, right: setMarginRight }[side])(v);
    }
  };

  const handleSetBleed = (side, value) => {
    const v = value;
    if (bleedLinked) {
      setBleedTop(v); setBleedBottom(v); setBleedLeft(v); setBleedRight(v);
    } else {
      ({ top: setBleedTop, bottom: setBleedBottom, left: setBleedLeft, right: setBleedRight }[side])(v);
    }
  };

  const navigateSheet = (dir) => {
    setSheetIndex(prev => Math.max(0, Math.min(prev + dir, totalSheets - 1)));
  };

  // ─── Execute Imposition ────────────────────────────────────────────────
  const handleRunImposition = async () => {
    setImposing(true);
    setError(null);

    const config = {
      sheet: { width: parseFloat(sheetWidth), height: parseFloat(sheetHeight), unit: 'mm' },
      layout: { pagesPerLayout: perSide },
      grid: { columns, rows, gutterX: parseFloat(gutterX), gutterY: parseFloat(gutterY) },
      margins: { top: parseFloat(marginTop || 0), bottom: parseFloat(marginBottom || 0), left: parseFloat(marginLeft || 0), right: parseFloat(marginRight || 0) },
      bleed: { top: parseFloat(bleedTop || 0), bottom: parseFloat(bleedBottom || 0), left: parseFloat(bleedLeft || 0), right: parseFloat(bleedRight || 0) },
      cropMarks: { enabled: cropMarks, length: parseFloat(cropMarkLength || 5), offset: parseFloat(cropMarkOffset || 3), unit: 'mm' },
      workStyle,
      marks: { cropMarks, registrationMarks, colorBars, jobSlug },
    };

    try {
      const res = await imposePdfJob(jobId, config);
      if (res.success) {
        setResult(res);
        onImpositionSuccess(res);
      } else {
        throw new Error(res.message || 'Imposition failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to execute imposition.');
    } finally {
      setImposing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-[1500px] mx-auto py-4 px-4">
      
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium mb-1.5">
          <Grid className="w-3.5 h-3.5" /> PHASE 5: IMPOSITION STUDIO
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight m-0">Press Sheet Imposition Engine</h3>
      </div>

      {/* ─── Layout Preset Selector (2PP / 4PP / 8PP / 16PP / 32PP) ───── */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">Page Layout</span>
        </div>
        <div className="flex items-center gap-2">
          {LAYOUT_PRESETS.map((lp) => (
            <button
              key={lp.pages}
              onClick={() => { setSelectedLayout(lp.pages); setSheetIndex(0); }}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all ${
                selectedLayout === lp.pages
                  ? 'bg-gradient-to-b from-cyan-950/80 to-blue-950/60 border-cyan-500/60 shadow-lg shadow-cyan-500/15'
                  : 'bg-[#141C2A] border-[#233045] hover:bg-[#1A2436] hover:border-[#2B3C57]'
              }`}
            >
              <span className={`text-2xl font-bold font-mono leading-none ${
                selectedLayout === lp.pages ? 'text-cyan-300' : 'text-slate-400'
              }`}>
                {lp.label}
              </span>
              <span className={`text-[9px] font-mono ${
                selectedLayout === lp.pages ? 'text-cyan-400' : 'text-slate-500'
              }`}>
                {lp.cols}×{lp.rows} Grid
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Imposition Mode Tabs ─────────────────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {IMPOSITION_MODES.map((m) => {
            const Icon = m.icon;
            const isActive = impositionMode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setImpositionMode(m.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 to-indigo-950/60 border-cyan-500/50 text-cyan-300 font-bold shadow-md shadow-cyan-500/10'
                    : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:bg-[#1A2436] hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] font-mono text-slate-500 mt-1 ml-1">
          {IMPOSITION_MODES.find(m => m.value === impositionMode)?.desc}
        </p>
      </div>

      {/* ─── Smart Summary Bar ─────────────────────────────────────────── */}
      <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#0F1923] to-[#141C2A] border border-[#1E2A3A] flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono text-amber-300 font-bold">AUTO-CALCULATED:</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono">
          <span className="text-slate-300">
            <span className="text-white font-bold">{totalPages}</span> pages ÷ 
            <span className="text-cyan-300 font-bold"> {perSide}</span> per side
            {isDuplex && <span className="text-indigo-300"> ×2 sides</span>}
            <span className="text-slate-400"> = </span>
            <span className="text-emerald-400 font-bold text-sm">{totalSheets} sheet{totalSheets > 1 ? 's' : ''}</span>
          </span>
          {blankPages > 0 && (
            <span className="text-amber-400/80 flex items-center gap-1">
              <Info className="w-3 h-3" /> {blankPages} blank page{blankPages > 1 ? 's' : ''} will be added
            </span>
          )}
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Cell: {cellSizeMM.cellW}×{cellSizeMM.cellH} mm</span>
        </div>
      </div>

      {/* ─── Main 2-Column Layout: Settings + Preview ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5">
        
        {/* ═══════════ LEFT: Settings ═══════════ */}
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          
          {/* ── Sheet Size ── */}
          <details open className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#141C2A] border border-[#233045] hover:border-[#2B3C57] transition-all">
              <Maximize2 className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex-1">Sheet Size</span>
              <span className="text-[10px] font-mono text-slate-400">{sheetWidth}×{sheetHeight} mm</span>
            </summary>
            <div className="mt-1.5 bg-[#141C2A] border border-[#233045] rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {SHEET_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleSelectSheetPreset(p)}
                    className={`p-2 rounded-lg border font-mono text-[10px] transition-all text-left ${
                      sheetPreset === p.name && !customSheet
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                        : 'bg-[#182234] border-[#26354D] text-slate-300 hover:bg-[#1E2B40]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#233045]">
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Width (mm)</label>
                  <input
                    type="number" value={sheetWidth}
                    onChange={(e) => { setSheetWidth(e.target.value); setCustomSheet(true); }}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Height (mm)</label>
                  <input
                    type="number" value={sheetHeight}
                    onChange={(e) => { setSheetHeight(e.target.value); setCustomSheet(true); }}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* ── Margins ── */}
          <details open className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#141C2A] border border-[#233045] hover:border-[#2B3C57] transition-all">
              <span className="w-4 h-4 text-emerald-400 font-bold text-sm text-center leading-4">⊡</span>
              <span className="text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider flex-1">Margins</span>
              <button
                onClick={(e) => { e.preventDefault(); setMarginLinked(!marginLinked); }}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                  marginLinked ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40' : 'border-[#2B3C57] text-slate-500'
                }`}
              >
                {marginLinked ? '🔗 LINKED' : 'INDIVIDUAL'}
              </button>
            </summary>
            <div className="mt-1.5 bg-[#141C2A] border border-[#233045] rounded-xl p-3">
              {marginLinked ? (
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-0.5">All Margins (mm)</label>
                  <input
                    type="number" step="0.5" value={marginTop}
                    onChange={(e) => handleSetMargin('top', e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { side: 'top', val: marginTop, label: 'Top' },
                    { side: 'bottom', val: marginBottom, label: 'Bottom' },
                    { side: 'left', val: marginLeft, label: 'Left' },
                    { side: 'right', val: marginRight, label: 'Right' },
                  ].map(m => (
                    <div key={m.side}>
                      <label className="text-[9px] font-mono text-slate-400 block mb-0.5">{m.label} (mm)</label>
                      <input
                        type="number" step="0.5" value={m.val}
                        onChange={(e) => handleSetMargin(m.side, e.target.value)}
                        className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* ── Bleed ── */}
          <details open className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#141C2A] border border-[#233045] hover:border-[#2B3C57] transition-all">
              <Scissors className="w-4 h-4 text-rose-400" />
              <span className="text-[11px] font-mono font-bold text-rose-300 uppercase tracking-wider flex-1">Bleed</span>
              <button
                onClick={(e) => { e.preventDefault(); setBleedLinked(!bleedLinked); }}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                  bleedLinked ? 'border-rose-500/50 text-rose-400 bg-rose-950/40' : 'border-[#2B3C57] text-slate-500'
                }`}
              >
                {bleedLinked ? '🔗 LINKED' : 'INDIVIDUAL'}
              </button>
            </summary>
            <div className="mt-1.5 bg-[#141C2A] border border-[#233045] rounded-xl p-3">
              {bleedLinked ? (
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-0.5">All Bleed (mm)</label>
                  <input
                    type="number" step="0.5" value={bleedTop}
                    onChange={(e) => handleSetBleed('top', e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-rose-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { side: 'top', val: bleedTop, label: 'Top' },
                    { side: 'bottom', val: bleedBottom, label: 'Bottom' },
                    { side: 'left', val: bleedLeft, label: 'Left' },
                    { side: 'right', val: bleedRight, label: 'Right' },
                  ].map(m => (
                    <div key={m.side}>
                      <label className="text-[9px] font-mono text-slate-400 block mb-0.5">{m.label} (mm)</label>
                      <input
                        type="number" step="0.5" value={m.val}
                        onChange={(e) => handleSetBleed(m.side, e.target.value)}
                        className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-rose-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* ── Gutters ── */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#141C2A] border border-[#233045] hover:border-[#2B3C57] transition-all">
              <Grid className="w-4 h-4 text-violet-400" />
              <span className="text-[11px] font-mono font-bold text-violet-300 uppercase tracking-wider flex-1">Gutters</span>
              <span className="text-[10px] font-mono text-slate-400">{gutterX}×{gutterY} mm</span>
            </summary>
            <div className="mt-1.5 bg-[#141C2A] border border-[#233045] rounded-xl p-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Horizontal (mm)</label>
                <input
                  type="number" step="0.5" value={gutterX}
                  onChange={(e) => setGutterX(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-violet-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Vertical (mm)</label>
                <input
                  type="number" step="0.5" value={gutterY}
                  onChange={(e) => setGutterY(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-violet-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>
          </details>

          {/* ── Crop Marks ── */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#141C2A] border border-[#233045] hover:border-[#2B3C57] transition-all">
              <Printer className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-wider flex-1">Print Marks</span>
              <span className="text-[10px] font-mono text-slate-400">
                {[cropMarks && 'Crop', registrationMarks && 'Reg', colorBars && 'Color'].filter(Boolean).join(', ') || 'None'}
              </span>
            </summary>
            <div className="mt-1.5 bg-[#141C2A] border border-[#233045] rounded-xl p-3 space-y-2">
              <div className="space-y-1">
                {[
                  { label: 'Cut / Crop Marks', state: cropMarks, set: setCropMarks },
                  { label: 'Registration Targets', state: registrationMarks, set: setRegistrationMarks },
                  { label: 'Color Separation Bars', state: colorBars, set: setColorBars },
                  { label: 'Job Metadata / Slug', state: jobSlug, set: setJobSlug },
                ].map((m, idx) => (
                  <label key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#182234] border border-[#26354D] cursor-pointer text-[10px] font-mono">
                    <span className="text-slate-200">{m.label}</span>
                    <input type="checkbox" checked={m.state} onChange={(e) => m.set(e.target.checked)} className="accent-cyan-400 w-3.5 h-3.5" />
                  </label>
                ))}
              </div>
              {cropMarks && (
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#233045]">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Mark Length (mm)</label>
                    <input type="number" step="0.5" value={cropMarkLength} onChange={(e) => setCropMarkLength(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-indigo-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Mark Offset (mm)</label>
                    <input type="number" step="0.5" value={cropMarkOffset} onChange={(e) => setCropMarkOffset(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-indigo-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none" />
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* ── Work Style ── */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#141C2A] border border-[#233045] hover:border-[#2B3C57] transition-all">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex-1">Work Style</span>
              <span className="text-[10px] font-mono text-slate-400">{WORK_STYLES.find(w => w.value === workStyle)?.label}</span>
            </summary>
            <div className="mt-1.5 bg-[#141C2A] border border-[#233045] rounded-xl p-3 space-y-1">
              {WORK_STYLES.map((ws) => (
                <button
                  key={ws.value}
                  onClick={() => setWorkStyle(ws.value)}
                  className={`w-full text-left p-2 rounded-lg border font-mono transition-all ${
                    workStyle === ws.value
                      ? 'bg-amber-950/50 border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-[#182234] border-[#26354D] text-slate-300 hover:bg-[#1E2B40]'
                  }`}
                >
                  <span className="text-[10px] block">{ws.label}</span>
                  <span className="text-[8px] text-slate-500 block">{ws.desc}</span>
                </button>
              ))}
            </div>
          </details>

          {/* ── Total Pages ── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider">Document Pages</span>
            </div>
            <input
              type="number" min="1" value={totalPages}
              onChange={(e) => { setTotalPages(e.target.value); setSheetIndex(0); }}
              className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-amber-400 rounded-lg px-2.5 py-2 text-sm text-white font-mono outline-none font-bold text-center"
            />
            {analysisData?.pageCount && (
              <p className="text-[9px] text-emerald-400 mt-1 font-mono text-center">
                ✓ Auto-detected from preflight: {analysisData.pageCount} pages
              </p>
            )}
          </div>

          {/* ── Execute Button ── */}
          <button
            disabled={imposing}
            onClick={handleRunImposition}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
              imposing
                ? 'bg-[#1C2638] text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20 hover:scale-[1.01]'
            }`}
          >
            {imposing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating {totalSheets} Sheet{totalSheets > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Grid className="w-4 h-4" /> Impose {totalPages} Pages → {totalSheets} Sheet{totalSheets > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>

        {/* ═══════════ RIGHT: Preview ═══════════ */}
        <div className="space-y-3">
          
          {/* Preview Header + Navigation */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-cyan-300">LIVE PREVIEW</span>
              <span className="text-[10px] text-slate-500">— {selectedLayout}PP {IMPOSITION_MODES.find(m => m.value === impositionMode)?.label}</span>
            </div>

            {/* Sheet Navigator */}
            <div className="flex items-center gap-1">
              <button onClick={() => setSheetIndex(0)} disabled={sheetIndex <= 0}
                className="p-1.5 rounded-lg bg-[#1A2436] border border-[#2B3C57] text-slate-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => navigateSheet(-1)} disabled={sheetIndex <= 0}
                className="p-1.5 rounded-lg bg-[#1A2436] border border-[#2B3C57] text-slate-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 py-1 bg-[#0D1117] border border-[#1E2A3A] rounded-lg text-center min-w-[100px]">
                <span className="text-xs font-mono text-white font-bold">{sheetIndex + 1}</span>
                <span className="text-[10px] font-mono text-slate-500"> / {totalSheets}</span>
              </div>
              <button onClick={() => navigateSheet(1)} disabled={sheetIndex >= totalSheets - 1}
                className="p-1.5 rounded-lg bg-[#1A2436] border border-[#2B3C57] text-slate-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setSheetIndex(totalSheets - 1)} disabled={sheetIndex >= totalSheets - 1}
                className="p-1.5 rounded-lg bg-[#1A2436] border border-[#2B3C57] text-slate-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="bg-[#0D1117] border border-[#1E2A3A] rounded-2xl p-4">
            <SheetPreview
              sheetWidth={sheetWidth}
              sheetHeight={sheetHeight}
              columns={columns}
              rows={rows}
              marginTop={marginTop}
              marginBottom={marginBottom}
              marginLeft={marginLeft}
              marginRight={marginRight}
              gutterX={gutterX}
              gutterY={gutterY}
              bleed={bleedTop}
              cropMarks={cropMarks}
              cropMarkLength={cropMarkLength}
              cropMarkOffset={cropMarkOffset}
              registrationMarks={registrationMarks}
              colorBars={colorBars}
              workStyle={workStyle}
              impositionMode={impositionMode}
              totalPages={totalPages}
              sheetIndex={sheetIndex}
              onSheetChange={(idx) => setSheetIndex(idx)}
              thumbnails={thumbnails}
              thumbnailsLoading={thumbnailsLoading}
              thumbnailsProgress={thumbnailsProgress}
            />
          </div>

          {/* Sheets Breakdown Table */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#233045] flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">Sheet Breakdown</span>
              <span className="text-[9px] font-mono text-slate-500 ml-auto">{totalSheets} sheets · {totalPages} pages · {blankPages} blank</span>
            </div>
            <div className="max-h-[180px] overflow-y-auto">
              <table className="w-full text-[10px] font-mono">
                <thead className="bg-[#0D1117] sticky top-0">
                  <tr className="text-slate-500">
                    <th className="px-3 py-1.5 text-left font-medium">Sheet</th>
                    <th className="px-3 py-1.5 text-left font-medium">Front Pages</th>
                    {isDuplex && <th className="px-3 py-1.5 text-left font-medium">Back Pages</th>}
                    <th className="px-3 py-1.5 text-right font-medium">Blanks</th>
                  </tr>
                </thead>
                <tbody>
                  {sheets.map((s) => (
                    <tr
                      key={s.index}
                      onClick={() => setSheetIndex(s.index)}
                      className={`cursor-pointer transition-all border-t border-[#1A2130] ${
                        sheetIndex === s.index
                          ? 'bg-cyan-950/40 text-cyan-300'
                          : 'hover:bg-[#182234] text-slate-300'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-bold">
                        {String(s.index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-3 py-1.5">{s.frontPages}</td>
                      {isDuplex && <td className="px-3 py-1.5">{s.backPages}</td>}
                      <td className="px-3 py-1.5 text-right">
                        {s.blankCount > 0 ? (
                          <span className="text-amber-400">{s.blankCount}</span>
                        ) : (
                          <span className="text-emerald-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'Layout', value: `${selectedLayout}PP`, color: 'text-cyan-400' },
              { label: 'Mode', value: IMPOSITION_MODES.find(m => m.value === impositionMode)?.label, color: 'text-cyan-400' },
              { label: 'Pages/Sheet', value: isDuplex ? `${perSide}×2` : `${perSide}`, color: 'text-emerald-400' },
              { label: 'Style', value: workStyle.replace(/_/g, ' '), color: 'text-indigo-400' },
              { label: 'Sheets', value: totalSheets, color: 'text-amber-400' },
            ].map((info, idx) => (
              <div key={idx} className="bg-[#0D1117] border border-[#1E2A3A] rounded-lg p-2 text-center">
                <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-slate-500 block">{info.label}</span>
                <span className={`text-[10px] font-bold font-mono block mt-0.5 ${info.color}`}>{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Success ───────────────────────────────────────────────────── */}
      {result && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white m-0">Imposition Complete</h4>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {totalPages} pages → {totalSheets} sheets ({selectedLayout}PP {IMPOSITION_MODES.find(m => m.value === impositionMode)?.label})
              </p>
            </div>
          </div>
          <button
            onClick={onProceedToOutput}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
          >
            View Production PDF <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
