import React, { useState, useMemo, useEffect } from 'react';
import { 
  Grid, 
  Layers, 
  Printer, 
  ArrowRight,
  AlertCircle,
  FileCheck,
  Scissors,
  BookOpen,
  Copy,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Bookmark,
  Sparkles,
  Calculator,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { imposePdfJob, getSourcePdfUrl, getOutputPdfUrl } from '../services/api';
import usePdfThumbnails from '../hooks/usePdfThumbnails';
import SheetPreview from './SheetPreview';

/* ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURATION CONSTANTS (KODAK PREPS / CIP4 STANDARDS)
 * ═══════════════════════════════════════════════════════════════════════════ */

// Standard book signature presets
const SIGNATURE_PRESETS = [
  { pages: 16, label: '16PP', name: '16PP Right-Angle', desc: 'CIP4 F16-1 • 4×2 Duplex (Preps Standard)', cols: 4, rows: 2, badge: 'Standard Book' },
  { pages: 32, label: '32PP', name: '32PP Press Section', desc: 'CIP4 F32-1 • 4×4 Duplex (Web / Large Sheet)', cols: 4, rows: 4, badge: 'Web Press' },
  { pages: 8,  label: '8PP',  name: '8PP Right-Angle', desc: 'CIP4 F8-1 • 2×2 Duplex (Small Section)', cols: 2, rows: 2 },
  { pages: 4,  label: '4PP',  name: '4PP Folio', desc: 'CIP4 F4-1 • 2×1 Duplex (Half-Fold Booklet)', cols: 2, rows: 1 },
  { pages: 2,  label: '2PP',  name: '2PP Spread', desc: 'Single-fold / 2-up Spread', cols: 2, rows: 1 },
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

const BINDING_STYLES = [
  { value: 'PERFECT_BINDING', label: 'Perfect Binding', icon: Layers, desc: 'Signatures gathered consecutively & glued at spine' },
  { value: 'SADDLE_STITCH',   label: 'Saddle Stitch',   icon: BookOpen, desc: 'Signatures nested inside each other & wire stitched at spine fold' },
  { value: 'SECTION_SEWING',  label: 'Section Sewing',  icon: FileCheck, desc: 'Signatures sewn through center fold then gathered' },
  { value: 'CUT_AND_STACK',   label: 'Cut & Stack',     icon: Scissors, desc: 'Guillotine cut & stacked in order for digital presses' },
];

const WORK_STYLES = [
  { value: 'SHEETWISE',        label: 'Sheetwise (Front & Back Plates)', desc: 'Standard duplex with independent front and back' },
  { value: 'WORK_AND_TURN',    label: 'Work and Turn',                 desc: 'Same plate, flip sheet along horizontal axis' },
  { value: 'WORK_AND_TUMBLE',  label: 'Work and Tumble',               desc: 'Same plate, flip sheet head-to-foot (vertical axis)' },
  { value: 'SIMPLEX',          label: 'Simplex (Single-Sided)',        desc: 'Print on front side only' },
  { value: 'PERFECTOR',        label: 'Perfector Press',               desc: 'Simultaneous duplex printing' },
];

// Paper stocks for dynamic spine calculation
const PAPER_CALIPER_PRESETS = [
  { label: '80 gsm White Offset / Book Paper', caliper: 0.096 },
  { label: '70 gsm Maplitho / Novel Stock',    caliper: 0.091 },
  { label: '90 gsm Gloss / Matt Art',          caliper: 0.082 },
  { label: '100 gsm Art Paper',                caliper: 0.095 },
  { label: '130 gsm Art Paper',                caliper: 0.115 },
  { label: '170 gsm Heavy Art Card',           caliper: 0.150 },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function ImpositionSection({
  jobId,
  analysisData,
  uploadedFile,
  activeJob,
  onImpositionSuccess,
  onProceedToOutput
}) {
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

  // ─── High-Level Prepress Part: Book Text vs Book Cover ──────────────────
  const [partMode, setPartMode] = useState('TEXT'); // 'TEXT' | 'COVER'

  // ─── Book Text (Signature) Settings ─────────────────────────────────────
  const [selectedLayout, setSelectedLayout] = useState(16); // 16PP Preps standard
  const activePreset = SIGNATURE_PRESETS.find(p => p.pages === selectedLayout) || SIGNATURE_PRESETS[0];
  const columns = activePreset.cols;
  const rows = activePreset.rows;

  const [bindingStyle, setBindingStyle] = useState('PERFECT_BINDING');
  const [creepMM, setCreepMM] = useState(1.5);
  const [collatingMarks, setCollatingMarks] = useState(true);

  // ─── Book Cover Studio Settings ─────────────────────────────────────────
  const [paperCaliper, setPaperCaliper] = useState(0.096); // 80gsm default
  const [customCaliper, setCustomCaliper] = useState(false);
  const [hingeAllowance, setHingeAllowance] = useState(0.5); // mm
  const [hasFlaps, setHasFlaps] = useState(false);
  const [flapWidth, setFlapWidth] = useState(60); // mm

  // ─── Sheet Dimensions ───────────────────────────────────────────────────
  const [sheetPreset, setSheetPreset] = useState('23×36"');
  const [sheetWidth, setSheetWidth] = useState(584);
  const [sheetHeight, setSheetHeight] = useState(914);
  const [customSheet, setCustomSheet] = useState(false);

  // ─── Margins & Bleed (4-Sided) ──────────────────────────────────────────
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);
  const [marginLinked, setMarginLinked] = useState(true);

  const [bleedTop, setBleedTop] = useState(3);
  const [bleedBottom, setBleedBottom] = useState(3);
  const [bleedLeft, setBleedLeft] = useState(3);
  const [bleedRight, setBleedRight] = useState(3);
  const [bleedLinked, setBleedLinked] = useState(true);

  // ─── Gutters ────────────────────────────────────────────────────────────
  const [gutterX, setGutterX] = useState(4);
  const [gutterY, setGutterY] = useState(4);

  // ─── Prepress Production Marks ──────────────────────────────────────────
  const [cropMarks, setCropMarks] = useState(true);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);
  const [registrationMarks, setRegistrationMarks] = useState(true);
  const [colorBars, setColorBars] = useState(true);
  const [jobSlug, setJobSlug] = useState(true);

  // ─── Work Style ─────────────────────────────────────────────────────────
  const [workStyle, setWorkStyle] = useState('SHEETWISE');

  // ─── Document & Signature Browser State ─────────────────────────────────
  const [totalPages, setTotalPages] = useState(analysisData?.pageCount || 16);
  const [signatureIndex, setSignatureIndex] = useState(0);

  // ─── Execution State ────────────────────────────────────────────────────
  const [imposing, setImposing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Sync with analysisData
  useEffect(() => {
    if (analysisData?.pageCount) {
      setTotalPages(analysisData.pageCount);
    }
  }, [analysisData?.pageCount]);

  // ─── Prepress Calculations ──────────────────────────────────────────────
  const totalBookPages = parseInt(totalPages, 10) || 16;
  const layoutPages = selectedLayout;
  const totalSignatures = Math.max(1, Math.ceil(totalBookPages / layoutPages));
  const totalCapacity = totalSignatures * layoutPages;
  const blankPaddingPages = Math.max(0, totalCapacity - totalBookPages);

  // Dynamic Spine Calculation (Formula: (Leaves) * Caliper + Hinge)
  const bookLeaves = Math.ceil(totalBookPages / 2);
  const calculatedSpine = useMemo(() => {
    const spine = (bookLeaves * parseFloat(paperCaliper)) + parseFloat(hingeAllowance || 0.5);
    return Math.max(1, Math.round(spine * 10) / 10);
  }, [bookLeaves, paperCaliper, hingeAllowance]);

  // Handlers
  const handleSelectSheetPreset = (preset) => {
    setSheetPreset(preset.name);
    setSheetWidth(preset.width);
    setSheetHeight(preset.height);
    setCustomSheet(false);
  };

  const handleSetMargin = (side, value) => {
    const v = parseFloat(value) || 0;
    if (marginLinked) {
      setMarginTop(v); setMarginBottom(v); setMarginLeft(v); setMarginRight(v);
    } else {
      ({ top: setMarginTop, bottom: setMarginBottom, left: setMarginLeft, right: setMarginRight }[side])(v);
    }
  };

  const handleSetBleed = (side, value) => {
    const v = parseFloat(value) || 0;
    if (bleedLinked) {
      setBleedTop(v); setBleedBottom(v); setBleedLeft(v); setBleedRight(v);
    } else {
      ({ top: setBleedTop, bottom: setBleedBottom, left: setBleedLeft, right: setBleedRight }[side])(v);
    }
  };

  // ─── Execute Imposition ─────────────────────────────────────────────────
  const handleRunImposition = async () => {
    setImposing(true);
    setError(null);

    const config = {
      sheet: {
        width: parseFloat(sheetWidth),
        height: parseFloat(sheetHeight),
        unit: 'mm'
      },
      layout: {
        pagesPerLayout: partMode === 'COVER' ? 4 : selectedLayout,
        mode: partMode === 'COVER' ? 'COVER' : 'TEXT'
      },
      workStyle,
      binding: {
        type: bindingStyle,
        creep: bindingStyle === 'SADDLE_STITCH' ? parseFloat(creepMM) : 0
      },
      margins: {
        top: parseFloat(marginTop || 0),
        bottom: parseFloat(marginBottom || 0),
        left: parseFloat(marginLeft || 0),
        right: parseFloat(marginRight || 0)
      },
      bleed: {
        top: parseFloat(bleedTop || 0),
        bottom: parseFloat(bleedBottom || 0),
        left: parseFloat(bleedLeft || 0),
        right: parseFloat(bleedRight || 0)
      },
      gutter: {
        horizontal: parseFloat(gutterX || 0),
        vertical: parseFloat(gutterY || 0),
        unit: 'mm'
      },
      cropMarks: {
        enabled: cropMarks,
        length: parseFloat(cropMarkLength || 5),
        offset: parseFloat(cropMarkOffset || 3),
        unit: 'mm'
      },
      marks: {
        crop: cropMarks,
        registrationMarks,
        colorBars,
        jobSlug,
        collatingMarks: partMode === 'TEXT' ? collatingMarks : false
      },
      coverStudio: partMode === 'COVER' ? {
        spineWidth: calculatedSpine,
        hasFlaps,
        flapWidth: hasFlaps ? parseFloat(flapWidth) : 0,
        paperCaliper: parseFloat(paperCaliper)
      } : undefined
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

  return (
    <div className="w-full max-w-[1550px] mx-auto py-4 px-4">
      {/* ─── Prepress Header ────────────────────────────────────────────── */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-medium mb-1.5 shadow-sm">
          <Grid className="w-3.5 h-3.5" /> PHASE 5: PREPRESS BOOK IMPOSITION STUDIO
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight m-0">Standard Book Imposition Engine</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
          Compliant with Kodak Preps & CIP4 standards. Automatically creates signatures, calculates dynamic spines, and generates production press sheets.
        </p>
      </div>

      {/* ─── Part Switcher: Book Text vs Book Cover ─────────────────────── */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex p-1 rounded-xl bg-[#141C2A] border border-[#233045] shadow-lg">
          <button
            onClick={() => { setPartMode('TEXT'); setSignatureIndex(0); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              partMode === 'TEXT'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Book Text (Body Signatures)
          </button>
          <button
            onClick={() => { setPartMode('COVER'); setSignatureIndex(0); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              partMode === 'COVER'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Book Cover Studio (Wraparound Spread)
          </button>
        </div>
      </div>

      {/* ─── Main Studio Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT COLUMN: CONTROLS & SPECIFICATIONS (5 COLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">

          {/* ─── MODE 1: BOOK TEXT CONTROLS ──────────────────────────────── */}
          {partMode === 'TEXT' && (
            <>
              {/* Signature Presets (16PP Standard, 32PP, 8PP, 4PP, 2PP) */}
              <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">Signature Fold Scheme</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    CIP4 / Preps
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  {SIGNATURE_PRESETS.map((preset) => {
                    const isSelected = selectedLayout === preset.pages;
                    return (
                      <button
                        key={preset.pages}
                        onClick={() => { setSelectedLayout(preset.pages); setSignatureIndex(0); }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                            : 'bg-[#10141D] border-[#233045] text-slate-400 hover:border-[#2B3C57] hover:text-slate-200'
                        }`}
                      >
                        <span className="text-lg font-bold font-mono">{preset.label}</span>
                        <span className="text-[10px] text-slate-400 truncate w-full">{preset.cols}×{preset.rows} Duplex</span>
                        {preset.badge && (
                          <span className="text-[8px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 mt-1">
                            {preset.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Active: <strong className="text-cyan-300">{activePreset.name}</strong> — {activePreset.desc}
                </p>
              </div>

              {/* Multi-Signature Intelligence Bar */}
              <div className="bg-gradient-to-br from-[#141C2A] to-[#1A2436] border border-[#233045] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Multi-Signature Pagination</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {totalSignatures} {totalSignatures === 1 ? 'Signature' : 'Signatures'} Auto-Calculated
                  </span>
                </div>

                {/* Calculation breakdown */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#0D121B] border border-[#1E293B] mb-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Book Pages</span>
                    <strong className="text-sm font-mono text-white">{totalBookPages}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Total Capacity</span>
                    <strong className="text-sm font-mono text-cyan-300">{totalCapacity}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Blank Padding</span>
                    <strong className={`text-sm font-mono ${blankPaddingPages > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {blankPaddingPages}
                    </strong>
                  </div>
                </div>

                {/* Interactive Signature Switcher */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#10141D] border border-[#233045]">
                  <button
                    onClick={() => setSignatureIndex(prev => Math.max(0, prev - 1))}
                    disabled={signatureIndex === 0}
                    className="p-1.5 rounded-lg bg-[#1A2436] hover:bg-[#233045] text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-center font-mono text-xs">
                    <span className="text-slate-400">Previewing: </span>
                    <strong className="text-cyan-300">
                      Signature {signatureIndex + 1} of {totalSignatures}
                    </strong>
                    <span className="text-slate-500 text-[10px] block">
                      Pages {signatureIndex * layoutPages + 1}–{Math.min((signatureIndex + 1) * layoutPages, totalBookPages)}
                    </span>
                  </div>

                  <button
                    onClick={() => setSignatureIndex(prev => Math.min(totalSignatures - 1, prev + 1))}
                    disabled={signatureIndex >= totalSignatures - 1}
                    className="p-1.5 rounded-lg bg-[#1A2436] hover:bg-[#233045] text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Binding Style Selection */}
              <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">Book Binding Scheme</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {BINDING_STYLES.map((b) => {
                    const Icon = b.icon;
                    const isSelected = bindingStyle === b.value;
                    return (
                      <button
                        key={b.value}
                        onClick={() => setBindingStyle(b.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                            : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold font-mono text-xs mb-1">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          {b.label}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight m-0">{b.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Creep Compensation (if Saddle Stitch) */}
                {bindingStyle === 'SADDLE_STITCH' && (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/50 mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-cyan-300 font-bold">Creep / Shingling Allowance:</span>
                      <span className="text-xs font-mono font-bold text-white">{creepMM} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={creepMM}
                      onChange={(e) => setCreepMM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Compensates for the push-out of inner pages when nested signatures are folded.
                    </p>
                  </div>
                )}

                {/* Collating Marks Toggle */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-[#10141D] border border-[#233045] cursor-pointer">
                  <span className="text-xs font-mono text-slate-300">Spine Collating Step-Marks</span>
                  <input
                    type="checkbox"
                    checked={collatingMarks}
                    onChange={(e) => setCollatingMarks(e.target.checked)}
                    className="rounded accent-cyan-400 w-4 h-4"
                  />
                </label>
              </div>
            </>
          )}

          {/* ─── MODE 2: BOOK COVER STUDIO CONTROLS ───────────────────────── */}
          {partMode === 'COVER' && (
            <div className="bg-[#141C2A] border border-amber-900/40 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">Dynamic Spine Calculator</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                  Prepress Standard
                </span>
              </div>

              {/* Spine Result Display */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/50 to-orange-950/30 border border-amber-500/40 text-center">
                <span className="text-xs font-mono text-amber-300 uppercase block mb-1">Calculated Spine Width</span>
                <strong className="text-3xl font-mono text-white tracking-tight block">
                  {calculatedSpine.toFixed(1)} <span className="text-lg text-amber-400 font-normal">mm</span>
                </strong>
                <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                  Based on {totalBookPages} book pages ({bookLeaves} sheets) + {hingeAllowance}mm hinge allowance
                </span>
              </div>

              {/* Paper Stock Caliper Selector */}
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 font-bold">Body Block Paper Stock</label>
                <select
                  value={paperCaliper}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPaperCaliper(val);
                    setCustomCaliper(false);
                  }}
                  className="w-full bg-[#10141D] border border-[#233045] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                >
                  {PAPER_CALIPER_PRESETS.map((p) => (
                    <option key={p.label} value={p.caliper}>
                      {p.label} (~{p.caliper} mm/leaf)
                    </option>
                  ))}
                </select>
              </div>

              {/* Hinge Allowance Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-slate-300 font-bold">Hinge / Glue Allowance:</span>
                  <span className="text-xs font-mono text-amber-300 font-bold">{hingeAllowance} mm</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.1"
                  value={hingeAllowance}
                  onChange={(e) => setHingeAllowance(parseFloat(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Flaps Option */}
              <div className="p-3 rounded-xl bg-[#10141D] border border-[#233045]">
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <span className="text-xs font-mono text-slate-200 font-bold">Include Cover Flaps (French Fold / Jacket)</span>
                  <input
                    type="checkbox"
                    checked={hasFlaps}
                    onChange={(e) => setHasFlaps(e.target.checked)}
                    className="rounded accent-amber-400 w-4 h-4"
                  />
                </label>

                {hasFlaps && (
                  <div className="mt-2 pt-2 border-t border-[#1E293B] flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Flap Width (mm):</span>
                    <input
                      type="number"
                      value={flapWidth}
                      onChange={(e) => setFlapWidth(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white text-right"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Press Sheet & Work Style Setup ───────────────────────────── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">Press Sheet & Machine Setup</span>
              </div>
            </div>

            {/* Sheet Presets */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Standard Press Sheet</label>
              <select
                value={sheetPreset}
                onChange={(e) => {
                  const p = SHEET_PRESETS.find(x => x.name === e.target.value);
                  if (p) handleSelectSheetPreset(p);
                }}
                className="w-full bg-[#10141D] border border-[#233045] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                {SHEET_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Sheet Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Width (mm)</label>
                <input
                  type="number"
                  value={sheetWidth}
                  onChange={(e) => { setSheetWidth(parseFloat(e.target.value) || 0); setSheetPreset('Custom'); }}
                  className="w-full bg-[#10141D] border border-[#233045] rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Height (mm)</label>
                <input
                  type="number"
                  value={sheetHeight}
                  onChange={(e) => { setSheetHeight(parseFloat(e.target.value) || 0); setSheetPreset('Custom'); }}
                  className="w-full bg-[#10141D] border border-[#233045] rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Work Style Selection */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Work Style</label>
              <select
                value={workStyle}
                onChange={(e) => setWorkStyle(e.target.value)}
                className="w-full bg-[#10141D] border border-[#233045] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                {WORK_STYLES.map((ws) => (
                  <option key={ws.value} value={ws.value}>{ws.label}</option>
                ))}
              </select>
            </div>

            {/* Margins & Bleed Quick Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#1E293B]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-400">Sheet Margins</span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">{marginTop} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={marginTop}
                  onChange={(e) => handleSetMargin('all', e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-400">Bleed</span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold">{bleedTop} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={bleedTop}
                  onChange={(e) => handleSetBleed('all', e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* ─── Production Marks Checkboxes ──────────────────────────────── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider block mb-2.5">
              Production Marks
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cropMarks} onChange={(e) => setCropMarks(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Crop Marks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={registrationMarks} onChange={(e) => setRegistrationMarks(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Registration Marks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={colorBars} onChange={(e) => setColorBars(e.target.checked)} className="rounded accent-cyan-400" />
                <span>CMYK Color Bars</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={jobSlug} onChange={(e) => setJobSlug(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Job Slug Line</span>
              </label>
            </div>
          </div>

          {/* ─── Error Display ────────────────────────────────────────────── */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <strong>Imposition Error:</strong>
                <p className="mt-1 m-0 text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* ─── Execute Imposition CTA ───────────────────────────────────── */}
          <button
            onClick={handleRunImposition}
            disabled={imposing}
            className={`w-full py-4 px-6 rounded-2xl font-bold font-mono text-sm tracking-wide uppercase transition-all shadow-xl flex items-center justify-center gap-2.5 ${
              partMode === 'COVER'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {imposing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Processing Prepress Imposition...</span>
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>
                  {partMode === 'COVER' ? 'Generate Wraparound Cover Spread' : `Impose ${totalSignatures} Book Signatures`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Success banner */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Imposition complete! Output ready.</span>
              </div>
              <button
                onClick={onProceedToOutput}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
              >
                Proceed to Output →
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT COLUMN: INTERACTIVE PREPRESS SHEET PREVIEW (7 COLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7">
          <SheetPreview
            partMode={partMode}
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
            impositionMode={bindingStyle}
            selectedLayout={selectedLayout}
            totalPages={totalBookPages}
            sheetIndex={signatureIndex}
            onSheetChange={(idx) => setSignatureIndex(idx)}
            thumbnails={thumbnails}
            thumbnailsLoading={thumbnailsLoading}
            thumbnailsProgress={thumbnailsProgress}
            coverParams={{
              spineWidth: calculatedSpine,
              flapWidth,
              hasFlaps,
              bodyPageCount: totalBookPages,
              coverStock: '80gsm'
            }}
          />
        </div>
      </div>
    </div>
  );
}
