import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  Layers, 
  Printer, 
  Sliders, 
  Check, 
  ArrowRight,
  ArrowLeft,
  Sparkles, 
  AlertCircle,
  RefreshCw,
  Maximize2,
  FileCheck,
  Scissors,
  BookOpen,
  Copy,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2
} from 'lucide-react';
import { imposePdfJob } from '../services/api';
import SheetPreview from './SheetPreview';

// ─── Presets ─────────────────────────────────────────────────────────────
const SHEET_PRESETS = [
  { name: 'SRA3 (320 × 450 mm)', width: 320, height: 450 },
  { name: 'A3+ (329 × 483 mm)', width: 329, height: 483 },
  { name: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { name: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { name: '23 × 36 in (584 × 914 mm)', width: 584, height: 914 },
  { name: '25 × 38 in (635 × 965 mm)', width: 635, height: 965 },
  { name: 'Custom Sheet', width: 350, height: 500 },
];

const IMPOSITION_MODES = [
  { value: 'N_UP', label: 'N-Up', icon: LayoutGrid, desc: 'Sequential pages in grid order' },
  { value: 'SADDLE_STITCH', label: 'Saddle Stitch', icon: BookOpen, desc: 'Booklet with center-staple binding' },
  { value: 'PERFECT_BINDING', label: 'Perfect Binding', icon: Layers, desc: 'Signature-based for glue binding' },
  { value: 'CUT_AND_STACK', label: 'Cut & Stack', icon: Scissors, desc: 'Pages ordered for guillotine cut' },
  { value: 'STEP_AND_REPEAT', label: 'Step & Repeat', icon: Copy, desc: 'Same page repeated across sheet' },
];

const WORK_STYLES = [
  { value: 'SIMPLEX', label: 'Simplex (Single-Sided)' },
  { value: 'SHEETWISE', label: 'Sheetwise (Front & Back)' },
  { value: 'WORK_AND_TURN', label: 'Work and Turn' },
  { value: 'WORK_AND_TUMBLE', label: 'Work and Tumble' },
  { value: 'PERFECTOR', label: 'Perfector' },
];

// ═════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════
export default function ImpositionSection({ jobId, analysisData, onImpositionSuccess, onProceedToOutput }) {
  // Sheet dimensions
  const [sheetPreset, setSheetPreset] = useState('SRA3 (320 × 450 mm)');
  const [sheetWidth, setSheetWidth] = useState(320);
  const [sheetHeight, setSheetHeight] = useState(450);

  // Grid
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(2);

  // Gutters
  const [gutterX, setGutterX] = useState(3);
  const [gutterY, setGutterY] = useState(3);

  // Margins
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);

  // Bleed & Marks
  const [bleed, setBleed] = useState(3);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);

  // Work style & mode
  const [workStyle, setWorkStyle] = useState('SIMPLEX');
  const [impositionMode, setImpositionMode] = useState('N_UP');
  const [cropMarks, setCropMarks] = useState(true);
  const [registrationMarks, setRegistrationMarks] = useState(true);
  const [colorBars, setColorBars] = useState(true);
  const [jobSlug, setJobSlug] = useState(true);

  // Total pages & sheet navigation
  const [totalPages, setTotalPages] = useState(analysisData?.pageCount || 16);
  const [sheetIndex, setSheetIndex] = useState(0);

  // Panels
  const [activePanel, setActivePanel] = useState('sheet'); // sheet | grid | marks

  // Execution state
  const [imposing, setImposing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSelectSheetPreset = (preset) => {
    setSheetPreset(preset.name);
    setSheetWidth(preset.width);
    setSheetHeight(preset.height);
  };

  // Total sheets calculation
  const perSide = parseInt(columns) * parseInt(rows);
  const isDuplex = workStyle !== 'SIMPLEX' && workStyle !== 'SINGLE_SIDED';
  const pagesPerPhysicalSheet = isDuplex ? perSide * 2 : perSide;
  const totalSheets = Math.max(1, Math.ceil((parseInt(totalPages) || 16) / pagesPerPhysicalSheet));

  const navigateSheet = (dir) => {
    setSheetIndex(prev => Math.max(0, Math.min(prev + dir, totalSheets - 1)));
  };

  // ─── Execute Imposition ────────────────────────────────────────────────
  const handleRunImposition = async () => {
    setImposing(true);
    setError(null);

    const config = {
      sheet: {
        width: parseFloat(sheetWidth),
        height: parseFloat(sheetHeight),
        unit: 'mm',
      },
      layout: {
        pagesPerLayout: parseInt(columns, 10) * parseInt(rows, 10),
      },
      grid: {
        columns: parseInt(columns, 10),
        rows: parseInt(rows, 10),
        gutterX: parseFloat(gutterX),
        gutterY: parseFloat(gutterY),
      },
      margins: {
        top: parseFloat(marginTop || 0),
        bottom: parseFloat(marginBottom || 0),
        left: parseFloat(marginLeft || 0),
        right: parseFloat(marginRight || 0),
      },
      bleed: {
        top: parseFloat(bleed || 0),
        bottom: parseFloat(bleed || 0),
        left: parseFloat(bleed || 0),
        right: parseFloat(bleed || 0),
      },
      cropMarks: {
        enabled: cropMarks,
        length: parseFloat(cropMarkLength || 5),
        offset: parseFloat(cropMarkOffset || 3),
        unit: 'mm',
      },
      workStyle,
      marks: {
        cropMarks,
        registrationMarks,
        colorBars,
        jobSlug,
      }
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

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1400px] mx-auto py-4 px-4">
      
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium mb-2">
          <Grid className="w-3.5 h-3.5" /> PHASE 5: IMPOSITION STUDIO
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight m-0">
          Press Sheet Layout & Imposition Engine
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
          Configure sheet dimensions, page layout, marks and work style, then preview the imposition in real-time before executing.
        </p>
      </div>

      {/* Imposition Mode Selector — Horizontal Tabs */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {IMPOSITION_MODES.map((m) => {
            const Icon = m.icon;
            const isActive = impositionMode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setImpositionMode(m.value)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 to-indigo-950/60 border-cyan-500/50 text-cyan-300 font-bold shadow-lg shadow-cyan-500/10'
                    : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:bg-[#1A2436] hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] font-mono text-slate-500 mt-1.5 ml-1">
          {IMPOSITION_MODES.find(m => m.value === impositionMode)?.desc}
        </p>
      </div>

      {/* Main Layout: Left Settings + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        
        {/* ═══ LEFT: Settings Panel ═══ */}
        <div className="space-y-4">
          
          {/* Panel Tabs */}
          <div className="flex rounded-xl bg-[#0D1117] border border-[#1E2A3A] p-0.5">
            {[
              { id: 'sheet', label: 'Sheet', icon: Maximize2 },
              { id: 'grid', label: 'Grid & Margins', icon: Grid },
              { id: 'marks', label: 'Marks & Style', icon: Printer },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    activePanel === tab.id
                      ? 'bg-[#1A2436] text-cyan-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sheet Panel */}
          {activePanel === 'sheet' && (
            <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5" /> Press Sheet Size
              </h4>

              {/* Presets */}
              <div className="grid grid-cols-1 gap-1.5">
                {SHEET_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSheetPreset(p)}
                    className={`flex items-center justify-between p-2 rounded-lg border font-mono text-[10px] transition-all ${
                      sheetPreset === p.name
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                        : 'bg-[#182234] border-[#26354D] text-slate-300 hover:bg-[#1E2B40]'
                    }`}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom dims */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Width (mm)</label>
                  <input
                    type="number" value={sheetWidth}
                    onChange={(e) => setSheetWidth(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Height (mm)</label>
                  <input
                    type="number" value={sheetHeight}
                    onChange={(e) => setSheetHeight(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Bleed */}
              <div className="pt-2 border-t border-[#233045]">
                <label className="text-[10px] font-mono text-cyan-300 block mb-0.5 flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-cyan-400" /> Bleed (mm)
                </label>
                <input
                  type="number" step="0.5" value={bleed}
                  onChange={(e) => setBleed(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>

              {/* Total Pages */}
              <div className="pt-2 border-t border-[#233045]">
                <label className="text-[10px] font-mono text-amber-300 block mb-0.5 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-400" /> Total Pages in Document
                </label>
                <input
                  type="number" min="1" value={totalPages}
                  onChange={(e) => { setTotalPages(e.target.value); setSheetIndex(0); }}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
                {analysisData?.pageCount && (
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">
                    Detected from analysis: {analysisData.pageCount} pages
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Grid & Margins Panel */}
          {activePanel === 'grid' && (
            <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Grid className="w-3.5 h-3.5" /> Grid Layout & Gutters
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Columns</label>
                  <input
                    type="number" min="1" max="10" value={columns}
                    onChange={(e) => { setColumns(e.target.value); setSheetIndex(0); }}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Rows</label>
                  <input
                    type="number" min="1" max="10" value={rows}
                    onChange={(e) => { setRows(e.target.value); setSheetIndex(0); }}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">X Gutter (mm)</label>
                  <input
                    type="number" step="0.5" value={gutterX}
                    onChange={(e) => setGutterX(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Y Gutter (mm)</label>
                  <input
                    type="number" step="0.5" value={gutterY}
                    onChange={(e) => setGutterY(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Margins */}
              <div className="pt-2 border-t border-[#233045]">
                <span className="text-[10px] font-mono text-emerald-400 block mb-1.5 font-bold">Sheet Margins (mm)</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Top', val: marginTop, set: setMarginTop },
                    { label: 'Bottom', val: marginBottom, set: setMarginBottom },
                    { label: 'Left', val: marginLeft, set: setMarginLeft },
                    { label: 'Right', val: marginRight, set: setMarginRight },
                  ].map((m) => (
                    <div key={m.label}>
                      <label className="text-[9px] font-mono text-slate-400 block">{m.label}</label>
                      <input
                        type="number" value={m.val}
                        onChange={(e) => m.set(e.target.value)}
                        className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout summary */}
              <div className="p-2.5 rounded-xl bg-[#1A2436] border border-[#2A3B56] text-center">
                <span className="text-[9px] text-slate-400 block font-mono">LAYOUT DENSITY</span>
                <span className="text-lg font-bold text-cyan-300 font-mono">
                  {columns} × {rows} = {perSide} Up
                </span>
                <span className="text-[9px] text-slate-400 block font-mono">
                  {totalSheets} sheet{totalSheets > 1 ? 's' : ''} needed for {totalPages} pages
                </span>
              </div>
            </div>
          )}

          {/* Marks & Style Panel */}
          {activePanel === 'marks' && (
            <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-3.5 h-3.5" /> Print Marks & Work Style
              </h4>

              <div className="space-y-1.5">
                {[
                  { label: 'Cut / Crop Marks', state: cropMarks, setState: setCropMarks },
                  { label: 'Registration Targets', state: registrationMarks, setState: setRegistrationMarks },
                  { label: 'Color Separation Bars', state: colorBars, setState: setColorBars },
                  { label: 'Job Metadata / Slug', state: jobSlug, setState: setJobSlug },
                ].map((m, idx) => (
                  <label key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#182234] border border-[#26354D] cursor-pointer text-[10px] font-mono">
                    <span className="text-slate-200">{m.label}</span>
                    <input
                      type="checkbox" checked={m.state}
                      onChange={(e) => m.setState(e.target.checked)}
                      className="accent-cyan-400 w-3.5 h-3.5"
                    />
                  </label>
                ))}
              </div>

              {/* Crop Mark Dimensions */}
              {cropMarks && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-[#182234] rounded-lg border border-[#26354D]">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block">Mark Length (mm)</label>
                    <input
                      type="number" step="0.5" value={cropMarkLength}
                      onChange={(e) => setCropMarkLength(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-indigo-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block">Mark Offset (mm)</label>
                    <input
                      type="number" step="0.5" value={cropMarkOffset}
                      onChange={(e) => setCropMarkOffset(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-indigo-400 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Work Style */}
              <div className="pt-2 border-t border-[#233045]">
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Work Style</label>
                <div className="space-y-1">
                  {WORK_STYLES.map((ws) => (
                    <button
                      key={ws.value}
                      onClick={() => setWorkStyle(ws.value)}
                      className={`w-full text-left p-2 rounded-lg border font-mono text-[10px] transition-all ${
                        workStyle === ws.value
                          ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-300 font-bold'
                          : 'bg-[#182234] border-[#26354D] text-slate-300 hover:bg-[#1E2B40]'
                      }`}
                    >
                      {ws.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            disabled={imposing}
            onClick={handleRunImposition}
            className={`w-full py-3 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
              imposing
                ? 'bg-[#1C2638] text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20 hover:scale-[1.01]'
            }`}
          >
            {imposing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Imposed Sheet...
              </>
            ) : (
              <>
                <Grid className="w-4 h-4" /> Execute Imposition Engine
              </>
            )}
          </button>
        </div>

        {/* ═══ RIGHT: Preview Canvas ═══ */}
        <div className="space-y-3">
          
          {/* Preview header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-cyan-300">LIVE SHEET PREVIEW</span>
              <span className="text-[10px] text-slate-500">— Updates in real-time</span>
            </div>

            {/* Sheet Navigation */}
            {totalSheets > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigateSheet(-1)}
                  disabled={sheetIndex <= 0}
                  className="p-1.5 rounded-lg bg-[#1A2436] border border-[#2B3C57] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 min-w-[60px] text-center">
                  Sheet {sheetIndex + 1}/{totalSheets}
                </span>
                <button
                  onClick={() => navigateSheet(1)}
                  disabled={sheetIndex >= totalSheets - 1}
                  className="p-1.5 rounded-lg bg-[#1A2436] border border-[#2B3C57] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
              bleed={bleed}
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
            />
          </div>

          {/* Quick Info Bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Mode', value: IMPOSITION_MODES.find(m => m.value === impositionMode)?.label, color: 'cyan' },
              { label: 'Pages/Sheet', value: `${perSide} ${isDuplex ? '×2 sides' : ''}`, color: 'emerald' },
              { label: 'Work Style', value: workStyle.replace(/_/g, ' '), color: 'indigo' },
              { label: 'Total Sheets', value: totalSheets, color: 'amber' },
            ].map((info, idx) => (
              <div key={idx} className="bg-[#141C2A] border border-[#233045] rounded-xl p-2.5 text-center">
                <span className={`text-[8px] font-mono font-bold uppercase tracking-wider text-${info.color}-400 block`}>{info.label}</span>
                <span className="text-[11px] font-bold text-white font-mono block mt-0.5">{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="mt-5 p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-left flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white m-0">Imposition Sheet Rendered</h4>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {perSide}-Up {IMPOSITION_MODES.find(m => m.value === impositionMode)?.label} layout generated. Output stored in GridFS.
              </p>
            </div>
          </div>
          <button
            onClick={onProceedToOutput}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
          >
            View Live HD PDF Preview <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
