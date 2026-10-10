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
  Unlink,
  Package,
  Box,
  Zap,
  Ruler
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
  { pages: 8, label: '8PP', name: '8PP Right-Angle', desc: 'CIP4 F8-1 • 2×2 Duplex (Small Section)', cols: 2, rows: 2 },
  { pages: 4, label: '4PP', name: '4PP Folio', desc: 'CIP4 F4-1 • 2×1 Duplex (Half-Fold Booklet)', cols: 2, rows: 1 },
  { pages: 2, label: '2PP', name: '2PP Spread', desc: 'Single-fold / 2-up Spread', cols: 2, rows: 1 },
];

const SHEET_PRESETS = [
  { name: 'SRA3', label: 'SRA3 (320 × 450 mm) • Digital Std', width: 320, height: 450, tech: 'DIGITAL' },
  { name: 'A3+', label: 'A3+ (329 × 483 mm) • Digital Extra', width: 329, height: 483, tech: 'DIGITAL' },
  { name: 'A3', label: 'A3 (297 × 420 mm) • Digital Medium', width: 297, height: 420, tech: 'DIGITAL' },
  { name: 'A4', label: 'A4 (210 × 297 mm) • Digital Short-Run', width: 210, height: 297, tech: 'DIGITAL' },
  { name: 'B2', label: 'B2 (500 × 707 mm) • Half-Size Offset', width: 500, height: 707, tech: 'OFFSET' },
  { name: '20×26"', label: '20 × 26 in (508 × 660 mm) • Offset Short', width: 508, height: 660, tech: 'OFFSET' },
  { name: '23×36"', label: '23 × 36 in (584 × 914 mm) • Offset 8-up', width: 584, height: 914, tech: 'OFFSET' },
  { name: '25×38"', label: '25 × 38 in (635 × 965 mm) • Offset Book', width: 635, height: 965, tech: 'OFFSET' },
  { name: 'CUSTOM', label: 'Custom Press Sheet Size...', width: null, height: null, isCustom: true },
];

const BOOK_PRESETS = [
  { name: 'AUTO', label: 'Auto (Detect from Source PDF)', desc: 'Uses uploaded PDF page size', isAuto: true },
  { name: 'A5', label: 'A5 (148 × 210 mm)', width: 148, height: 210, desc: 'Standard Novel / Paperback' },
  { name: 'A4', label: 'A4 (210 × 297 mm)', width: 210, height: 297, desc: 'Magazines, Catalogues, Manuals' },
  { name: 'ROYAL_8VO', label: 'Royal Octavo (156 × 234 mm)', width: 156, height: 234, desc: 'Hardcover & Academic Standard' },
  { name: 'CROWN_8VO', label: 'Crown Octavo (126 × 190 mm)', width: 126, height: 190, desc: 'Standard Fiction & Trade' },
  { name: 'DEMY_8VO', label: 'Demy Octavo (138 × 216 mm)', width: 138, height: 216, desc: 'Non-Fiction, Memoirs, Biography' },
  { name: 'US_TRADE', label: 'US Trade 6×9 in (152.4 × 228.6 mm)', width: 152.4, height: 228.6, desc: 'North American Standard 6×9' },
  { name: 'US_DIGEST', label: 'US Digest 5.5×8.5 in (140 × 216 mm)', width: 139.7, height: 215.9, desc: 'US Digest 5.5×8.5 Standard' },
  { name: 'B5', label: 'B5 (176 × 250 mm)', width: 176, height: 250, desc: 'Textbooks & Scientific Journals' },
  { name: 'POCKET', label: 'Pocket Book (110 × 178 mm)', width: 110, height: 178, desc: 'Mass Market Paperback' },
  { name: 'CUSTOM', label: 'Custom Book Size...', width: null, height: null, desc: 'Enter custom trim width & height', isCustom: true }
];

const BINDING_STYLES = [
  { value: 'PERFECT_BINDING', label: 'Perfect Binding', icon: Layers, desc: 'Signatures gathered consecutively & glued at spine' },
  { value: 'SADDLE_STITCH', label: 'Saddle Stitch', icon: BookOpen, desc: 'Signatures nested inside each other & wire stitched at spine fold' },
  { value: 'SECTION_SEWING', label: 'Section Sewing', icon: FileCheck, desc: 'Signatures sewn through center fold then gathered' },
  { value: 'CUT_AND_STACK', label: 'Cut & Stack', icon: Scissors, desc: 'Guillotine cut & stacked in order for digital presses' },
];

const WORK_STYLES = [
  { value: 'SHEETWISE', label: 'Sheetwise (Front & Back Plates)', desc: 'Standard duplex with independent front and back' },
  { value: 'WORK_AND_TURN', label: 'Work and Turn', desc: 'Same plate, flip sheet along horizontal axis' },
  { value: 'WORK_AND_TUMBLE', label: 'Work and Tumble', desc: 'Same plate, flip sheet head-to-foot (vertical axis)' },
  { value: 'SIMPLEX', label: 'Simplex (Single-Sided)', desc: 'Print on front side only' },
  { value: 'PERFECTOR', label: 'Perfector Press', desc: 'Simultaneous duplex printing' },
];

