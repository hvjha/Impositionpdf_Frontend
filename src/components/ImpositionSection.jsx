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
  CheckCircle2,
  RotateCw,
  Compass,
  MoveHorizontal,
  MoveVertical,
  Maximize2,
  Settings2,
  SlidersHorizontal,
  Camera,
  Link2,
  Unlink
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
  { name: 'CUSTOM',         label: 'Custom Press Sheet Size...', width: null, height: null, isCustom: true },
];

const BOOK_PRESETS = [
  { name: 'AUTO',        label: 'Auto (Detect from Source PDF)',              desc: 'Uses uploaded PDF page size', isAuto: true },
  { name: 'A5',          label: 'A5 (148 × 210 mm)',                  width: 148,   height: 210,   desc: 'Standard Novel / Paperback' },
  { name: 'A4',          label: 'A4 (210 × 297 mm)',                  width: 210,   height: 297,   desc: 'Magazines, Catalogues, Manuals' },
  { name: 'ROYAL_8VO',   label: 'Royal Octavo (156 × 234 mm)',        width: 156,   height: 234,   desc: 'Hardcover & Academic Standard' },
  { name: 'CROWN_8VO',   label: 'Crown Octavo (126 × 190 mm)',        width: 126,   height: 190,   desc: 'Standard Fiction & Trade' },
  { name: 'DEMY_8VO',    label: 'Demy Octavo (138 × 216 mm)',         width: 138,   height: 216,   desc: 'Non-Fiction, Memoirs, Biography' },
  { name: 'US_TRADE',    label: 'US Trade 6×9 in (152.4 × 228.6 mm)',  width: 152.4, height: 228.6, desc: 'North American Standard 6×9' },
  { name: 'US_DIGEST',   label: 'US Digest 5.5×8.5 in (140 × 216 mm)', width: 139.7, height: 215.9, desc: 'US Digest 5.5×8.5 Standard' },
  { name: 'B5',          label: 'B5 (176 × 250 mm)',                  width: 176,   height: 250,   desc: 'Textbooks & Scientific Journals' },
  { name: 'POCKET',      label: 'Pocket Book (110 × 178 mm)',         width: 110,   height: 178,   desc: 'Mass Market Paperback' },
  { name: 'CUSTOM',      label: 'Custom Book Size...',                width: null,  height: null,  desc: 'Enter custom trim width & height', isCustom: true }
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

  // ─── Sheet Dimensions (Raw Stock Paper) ─────────────────────────────────
  const [sheetPreset, setSheetPreset] = useState('23×36"');
  const [sheetWidth, setSheetWidth] = useState(584);
  const [sheetHeight, setSheetHeight] = useState(914);
  const [customSheet, setCustomSheet] = useState(false);

  // ─── Book Dimensions (Finished Trim Size) ───────────────────────────────
  const sourcePdfPageWidthMM = useMemo(() => {
    if (analysisData?.firstPage?.width) {
      return Math.round((analysisData.firstPage.width / 2.834645) * 10) / 10;
    }
    return 148;
  }, [analysisData?.firstPage?.width]);

  const sourcePdfPageHeightMM = useMemo(() => {
    if (analysisData?.firstPage?.height) {
      return Math.round((analysisData.firstPage.height / 2.834645) * 10) / 10;
    }
    return 210;
  }, [analysisData?.firstPage?.height]);

  const [bookPreset, setBookPreset] = useState('AUTO');
  const [bookWidth, setBookWidth] = useState(148);
  const [bookHeight, setBookHeight] = useState(210);
  const [customBook, setCustomBook] = useState(false);

  // Auto-sync Book Size when analysisData arrives (if bookPreset is AUTO)
  useEffect(() => {
    if (bookPreset === 'AUTO' && sourcePdfPageWidthMM && sourcePdfPageHeightMM) {
      setBookWidth(sourcePdfPageWidthMM);
      setBookHeight(sourcePdfPageHeightMM);
    }
  }, [bookPreset, sourcePdfPageWidthMM, sourcePdfPageHeightMM]);

  // ─── Sheet & Page Orientation ───────────────────────────────────────────
  const [sheetOrientation, setSheetOrientation] = useState('PORTRAIT'); // 'PORTRAIT' | 'LANDSCAPE'
  const [pageOrientation, setPageOrientation] = useState('AUTO'); // 'AUTO' | 'PORTRAIT' | 'LANDSCAPE'
  const [pageRotation, setPageRotation] = useState(0); // 0 | 90 | 180 | 270

  // ─── Sheet Margins (Vertical & Horizontal + Advanced 4-Sided) ───────────
  const [verticalMargin, setVerticalMargin] = useState(10);
  const [horizontalMargin, setHorizontalMargin] = useState(10);
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);
  const [showAdvancedMargins, setShowAdvancedMargins] = useState(false);

  const [bleedTop, setBleedTop] = useState(3);
  const [bleedBottom, setBleedBottom] = useState(3);
  const [bleedLeft, setBleedLeft] = useState(3);
  const [bleedRight, setBleedRight] = useState(3);
  const [bleedLinked, setBleedLinked] = useState(true);

  // ─── Gutters / Cut Spacing ─────────────────────────────────────────────
  const [gutterX, setGutterX] = useState(4);
  const [gutterY, setGutterY] = useState(4);
  const [guttersLinked, setGuttersLinked] = useState(true);

  // ─── Prepress Production Marks ──────────────────────────────────────────
  const [cropMarks, setCropMarks] = useState(true);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);
  const [registrationMarks, setRegistrationMarks] = useState(true);
  const [colorBars, setColorBars] = useState(true);
  const [cameraMarks, setCameraMarks] = useState(true);
  const [cameraMarkSize, setCameraMarkSize] = useState(5); // mm diameter
  const [cameraMarkOffset, setCameraMarkOffset] = useState(8); // mm sheet inset
  const [cameraMarkStyle, setCameraMarkStyle] = useState('RING'); // 'RING' | 'SOLID' | 'TARGET'
  const [cameraMarkPositions, setCameraMarkPositions] = useState('CORNERS_AND_EDGES'); // 'CORNERS_AND_EDGES' | 'CORNERS'
  const [showCameraOptions, setShowCameraOptions] = useState(false);
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

  // Prepress Fit Intelligence: Compare Sheet Printable Area vs Book Grid
  const fitMetrics = useMemo(() => {
    const sw = parseFloat(sheetWidth) || 0;
    const sh = parseFloat(sheetHeight) || 0;
    const ml = parseFloat(marginLeft) || 0;
    const mr = parseFloat(marginRight) || 0;
    const mt = parseFloat(marginTop) || 0;
    const mb = parseFloat(marginBottom) || 0;
    const gx = parseFloat(gutterX) || 0;
    const gy = parseFloat(gutterY) || 0;
    const c = Math.max(1, columns);
    const r = Math.max(1, rows);

    const printableW = Math.max(0, sw - ml - mr);
    const printableH = Math.max(0, sh - mt - mb);

    const slotW = Math.max(0, (printableW - gx * (c - 1)) / c);
    const slotH = Math.max(0, (printableH - gy * (r - 1)) / r);

    const targetW = parseFloat(bookWidth) || 0;
    const targetH = parseFloat(bookHeight) || 0;

    const fitsCleanly = slotW >= targetW && slotH >= targetH;
    const deltaW = Math.round((slotW - targetW) * 10) / 10;
    const deltaH = Math.round((slotH - targetH) * 10) / 10;

    return {
      printableW: Math.round(printableW * 10) / 10,
      printableH: Math.round(printableH * 10) / 10,
      slotW: Math.round(slotW * 10) / 10,
      slotH: Math.round(slotH * 10) / 10,
      targetW,
      targetH,
      fitsCleanly,
      deltaW,
      deltaH
    };
  }, [sheetWidth, sheetHeight, marginLeft, marginRight, marginTop, marginBottom, gutterX, gutterY, columns, rows, bookWidth, bookHeight]);

  // Handlers for Sheet Size
  const handleSelectSheetPreset = (preset) => {
    setSheetPreset(preset.name);
    if (preset.name === 'CUSTOM') {
      setCustomSheet(true);
      return;
    }
    setCustomSheet(false);
    let w = preset.width;
    let h = preset.height;
    if (sheetOrientation === 'LANDSCAPE' && w < h) {
      const tmp = w; w = h; h = tmp;
    } else if (sheetOrientation === 'PORTRAIT' && w > h) {
      const tmp = w; w = h; h = tmp;
    }
    setSheetWidth(w);
    setSheetHeight(h);
  };

  const handleSheetWidthChange = (val) => {
    const num = parseFloat(val) || 0;
    setSheetWidth(num);
    setSheetPreset('CUSTOM');
    setCustomSheet(true);
  };

  const handleSheetHeightChange = (val) => {
    const num = parseFloat(val) || 0;
    setSheetHeight(num);
    setSheetPreset('CUSTOM');
    setCustomSheet(true);
  };

  // Handlers for Book Size
  const handleSelectBookPreset = (presetName) => {
    setBookPreset(presetName);
    if (presetName === 'AUTO') {
      setBookWidth(sourcePdfPageWidthMM);
      setBookHeight(sourcePdfPageHeightMM);
      setCustomBook(false);
    } else if (presetName === 'CUSTOM') {
      setCustomBook(true);
    } else {
      setCustomBook(false);
      const p = BOOK_PRESETS.find(x => x.name === presetName);
      if (p && p.width && p.height) {
        setBookWidth(p.width);
        setBookHeight(p.height);
      }
    }
  };

  const handleBookWidthChange = (val) => {
    const num = parseFloat(val) || 0;
    setBookWidth(num);
    setBookPreset('CUSTOM');
    setCustomBook(true);
  };

  const handleBookHeightChange = (val) => {
    const num = parseFloat(val) || 0;
    setBookHeight(num);
    setBookPreset('CUSTOM');
    setCustomBook(true);
  };

  // Handlers for Margins
  const handleVerticalMarginChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setVerticalMargin(v);
    setMarginTop(v);
    setMarginBottom(v);
  };

  const handleHorizontalMarginChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setHorizontalMargin(v);
    setMarginLeft(v);
    setMarginRight(v);
  };

  const handleIndividualMarginChange = (side, val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    if (side === 'top') {
      setMarginTop(v);
      if (v === marginBottom) setVerticalMargin(v);
    } else if (side === 'bottom') {
      setMarginBottom(v);
      if (v === marginTop) setVerticalMargin(v);
    } else if (side === 'left') {
      setMarginLeft(v);
      if (v === marginRight) setHorizontalMargin(v);
    } else if (side === 'right') {
      setMarginRight(v);
      if (v === marginLeft) setHorizontalMargin(v);
    }
  };

  // Handlers for Cut Gutters (Padding between pages)
  const handleGutterXChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setGutterX(v);
    if (guttersLinked) setGutterY(v);
  };

  const handleGutterYChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setGutterY(v);
    if (guttersLinked) setGutterX(v);
  };

  const handleToggleGuttersLinked = () => {
    const nextLinked = !guttersLinked;
    setGuttersLinked(nextLinked);
    if (nextLinked) {
      setGutterY(gutterX);
    }
  };

  const handleQuickGutterPreset = (presetMm) => {
    setGutterX(presetMm);
    setGutterY(presetMm);
  };

  const handleToggleSheetOrientation = (newOrientation) => {
    if (newOrientation === sheetOrientation) return;
    setSheetOrientation(newOrientation);
    const w = parseFloat(sheetWidth);
    const h = parseFloat(sheetHeight);
    if ((newOrientation === 'LANDSCAPE' && w < h) || (newOrientation === 'PORTRAIT' && w > h)) {
      setSheetWidth(h);
      setSheetHeight(w);
    }
  };

  const handleSelectPageOrientation = (orient, rot = 0) => {
    setPageOrientation(orient);
    setPageRotation(rot);
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
        unit: 'mm',
        orientation: sheetOrientation,
        preset: sheetPreset,
        isCustom: sheetPreset === 'CUSTOM'
      },
      bookSize: {
        width: parseFloat(bookWidth),
        height: parseFloat(bookHeight),
        unit: 'mm',
        preset: bookPreset,
        isCustom: bookPreset === 'CUSTOM'
      },
      layout: {
        pagesPerLayout: partMode === 'COVER' ? 4 : selectedLayout,
        mode: partMode === 'COVER' ? 'COVER' : 'TEXT',
        orientation: pageOrientation,
        pageOrientation,
        pageRotation: parseInt(pageRotation, 10) || 0
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
        right: parseFloat(marginRight || 0),
        vertical: parseFloat(verticalMargin || 0),
        horizontal: parseFloat(horizontalMargin || 0)
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
        registration: registrationMarks,
        colorBars,
        colorBar: colorBars,
        cameraMarks: cameraMarks ? {
          enabled: true,
          size: parseFloat(cameraMarkSize) || 5,
          offset: parseFloat(cameraMarkOffset) || 8,
          style: cameraMarkStyle,
          positions: cameraMarkPositions
        } : false,
        cameraMarkSize: parseFloat(cameraMarkSize) || 5,
        cameraMarkOffset: parseFloat(cameraMarkOffset) || 8,
        cameraMarkStyle,
        cameraMarkPositions,
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

          {/* ─── 1. Press Sheet Setup ─────────────────────────────────────── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">1. Press Sheet (Paper Stock)</span>
              </div>
              {sheetPreset === 'CUSTOM' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700">
                  Custom Size
                </span>
              )}
            </div>

            {/* Sheet Presets Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-slate-400">Sheet Stock Preset</label>
                <span className="text-[10px] font-mono text-slate-500">
                  {sheetWidth} × {sheetHeight} mm
                </span>
              </div>
              <select
                value={sheetPreset}
                onChange={(e) => {
                  const p = SHEET_PRESETS.find(x => x.name === e.target.value);
                  if (p) handleSelectSheetPreset(p);
                }}
                className="w-full bg-[#10141D] border border-[#233045] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                {SHEET_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Press Sheet Dimensions */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              sheetPreset === 'CUSTOM' ? 'bg-cyan-950/40 border-cyan-500/70 shadow-sm' : 'bg-[#10141D] border-[#233045]'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono text-slate-300 font-bold uppercase flex items-center gap-1.5">
                  <span>Custom Sheet Dimensions</span>
                  {sheetPreset === 'CUSTOM' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500 text-black font-bold">Custom Active</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const temp = sheetWidth;
                    setSheetWidth(sheetHeight);
                    setSheetHeight(temp);
                    setSheetPreset('CUSTOM');
                  }}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
                  title="Swap Width and Height"
                >
                  Swap W↔H
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-[10px] font-mono text-slate-500">W:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={sheetWidth}
                    onChange={(e) => handleSheetWidthChange(e.target.value)}
                    className="w-full bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded-lg pl-7 pr-7 py-1.5 text-xs font-mono text-white"
                    placeholder="Width mm"
                  />
                  <span className="absolute right-2 top-2 text-[9px] font-mono text-slate-500">mm</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-[10px] font-mono text-slate-500">H:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={sheetHeight}
                    onChange={(e) => handleSheetHeightChange(e.target.value)}
                    className="w-full bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded-lg pl-7 pr-7 py-1.5 text-xs font-mono text-white"
                    placeholder="Height mm"
                  />
                  <span className="absolute right-2 top-2 text-[9px] font-mono text-slate-500">mm</span>
                </div>
              </div>
              {sheetPreset === 'CUSTOM' && (
                <div className="mt-2 pt-2 border-t border-[#1E293B] flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono text-slate-500">Quick Sizes:</span>
                  {[
                    { label: 'SRA3 320×450', w: 320, h: 450 },
                    { label: 'B2 500×707', w: 500, h: 707 },
                    { label: '23×36" (584×914)', w: 584, h: 914 },
                    { label: '19×25" (483×635)', w: 483, h: 635 }
                  ].map(sz => (
                    <button
                      key={sz.label}
                      type="button"
                      onClick={() => {
                        setSheetWidth(sz.w);
                        setSheetHeight(sz.h);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#141C2A] hover:bg-[#1E293B] text-cyan-300 text-[9px] font-mono border border-[#233045] transition-all"
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sheet Orientation Selector */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Sheet Feed Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSheetOrientation('PORTRAIT')}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sheetOrientation === 'PORTRAIT'
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm">↕️</span>
                  <span>Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSheetOrientation('LANDSCAPE')}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sheetOrientation === 'LANDSCAPE'
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm">↔️</span>
                  <span>Landscape</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── 2. Finished Book Size Setup ──────────────────────────────── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">2. Finished Book Size (Trim)</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                bookPreset === 'CUSTOM'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : bookPreset === 'AUTO'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                  : 'bg-[#10141D] text-slate-400 border-[#233045]'
              }`}>
                {bookPreset === 'CUSTOM' ? 'Custom Trim' : bookPreset === 'AUTO' ? 'Auto-Detect' : bookPreset}
              </span>
            </div>

            {/* Book Presets Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-slate-400">Standard Book Trim Preset</label>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {bookWidth} × {bookHeight} mm
                </span>
              </div>
              <select
                value={bookPreset}
                onChange={(e) => handleSelectBookPreset(e.target.value)}
                className="w-full bg-[#10141D] border border-[#233045] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                {BOOK_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Book Trim Dimensions */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              bookPreset === 'CUSTOM' ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm' : 'bg-[#10141D] border-[#233045]'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono text-slate-300 font-bold uppercase flex items-center gap-1.5">
                  <span>Custom Trim Dimensions</span>
                  {bookPreset === 'CUSTOM' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-black font-bold">Custom Active</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const temp = bookWidth;
                    setBookWidth(bookHeight);
                    setBookHeight(temp);
                    setBookPreset('CUSTOM');
                  }}
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
                  title="Swap Width and Height"
                >
                  Swap W↔H
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-[10px] font-mono text-slate-500">W:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={bookWidth}
                    onChange={(e) => handleBookWidthChange(e.target.value)}
                    className="w-full bg-[#141C2A] border border-[#233045] focus:border-emerald-500 rounded-lg pl-7 pr-7 py-1.5 text-xs font-mono text-white"
                    placeholder="Width mm"
                  />
                  <span className="absolute right-2 top-2 text-[9px] font-mono text-slate-500">mm</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-[10px] font-mono text-slate-500">H:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={bookHeight}
                    onChange={(e) => handleBookHeightChange(e.target.value)}
                    className="w-full bg-[#141C2A] border border-[#233045] focus:border-emerald-500 rounded-lg pl-7 pr-7 py-1.5 text-xs font-mono text-white"
                    placeholder="Height mm"
                  />
                  <span className="absolute right-2 top-2 text-[9px] font-mono text-slate-500">mm</span>
                </div>
              </div>
              {bookPreset === 'CUSTOM' && (
                <div className="mt-2 pt-2 border-t border-[#1E293B] flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono text-slate-500">Quick Trims:</span>
                  {[
                    { label: 'A5 (148×210)', w: 148, h: 210 },
                    { label: 'US Trade 6×9"', w: 152.4, h: 228.6 },
                    { label: 'Demy 8vo (138×216)', w: 138, h: 216 },
                    { label: 'Square 210×210', w: 210, h: 210 }
                  ].map(sz => (
                    <button
                      key={sz.label}
                      type="button"
                      onClick={() => {
                        setBookWidth(sz.w);
                        setBookHeight(sz.h);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#141C2A] hover:bg-[#1E293B] text-emerald-300 text-[9px] font-mono border border-[#233045] transition-all"
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Page Orientation & Rotation Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Page Orientation & Rotation</span>
                </label>
                <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/60">
                  {pageOrientation} ({pageRotation}°)
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectPageOrientation('AUTO', 0)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    pageOrientation === 'AUTO' && pageRotation === 0
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                  }`}
                  title="Auto preserves original page aspect ratio"
                >
                  <div className="text-[9px] text-slate-500">AUTO</div>
                  <div className="text-[10px] font-semibold">Aspect</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPageOrientation('PORTRAIT', 0)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    pageOrientation === 'PORTRAIT' && pageRotation === 0
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                  }`}
                  title="Portrait 0° Upright"
                >
                  <div className="text-[9px] text-slate-500">0°</div>
                  <div className="text-[10px] font-semibold">Portrait</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPageOrientation('LANDSCAPE', 90)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    pageRotation === 90
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                  }`}
                  title="Landscape 90° Clockwise"
                >
                  <div className="text-[9px] text-slate-500">90° CW</div>
                  <div className="text-[10px] font-semibold">Landscp</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPageOrientation('PORTRAIT', 180)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    pageRotation === 180
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                  }`}
                  title="Inverted 180° Head-to-Head"
                >
                  <div className="text-[9px] text-slate-500">180°</div>
                  <div className="text-[10px] font-semibold">Invert</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPageOrientation('LANDSCAPE', 270)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    pageRotation === 270
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                  }`}
                  title="Landscape 270° Counter-Clockwise"
                >
                  <div className="text-[9px] text-slate-500">270° CCW</div>
                  <div className="text-[10px] font-semibold">Turn</div>
                </button>
              </div>
            </div>

            {/* Live Prepress Fit Intelligence Card */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-[#1E293B] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Grid Slot Capacity ({columns}×{rows}):</span>
                <span className="text-cyan-300 font-bold">{fitMetrics.slotW} × {fitMetrics.slotH} mm</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Target Book Trim:</span>
                <span className="text-emerald-300 font-bold">{bookWidth} × {bookHeight} mm</span>
              </div>
              <div className={`pt-1 text-[10px] font-mono border-t border-[#1E293B] ${
                fitMetrics.fitsCleanly ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {fitMetrics.fitsCleanly
                  ? `✓ Fits cleanly on press sheet (+${fitMetrics.deltaW}mm W, +${fitMetrics.deltaH}mm H margin allowance).`
                  : `⚠️ Grid slot is smaller than book trim (${Math.abs(fitMetrics.deltaW)}mm W / ${Math.abs(fitMetrics.deltaH)}mm H). Prepress engine will scale content to fit.`}
              </div>
            </div>
          </div>

          {/* ─── 3. Margins & Machine Press Setup ──────────────────────────── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">3. Margins & Press Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedMargins(!showAdvancedMargins)}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-all"
              >
                <Settings2 className="w-3 h-3" />
                <span>{showAdvancedMargins ? 'Hide 4-Sided' : 'Fine-Tune 4 Sides'}</span>
              </button>
            </div>

            {/* Vertical & Horizontal Margins */}
            <div className="space-y-3">
              {/* Vertical Margin (Top / Bottom) */}
              <div className="p-2.5 rounded-xl bg-[#10141D] border border-[#233045]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 font-bold">
                    <MoveVertical className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Vertical Margin (Top & Bottom)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={verticalMargin}
                      onChange={(e) => handleVerticalMarginChange(e.target.value)}
                      className="w-14 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[10px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={verticalMargin}
                  onChange={(e) => handleVerticalMarginChange(e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Horizontal Margin (Left / Right) */}
              <div className="p-2.5 rounded-xl bg-[#10141D] border border-[#233045]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 font-bold">
                    <MoveHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Horizontal Margin (Left & Right / Grippers)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={horizontalMargin}
                      onChange={(e) => handleHorizontalMarginChange(e.target.value)}
                      className="w-14 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[10px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={horizontalMargin}
                  onChange={(e) => handleHorizontalMarginChange(e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Advanced 4-Sided Fine Tuning (Collapsible) */}
            {showAdvancedMargins && (
              <div className="p-3 rounded-xl bg-[#0D121B] border border-cyan-900/50 space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">
                  Individual 4-Sided Machine Margin Adjustments
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Top (Gripper Lead Edge)</label>
                    <input
                      type="number"
                      value={marginTop}
                      onChange={(e) => handleIndividualMarginChange('top', e.target.value)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Bottom (Tail Edge)</label>
                    <input
                      type="number"
                      value={marginBottom}
                      onChange={(e) => handleIndividualMarginChange('bottom', e.target.value)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Left (Side Guide 1)</label>
                    <input
                      type="number"
                      value={marginLeft}
                      onChange={(e) => handleIndividualMarginChange('left', e.target.value)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Right (Side Guide 2)</label>
                    <input
                      type="number"
                      value={marginRight}
                      onChange={(e) => handleIndividualMarginChange('right', e.target.value)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cut Spacing / Padding around each cut item (Gutters) */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-cyan-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase">
                    Cut Spacing & Padding (Gutters)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGuttersLinked}
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                    guttersLinked
                      ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                  }`}
                  title={guttersLinked ? 'Cut gaps are linked together' : 'Cut gaps are independent'}
                >
                  {guttersLinked ? <Link2 className="w-3 h-3 text-cyan-400" /> : <Unlink className="w-3 h-3 text-slate-500" />}
                  <span>{guttersLinked ? 'Linked Gaps' : 'Independent'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 m-0">
                Padding & gutter spacing between individual cuts on the {columns}×{rows} grid ({selectedLayout}PP signature / {columns * rows}-up press sheet).
              </p>

              {/* Horizontal Gutter (Column Cut Gap) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                    <span>Horizontal Cut Gap (Cols):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={gutterX}
                      onChange={(e) => handleGutterXChange(e.target.value)}
                      className="w-14 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[10px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={gutterX}
                  onChange={(e) => handleGutterXChange(e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Vertical Gutter (Row Cut Gap) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
                    <MoveVertical className="w-3 h-3 text-cyan-400" />
                    <span>Vertical Cut Gap (Rows / Spine):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={gutterY}
                      onChange={(e) => handleGutterYChange(e.target.value)}
                      className="w-14 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[10px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={gutterY}
                  onChange={(e) => handleGutterYChange(e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Quick Gutter Presets */}
              <div className="pt-1.5 border-t border-[#1E293B] flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-mono text-slate-500">Gap Presets:</span>
                {[
                  { label: '0 mm (Butt Cut)', val: 0 },
                  { label: '3 mm (Double Cut)', val: 3 },
                  { label: '4 mm (Standard)', val: 4 },
                  { label: '6 mm', val: 6 },
                  { label: '10 mm', val: 10 }
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleQuickGutterPreset(p.val)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                      gutterX === p.val && gutterY === p.val
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'bg-[#141C2A] text-slate-400 hover:text-white border border-[#233045]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bleed & Work Style */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1E293B]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-400">Bleed (Trim Box)</span>
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

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Work Style</label>
                <select
                  value={workStyle}
                  onChange={(e) => setWorkStyle(e.target.value)}
                  className="w-full bg-[#10141D] border border-[#233045] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  {WORK_STYLES.map((ws) => (
                    <option key={ws.value} value={ws.value}>{ws.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ─── Production Marks Checkboxes ──────────────────────────────── */}
          <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                Production Marks
              </span>
              {cameraMarks && (
                <button
                  type="button"
                  onClick={() => setShowCameraOptions(!showCameraOptions)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1 cursor-pointer ${
                    showCameraOptions
                      ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                      : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-700 text-cyan-300'
                  }`}
                  title="Configure Camera Marks"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>{showCameraOptions ? 'Hide Cam Opts' : 'Camera Opts'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cropMarks} onChange={(e) => setCropMarks(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Crop Marks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cameraMarks} onChange={(e) => setCameraMarks(e.target.checked)} className="rounded accent-cyan-400" />
                <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                  <Camera className="w-3.5 h-3.5" /> Camera Marks
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={registrationMarks} onChange={(e) => setRegistrationMarks(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Registration Targets</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={colorBars} onChange={(e) => setColorBars(e.target.checked)} className="rounded accent-cyan-400" />
                <span className="text-amber-300 font-semibold">CMYK Color Bars</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={jobSlug} onChange={(e) => setJobSlug(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Job Slug Line</span>
              </label>
              {partMode === 'TEXT' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={collatingMarks} onChange={(e) => setCollatingMarks(e.target.checked)} className="rounded accent-cyan-400" />
                  <span>Collating Marks</span>
                </label>
              )}
            </div>

            {/* ─── Expandable Camera Mark Options ─── */}
            {cameraMarks && showCameraOptions && (
              <div className="mt-3 pt-3 border-t border-[#1E293B] space-y-3 bg-[#10141D] p-3 rounded-xl border border-cyan-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5 uppercase">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    Optical Camera Fiducial Options
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    Zünd • Kongsberg • i-cut
                  </span>
                </div>

                {/* Mark Style */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">Mark Style & Geometry:</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{cameraMarkStyle}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'RING', label: 'Ring + Dot', desc: 'Zünd / Kongsberg' },
                      { id: 'SOLID', label: 'Solid Dot', desc: 'i-cut standard' },
                      { id: 'TARGET', label: 'Crosshair', desc: 'Optical bullseye' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setCameraMarkStyle(st.id)}
                        className={`px-2 py-1.5 rounded-lg text-left transition-all border ${
                          cameraMarkStyle === st.id
                            ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-sm'
                            : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[11px] font-mono font-bold">{st.label}</div>
                        <div className="text-[9px] text-slate-500 line-clamp-1">{st.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mark Diameter / Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">Fiducial Diameter (Size):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="2"
                        max="12"
                        step="0.5"
                        value={cameraMarkSize}
                        onChange={(e) => setCameraMarkSize(Math.max(1, parseFloat(e.target.value) || 5))}
                        className="w-14 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                      />
                      <span className="text-[10px] font-mono text-slate-500">mm</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { val: 3, label: '3 mm' },
                      { val: 4, label: '4 mm' },
                      { val: 5, label: '5 mm (Std)' },
                      { val: 6, label: '6 mm' },
                      { val: 8, label: '8 mm (Large)' }
                    ].map(sz => (
                      <button
                        key={sz.val}
                        type="button"
                        onClick={() => setCameraMarkSize(sz.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                          cameraMarkSize === sz.val
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                            : 'bg-[#141C2A] text-slate-400 hover:text-white border-[#233045]'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edge Inset / Offset */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">Edge Inset (Offset from Sheet Margin):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="3"
                        max="30"
                        step="1"
                        value={cameraMarkOffset}
                        onChange={(e) => setCameraMarkOffset(Math.max(2, parseFloat(e.target.value) || 8))}
                        className="w-14 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                      />
                      <span className="text-[10px] font-mono text-slate-500">mm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="25"
                    step="1"
                    value={cameraMarkOffset}
                    onChange={(e) => setCameraMarkOffset(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {[
                      { val: 5, label: '5 mm' },
                      { val: 8, label: '8 mm (Std)' },
                      { val: 10, label: '10 mm' },
                      { val: 15, label: '15 mm' }
                    ].map(off => (
                      <button
                        key={off.val}
                        type="button"
                        onClick={() => setCameraMarkOffset(off.val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                          cameraMarkOffset === off.val
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                            : 'bg-[#141C2A] text-slate-400 hover:text-white border-[#233045]'
                        }`}
                      >
                        {off.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Placement Positions */}
                <div className="pt-2 border-t border-[#1E293B]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400">Fiducial Distribution:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCameraMarkPositions('CORNERS_AND_EDGES')}
                      className={`px-2 py-1.5 rounded-lg text-left transition-all border ${
                        cameraMarkPositions === 'CORNERS_AND_EDGES'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-mono">4 Corners + Mid Edges</div>
                      <div className="text-[9px] text-slate-500">8 fiducials (Large Format / Zünd)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraMarkPositions('CORNERS')}
                      className={`px-2 py-1.5 rounded-lg text-left transition-all border ${
                        cameraMarkPositions === 'CORNERS'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-mono">4 Corners Only</div>
                      <div className="text-[9px] text-slate-500">Perimeter registration</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            cameraMarks={cameraMarks}
            cameraMarkSize={cameraMarkSize}
            cameraMarkOffset={cameraMarkOffset}
            cameraMarkStyle={cameraMarkStyle}
            cameraMarkPositions={cameraMarkPositions}
            workStyle={workStyle}
            impositionMode={bindingStyle}
            selectedLayout={selectedLayout}
            totalPages={totalBookPages}
            sheetIndex={signatureIndex}
            onSheetChange={(idx) => setSignatureIndex(idx)}
            thumbnails={thumbnails}
            thumbnailsLoading={thumbnailsLoading}
            thumbnailsProgress={thumbnailsProgress}
            pageRotation={pageRotation}
            pageOrientation={pageOrientation}
            bookWidth={parseFloat(bookWidth)}
            bookHeight={parseFloat(bookHeight)}
            bookPreset={bookPreset}
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
