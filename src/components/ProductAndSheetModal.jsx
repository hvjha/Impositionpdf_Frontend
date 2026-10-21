import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  BookOpen,
  Layers,
  Printer,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  X,
  ShieldCheck,
  Zap,
  Ruler,
  Maximize2,
  FileText,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { calculatePressSheetUps } from '../utils/impositionCalculations';

export default function ProductAndSheetModal({
  isOpen,
  onClose,
  file,
  job,
  analysisData,
  onProceed
}) {
  // ─── Unit preference: inch or mm ───────────────────────────────────────
  const [unit, setUnit] = useState('inch');

  // ─── Product Selection: 'BOX' | 'COVER' | 'TEXT' ────────────────────────
  // Default to 'BOX' for 1-page carton PDFs, or 'TEXT' if > 4 pages
  const [productType, setProductType] = useState(() => {
    const pageCount = analysisData?.pageCount || 1;
    if (pageCount > 4) return 'TEXT';
    return 'BOX';
  });

  // Extract detected artwork dimensions from analysis data
  const artworkDims = useMemo(() => {
    const page = analysisData?.pages?.[0] || {};
    const boxes = page.boxes || {};

    // 1. Check ContentBox / ArtBox / TrimBox
    let widthMM = null;
    let heightMM = null;

    if (boxes.content && (boxes.content.widthMM || boxes.content.width)) {
      widthMM = boxes.content.widthMM || (boxes.content.width * 25.4 / 72);
      heightMM = boxes.content.heightMM || (boxes.content.height * 25.4 / 72);
    } else if (boxes.trim && (boxes.trim.width || boxes.trim.widthMm)) {
      widthMM = boxes.trim.widthMm || (boxes.trim.width * 25.4 / 72);
      heightMM = boxes.trim.heightMm || (boxes.trim.height * 25.4 / 72);
    } else if (boxes.art && boxes.art.width) {
      widthMM = boxes.art.width * 25.4 / 72;
      heightMM = boxes.art.height * 25.4 / 72;
    } else if (boxes.media && boxes.media.width) {
      widthMM = boxes.media.width * 25.4 / 72;
      heightMM = boxes.media.height * 25.4 / 72;
    } else if (page.source?.widthPt) {
      widthMM = page.source.widthPt * 25.4 / 72;
      heightMM = page.source.heightPt * 25.4 / 72;
    } else {
      // Default to Acuzie 100ml carton flat dimensions (300.7 x 196.1 mm / 11.84 x 7.72 in)
      widthMM = 300.7;
      heightMM = 196.1;
    }

    widthMM = Math.round(widthMM * 10) / 10;
    heightMM = Math.round(heightMM * 10) / 10;

    const widthIn = Math.round((widthMM / 25.4) * 100) / 100;
    const heightIn = Math.round((heightMM / 25.4) * 100) / 100;

    return {
      widthMM,
      heightMM,
      widthIn,
      heightIn,
      fileName: file?.name || job?.originalFileName || 'Source Artwork',
      fileSize: file?.size || job?.fileSize || 0,
      pageCount: analysisData?.pageCount || 1
    };
  }, [analysisData, file, job]);

  // Calculate press sheet UPS options based on current product type & artwork dimensions
  const sheetOptions = useMemo(() => {
    return calculatePressSheetUps(artworkDims.widthMM, artworkDims.heightMM, {
      productType,
      marginMM: 6.35
    });
  }, [artworkDims.widthMM, artworkDims.heightMM, productType]);

  // Selected Sheet State (default to Rank 1 Best Imposition)
  const [selectedSheetName, setSelectedSheetName] = useState('');

  // Auto-sync selected sheet whenever options update - selects the Rank 1 (Best Imposition) by default
  useEffect(() => {
    if (sheetOptions.length > 0) {
      const preferred = sheetOptions.find(s => s.rank === 1) ||
                        sheetOptions.find(s => s.name === '20×28"') ||
                        sheetOptions[0];
      if (preferred) {
        setSelectedSheetName(preferred.name);
      }
    }
  }, [sheetOptions]);

  const activeSheet = useMemo(() => {
    return sheetOptions.find(s => s.name === selectedSheetName) || sheetOptions[0] || null;
  }, [sheetOptions, selectedSheetName]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!activeSheet) return;
    onProceed({
      productType,
      sheetConfig: {
        name: activeSheet.name,
        sheetWidth: activeSheet.sheetWidth,
        sheetHeight: activeSheet.sheetHeight,
        sheetOrientation: activeSheet.sheetOrientation,
        cols: activeSheet.cols,
        rows: activeSheet.rows,
        ups: activeSheet.ups,
        tech: activeSheet.tech,
        label: activeSheet.label
      },
      analysisData,
      skipToImposition: true
    });
  };

  const handleStepByStep = () => {
    onProceed({
      productType,
      sheetConfig: activeSheet,
      analysisData,
      skipToImposition: false
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#0D121F] border border-cyan-500/40 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl shadow-cyan-950/70 overflow-hidden font-sans text-slate-200">
        
        {/* ─── Modal Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-mono m-0">
                  Select Product & Press Sheet
                </h2>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold uppercase tracking-wider">
                  Automated Yield
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono m-0 mt-0.5">
                Upload completed! Choose your job type and press sheet below to proceed with 1-click imposition.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close Setup Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Scrollable Body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ─── Detected Artwork Specs Banner ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#131A29] border border-cyan-800/40 shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate font-mono m-0">
                  {artworkDims.fileName}
                </p>
                <p className="text-[11px] text-cyan-300 font-mono m-0 flex items-center gap-2">
                  <span>Detected Flat Dimensions:</span>
                  <span className="text-white font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    {unit === 'inch'
                      ? `${artworkDims.widthIn}" × ${artworkDims.heightIn}"`
                      : `${artworkDims.widthMM} × ${artworkDims.heightMM} mm`}
                  </span>
                  <span className="text-slate-400">({artworkDims.pageCount} page)</span>
                </p>
              </div>
            </div>

            {/* Inch vs MM Toggle */}
            <div className="flex items-center gap-1 bg-[#0A0E17] p-1 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setUnit('inch')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                  unit === 'inch'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Inches (")
              </button>
              <button
                type="button"
                onClick={() => setUnit('mm')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                  unit === 'mm'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Millimeters (mm)
              </button>
            </div>
          </div>

          {/* ─── Step 1: Select Product Type ─── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">1</span>
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono m-0">
                  Select Product Type
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {productType === 'BOX' ? '📦 Packaging Carton Selected' : productType === 'COVER' ? '📖 Book Cover Selected' : '📑 Book Text Selected'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Product 1: Packaging Box */}
              <button
                type="button"
                onClick={() => setProductType('BOX')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  productType === 'BOX'
                    ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-cyan-950/60 border-emerald-400 shadow-xl shadow-emerald-950/50'
                    : 'bg-[#121826] border-[#222E42] hover:border-slate-500 hover:bg-[#161F30]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      productType === 'BOX' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    {productType === 'BOX' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white m-0">Box & Packaging</h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono leading-relaxed">
                    Mono cartons, RTE / STE tuck boxes, perfume & pharma packaging, corrugated cartons.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Title header preserved by default</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>No unwanted camera/crop marks</span>
                  </div>
                </div>
              </button>

              {/* Product 2: Book Cover */}
              <button
                type="button"
                onClick={() => setProductType('COVER')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  productType === 'COVER'
                    ? 'bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/60 border-purple-400 shadow-xl shadow-purple-950/50'
                    : 'bg-[#121826] border-[#222E42] hover:border-slate-500 hover:bg-[#161F30]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      productType === 'COVER' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    {productType === 'COVER' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-700">
                        <CheckCircle2 className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white m-0">Book Cover Studio</h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono leading-relaxed">
                    Paperback wrap covers, hardcover dust jackets with flaps, spine caliper crease scores.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-purple-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Spine width & caliper calculation</span>
                  </div>
                  <div className="text-[10px] font-mono text-purple-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Clean finished trim cutlines</span>
                  </div>
                </div>
              </button>

              {/* Product 3: Book Text / Signatures */}
              <button
                type="button"
                onClick={() => setProductType('TEXT')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  productType === 'TEXT'
                    ? 'bg-gradient-to-br from-blue-950/70 via-slate-900 to-cyan-950/60 border-cyan-400 shadow-xl shadow-cyan-950/50'
                    : 'bg-[#121826] border-[#222E42] hover:border-slate-500 hover:bg-[#161F30]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      productType === 'TEXT' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Layers className="w-5 h-5" />
                    </div>
                    {productType === 'TEXT' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-700">
                        <CheckCircle2 className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white m-0">Book Text & Pages</h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono leading-relaxed">
                    Multi-page publications, 16PP, 32PP, 8PP, 4PP CIP4 signature folding layouts.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>CIP4 / Preps signature imposition</span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Spine collation staircase marks</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ─── Step 2: Press Sheet Size & UPS Selection ─── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">2</span>
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono m-0">
                  Select Press Sheet Size & UPS Yield
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Minimum Sheet & Optimal Yields Highlighted
              </span>
            </div>

            {/* Grid of Sheet Cards with 3-Tier Visual Imposition Ranking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sheetOptions.map((sheet) => {
                const isSelected = selectedSheetName === sheet.name;
                const isRank1 = sheet.rank === 1;
                const isRank2 = sheet.rank === 2;
                const isRank3 = sheet.rank === 3;

                // Color themes according to user instructions:
                // Best Imposition -> Green
                // Second Best -> Light Green
                // Third Best -> Light Yellow
                let cardThemeClass = 'bg-[#121826] border-[#222E42] hover:border-slate-500 hover:bg-[#161F30]';
                let rankBadgeBg = 'bg-slate-800 text-slate-300 border-slate-700';

                if (isRank1) {
                  cardThemeClass = isSelected
                    ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/70 border-emerald-400 shadow-xl shadow-emerald-950/70 ring-2 ring-emerald-400'
                    : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-[#121826] border-emerald-500/80 hover:border-emerald-400 hover:bg-emerald-950/50 shadow-md shadow-emerald-950/40';
                  rankBadgeBg = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/30';
                } else if (isRank2) {
                  cardThemeClass = isSelected
                    ? 'bg-gradient-to-br from-lime-950/80 via-slate-900 to-emerald-950/60 border-lime-400 shadow-xl shadow-lime-950/60 ring-2 ring-lime-400'
                    : 'bg-gradient-to-br from-lime-950/30 via-slate-900 to-[#121826] border-lime-500/70 hover:border-lime-400 hover:bg-lime-950/40 shadow-sm shadow-lime-950/30';
                  rankBadgeBg = 'bg-lime-400 text-slate-950 font-bold border-lime-300 shadow-md shadow-lime-400/25';
                } else if (isRank3) {
                  cardThemeClass = isSelected
                    ? 'bg-gradient-to-br from-yellow-950/80 via-slate-900 to-amber-950/60 border-yellow-400 shadow-xl shadow-yellow-950/60 ring-2 ring-yellow-400'
                    : 'bg-gradient-to-br from-yellow-950/30 via-slate-900 to-[#121826] border-yellow-400/70 hover:border-yellow-300 hover:bg-yellow-950/40 shadow-sm shadow-yellow-950/20';
                  rankBadgeBg = 'bg-yellow-400 text-slate-950 font-bold border-yellow-300 shadow-md shadow-yellow-400/25';
                } else if (isSelected) {
                  cardThemeClass = 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 border-cyan-400 shadow-xl shadow-cyan-950/60 ring-2 ring-cyan-400/40';
                }

                return (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => setSelectedSheetName(sheet.name)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${cardThemeClass}`}
                  >
                    <div>
                      {/* Top Rank Banner & Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm sm:text-base font-bold font-mono ${
                            isSelected ? 'text-white' : isRank1 ? 'text-emerald-200' : isRank2 ? 'text-lime-200' : isRank3 ? 'text-yellow-200' : 'text-slate-200'
                          }`}>
                            {sheet.name}
                          </span>
                          {sheet.isCustomFit ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                              Tailored
                            </span>
                          ) : sheet.tech === 'OFFSET' ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                              Offset
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              Digital
                            </span>
                          )}
                        </div>

                        {/* UPS Badge */}
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                          isRank1
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                            : isRank2
                            ? 'bg-lime-400 text-slate-950 border-lime-300 shadow-sm'
                            : isRank3
                            ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-sm'
                            : isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {sheet.ups} UPS
                        </span>
                      </div>

                      {/* Sheet Dimensions */}
                      <div className="text-[11px] font-mono text-slate-400">
                        {sheet.widthIn}" × {sheet.heightIn}" ({sheet.widthMM} × {sheet.heightMM} mm)
                      </div>

                      {/* Prominent Visual Hierarchy Ranking Badges */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {isRank1 && (
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 border border-emerald-400 shadow-sm flex items-center gap-1">
                            <span>★</span> Best Imposition
                          </span>
                        )}
                        {isRank2 && (
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-lime-400 text-slate-950 border border-lime-300 shadow-sm flex items-center gap-1">
                            <span>●</span> 2nd Best Option
                          </span>
                        )}
                        {isRank3 && (
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 border border-yellow-300 shadow-sm flex items-center gap-1">
                            <span>▲</span> 3rd Best Option
                          </span>
                        )}
                        {sheet.isCustomFit && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                            Zero Waste • 5mm Gap
                          </span>
                        )}
                        {!isRank1 && !isRank2 && !isRank3 && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                            {sheet.layoutText || `${sheet.cols} × ${sheet.rows}`} Grid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Miniature Layout Preview & Efficiency */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">
                        Efficiency: <span className={`font-bold ${isRank1 ? 'text-emerald-400' : isRank2 ? 'text-lime-400' : isRank3 ? 'text-yellow-400' : 'text-slate-200'}`}>
                          {sheet.efficiency}%
                        </span>
                      </span>
                      <span className="text-slate-500">
                        {sheet.sheetOrientation === 'LANDSCAPE' ? 'Landscape' : 'Portrait'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Production Defaults Guarantee ─── */}
          <div className="p-3.5 rounded-2xl bg-[#101624] border border-[#233045] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-white">Prepress Quality Guarantee:</strong> Top title header is preserved by default.
              </span>
            </div>
            {productType === 'BOX' && (
              <span className="text-emerald-300 text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ✓ Camera & crop marks hidden for clean die-cutting
              </span>
            )}
          </div>
        </div>

        {/* ─── Footer Action Bar ─────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0E17] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <span className="text-slate-500">Configured:</span>
            <span className="text-white font-bold">{productType === 'BOX' ? 'Packaging Box' : productType === 'COVER' ? 'Book Cover' : 'Book Text'}</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-bold">{activeSheet?.name}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold">{activeSheet?.ups} UPS</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
              title="Skip directly to Imposition studio"
            >
              <span>⚡ Fast-Track to Imposition</span>
            </button>

            <button
              type="button"
              onClick={handleStepByStep}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-blue-400 text-slate-950 font-bold font-mono text-xs sm:text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Verify detected carton dimensions, layers, and preflight audit quality"
            >
              <span>Start Prepress Workflow (Analyze → Validate → Impose)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