// Paper stocks for dynamic spine calculation
const PAPER_CALIPER_PRESETS = [
  { label: '80 gsm White Offset / Book Paper', caliper: 0.096 },
  { label: '70 gsm Maplitho / Novel Stock', caliper: 0.091 },
  { label: '90 gsm Gloss / Matt Art', caliper: 0.082 },
  { label: '100 gsm Art Paper', caliper: 0.095 },
  { label: '130 gsm Art Paper', caliper: 0.115 },
  { label: '170 gsm Heavy Art Card', caliper: 0.150 },
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

  // ─── High-Level Prepress Part: Book Text vs Book Cover vs Box Studio ──
  const [partMode, setPartMode] = useState('TEXT'); // 'TEXT' | 'COVER' | 'BOX'

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

  // ─── Box & Packaging Studio Settings ─────────────────────────────────────
  const [boxStyle, setBoxStyle] = useState('RTE'); // 'RTE' | 'STE' | 'LOCK_BOTTOM' | 'SLEEVE' | 'CUSTOM'
  const [boxLength, setBoxLength] = useState(100); // mm (L)
  const [boxWidth, setBoxWidth] = useState(60);   // mm (W)
  const [boxHeight, setBoxHeight] = useState(140);  // mm (H / Depth)
  const [glueTabWidth, setGlueTabWidth] = useState(15); // mm
  const [tuckFlapHeight, setTuckFlapHeight] = useState(15); // mm
  const [boxCols, setBoxCols] = useState(2);
  const [boxRows, setBoxRows] = useState(3);
  const [interlockMode, setInterlockMode] = useState('INTERLOCKING'); // 'INTERLOCKING' | 'STANDARD' | 'HEAD_TO_HEAD'
  const [dielineOverlay, setDielineOverlay] = useState(true);
  const [removeWhiteSpace, setRemoveWhiteSpace] = useState(true); // Auto-crop white space around box
  const [interlockShiftX, setInterlockShiftX] = useState(0); // mm
  const [interlockShiftY, setInterlockShiftY] = useState(0); // mm
  const [orderQuantity, setOrderQuantity] = useState(1000);

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

  // ─── Sheet Margins (Independent 4-Sided Machine Margins) ────────────────
  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);
  const [marginsLinked, setMarginsLinked] = useState(false); // Independent by default as requested

  const [bleedTop, setBleedTop] = useState(3);
  const [bleedBottom, setBleedBottom] = useState(3);
  const [bleedLeft, setBleedLeft] = useState(3);
  const [bleedRight, setBleedRight] = useState(3);
  const [bleedLinked, setBleedLinked] = useState(true);

  // ─── Gutters / Cut Spacing ─────────────────────────────────────────────
  const [gutterX, setGutterX] = useState(4);
  const [gutterY, setGutterY] = useState(4);
  const [guttersLinked, setGuttersLinked] = useState(true);

  // ─── Press Technology: Offset vs Digital ──────────────────────────────
  const [printTechnology, setPrintTechnology] = useState('OFFSET'); // 'OFFSET' | 'DIGITAL'

  // ─── Prepress Production Marks ──────────────────────────────────────────
  const [cropMarks, setCropMarks] = useState(true);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);
  // Note: Registration marks removed as requested (no longer used in modern prepress)
  const [colorBars, setColorBars] = useState(true);
  const [cameraMarks, setCameraMarks] = useState(false);
  const [cameraMarkRadius, setCameraMarkRadius] = useState(3.5); // 3.5 mm radius circle
  const [cameraMarkOffset, setCameraMarkOffset] = useState(6); // mm sheet inset
  const [cameraMarkPositions, setCameraMarkPositions] = useState('CORNERS_AND_EDGES'); // 'CORNERS_AND_EDGES' | 'CORNERS'
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [jobSlug, setJobSlug] = useState(true);
  const [foldMarks, setFoldMarks] = useState(true);
  const [digitalBarcode, setDigitalBarcode] = useState(false);

  // Switch between Offset Press and Digital Press with smart presets
  const handleSelectPressTechnology = (tech) => {
    setPrintTechnology(tech);
    if (tech === 'OFFSET') {
      if (['SRA3', 'A3+', 'A4'].includes(sheetPreset)) {
        setSheetPreset('23×36"');
        setSheetWidth(584);
        setSheetHeight(914);
        setCustomSheet(false);
      }
      setCropMarks(true);
      setColorBars(true);
      setJobSlug(true);
      setCollatingMarks(true);
      setFoldMarks(true);
      setDigitalBarcode(false);
      setCameraMarks(false);
      setMarginTop(15); // Standard offset lead gripper allowance
      setMarginBottom(10);
      setMarginLeft(10);
      setMarginRight(10);
    } else if (tech === 'DIGITAL') {
      if (['23×36"', '25×38"', '20×26"', 'B2'].includes(sheetPreset)) {
        setSheetPreset('SRA3');
        setSheetWidth(320);
        setSheetHeight(450);
        setCustomSheet(false);
      }
      setCropMarks(true);
      setColorBars(false);        // Closed-loop digital press calibration
      setJobSlug(true);
      setCollatingMarks(false);
      setFoldMarks(false);
      setDigitalBarcode(true);    // Optical barcode for automated digital cutter
      setCameraMarks(true);        // Optical fiducials for automated digital cutter
      setCameraMarkRadius(3.5);    // 3.5 mm radius circle ensures zero overlap with book pages
      setCameraMarkOffset(6);      // 6 mm margin offset
      setMarginTop(12);           // Safe generous margins for digital camera marks
      setMarginBottom(12);
      setMarginLeft(12);
      setMarginRight(12);
    }
  };

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

  // Box Dieline Flat Dimensions Calculation
  const boxFlatDimensions = useMemo(() => {
    const L = parseFloat(boxLength) || 100;
    const W = parseFloat(boxWidth) || 60;
    const H = parseFloat(boxHeight) || 140;
    const glue = parseFloat(glueTabWidth) || 15;
    const tuck = parseFloat(tuckFlapHeight) || 15;

    let flatW = 0;
    let flatH = 0;

    if (boxStyle === 'RTE' || boxStyle === 'STE') {
      flatW = 2 * L + 2 * W + glue;
      flatH = H + 2 * tuck + 6;
    } else if (boxStyle === 'LOCK_BOTTOM') {
      flatW = 2 * L + 2 * W + glue;
      flatH = H + 0.5 * W + tuck + 10;
    } else {
      flatW = sourcePdfPageWidthMM || (L + W);
      flatH = sourcePdfPageHeightMM || H;
    }

    return {
      flatW: Math.round(flatW * 10) / 10,
      flatH: Math.round(flatH * 10) / 10
    };
  }, [boxStyle, boxLength, boxWidth, boxHeight, glueTabWidth, tuckFlapHeight, sourcePdfPageWidthMM, sourcePdfPageHeightMM]);

  // Box Packaging Press Sheet Metrics
  const boxMetrics = useMemo(() => {
    const c = Math.max(1, parseInt(boxCols, 10) || 1);
    const r = Math.max(1, parseInt(boxRows, 10) || 1);
    const boxesPerSheet = c * r;

    const sw = parseFloat(sheetWidth) || 584;
    const sh = parseFloat(sheetHeight) || 914;
    const sheetArea = sw * sh;

    const netBoxArea = boxesPerSheet * (boxFlatDimensions.flatW * boxFlatDimensions.flatH);
    const efficiencyPct = Math.min(100, Math.round((netBoxArea / sheetArea) * 1000) / 10);
    const wastePct = Math.round((100 - efficiencyPct) * 10) / 10;
    const sheetsNeeded = Math.ceil((parseInt(orderQuantity, 10) || 1000) / boxesPerSheet);

    return { boxesPerSheet, sheetArea, netBoxArea, efficiencyPct, wastePct, sheetsNeeded };
  }, [boxCols, boxRows, sheetWidth, sheetHeight, boxFlatDimensions, orderQuantity]);

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

  // Handlers for Margins (Decoupled & Individual by default)
  const handleIndividualMarginChange = (side, val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    if (marginsLinked) {
      setMarginTop(v);
      setMarginBottom(v);
      setMarginLeft(v);
      setMarginRight(v);
      return;
    }
    if (side === 'top') {
      setMarginTop(v);
    } else if (side === 'bottom') {
      setMarginBottom(v);
    } else if (side === 'left') {
      setMarginLeft(v);
    } else if (side === 'right') {
      setMarginRight(v);
    }
  };

  const handleToggleMarginsLinked = () => {
    setMarginsLinked(prev => !prev);
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

    const isBoxMode = partMode === 'BOX';
    const config = {
      productCategory: isBoxMode ? 'BOX' : 'BOOK',
      sheet: {
        width: parseFloat(sheetWidth),
        height: parseFloat(sheetHeight),
        unit: 'mm',
        orientation: sheetOrientation,
        preset: sheetPreset,
        isCustom: sheetPreset === 'CUSTOM'
      },
      bookSize: {
        width: isBoxMode ? boxFlatDimensions.flatW : parseFloat(bookWidth),
        height: isBoxMode ? boxFlatDimensions.flatH : parseFloat(bookHeight),
        unit: 'mm',
        preset: bookPreset,
        isCustom: bookPreset === 'CUSTOM'
      },
      layout: {
        pagesPerLayout: isBoxMode ? boxMetrics.boxesPerSheet : (partMode === 'COVER' ? 4 : selectedLayout),
        mode: partMode,
        columns: isBoxMode ? boxCols : columns,
        rows: isBoxMode ? boxRows : rows,
        interlockMode: isBoxMode ? interlockMode : 'STANDARD',
        orientation: pageOrientation,
        pageOrientation,
        pageRotation: parseInt(pageRotation, 10) || 0
      },
      boxConfig: isBoxMode ? {
        boxStyle,
        length: parseFloat(boxLength) || 100,
        width: parseFloat(boxWidth) || 60,
        height: parseFloat(boxHeight) || 140,
        glueTab: parseFloat(glueTabWidth) || 15,
        tuckFlap: parseFloat(tuckFlapHeight) || 15,
        flatWidth: boxFlatDimensions.flatW,
        flatHeight: boxFlatDimensions.flatH,
        interlockMode,
        dielineOverlay,
        removeWhiteSpace,
        interlockShiftX,
        interlockShiftY,
        orderQuantity: parseInt(orderQuantity, 10) || 1000
      } : undefined,
      workStyle: isBoxMode ? 'SINGLE_SIDED' : workStyle,
      binding: {
        type: isBoxMode ? 'FLAT' : bindingStyle,
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
      printTechnology,
      cropMarks: {
        enabled: cropMarks,
        length: parseFloat(cropMarkLength || 5),
        offset: parseFloat(cropMarkOffset || 3),
        unit: 'mm'
      },
      marks: {
        crop: cropMarks,
        registrationMarks: false,
        registration: false,
        colorBars,
        colorBar: colorBars,
        cameraMarks: cameraMarks ? {
          enabled: true,
          radius: parseFloat(cameraMarkRadius) || 3.5,
          size: (parseFloat(cameraMarkRadius) || 3.5) * 2,
          offset: parseFloat(cameraMarkOffset) || 6,
          positions: cameraMarkPositions
        } : false,
        cameraMarkRadius: parseFloat(cameraMarkRadius) || 5,
        cameraMarkSize: (parseFloat(cameraMarkRadius) || 5) * 2,
        cameraMarkOffset: parseFloat(cameraMarkOffset) || 8,
        cameraMarkPositions,
        jobSlug,
        collatingMarks: partMode === 'TEXT' ? collatingMarks : false,
        foldMarks,
        digitalBarcode,
        printTechnology
      },
      creepCompensation: bindingStyle === 'SADDLE_STITCH' ? {
        enabled: true,
        amountMm: creepMM
      } : undefined,
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
    <div className="w-full max-w-[1920px] mx-auto py-1 px-1 sm:px-2 space-y-3 font-sans">
      {/* ─── Compact Glass Control Header Bar ────────────────────────────── */}
      <div className="glass-panel rounded-2xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Phase & Active Specs Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-bold shadow-sm">
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span>PHASE 5: IMPOSITION STUDIO</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {totalBookPages} Pages • {activePreset.label} ({columns}×{rows}) • {sheetWidth}×{sheetHeight}mm Sheet
          </span>
        </div>

        {/* Center: Part Mode Switcher (Book Text vs Cover vs Box Studio) */}
        <div className="inline-flex p-1 rounded-xl glass-card border border-white/10 shadow-inner gap-1">
          <button
            type="button"
            onClick={() => { setPartMode('TEXT'); setSignatureIndex(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${partMode === 'TEXT'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Book Signatures ({totalSignatures})</span>
          </button>
          <button
            type="button"
            onClick={() => { setPartMode('COVER'); setSignatureIndex(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${partMode === 'COVER'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Cover Studio</span>
          </button>
          <button
            type="button"
            onClick={() => { setPartMode('BOX'); setSignatureIndex(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${partMode === 'BOX'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Box & Packaging Studio</span>
          </button>
        </div>

        {/* Right: Printing Technology Setup Switcher */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectPressTechnology('OFFSET')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${printTechnology === 'OFFSET'
                ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-md shadow-blue-500/20'
                : 'glass-card text-slate-400 hover:text-white border-white/5'
              }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>OFFSET (CTP)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectPressTechnology('DIGITAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${printTechnology === 'DIGITAL'
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 shadow-md shadow-cyan-500/30'
                : 'glass-card text-slate-400 hover:text-white border-white/5'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DIGITAL (OPTICAL)</span>
          </button>
        </div>
      </div>

      {/* ─── 3-Panel Industrial Prepress Studio Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

        {/* ═══════════════════════════════════════════════════════════════════
            LEFT COLUMN: PARAMETERS, MARGINS & LAYOUT SCHEMES (3 COLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-3 max-h-[calc(100vh-130px)] overflow-y-auto pr-1">

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
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${isSelected
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
                        className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
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

          {/* ─── MODE 3: BOX & PACKAGING STUDIO CONTROLS ─────────────────── */}
          {partMode === 'BOX' && (
            <div className="bg-[#141C2A] border border-emerald-900/40 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">Box Packaging Studio</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  N-Up Packaging
                </span>
              </div>

              {/* Box Style Presets */}
              <div>
                <label className="text-[11px] font-mono text-slate-300 font-bold block mb-1.5">Box Design Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'RTE', label: 'Reverse Tuck (RTE)', desc: 'Retail Folding Carton' },
                    { id: 'STE', label: 'Straight Tuck (STE)', desc: 'Front Tuck Carton' },
                    { id: 'LOCK_BOTTOM', label: 'Crash Lock', desc: 'Auto Lock Heavy Duty' },
                    { id: 'SLEEVE', label: 'Packaging Sleeve', desc: 'Slide-over Sleeve' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setBoxStyle(style.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${boxStyle === style.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <div className="text-xs font-bold font-mono">{style.label}</div>
                      <div className="text-[9px] text-slate-400 truncate">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Box Dimensions (L x W x H) */}
              <div className="p-3 rounded-xl bg-[#10141D] border border-[#233045] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                    Finished 3D Box Dimensions (mm)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Length (L):</span>
                    <input
                      type="number"
                      value={boxLength}
                      onChange={(e) => setBoxLength(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Width (W):</span>
                    <input
                      type="number"
                      value={boxWidth}
                      onChange={(e) => setBoxWidth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Height/Depth:</span>
                    <input
                      type="number"
                      value={boxHeight}
                      onChange={(e) => setBoxHeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                {/* Calculated Flat Dieline Footprint */}
                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Calculated Flat Dieline:</span>
                  <span className="text-xs font-mono text-emerald-300 font-bold">
                    {boxFlatDimensions.flatW} × {boxFlatDimensions.flatH} mm
                  </span>
                </div>
              </div>

              {/* N-Up Grid & Interlocking Dutch Layout */}
              <div className="p-3 rounded-xl bg-[#10141D] border border-[#233045] space-y-2.5">
                <span className="text-xs font-mono text-slate-200 font-bold block">
                  Box N-Up Grid & Laying Pattern
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Columns (C):</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={boxCols}
                      onChange={(e) => setBoxCols(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Rows (R):</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={boxRows}
                      onChange={(e) => setBoxRows(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                {/* Interlocking / Dutch Rotation Mode */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Interlocking Row Nesting (Paper Saving)</label>
                  <select
                    value={interlockMode}
                    onChange={(e) => setInterlockMode(e.target.value)}
                    className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                  >
                    <option value="INTERLOCKING">INTERLOCKING / DUTCH (Alternate row 180°)</option>
                    <option value="STANDARD">UNIFORM (All 0°)</option>
                    <option value="HEAD_TO_HEAD">HEAD TO HEAD (Top to Top 180°)</option>
                  </select>
                </div>

                {/* Auto-Crop White Space & Dieline Keylines Checkboxes */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141C2A] border border-[#233045]">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="removeWhiteSpace"
                        checked={removeWhiteSpace}
                        onChange={(e) => setRemoveWhiteSpace(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="removeWhiteSpace" className="text-xs font-mono text-slate-200 cursor-pointer">
                        Remove White Space (Auto-Crop Bounding Box)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141C2A] border border-[#233045]">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="dielineOverlay"
                        checked={dielineOverlay}
                        onChange={(e) => setDielineOverlay(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                      />
                      <label htmlFor="dielineOverlay" className="text-xs font-mono text-slate-200 cursor-pointer">
                        Draw Structural Keylines (Red Cut / Blue Crease)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Flap Nesting Shift X & Y (for Interlocking Alignment) */}
                {interlockMode !== 'STANDARD' && (
                  <div className="p-2.5 rounded-lg bg-[#10141D] border border-[#233045] space-y-2">
                    <label className="text-[10px] font-mono text-cyan-400 block uppercase font-semibold">
                      Interlocking Flap Nesting Shift
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Shift Y (Vertical Nesting mm)</label>
                        <input
                          type="number"
                          step="1"
                          value={interlockShiftY}
                          onChange={(e) => setInterlockShiftY(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                          placeholder="0 mm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Shift X (Horizontal Alignment mm)</label>
                        <input
                          type="number"
                          step="1"
                          value={interlockShiftX}
                          onChange={(e) => setInterlockShiftX(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                          placeholder="0 mm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box Efficiency & Required Sheets Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Total Boxes per Sheet:</span>
                  <strong className="text-emerald-300 font-bold">{boxMetrics.boxesPerSheet}-Up Layout</strong>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Sheet Area Efficiency:</span>
                  <strong className="text-emerald-400 font-bold">{boxMetrics.efficiencyPct}%</strong>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Paper Trim Waste:</span>
                  <strong className="text-amber-400 font-bold">{boxMetrics.wastePct}%</strong>
                </div>
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
            <div className={`p-2.5 rounded-xl border transition-all ${sheetPreset === 'CUSTOM' ? 'bg-cyan-950/40 border-cyan-500/70 shadow-sm' : 'bg-[#10141D] border-[#233045]'
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
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${sheetOrientation === 'PORTRAIT'
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
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${sheetOrientation === 'LANDSCAPE'
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
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${bookPreset === 'CUSTOM'
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
            <div className={`p-2.5 rounded-xl border transition-all ${bookPreset === 'CUSTOM' ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm' : 'bg-[#10141D] border-[#233045]'
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
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${pageOrientation === 'AUTO' && pageRotation === 0
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
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${pageOrientation === 'PORTRAIT' && pageRotation === 0
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
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${pageRotation === 90
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
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${pageRotation === 180
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
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${pageRotation === 270
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
              <div className={`pt-1 text-[10px] font-mono border-t border-[#1E293B] ${fitMetrics.fitsCleanly ? 'text-emerald-400' : 'text-amber-400'
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
                onClick={handleToggleMarginsLinked}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer ${
                  marginsLinked
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white'
                }`}
                title={marginsLinked ? "All margins are synchronized" : "Margins adjust independently (individual mode)"}
              >
                {marginsLinked ? <Link2 className="w-3 h-3 text-cyan-400" /> : <Unlink className="w-3 h-3 text-amber-400" />}
                <span>{marginsLinked ? 'Margins Linked' : 'Independent (Individual)'}</span>
              </button>
            </div>

            {/* Individual 4-Sided Machine Margins Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Top Margin */}
              <div className="p-2.5 rounded-xl bg-[#10141D] border border-[#233045] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
                    <MoveVertical className="w-3 h-3 text-cyan-400" />
                    <span>Top (Lead / Gripper)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marginTop}
                      onChange={(e) => handleIndividualMarginChange('top', e.target.value)}
                      className="w-12 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[9px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={marginTop}
                  onChange={(e) => handleIndividualMarginChange('top', e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Bottom Margin */}
              <div className="p-2.5 rounded-xl bg-[#10141D] border border-[#233045] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
                    <MoveVertical className="w-3 h-3 text-cyan-400" />
                    <span>Bottom (Tail Edge)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marginBottom}
                      onChange={(e) => handleIndividualMarginChange('bottom', e.target.value)}
                      className="w-12 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[9px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={marginBottom}
                  onChange={(e) => handleIndividualMarginChange('bottom', e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Left Margin */}
              <div className="p-2.5 rounded-xl bg-[#10141D] border border-[#233045] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                    <span>Left (Side Guide 1)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marginLeft}
                      onChange={(e) => handleIndividualMarginChange('left', e.target.value)}
                      className="w-12 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[9px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={marginLeft}
                  onChange={(e) => handleIndividualMarginChange('left', e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Right Margin */}
              <div className="p-2.5 rounded-xl bg-[#10141D] border border-[#233045] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                    <span>Right (Side Guide 2)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marginRight}
                      onChange={(e) => handleIndividualMarginChange('right', e.target.value)}
                      className="w-12 bg-[#141C2A] border border-[#233045] focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                    />
                    <span className="text-[9px] font-mono text-slate-500">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={marginRight}
                  onChange={(e) => handleIndividualMarginChange('right', e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Quick Margin Setup Presets */}
            <div className="pt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-slate-500">Quick Margins:</span>
              <button
                type="button"
                onClick={() => {
                  setMarginTop(10);
                  setMarginBottom(10);
                  setMarginLeft(10);
                  setMarginRight(10);
                }}
                className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#10141D] hover:bg-[#1A2333] text-slate-300 border border-[#233045]"
              >
                Equal 10mm
              </button>
              <button
                type="button"
                onClick={() => {
                  setMarginTop(15);
                  setMarginBottom(10);
                  setMarginLeft(10);
                  setMarginRight(10);
                }}
                className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#10141D] hover:bg-[#1A2333] text-slate-300 border border-[#233045]"
              >
                Gripper 15mm (Lead)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMarginTop(12);
                  setMarginBottom(12);
                  setMarginLeft(12);
                  setMarginRight(12);
                }}
                className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#10141D] hover:bg-[#1A2333] text-cyan-300 border border-cyan-800/60"
              >
                Digital Safe 12mm
              </button>
            </div>

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
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${guttersLinked
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
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${gutterX === p.val && gutterY === p.val
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
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CENTER COLUMN: INTERACTIVE PREPRESS SHEET PREVIEW CANVAS (6 COLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 xl:col-span-6 min-w-0">
          <div className="glass-panel rounded-2xl p-3 shadow-2xl flex flex-col min-h-[calc(100vh-130px)]">
            <SheetPreview
              partMode={partMode}
              sheetWidth={sheetWidth}
              sheetHeight={sheetHeight}
              columns={partMode === 'BOX' ? boxCols : columns}
              rows={partMode === 'BOX' ? boxRows : rows}
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
              colorBars={colorBars}
              cameraMarks={cameraMarks}
              cameraMarkRadius={cameraMarkRadius}
              cameraMarkSize={cameraMarkRadius * 2}
              cameraMarkOffset={cameraMarkOffset}
              cameraMarkPositions={cameraMarkPositions}
              collatingMarks={collatingMarks}
              foldMarks={foldMarks}
              digitalBarcode={digitalBarcode}
              printTechnology={printTechnology}
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
              boxParams={{
                boxStyle,
                length: parseFloat(boxLength) || 100,
                width: parseFloat(boxWidth) || 60,
                height: parseFloat(boxHeight) || 140,
                glueTab: parseFloat(glueTabWidth) || 15,
                tuckFlap: parseFloat(tuckFlapHeight) || 15,
                flatWidth: boxFlatDimensions.flatW,
                flatHeight: boxFlatDimensions.flatH,
                interlockMode,
                dielineOverlay,
                removeWhiteSpace,
                interlockShiftX,
                interlockShiftY
              }}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT COLUMN: METRICS, PRODUCTION MARKS & ACTIONS (3 COLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-3 max-h-[calc(100vh-130px)] overflow-y-auto pl-1">

          {/* Multi-Signature Pagination & Intelligence Bar */}
          <div className="glass-panel border border-white/10 rounded-2xl p-3.5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Multi-Signature Pagination</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                {totalSignatures} {totalSignatures === 1 ? 'Sig' : 'Sigs'}
              </span>
            </div>

            {/* Calculation breakdown */}
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-white/5 text-center">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Pages</span>
                <strong className="text-xs font-mono text-white">{totalBookPages}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Capacity</span>
                <strong className="text-xs font-mono text-cyan-300">{totalCapacity}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Blank</span>
                <strong className={`text-xs font-mono ${blankPaddingPages > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {blankPaddingPages}
                </strong>
              </div>
            </div>

            {/* Interactive Signature Switcher */}
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-white/10">
              <button
                type="button"
                onClick={() => setSignatureIndex(prev => Math.max(0, prev - 1))}
                disabled={signatureIndex === 0}
                className="p-1 rounded-lg glass-card hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center font-mono text-xs">
                <span className="text-slate-400">Sig </span>
                <strong className="text-cyan-300">
                  {signatureIndex + 1} / {totalSignatures}
                </strong>
                <span className="text-slate-500 text-[10px] block">
                  Pages {signatureIndex * layoutPages + 1}–{Math.min((signatureIndex + 1) * layoutPages, totalBookPages)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSignatureIndex(prev => Math.min(totalSignatures - 1, prev + 1))}
                disabled={signatureIndex >= totalSignatures - 1}
                className="p-1 rounded-lg glass-card hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── Production Marks Checkboxes ──────────────────────────────── */}
          <div className="glass-panel border border-white/10 rounded-2xl p-3.5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                Production Marks
              </span>
              {cameraMarks && (
                <button
                  type="button"
                  onClick={() => setShowCameraOptions(!showCameraOptions)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1 cursor-pointer ${showCameraOptions
                      ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                      : 'glass-card border-cyan-700/60 text-cyan-300 hover:text-white'
                    }`}
                  title="Configure Camera Marks"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>{showCameraOptions ? 'Hide Opts' : 'Fiducials'}</span>
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
                <input type="checkbox" checked={colorBars} onChange={(e) => setColorBars(e.target.checked)} className="rounded accent-cyan-400" />
                <span className="text-amber-300 font-semibold">CMYK Bars</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={jobSlug} onChange={(e) => setJobSlug(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Job Slug</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={foldMarks} onChange={(e) => setFoldMarks(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Fold & Knife Marks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={digitalBarcode} onChange={(e) => setDigitalBarcode(e.target.checked)} className="rounded accent-cyan-400" />
                <span className="text-emerald-300 font-semibold">Auto-Cut Barcode</span>
              </label>
              {partMode === 'TEXT' && (
                <label className="flex items-center gap-2 cursor-pointer col-span-2">
                  <input type="checkbox" checked={collatingMarks} onChange={(e) => setCollatingMarks(e.target.checked)} className="rounded accent-cyan-400" />
                  <span className="text-cyan-300">Spine Collation Stairs (Kodak)</span>
                </label>
              )}
            </div>

            {/* ─── Digital Press Setup Intelligence Card ─── */}
            {printTechnology === 'DIGITAL' && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/70 border border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                    <Printer className="w-3 h-3 text-emerald-400" />
                    Digital Press Calibration Guard
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    SRA3 / Cut-Sheet
                  </span>
                </div>
                <div className="text-[9px] font-mono space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Lead Gripper Margin (≥4.5mm):</span>
                    <span className={`font-bold ${parseFloat(marginTop) >= 4.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {marginTop}mm {parseFloat(marginTop) >= 4.5 ? '✓ Safe' : '⚠️ Risk'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Automated Cutter Protocol:</span>
                    <span className="text-cyan-300 font-bold">Duplo / Horizon / Zünd</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Press Profile:</span>
                    <span className="text-slate-200">Closed-Loop Toner (Zero Plate Wear)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Expandable Camera Mark Options ─── */}
            {cameraMarks && showCameraOptions && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-cyan-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1.5 uppercase">
                    <Camera className="w-3 h-3 text-cyan-400" />
                    Optical Fiducial Settings
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    Zünd • Kongsberg
                  </span>
                </div>

                {/* 5 mm radius circle filled with color with an outer border */}
                <div className="p-2 rounded-lg bg-slate-950/80 border border-cyan-800/40 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-white/10 shrink-0">
                    <svg width="24" height="24" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="13" fill="#FFFFFF" stroke="#000000" strokeWidth="1.2" />
                      <circle cx="16" cy="16" r="9" fill="#000000" stroke="#000000" strokeWidth="0.8" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold text-white flex items-center gap-1">
                      <span>5 mm Radius Circle</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-900/60 text-cyan-300">Clean Border</span>
                    </div>
                    <div className="text-[8px] text-slate-400 leading-tight">
                      Outer border ring with solid fill. Precision optical fiducials safely in waste margins.
                    </div>
                  </div>
                </div>

                {/* Mark Radius */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">Radius:</span>
                    <span className="text-[10px] font-mono text-cyan-300 font-bold">{cameraMarkRadius} mm</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { val: 3.5, label: '3.5 mm' },
                      { val: 4, label: '4 mm' },
                      { val: 5, label: '5 mm (Std)' }
                    ].map(sz => (
                      <button
                        key={sz.val}
                        type="button"
                        onClick={() => setCameraMarkRadius(sz.val)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all border cursor-pointer ${cameraMarkRadius === sz.val
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                            : 'glass-card text-slate-400 hover:text-white border-white/5'
                          }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Placement Positions */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block mb-1">Fiducial Distribution:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCameraMarkPositions('CORNERS_AND_EDGES')}
                      className={`p-1.5 rounded-lg text-left transition-all border cursor-pointer ${cameraMarkPositions === 'CORNERS_AND_EDGES'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold'
                          : 'glass-card border-white/5 text-slate-400 hover:text-white'
                        }`}
                    >
                      <div className="text-[10px] font-mono">4 Corners + Edges</div>
                      <div className="text-[8px] text-slate-500">8 marks</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraMarkPositions('CORNERS')}
                      className={`p-1.5 rounded-lg text-left transition-all border cursor-pointer ${cameraMarkPositions === 'CORNERS'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold'
                          : 'glass-card border-white/5 text-slate-400 hover:text-white'
                        }`}
                    >
                      <div className="text-[10px] font-mono">Corners Only</div>
                      <div className="text-[8px] text-slate-500">4 marks</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Production Specs Summary ─────────────────────────────────── */}
          <div className="glass-card rounded-2xl p-3 border border-white/10 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Sheet Stock:</span>
              <strong className="text-white">{sheetWidth} × {sheetHeight} mm</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>{partMode === 'BOX' ? 'Flat Box Dieline:' : 'Book Trim:'}</span>
              <strong className={partMode === 'BOX' ? 'text-emerald-300' : 'text-cyan-300'}>
                {partMode === 'BOX' ? `${boxFlatDimensions.flatW} × ${boxFlatDimensions.flatH} mm` : `${bookWidth} × ${bookHeight} mm`}
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>{partMode === 'BOX' ? 'Sheet N-Up Grid:' : 'Press Runs:'}</span>
              <strong className={partMode === 'BOX' ? 'text-emerald-400' : 'text-emerald-400'}>
                {partMode === 'BOX' ? `${boxMetrics.boxesPerSheet}-Up (${boxCols}×${boxRows})` : `${totalSignatures} Sheets Duplex`}
              </strong>
            </div>
            {partMode === 'BOX' && (
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/5">
                <span>Sheet Efficiency:</span>
                <strong className="text-emerald-400">{boxMetrics.efficiencyPct}%</strong>
              </div>
            )}
          </div>

          {/* ─── Error Display ────────────────────────────────────────────── */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <strong>Imposition Error:</strong>
                <p className="mt-0.5 m-0 text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* ─── Execute Imposition CTA ───────────────────────────────────── */}
          <button
            onClick={handleRunImposition}
            disabled={imposing}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold font-mono text-xs tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${partMode === 'COVER'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/20'
                : partMode === 'BOX'
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/30 glass-glow-cyan'
              } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {imposing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Processing Prepress Imposition...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>
                  {partMode === 'COVER'
                    ? 'Generate Cover Spread'
                    : partMode === 'BOX'
                      ? `Impose ${boxMetrics.boxesPerSheet}-Up Box Sheet`
                      : `Impose ${totalSignatures} Book Signatures`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Success banner */}
          {result && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs font-mono flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Imposition complete! Output ready.</span>
              </div>
              <button
                onClick={onProceedToOutput}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-xs cursor-pointer"
              >
                Proceed →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>

  );
}
