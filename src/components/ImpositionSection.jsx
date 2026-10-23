import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Move,
  Maximize2,
  Settings2,
  SlidersHorizontal,
  Camera,
  Link2,
  Unlink,
  Package,
  Box,
  Zap,
  Ruler,
  Upload,
  ShieldCheck
} from 'lucide-react';
import { imposePdfJob, getSourcePdfUrl, getOutputPdfUrl, detectArtworkMargins } from '../services/api';
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
  { name: '18×25"', label: '18 × 25 in (457 × 635 mm) • Packaging Press', width: 635, height: 457.2, tech: 'OFFSET' },
  { name: 'SRA3', label: 'SRA3 (320 × 450 mm) • Digital Std', width: 320, height: 450, tech: 'DIGITAL' },
  { name: 'A3+', label: 'A3+ (329 × 483 mm) • Digital Extra', width: 329, height: 483, tech: 'DIGITAL' },
  { name: 'A3', label: 'A3 (297 × 420 mm) • Digital Medium', width: 297, height: 420, tech: 'DIGITAL' },
  { name: 'A4', label: 'A4 (210 × 297 mm) • Digital Short-Run', width: 210, height: 297, tech: 'DIGITAL' },
  { name: 'B2', label: 'B2 (500 × 707 mm) • Half-Size Offset', width: 500, height: 707, tech: 'OFFSET' },
  { name: '20×26"', label: '20 × 26 in (508 × 660 mm) • Offset Short', width: 508, height: 660, tech: 'OFFSET' },
  { name: '20×28"', label: '20 × 28 in (508 × 711 mm) • Packaging Press', width: 508, height: 711.2, tech: 'OFFSET' },
  { name: '20×30"', label: '20 × 30 in (508 × 762 mm) • Packaging Press', width: 508, height: 762, tech: 'OFFSET' },
  { name: '23×36"', label: '23 × 36 in (584 × 914 mm) • Offset 8-up', width: 584, height: 914, tech: 'OFFSET' },
  { name: '25×38"', label: '25 × 38 in (635 × 965 mm) • Offset Book', width: 635, height: 965, tech: 'OFFSET' },
  { name: '28×40"', label: '28 × 40 in (711 × 1016 mm) • Full-Size Offset', width: 711, height: 1016, tech: 'OFFSET' },
  { name: '30×40"', label: '30 × 40 in (762 × 1016 mm) • Packaging Press', width: 762, height: 1016, tech: 'OFFSET' },
  { name: 'CUSTOM', label: 'Custom Press Sheet Size...', width: null, height: null, isCustom: true },
];

/**
 * Calculates and selects the minimum sheet size from standard presets (or custom)
 * where the required imposition footprint fits cleanly with machine margins.
 */
export function findMinimumSheetSize(reqW, reqH, preferredOrientation = 'PORTRAIT') {
  const candidates = [];

  for (const preset of SHEET_PRESETS) {
    if (!preset.width || !preset.height) continue;
    const w = preset.width;
    const h = preset.height;

    // Check direct orientation (w, h)
    if (w >= reqW - 0.5 && h >= reqH - 0.5) {
      candidates.push({
        name: preset.name,
        label: preset.label,
        width: w,
        height: h,
        orientation: w >= h ? 'LANDSCAPE' : 'PORTRAIT',
        area: w * h,
        marginW: w - reqW,
        marginH: h - reqH,
        isCustom: false
      });
    }

    // Check rotated orientation (h, w)
    if (h >= reqW - 0.5 && w >= reqH - 0.5 && w !== h) {
      candidates.push({
        name: preset.name,
        label: preset.label,
        width: h,
        height: w,
        orientation: h >= w ? 'LANDSCAPE' : 'PORTRAIT',
        area: w * h,
        marginW: h - reqW,
        marginH: w - reqH,
        isCustom: false
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (Math.abs(a.area - b.area) > 1) {
        return a.area - b.area; // Smallest sheet area first
      }
      return (a.marginW + a.marginH) - (b.marginW + b.marginH);
    });
    return candidates[0];
  }

  // If no standard preset fits, calculate minimum exact custom sheet size
  const customW = Math.ceil(reqW);
  const customH = Math.ceil(reqH);
  return {
    name: 'CUSTOM',
    label: `Custom (${customW} × ${customH} mm)`,
    width: customW,
    height: customH,
    orientation: customW >= customH ? 'LANDSCAPE' : 'PORTRAIT',
    area: customW * customH,
    marginW: 0,
    marginH: 0,
    isCustom: true
  };
}

/**
 * Calculates the maximum finished page size for a signature on a given press sheet.
 * Based on industry-standard prepress allowances:
 * - Long sheet dimension: 2.0 inches (50.8 mm) total margin/gripper/gutter allowance.
 * - Short sheet dimension: 1.0 inch (25.4 mm) total margin/gripper/gutter allowance.
 *
 * Examples on 23×36" sheet:
 * - 16PP (4 cols × 2 rows): 8.5" × 11" (215.9 × 279.4 mm) [US Letter]
 * - 32PP (4 cols × 4 rows): 5.5" × 8.5" (139.7 × 215.9 mm) [US Statement / Half-Letter]
 * - 8PP (2 cols × 2 rows): 11" × 17" (279.4 × 431.8 mm) [US Tabloid]
 * - 4PP (2 cols × 1 row): 17" × 22" (431.8 × 558.8 mm)
 * - 2PP (2 cols × 1 row): 17" × 22" (431.8 × 558.8 mm)
 */
export function calculateMaxPageSizeForSignature(sheetW_mm, sheetH_mm, pages) {
  const wIn = (parseFloat(sheetW_mm) || 584) / 25.4;
  const hIn = (parseFloat(sheetH_mm) || 914) / 25.4;
  const shortIn = Math.min(wIn, hIn);
  const longIn = Math.max(wIn, hIn);

  const longAllowanceIn = 2.0;   // 2.0 inches total allowance on long side
  const shortAllowanceIn = 1.0;  // 1.0 inch total allowance on short side

  const usableLongIn = Math.max(1, longIn - longAllowanceIn);
  const usableShortIn = Math.max(1, shortIn - shortAllowanceIn);

  let pageW_in = 0;
  let pageH_in = 0;
  let cols = 2;
  let rows = 2;
  let standardName = '';

  const pp = Number(pages) || 16;
  if (pp === 16) {
    cols = 4;
    rows = 2;
    pageW_in = Math.round((usableLongIn / 4) * 100) / 100;
    pageH_in = Math.round((usableShortIn / 2) * 100) / 100;
    if (Math.abs(pageW_in - 8.5) < 0.15 && Math.abs(pageH_in - 11.0) < 0.15) {
      pageW_in = 8.5;
      pageH_in = 11.0;
      standardName = 'US Letter (8.5 × 11")';
    }
  } else if (pp === 32) {
    cols = 4;
    rows = 4;
    pageW_in = Math.round((usableShortIn / 4) * 100) / 100;
    pageH_in = Math.round((usableLongIn / 4) * 100) / 100;
    if (Math.abs(pageW_in - 5.5) < 0.15 && Math.abs(pageH_in - 8.5) < 0.15) {
      pageW_in = 5.5;
      pageH_in = 8.5;
      standardName = 'US Statement / Half-Letter (5.5 × 8.5")';
    }
  } else if (pp === 8) {
    cols = 2;
    rows = 2;
    pageW_in = Math.round((usableShortIn / 2) * 100) / 100;
    pageH_in = Math.round((usableLongIn / 2) * 100) / 100;
    if (Math.abs(pageW_in - 11.0) < 0.15 && Math.abs(pageH_in - 17.0) < 0.15) {
      pageW_in = 11.0;
      pageH_in = 17.0;
      standardName = 'US Tabloid / Ledger (11 × 17")';
    }
  } else if (pp === 4 || pp === 2) {
    cols = 2;
    rows = 1;
    pageW_in = Math.round((usableLongIn / 2) * 100) / 100;
    pageH_in = Math.round((usableShortIn / 1) * 100) / 100;
    if (Math.abs(pageW_in - 17.0) < 0.15 && Math.abs(pageH_in - 22.0) < 0.15) {
      pageW_in = 17.0;
      pageH_in = 22.0;
      standardName = '17 × 22" (Folio)';
    }
  } else {
    cols = Math.ceil(Math.sqrt(pp / 2));
    rows = Math.max(1, Math.ceil((pp / 2) / cols));
    pageW_in = Math.round((usableLongIn / cols) * 100) / 100;
    pageH_in = Math.round((usableShortIn / rows) * 100) / 100;
  }

  const pageW_mm = Math.round((pageW_in * 25.4) * 10) / 10;
  const pageH_mm = Math.round((pageH_in * 25.4) * 10) / 10;

  return {
    pageW_in,
    pageH_in,
    pageW_mm,
    pageH_mm,
    cols,
    rows,
    standardName: standardName || `${pageW_in}" × ${pageH_in}" (${pageW_mm} × ${pageH_mm} mm)`,
    pages: pp
  };
}

const BOOK_PRESETS = [
  { name: 'AUTO', label: 'Auto (Detect from Source PDF)', desc: 'Uses uploaded PDF page size', isAuto: true },
  { name: 'MAX_FIT', label: 'Max Signature Fit (Optimal Sheet Fill)', desc: 'Prepress max page size for signature & press sheet', isMaxFit: true },
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
  activeDocument = null,
  onImpositionSuccess,
  onProceedToOutput,
  customKeylines = [],
  onOpenKeylineStudio,
  initialProductType,
  initialSheetConfig,
  onOpenGangModal = null
}) {
  const activeOutputFileId = activeJob?.outputFileId;
  const pdfSource = useMemo(() => {
    if (uploadedFile) return uploadedFile;
    if (jobId) return getSourcePdfUrl(jobId);
    if (activeOutputFileId) return getOutputPdfUrl(activeOutputFileId);
    return null;
  }, [uploadedFile, jobId, activeOutputFileId]);

  const {
    thumbnails,
    pageViewports,
    loading: thumbnailsLoading,
    progress: thumbnailsProgress
  } = usePdfThumbnails(pdfSource, Math.min(64, parseInt(analysisData?.pageCount || 16, 10)));

  // ─── High-Level Prepress Part: Book Text vs Book Cover vs Box Studio ──
  const defaultMode = initialProductType || (analysisData?.pageCount > 4 ? 'TEXT' : 'BOX');
  const [partMode, setPartMode] = useState(defaultMode);

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
  const [packagingUnit, setPackagingUnit] = useState('inch'); // 'inch' | 'mm'
  const [boxStyle, setBoxStyle] = useState('RTE'); // 'RTE' | 'STE' | 'LOCK_BOTTOM' | 'SLEEVE' | 'CUSTOM'
  const [boxLength, setBoxLength] = useState(4.09); // L (4.09" for Acuzie 100ml)
  const [boxWidth, setBoxWidth] = useState(1.57);   // W (1.57" for Acuzie 100ml)
  const [boxHeight, setBoxHeight] = useState(4.72);  // H / Depth (4.72" for Acuzie 100ml)
  const [glueTabWidth, setGlueTabWidth] = useState(0.52); // Glue tab (0.52" for Acuzie 100ml)
  const [tuckFlapHeight, setTuckFlapHeight] = useState(1.5); // Tuck flap (1.5" for Acuzie 100ml)
  const [boxCols, setBoxCols] = useState(initialSheetConfig?.cols || 2);
  const [boxRows, setBoxRows] = useState(initialSheetConfig?.rows || (initialSheetConfig?.name === '20×28"' ? 1 : initialSheetConfig?.name === '20×30"' ? 1 : 2));
  const [interlockMode, setInterlockMode] = useState('STANDARD'); // 'STANDARD' (Uniform 0° all ups) default for Zero Gaps & Tight CAD Pack
  const [dielineOverlay, setDielineOverlay] = useState(defaultMode === 'BOX'); // Key Die Lines default to true for Box
  const [removeWhiteSpace, setRemoveWhiteSpace] = useState(true); // Default true for Box mode so blank spaces are automatically trimmed!
  const [interlockShiftX, setInterlockShiftX] = useState(0); // Shift for interlocking alignment
  const [interlockShiftY, setInterlockShiftY] = useState(0);
  const [orderQuantity, setOrderQuantity] = useState(1000);
  const [layoutShiftX, setLayoutShiftX] = useState(0); // Interactive drag/nudge shift X (mm)
  const [layoutShiftY, setLayoutShiftY] = useState(0); // Interactive drag/nudge shift Y (mm)
  const [nudgeStep, setNudgeStep] = useState(1.0); // Nudge step in mm (0.5, 1.0, 5.0)
  const [upOffsets, setUpOffsets] = useState({}); // { [upIdx]: { x: number, y: number } }
  const [selectedUpIndex, setSelectedUpIndex] = useState(0); // 0 (UP #1) by default or null
  const [multiPageGang, setMultiPageGang] = useState(true); // Default true when multi-page PDF is loaded
  const [pageAllocation, setPageAllocation] = useState({}); // { [upIdx]: number }

  // ─── Box In-Between Gap Trimming (Horizontal & Vertical Spacing) ───────
  // Prepress packaging requirement: strictly Zero Gaps & Tight CAD Pack default (0.00 gap)
  const [boxGutterX, setBoxGutterX] = useState(3.0); // 3.0 mm default for standard die clearance
  const [boxGutterY, setBoxGutterY] = useState(3.0); // 3.0 mm default for standard die clearance
  const [boxGuttersLinked, setBoxGuttersLinked] = useState(true);

  // ─── Box Artwork Trimming (Client File White Space Margins Removal) ─────
  const [trimTop, setTrimTop] = useState(0);       // in active packaging unit
  const [trimBottom, setTrimBottom] = useState(0); // in active packaging unit
  const [trimLeft, setTrimLeft] = useState(0);     // in active packaging unit
  const [trimRight, setTrimRight] = useState(0);   // in active packaging unit
  const [trimLinked, setTrimLinked] = useState(false); // Link top & bottom
  const [detectingMargins, setDetectingMargins] = useState(false);
  const [marginDetectionResult, setMarginDetectionResult] = useState(null);

  // ─── Sheet Dimensions (Raw Stock Paper) ─────────────────────────────────
  const [sheetPreset, setSheetPreset] = useState(initialSheetConfig?.name || '20×28"');
  const [sheetWidth, setSheetWidth] = useState(initialSheetConfig?.sheetWidth || 508);
  const [sheetHeight, setSheetHeight] = useState(initialSheetConfig?.sheetHeight || 711.2);
  const [customSheet, setCustomSheet] = useState(false);

  // ─── Book Dimensions (Finished Trim Size) ───────────────────────────────
  const sourcePdfPageWidthMM = useMemo(() => {
    const pt = analysisData?.pages?.[0]?.source?.widthPt ||
               analysisData?.pages?.[0]?.boxes?.media?.width ||
               analysisData?.firstPage?.width;
    if (pt) {
      return Math.round((pt * 25.4 / 72) * 10) / 10;
    }
    return 406.4;
  }, [analysisData]);

  const sourcePdfPageHeightMM = useMemo(() => {
    const pt = analysisData?.pages?.[0]?.source?.heightPt ||
               analysisData?.pages?.[0]?.boxes?.media?.height ||
               analysisData?.firstPage?.height;
    if (pt) {
      return Math.round((pt * 25.4 / 72) * 10) / 10;
    }
    return 279.4;
  }, [analysisData]);

  // Detected ArtBox / TrimBox / ContentBox from source PDF analysis
  const detectedArtBox = useMemo(() => {
    const media = analysisData?.pages?.[0]?.boxes?.media || { width: 1152, height: 792, x: 0, y: 0 };

    // Priority 1: Vector Content Bounding Box (exact carton content / dieline boundaries)
    const content = analysisData?.pages?.[0]?.boxes?.content || analysisData?.pages?.[0]?.contentBox;
    if (content && (content.leftMM > 0 || content.bottomMM > 0 || content.rightMM > 0 || content.topMM > 0 || content.widthMM > 0)) {
      return {
        x: content.x,
        y: content.y,
        width: content.width,
        height: content.height,
        leftMM: content.leftMM,
        bottomMM: content.bottomMM,
        rightMM: content.rightMM,
        topMM: content.topMM,
        widthMM: content.widthMM,
        heightMM: content.heightMM,
        dielineOnly: content.dielineOnly || null,
        headerHeightMM: content.headerHeightMM || content.dielineOnly?.headerHeightMM || 20.0,
        source: 'ContentBox'
      };
    }

    // Priority 2: ArtBox (if contentBox not available)
    const art = analysisData?.pages?.[0]?.boxes?.art;
    if (art && (art.width < media.width - 2 || art.height < media.height - 2)) {
      return {
        x: art.x,
        y: art.y,
        width: art.width,
        height: art.height,
        leftMM: Math.max(0, Math.round(((art.x - (media.x || 0)) * 25.4 / 72) * 10) / 10),
        bottomMM: Math.max(0, Math.round(((art.y - (media.y || 0)) * 25.4 / 72) * 10) / 10),
        rightMM: Math.max(0, Math.round(((media.width - (art.x - (media.x || 0) + art.width)) * 25.4 / 72) * 10) / 10),
        topMM: Math.max(0, Math.round(((media.height - (art.y - (media.y || 0) + art.height)) * 25.4 / 72) * 10) / 10),
        widthMM: Math.max(0, Math.round((art.width * 25.4 / 72) * 10) / 10),
        heightMM: Math.max(0, Math.round((art.height * 25.4 / 72) * 10) / 10),
        source: 'ArtBox'
      };
    }

    // Priority 3: TrimBox
    const trim = analysisData?.pages?.[0]?.boxes?.trim;
    if (trim && (trim.width < media.width - 2 || trim.height < media.height - 2)) {
      return {
        x: trim.x,
        y: trim.y,
        width: trim.width,
        height: trim.height,
        leftMM: Math.max(0, Math.round(((trim.x - (media.x || 0)) * 25.4 / 72) * 10) / 10),
        bottomMM: Math.max(0, Math.round(((trim.y - (media.y || 0)) * 25.4 / 72) * 10) / 10),
        rightMM: Math.max(0, Math.round(((media.width - (trim.x - (media.x || 0) + trim.width)) * 25.4 / 72) * 10) / 10),
        topMM: Math.max(0, Math.round(((media.height - (trim.y - (media.y || 0) + trim.height)) * 25.4 / 72) * 10) / 10),
        widthMM: Math.max(0, Math.round((trim.width * 25.4 / 72) * 10) / 10),
        heightMM: Math.max(0, Math.round((trim.height * 25.4 / 72) * 10) / 10),
        source: 'TrimBox'
      };
    }

    return null;
  }, [analysisData]);

  const [trimHeader, setTrimHeader] = useState(false); // Default false: only trim header when explicitly requested by user
  const [headerTrimHeight, setHeaderTrimHeight] = useState(0.75); // in packagingUnit (0.75 in or 20 mm)
  const [bookPreset, setBookPreset] = useState('AUTO');

  // Dynamic synchronization when initialProductType or initialSheetConfig props arrive
  useEffect(() => {
    if (initialProductType) {
      setPartMode(initialProductType);
      if (initialProductType === 'BOX') {
        setCropMarks(false);
        setCameraMarks(false);
        setColorBars(false);
        setDielineOverlay(true);
      }
    }
  }, [initialProductType]);

  useEffect(() => {
    if (initialSheetConfig) {
      if (initialSheetConfig.name) setSheetPreset(initialSheetConfig.name);
      if (initialSheetConfig.sheetWidth) setSheetWidth(initialSheetConfig.sheetWidth);
      if (initialSheetConfig.sheetHeight) setSheetHeight(initialSheetConfig.sheetHeight);
      if (initialSheetConfig.cols) setBoxCols(initialSheetConfig.cols);
      if (initialSheetConfig.rows) setBoxRows(initialSheetConfig.rows);
      if (initialSheetConfig.gapX !== undefined) setBoxGutterX(initialSheetConfig.gapX);
      if (initialSheetConfig.gapY !== undefined) setBoxGutterY(initialSheetConfig.gapY);
      if (initialSheetConfig.upOffsets) setUpOffsets(initialSheetConfig.upOffsets);
      if (initialSheetConfig.multiPageGang !== undefined) setMultiPageGang(initialSheetConfig.multiPageGang);
      if (initialSheetConfig.sheetOrientation) setSheetOrientation(initialSheetConfig.sheetOrientation);
      if (initialSheetConfig.isCustomFit || initialSheetConfig.name?.includes('Custom')) {
        setCustomSheet(true);
      } else {
        setCustomSheet(false);
      }
    }
  }, [initialSheetConfig]);

  // Auto-sync headerTrimHeight from detected content if headerHeightMM is available
  useEffect(() => {
    const hh = detectedArtBox?.dielineOnly?.headerHeightMM || detectedArtBox?.headerHeightMM;
    if (hh) {
      const isInch = packagingUnit === 'inch';
      setHeaderTrimHeight(isInch ? Math.round((hh / 25.4) * 100) / 100 : Math.round(hh * 10) / 10);
    }
  }, [detectedArtBox, packagingUnit]);

  // Auto-sync box trimming and zero gaps when detectedArtBox arrives
  useEffect(() => {
    if (partMode === 'BOX' && detectedArtBox) {
      const isInch = packagingUnit === 'inch';
      const factor = isInch ? 1 / 25.4 : 1;
      const roundFactor = isInch ? 100 : 10;

      const target = (trimHeader && detectedArtBox.dielineOnly) ? detectedArtBox.dielineOnly : detectedArtBox;
      setTrimLeft(Math.round(target.leftMM * factor * roundFactor) / roundFactor);
      setTrimRight(Math.round(target.rightMM * factor * roundFactor) / roundFactor);
      setTrimBottom(Math.round(target.bottomMM * factor * roundFactor) / roundFactor);

      // Only trim the top header if user explicitly enabled trimHeader!
      if (trimHeader && detectedArtBox.dielineOnly) {
        setTrimTop(Math.round(detectedArtBox.dielineOnly.topMM * factor * roundFactor) / roundFactor);
      } else if (trimHeader) {
        const hMM = (parseFloat(headerTrimHeight) || (isInch ? 0.75 : 20.0)) * (isInch ? 25.4 : 1);
        setTrimTop(Math.round((target.topMM + hMM) * factor * roundFactor) / roundFactor);
      } else {
        setTrimTop(Math.round(target.topMM * factor * roundFactor) / roundFactor);
      }

      setBoxGutterX(isInch ? 0.118 : 3.0);
      if (interlockMode === 'INTERLOCKING') {
        const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
        const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
        const nestY_MM = -Math.max(0, tuckMM - 3.0);
        const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
        setBoxGutterY(nestY);
        setBoxGuttersLinked(false);
      } else {
        setBoxGutterY(isInch ? 0.118 : 3.0);
      }
      setInterlockShiftX(0);
      setInterlockShiftY(0);
      setMarginTop(6.35);
      setMarginBottom(6.35);
      setMarginLeft(6.35);
      setMarginRight(6.35);
    }
  }, [partMode, detectedArtBox, packagingUnit, trimHeader, interlockMode, tuckFlapHeight]);

  // Fallback to fetch detected margins from backend if analysisData did not include vector content bounding box
  useEffect(() => {
    if (partMode === 'BOX' && (!detectedArtBox || !detectedArtBox.leftMM) && jobId) {
      detectArtworkMargins(jobId).then((res) => {
        if (res.success && res.detected && res.margins) {
          const isInch = packagingUnit === 'inch';
          const factor = isInch ? 1 / 25.4 : 1;
          const roundFactor = isInch ? 100 : 10;
          const target = (trimHeader && res.dielineMargins) ? res.dielineMargins : res.margins;
          setTrimLeft(Math.round(target.leftMM * factor * roundFactor) / roundFactor);
          setTrimRight(Math.round(target.rightMM * factor * roundFactor) / roundFactor);
          setTrimBottom(Math.round(target.bottomMM * factor * roundFactor) / roundFactor);

          if (trimHeader && res.dielineMargins) {
            setTrimTop(Math.round(res.dielineMargins.topMM * factor * roundFactor) / roundFactor);
          } else if (trimHeader) {
            const hMM = (parseFloat(headerTrimHeight) || (isInch ? 0.75 : 20.0)) * (isInch ? 25.4 : 1);
            setTrimTop(Math.round((target.topMM + hMM) * factor * roundFactor) / roundFactor);
          } else {
            setTrimTop(Math.round(target.topMM * factor * roundFactor) / roundFactor);
          }

          setBoxGutterX(isInch ? 0.118 : 3.0);
          if (interlockMode === 'INTERLOCKING') {
            const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
            const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
            const nestY_MM = -Math.max(0, tuckMM - 3.0);
            const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
            setBoxGutterY(nestY);
            setBoxGuttersLinked(false);
          } else {
            setBoxGutterY(isInch ? 0.118 : 3.0);
          }
          setInterlockShiftX(0);
          setInterlockShiftY(0);
          setMarginTop(6.35);
          setMarginBottom(6.35);
          setMarginLeft(6.35);
          setMarginRight(6.35);
        }
      }).catch(() => {});
    }
  }, [partMode, detectedArtBox, jobId, packagingUnit, trimHeader, interlockMode, tuckFlapHeight]);

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
  const [fitMode, setFitMode] = useState('NONE'); // 'NONE' | 'SCALE_TO_FIT'

  // ─── Sheet Margins (Independent 4-Sided Machine Margins) ────────────────
  const [marginTop, setMarginTop] = useState(defaultMode === 'BOX' ? 6.35 : 10);
  const [marginBottom, setMarginBottom] = useState(defaultMode === 'BOX' ? 6.35 : 10);
  const [marginLeft, setMarginLeft] = useState(defaultMode === 'BOX' ? 6.35 : 10);
  const [marginRight, setMarginRight] = useState(defaultMode === 'BOX' ? 6.35 : 10);
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
  const [cropMarks, setCropMarks] = useState(defaultMode === 'BOX' ? false : true);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);
  // Note: Registration marks removed as requested (no longer used in modern prepress)
  const [colorBars, setColorBars] = useState(defaultMode === 'BOX' ? false : true);
  const [cameraMarks, setCameraMarks] = useState(false);
  const [cameraMarkRadius, setCameraMarkRadius] = useState(3.5); // 3.5 mm radius circle
  const [cameraMarkOffset, setCameraMarkOffset] = useState(6); // mm sheet inset
  const [cameraMarkPositions, setCameraMarkPositions] = useState('CORNERS_AND_EDGES'); // 'CORNERS_AND_EDGES' | 'CORNERS'
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [jobSlug, setJobSlug] = useState(true);
  const [foldMarks, setFoldMarks] = useState(defaultMode === 'BOX' ? false : true);
  const [digitalBarcode, setDigitalBarcode] = useState(false);

  // Switch between Offset Press and Digital Press with smart presets
  const handleSelectPressTechnology = (tech) => {
    setPrintTechnology(tech);
    if (tech === 'OFFSET') {
      if (['SRA3', 'A3+', 'A4'].includes(sheetPreset)) {
        setSheetPreset(partMode === 'BOX' ? '20×28"' : '23×36"');
        setSheetWidth(partMode === 'BOX' ? 508 : 584);
        setSheetHeight(partMode === 'BOX' ? 711.2 : 914);
        setCustomSheet(false);
      }
      setCropMarks(partMode === 'BOX' ? false : true);
      setColorBars(partMode === 'BOX' ? false : true);
      setJobSlug(true);
      setCollatingMarks(partMode === 'TEXT');
      setFoldMarks(partMode === 'BOX' ? false : true);
      setDigitalBarcode(false);
      setCameraMarks(false);
      setMarginTop(partMode === 'BOX' ? 6.35 : 15); // Standard offset lead gripper allowance
      setMarginBottom(partMode === 'BOX' ? 6.35 : 10);
      setMarginLeft(partMode === 'BOX' ? 6.35 : 10);
      setMarginRight(partMode === 'BOX' ? 6.35 : 10);
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

  // Imported custom keylines (if sent from standalone Keyline Studio or uploaded locally)
  const [localKeylines, setLocalKeylines] = useState(customKeylines || []);

  useEffect(() => {
    if (customKeylines && customKeylines.length > 0) {
      setLocalKeylines(customKeylines);
    }
  }, [customKeylines]);

  const keylineElements = localKeylines;
  const impositionKeylineFileRef = useRef(null);

  const handleUploadKeylineFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        if (file.name.endsWith('.json') || file.type.includes('json')) {
          const parsed = JSON.parse(text);
          const elements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
          if (elements.length > 0) {
            setLocalKeylines(elements);
          }
        } else if (file.name.endsWith('.svg') || file.type.includes('svg') || text.includes('<svg')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'image/svg+xml');
          const imported = [];
          doc.querySelectorAll('rect').forEach((r, idx) => {
            imported.push({
              id: `imp_rect_${Date.now()}_${idx}`,
              type: 'rect',
              lineType: 'cut',
              x: parseFloat(r.getAttribute('x')) || 0,
              y: parseFloat(r.getAttribute('y')) || 0,
              width: parseFloat(r.getAttribute('width')) || 100,
              height: parseFloat(r.getAttribute('height')) || 100,
              strokeColor: r.getAttribute('stroke') || '#E6007A',
              strokeWidth: parseFloat(r.getAttribute('stroke-width')) || 1,
              strokeDash: r.getAttribute('stroke-dasharray') || '',
              fillColor: r.getAttribute('fill') || 'none',
              fillOpacity: parseFloat(r.getAttribute('fill-opacity')) || 0,
              label: `Box ${idx + 1}`
            });
          });
          doc.querySelectorAll('line').forEach((l, idx) => {
            imported.push({
              id: `imp_line_${Date.now()}_${idx}`,
              type: 'line',
              lineType: 'crease',
              x1: parseFloat(l.getAttribute('x1')) || 0,
              y1: parseFloat(l.getAttribute('y1')) || 0,
              x2: parseFloat(l.getAttribute('x2')) || 100,
              y2: parseFloat(l.getAttribute('y2')) || 100,
              strokeColor: l.getAttribute('stroke') || '#009EE3',
              strokeWidth: parseFloat(l.getAttribute('stroke-width')) || 1,
              strokeDash: l.getAttribute('stroke-dasharray') || '',
              label: `Line ${idx + 1}`
            });
          });
          doc.querySelectorAll('circle').forEach((c, idx) => {
            imported.push({
              id: `imp_circle_${Date.now()}_${idx}`,
              type: 'circle',
              lineType: 'perf',
              cx: parseFloat(c.getAttribute('cx')) || 0,
              cy: parseFloat(c.getAttribute('cy')) || 0,
              r: parseFloat(c.getAttribute('r')) || 10,
              strokeColor: c.getAttribute('stroke') || '#00A651',
              strokeWidth: parseFloat(c.getAttribute('stroke-width')) || 1,
              strokeDash: c.getAttribute('stroke-dasharray') || '',
              label: `Circle ${idx + 1}`
            });
          });
          if (imported.length > 0) {
            setLocalKeylines(imported);
          }
        }
      } catch (err) {
        console.error("Failed to parse keylines in ImpositionSection:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Sync with analysisData
  useEffect(() => {
    if (analysisData?.pageCount) {
      setTotalPages(analysisData.pageCount);
    }
  }, [analysisData?.pageCount]);

  // ─── Prepress Calculations ──────────────────────────────────────────────
  const isBoxJob = partMode === 'BOX';
  const sourcePdfPageCount = parseInt(analysisData?.pageCount || activeDocument?.pageCount || activeJob?.pageCount || totalPages, 10) || 1;
  const isMultiPageGangActive = Boolean(isBoxJob && multiPageGang && sourcePdfPageCount > 1);
  const boxPagesPerSheet = Math.max(1, (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2));

  const totalBookPages = parseInt(totalPages, 10) || (isBoxJob ? sourcePdfPageCount : 16);
  const layoutPages = selectedLayout;
  const totalSignatures = isBoxJob
    ? (isMultiPageGangActive
        ? Math.max(1, Math.ceil(sourcePdfPageCount / boxPagesPerSheet))
        : Math.max(1, sourcePdfPageCount))
    : Math.max(1, Math.ceil(totalBookPages / layoutPages));
  const totalCapacity = isBoxJob
    ? totalSignatures * boxPagesPerSheet
    : totalSignatures * layoutPages;
  const blankPaddingPages = isBoxJob ? 0 : Math.max(0, totalCapacity - totalBookPages);

  // Dynamic Spine Calculation (Formula: (Leaves) * Caliper + Hinge)
  const bookLeaves = Math.ceil(totalBookPages / 2);
  const calculatedSpine = useMemo(() => {
    const spine = (bookLeaves * parseFloat(paperCaliper)) + parseFloat(hingeAllowance || 0.5);
    return Math.max(1, Math.round(spine * 10) / 10);
  }, [bookLeaves, paperCaliper, hingeAllowance]);

  // ─── Dynamic Prepress Signature Maximum Page Size Calculation ─────────────
  // Calculates the optimal/maximum page size (width × height) that can fit
  // on the currently selected press sheet for the selected signature fold scheme.
  const maxPageSize = useMemo(() => {
    return calculateMaxPageSizeForSignature(sheetWidth, sheetHeight, selectedLayout);
  }, [sheetWidth, sheetHeight, selectedLayout]);

  // Keep Book Size synchronized when bookPreset is 'MAX_FIT'
  useEffect(() => {
    if (bookPreset === 'MAX_FIT' && maxPageSize) {
      setBookWidth(maxPageSize.pageW_mm);
      setBookHeight(maxPageSize.pageH_mm);
    }
  }, [bookPreset, maxPageSize]);

  // Box Dieline Flat Dimensions Calculation
  const boxFlatDimensions = useMemo(() => {
    const isInch = packagingUnit === 'inch';
    const L = parseFloat(boxLength) || (isInch ? 4.09 : 100);
    const W = parseFloat(boxWidth) || (isInch ? 1.57 : 60);
    const H = parseFloat(boxHeight) || (isInch ? 4.72 : 140);
    const glue = parseFloat(glueTabWidth) || (isInch ? 0.52 : 15);
    const tuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 15);

    let flatW = 0;
    let flatH = 0;

    if (detectedArtBox && (detectedArtBox.widthMM > 0 || detectedArtBox.heightMM > 0)) {
      const target = (trimHeader && detectedArtBox.dielineOnly) ? detectedArtBox.dielineOnly : detectedArtBox;
      flatW = isInch ? (target.widthMM / 25.4) : target.widthMM;
      flatH = isInch ? (target.heightMM / 25.4) : target.heightMM;
    } else if (boxStyle === 'RTE' || boxStyle === 'STE') {
      flatW = 2 * L + 2 * W + glue;
      flatH = H + 2 * W + tuck + (isInch ? 0.08 : 2);
    } else if (boxStyle === 'LOCK_BOTTOM') {
      flatW = 2 * L + 2 * W + glue;
      flatH = H + 0.5 * W + tuck + (isInch ? 0.35 : 10);
    } else {
      const fallbackW = (detectedArtBox?.widthMM) || sourcePdfPageWidthMM || (L + W);
      const fallbackH = (trimHeader && detectedArtBox?.dielineOnly ? detectedArtBox.dielineOnly.heightMM : detectedArtBox?.heightMM) || sourcePdfPageHeightMM || H;
      flatW = isInch ? (fallbackW / 25.4) : fallbackW;
      flatH = isInch ? (fallbackH / 25.4) : fallbackH;
    }

    const roundFactor = isInch ? 100 : 10;
    return {
      flatW: Math.round(flatW * roundFactor) / roundFactor,
      flatH: Math.round(flatH * roundFactor) / roundFactor,
      unit: packagingUnit
    };
  }, [boxStyle, boxLength, boxWidth, boxHeight, glueTabWidth, tuckFlapHeight, sourcePdfPageWidthMM, sourcePdfPageHeightMM, packagingUnit, detectedArtBox, trimHeader]);

  // Effective Box Artwork Dimensions after Margin Trimming
  const effectiveBoxDimensions = useMemo(() => {
    const isInch = packagingUnit === 'inch';
    const vpW = pageViewports?.[0]?.widthMM;
    const vpH = pageViewports?.[0]?.heightMM;
    const srcW = sourcePdfPageWidthMM || vpW || (isInch ? 16 * 25.4 : 406.4);
    const srcH = sourcePdfPageHeightMM || vpH || (isInch ? 11 * 25.4 : 279.4);
    const tTop = Math.max(0, parseFloat(trimTop) || 0) * (isInch ? 25.4 : 1);
    const tBottom = Math.max(0, parseFloat(trimBottom) || 0) * (isInch ? 25.4 : 1);
    const tLeft = Math.max(0, parseFloat(trimLeft) || 0) * (isInch ? 25.4 : 1);
    const tRight = Math.max(0, parseFloat(trimRight) || 0) * (isInch ? 25.4 : 1);
    const hasManualTrim = (tTop > 0 || tBottom > 0 || tLeft > 0 || tRight > 0);

    let effW, effH;
    if (hasManualTrim) {
      effW = Math.max(20, Math.round((srcW - tLeft - tRight) * 10) / 10);
      effH = Math.max(20, Math.round((srcH - tTop - tBottom) * 10) / 10);
    } else if (removeWhiteSpace && detectedArtBox) {
      const target = (trimHeader && detectedArtBox.dielineOnly) ? detectedArtBox.dielineOnly : detectedArtBox;
      let hMM = target.heightMM;
      if (trimHeader && !detectedArtBox.dielineOnly) {
        hMM = Math.max(20, hMM - (parseFloat(headerTrimHeight) || (isInch ? 0.75 : 20.0)) * (isInch ? 25.4 : 1));
      }
      effW = Math.max(20, Math.round(target.widthMM * 10) / 10);
      effH = Math.max(20, Math.round(hMM * 10) / 10);
    } else {
      effW = Math.round((isInch ? boxFlatDimensions.flatW * 25.4 : boxFlatDimensions.flatW) * 10) / 10;
      effH = Math.round((isInch ? boxFlatDimensions.flatH * 25.4 : boxFlatDimensions.flatH) * 10) / 10;
    }
    const savedH = Math.round((tTop + tBottom) * 10) / 10;
    const savedW = Math.round((tLeft + tRight) * 10) / 10;
    return { effW, effH, savedH, savedW, srcW, srcH };
  }, [sourcePdfPageWidthMM, sourcePdfPageHeightMM, trimTop, trimBottom, trimLeft, trimRight, packagingUnit, boxFlatDimensions, removeWhiteSpace, detectedArtBox, trimHeader, headerTrimHeight, pageViewports]);

  // Box Packaging Press Sheet Metrics
  const boxMetrics = useMemo(() => {
    const c = Math.max(1, parseInt(boxCols, 10) || 1);
    const r = Math.max(1, parseInt(boxRows, 10) || 1);
    const boxesPerSheet = c * r;

    const sw = parseFloat(sheetWidth) || 584;
    const sh = parseFloat(sheetHeight) || 914;
    const sheetArea = sw * sh;

    const boxW = effectiveBoxDimensions.effW;
    const boxH = effectiveBoxDimensions.effH;

    const netBoxArea = boxesPerSheet * (boxW * boxH);
    const efficiencyPct = Math.min(100, Math.round((netBoxArea / sheetArea) * 1000) / 10);
    const wastePct = Math.round((100 - efficiencyPct) * 10) / 10;
    const sheetsNeeded = Math.ceil((parseInt(orderQuantity, 10) || 1000) / boxesPerSheet);

    return { boxesPerSheet, sheetArea, netBoxArea, efficiencyPct, wastePct, sheetsNeeded, boxW, boxH };
  }, [boxCols, boxRows, sheetWidth, sheetHeight, effectiveBoxDimensions, orderQuantity]);

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

  // ─── Prepress Minimum Sheet Size Intelligence ──────────────────────────
  // Calculates minimum sheet dimensions needed to accommodate current layout cleanly
  const minSheetNeeded = useMemo(() => {
    let reqW, reqH;
    const ml = parseFloat(marginLeft) || 10;
    const mr = parseFloat(marginRight) || 10;
    const mt = parseFloat(marginTop) || 10;
    const mb = parseFloat(marginBottom) || 10;

    if (partMode === 'BOX') {
      const c = Math.max(1, parseInt(boxCols, 10) || 1);
      const r = Math.max(1, parseInt(boxRows, 10) || 1);
      const isInch = packagingUnit === 'inch';
      const gx = isInch ? (parseFloat(boxGutterX) || 0) * 25.4 : (parseFloat(boxGutterX) || 0);
      const gy = isInch ? (parseFloat(boxGutterY) || 0) * 25.4 : (parseFloat(boxGutterY) || 0);
      const isRotated = (parseInt(pageRotation, 10) || 0) === 90 || (parseInt(pageRotation, 10) || 0) === 270;
      const boxW = isRotated ? effectiveBoxDimensions.effH : effectiveBoxDimensions.effW;
      const boxH = isRotated ? effectiveBoxDimensions.effW : effectiveBoxDimensions.effH;

      const layoutW = c * boxW + (c - 1) * gx;
      const layoutH = r * boxH + (r - 1) * gy;
      reqW = Math.ceil((layoutW + ml + mr) * 10) / 10;
      reqH = Math.ceil((layoutH + mt + mb) * 10) / 10;
    } else {
      const c = Math.max(1, columns);
      const r = Math.max(1, rows);
      const bW = parseFloat(bookWidth) || 148;
      const bH = parseFloat(bookHeight) || 210;
      const gx = parseFloat(gutterX) || 0;
      const gy = parseFloat(gutterY) || 0;

      const isRotated = (parseInt(pageRotation, 10) || 0) === 90 || (parseInt(pageRotation, 10) || 0) === 270 || pageOrientation === 'LANDSCAPE';
      const effPW = isRotated ? bH : bW;
      const effPH = isRotated ? bW : bH;

      const layoutW = c * effPW + (c - 1) * gx;
      const layoutH = r * effPH + (r - 1) * gy;
      reqW = Math.ceil((layoutW + ml + mr) * 10) / 10;
      reqH = Math.ceil((layoutH + mt + mb) * 10) / 10;
    }

    const currentW = parseFloat(sheetWidth) || 0;
    const currentH = parseFloat(sheetHeight) || 0;
    const fitsCurrent = currentW >= reqW - 0.5 && currentH >= reqH - 0.5;
    const bestSheet = findMinimumSheetSize(reqW, reqH, sheetOrientation);

    return {
      reqW,
      reqH,
      fitsCurrent,
      bestSheet
    };
  }, [
    partMode,
    boxCols,
    boxRows,
    effectiveBoxDimensions,
    packagingUnit,
    boxGutterX,
    boxGutterY,
    columns,
    rows,
    bookWidth,
    bookHeight,
    gutterX,
    gutterY,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    sheetWidth,
    sheetHeight,
    sheetOrientation,
    pageRotation
  ]);

  // Handler to select and apply the minimum sheet size where imposition is possible
  const applyMinimumSheetSize = (target = null) => {
    const sheetToApply = target || minSheetNeeded.bestSheet;
    if (!sheetToApply) return;
    setSheetPreset(sheetToApply.name);
    setSheetWidth(sheetToApply.width);
    setSheetHeight(sheetToApply.height);
    setSheetOrientation(sheetToApply.orientation);
    setCustomSheet(sheetToApply.isCustom);
  };

  // Handler to set custom sheet size tightly wrapping the box layout with press margins
  const handleFitSheetToLayout = (customMargins = null) => {
    const isInch = packagingUnit === 'inch';
    const c = Math.max(1, parseInt(boxCols, 10) || 2);
    const r = Math.max(1, parseInt(boxRows, 10) || 2);
    const effW = effectiveBoxDimensions.effW;
    const effH = effectiveBoxDimensions.effH;
    const gx = isInch ? (parseFloat(boxGutterX) || 0) * 25.4 : (parseFloat(boxGutterX) || 0);
    const gy = isInch ? (parseFloat(boxGutterY) || 0) * 25.4 : (parseFloat(boxGutterY) || 0);
    const ml = customMargins != null ? customMargins : (parseFloat(marginLeft) || 6.35);
    const mr = customMargins != null ? customMargins : (parseFloat(marginRight) || 6.35);
    const mt = customMargins != null ? customMargins : (parseFloat(marginTop) || 6.35);
    const mb = customMargins != null ? customMargins : (parseFloat(marginBottom) || 6.35);

    const layoutW = c * effW + (c - 1) * gx;
    const layoutH = r * effH + (r - 1) * gy;
    const fitW = Math.round((layoutW + ml + mr) * 10) / 10;
    const fitH = Math.round((layoutH + mt + mb) * 10) / 10;

    setSheetPreset('CUSTOM');
    setCustomSheet(true);
    setSheetWidth(fitW);
    setSheetHeight(fitH);
    setMarginDetectionResult({
      success: true,
      msg: `📐 Sheet custom-sized to tight layout: ${fitW} × ${fitH} mm (${(fitW / 25.4).toFixed(2)}" × ${(fitH / 25.4).toFixed(2)}")`
    });
  };

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

    if (partMode === 'BOX') {
      if (preset.name === '20×28"') {
        setBoxCols(2);
        setBoxRows(1);
        const val = packagingUnit === 'inch' ? 0.197 : 5.0;
        handleBoxGutterXChange(val);
        handleBoxGutterYChange(val);
      } else if (preset.name === '20×30"') {
        setBoxCols(3);
        setBoxRows(1);
        const val = packagingUnit === 'inch' ? 0.197 : 5.0;
        handleBoxGutterXChange(val);
        handleBoxGutterYChange(val);
      } else if (preset.name === '23×36"' || preset.name === '25×38"' || preset.name === '18×25"') {
        setBoxCols(2);
        setBoxRows(2);
        const val = packagingUnit === 'inch' ? 0.098 : 2.5;
        handleBoxGutterXChange(val);
        handleBoxGutterYChange(val);
      }
    }
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
    } else if (presetName === 'MAX_FIT') {
      setBookWidth(maxPageSize.pageW_mm);
      setBookHeight(maxPageSize.pageH_mm);
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

  // ─── Box In-Between Gap Handlers ───────────────────────────────────────
  const handleBoxGutterXChange = (val) => {
    const v = parseFloat(val) || 0;
    setBoxGutterX(v);
    if (boxGuttersLinked) setBoxGutterY(v);
  };

  const handleBoxGutterYChange = (val) => {
    const v = parseFloat(val) || 0;
    setBoxGutterY(v);
    if (boxGuttersLinked) setBoxGutterX(v);
  };

  // ─── Swap Ups & Page Allocation Handlers ──────────────────────────────
  const handleSwapUps = (idxA, idxB) => {
    if (idxA === idxB) return;
    setPageAllocation(prev => {
      const pageA = prev[idxA] !== undefined ? prev[idxA] : (idxA + 1);
      const pageB = prev[idxB] !== undefined ? prev[idxB] : (idxB + 1);
      return {
        ...prev,
        [idxA]: pageB,
        [idxB]: pageA
      };
    });
    setUpOffsets(prev => {
      const next = { ...prev };
      delete next[idxA];
      delete next[idxB];
      return next;
    });
  };

  const handlePageChangeForUp = (upIdx, pageNum) => {
    setPageAllocation(prev => ({
      ...prev,
      [upIdx]: pageNum
    }));
  };

  // ─── Unit Conversion Handler (inch <-> mm) ──────────────────────────────
  const handlePackagingUnitToggle = (newUnit) => {
    if (newUnit === packagingUnit) return;
    if (newUnit === 'mm') {
      setBoxGutterX(prev => Math.round((parseFloat(prev) * 25.4 || 5.0) * 10) / 10);
      setBoxGutterY(prev => Math.round((parseFloat(prev) * 25.4 || 5.0) * 10) / 10);
      setBoxLength(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setBoxWidth(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setBoxHeight(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setGlueTabWidth(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setTuckFlapHeight(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setTrimTop(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setTrimBottom(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setTrimLeft(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setTrimRight(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
      setHeaderTrimHeight(prev => Math.round((parseFloat(prev) * 25.4) * 10) / 10);
    } else {
      setBoxGutterX(prev => Math.round(((parseFloat(prev) / 25.4) || 0.197) * 1000) / 1000);
      setBoxGutterY(prev => Math.round(((parseFloat(prev) / 25.4) || 0.197) * 1000) / 1000);
      setBoxLength(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setBoxWidth(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setBoxHeight(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setGlueTabWidth(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setTuckFlapHeight(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setTrimTop(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setTrimBottom(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setTrimLeft(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setTrimRight(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
      setHeaderTrimHeight(prev => Math.round((parseFloat(prev) / 25.4) * 100) / 100);
    }
    setPackagingUnit(newUnit);
  };

  // ─── Box Artwork Margin Trim Handlers ──────────────────────────────────
  const handleTrimTopChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setTrimTop(v);
    if (trimLinked) setTrimBottom(v);
  };

  const handleTrimBottomChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setTrimBottom(v);
    if (trimLinked) setTrimTop(v);
  };

  const handleTrimLeftChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setTrimLeft(v);
    if (trimLinked) setTrimRight(v);
  };

  const handleTrimRightChange = (val) => {
    const v = Math.max(0, parseFloat(val) || 0);
    setTrimRight(v);
    if (trimLinked) setTrimLeft(v);
  };

  const handleApplyQuarterInchSheetMargins = () => {
    const qMargin = 6.35; // 0.25 inch in mm
    setMarginTop(qMargin);
    setMarginBottom(qMargin);
    setMarginLeft(qMargin);
    setMarginRight(qMargin);
    setMarginDetectionResult({
      success: true,
      msg: `📐 Applied 0.25" (6.35 mm) sheet margins to all 4 sides (Top, Bottom, Left, Right).`
    });
  };

  const handleTightenCadPack = async () => {
    setDetectingMargins(true);
    setMarginDetectionResult(null);
    setRemoveWhiteSpace(true);
    setTrimHeader(true);
    const isInch = packagingUnit === 'inch';
    const roundFactor = isInch ? 100 : 10;
    const factor = isInch ? 1 / 25.4 : 1;

    let targetBox = detectedArtBox;

    if (!targetBox && jobId) {
      try {
        const res = await detectArtworkMargins(jobId);
        if (res.success && res.detected && res.margins) {
          targetBox = res.margins;
          if (res.dielineMargins) {
            targetBox.dielineOnly = res.dielineMargins;
          }
        }
      } catch (err) {
        console.error("Failed to detect margins in tighten CAD:", err);
      }
    }

    let trimmedTop = 0, trimmedBot = 0, trimmedLeft = 0, trimmedRight = 0;
    const hMM_cad = (parseFloat(headerTrimHeight) || (isInch ? 0.75 : 20.0)) * (isInch ? 25.4 : 1);

    if (targetBox) {
      // Bottom, left, right strictly match detected artwork footprint (bottom flaps preserved 100%)
      trimmedBot = Math.round(targetBox.bottomMM * factor * roundFactor) / roundFactor;
      trimmedLeft = Math.round(targetBox.leftMM * factor * roundFactor) / roundFactor;
      trimmedRight = Math.round(targetBox.rightMM * factor * roundFactor) / roundFactor;

      // Use dielineOnly to trim off title blocks
      if (targetBox.dielineOnly) {
        trimmedTop = Math.round(targetBox.dielineOnly.topMM * factor * roundFactor) / roundFactor;
      } else {
        trimmedTop = Math.round((targetBox.topMM + hMM_cad) * factor * roundFactor) / roundFactor;
      }
    } else {
      const srcW = isInch ? (sourcePdfPageWidthMM / 25.4) : sourcePdfPageWidthMM;
      const srcH = isInch ? (sourcePdfPageHeightMM / 25.4) : sourcePdfPageHeightMM;
      const flatW = boxFlatDimensions.flatW;
      const flatH = boxFlatDimensions.flatH;
      const diffW = Math.max(0, srcW - flatW);
      const diffH = Math.max(0, srcH - flatH);
      trimmedLeft = Math.round((diffW / 2) * roundFactor) / roundFactor;
      trimmedRight = trimmedLeft;
      trimmedTop = Math.round((diffH / 2) * roundFactor) / roundFactor;
      trimmedBot = trimmedTop;
    }

    setTrimLeft(trimmedLeft);
    setTrimRight(trimmedRight);
    setTrimTop(trimmedTop);
    setTrimBottom(trimmedBot);

    // Set zero gap between individual box ups (butt-cut)
    setBoxGutterX(0);
    if (interlockMode === 'INTERLOCKING' || interlockMode === 'DUTCH') {
      const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
      const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
      const nest0 = isInch ? Math.round((-tuckMM / 25.4) * 100) / 100 : Math.round(-tuckMM * 10) / 10;
      setBoxGutterY(nest0);
      setBoxGuttersLinked(false);
    } else {
      setBoxGutterY(0);
      setBoxGuttersLinked(true);
    }
    setInterlockShiftX(0);
    setInterlockShiftY(0);

    // Apply 0.25" (6.35 mm) sheet margins all around
    const qMargin = 6.35;
    setMarginTop(qMargin);
    setMarginBottom(qMargin);
    setMarginLeft(qMargin);
    setMarginRight(qMargin);

    const effW = Math.max(1, Math.round((sourcePdfPageWidthMM - (trimmedLeft + trimmedRight) * (isInch ? 25.4 : 1)) * 10) / 10);
    const effH = Math.max(1, Math.round((sourcePdfPageHeightMM - (trimmedTop + trimmedBot) * (isInch ? 25.4 : 1)) * 10) / 10);
    const effWDisp = isInch ? `${(effW / 25.4).toFixed(2)}"` : `${effW} mm`;
    const effHDisp = isInch ? `${(effH / 25.4).toFixed(2)}"` : `${effH} mm`;

    setMarginDetectionResult({
      success: true,
      msg: `✨ Zero Gaps & Tight CAD Pack Applied! 1-Up content footprint: ${effWDisp} × ${effHDisp}. Set zero box gap & 0.25" sheet margins all around.`
    });
    setDetectingMargins(false);
  };

  const handleTightFit3mm = async () => {
    setDetectingMargins(true);
    setMarginDetectionResult(null);
    setRemoveWhiteSpace(true);
    setTrimHeader(true);
    const isInch = packagingUnit === 'inch';
    const roundFactor = isInch ? 100 : 10;
    const factor = isInch ? 1 / 25.4 : 1;
    const hMM = (parseFloat(headerTrimHeight) || (isInch ? 0.75 : 20.0)) * (isInch ? 25.4 : 1);

    let targetBox = detectedArtBox;

    if (!targetBox && jobId) {
      try {
        const res = await detectArtworkMargins(jobId);
        if (res.success && res.detected && res.margins) {
          targetBox = res.margins;
          if (res.dielineMargins) {
            targetBox.dielineOnly = res.dielineMargins;
          }
        }
      } catch (err) {
        console.error("Failed to detect margins in tight fit 3mm:", err);
      }
    }

    let trimmedTop = 0, trimmedBot = 0, trimmedLeft = 0, trimmedRight = 0;

    if (targetBox) {
      // Bottom, left, right strictly match detected artwork footprint (flaps preserved 100%)
      trimmedBot = Math.round(targetBox.bottomMM * factor * roundFactor) / roundFactor;
      trimmedLeft = Math.round(targetBox.leftMM * factor * roundFactor) / roundFactor;
      trimmedRight = Math.round(targetBox.rightMM * factor * roundFactor) / roundFactor;

      // Use dielineOnly to trim off title blocks
      if (targetBox.dielineOnly) {
        trimmedTop = Math.round(targetBox.dielineOnly.topMM * factor * roundFactor) / roundFactor;
      } else {
        trimmedTop = Math.round((targetBox.topMM + hMM) * factor * roundFactor) / roundFactor;
      }
    } else {
      const srcW = isInch ? (sourcePdfPageWidthMM / 25.4) : sourcePdfPageWidthMM;
      const srcH = isInch ? (sourcePdfPageHeightMM / 25.4) : sourcePdfPageHeightMM;
      const flatW = boxFlatDimensions.flatW;
      const flatH = boxFlatDimensions.flatH;
      const diffW = Math.max(0, srcW - flatW);
      const diffH = Math.max(0, srcH - flatH);
      trimmedLeft = Math.round((diffW / 2) * roundFactor) / roundFactor;
      trimmedRight = trimmedLeft;
      trimmedTop = Math.round((diffH / 2) * roundFactor) / roundFactor;
      trimmedBot = trimmedTop;
    }

    setTrimLeft(trimmedLeft);
    setTrimRight(trimmedRight);
    setTrimTop(trimmedTop);
    setTrimBottom(trimmedBot);

    // Calculate strict 3.0 mm (0.118") tuck flap nesting
    const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
    const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
    const clearanceMM = 3.0; // exact 3.0 mm die clearance
    const nestY_MM = -Math.max(0, tuckMM - clearanceMM);
    const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
    const g3 = isInch ? 0.118 : 3.0;

    setBoxGutterX(g3);
    setBoxGutterY(nestY);
    setBoxGuttersLinked(false);

    // Set INTERLOCKING mode
    setInterlockMode('INTERLOCKING');
    setInterlockShiftX(0);
    setInterlockShiftY(0);
    setLayoutShiftX(0);
    setLayoutShiftY(0);

    // Apply 0.25" (6.35 mm) sheet margins all around
    const qMargin = 6.35;
    setMarginTop(qMargin);
    setMarginBottom(qMargin);
    setMarginLeft(qMargin);
    setMarginRight(qMargin);

    const effW = Math.max(1, Math.round((sourcePdfPageWidthMM - (trimmedLeft + trimmedRight) * (isInch ? 25.4 : 1)) * 10) / 10);
    const effH = Math.max(1, Math.round((sourcePdfPageHeightMM - (trimmedTop + trimmedBot) * (isInch ? 25.4 : 1)) * 10) / 10);
    const effWDisp = isInch ? `${(effW / 25.4).toFixed(2)}"` : `${effW} mm`;
    const effHDisp = isInch ? `${(effH / 25.4).toFixed(2)}"` : `${effH} mm`;

    // Ensure sheet accommodates the 4-up 3mm nested layout
    const c = Math.max(1, parseInt(boxCols, 10) || 2);
    const r = Math.max(1, parseInt(boxRows, 10) || 2);
    const reqW = c * effW + (c - 1) * 3.0 + qMargin * 2;
    const reqH = r * effH + (r - 1) * nestY_MM + qMargin * 2;
    const curW = parseFloat(sheetWidth) || 0;
    const curH = parseFloat(sheetHeight) || 0;
    if (curW < reqW - 1 || curH < reqH - 1) {
      const best = findMinimumSheetSize(reqW, reqH, sheetOrientation);
      if (best) {
        setSheetPreset(best.name);
        setSheetWidth(best.width);
        setSheetHeight(best.height);
        setSheetOrientation(best.orientation);
        setCustomSheet(best.isCustom);
      }
    }

    setMarginDetectionResult({
      success: true,
      msg: `✨ Strict 3.0 mm Interlock Nesting Applied! 1-Up content footprint: ${effWDisp} × ${effHDisp}. Opposing tuck flaps interlock with exact 3.0 mm clearance.`
    });
    setDetectingMargins(false);
  };

  const handleToggleTrimHeader = () => {
    const next = !trimHeader;
    setTrimHeader(next);
    const isInch = packagingUnit === 'inch';
    const factor = isInch ? 1 / 25.4 : 1;
    const roundFactor = isInch ? 100 : 10;
    const hMM = (parseFloat(headerTrimHeight) || (isInch ? 0.75 : 20.0)) * (isInch ? 25.4 : 1);
    const hVal = Math.round(hMM * factor * roundFactor) / roundFactor;

    const targetBox = detectedArtBox;

    if (targetBox) {
      if (targetBox.dielineOnly) {
        // Vector keylines with detected top gap (e.g. Pluvya)
        const src = next ? targetBox.dielineOnly : targetBox;
        setTrimTop(Math.round(src.topMM * factor * roundFactor) / roundFactor);
        setTrimBottom(Math.round(src.bottomMM * factor * roundFactor) / roundFactor);
        setTrimLeft(Math.round(src.leftMM * factor * roundFactor) / roundFactor);
        setTrimRight(Math.round(src.rightMM * factor * roundFactor) / roundFactor);
      } else {
        // Works for images, raster artwork, ArtBox, or any box without a separate vector gap
        if (next) {
          const baseTopMM = trimTop > 0 ? (trimTop * (isInch ? 25.4 : 1)) : targetBox.topMM;
          const newTopMM = baseTopMM + hMM;
          setTrimTop(Math.round(newTopMM * factor * roundFactor) / roundFactor);
          if (trimLeft === 0 && trimBottom === 0) {
            setTrimBottom(Math.round(targetBox.bottomMM * factor * roundFactor) / roundFactor);
            setTrimLeft(Math.round(targetBox.leftMM * factor * roundFactor) / roundFactor);
            setTrimRight(Math.round(targetBox.rightMM * factor * roundFactor) / roundFactor);
          }
        } else {
          const curTopMM = (parseFloat(trimTop) || 0) * (isInch ? 25.4 : 1);
          const revertedTopMM = Math.max(targetBox.topMM, curTopMM - hMM);
          setTrimTop(Math.round(revertedTopMM * factor * roundFactor) / roundFactor);
        }
      }
    } else {
      if (next) {
        setTrimTop(prev => Math.round((prev + hVal) * roundFactor) / roundFactor);
      } else {
        setTrimTop(prev => Math.max(0, Math.round((prev - hVal) * roundFactor) / roundFactor));
      }
    }
  };

  const handleHeaderTrimHeightChange = (val) => {
    const num = parseFloat(val) || 0;
    const oldVal = parseFloat(headerTrimHeight) || 0;
    const diff = num - oldVal;
    setHeaderTrimHeight(num);
    if (trimHeader) {
      setTrimTop(prev => Math.max(0, Math.round((prev + diff) * 100) / 100));
    }
  };

  const handleAutoDetectMargins = async (forceDielineOnly = false) => {
    setDetectingMargins(true);
    setMarginDetectionResult(null);
    const isInch = packagingUnit === 'inch';
    const factor = isInch ? 1 / 25.4 : 1;
    const roundFactor = isInch ? 100 : 10;
    const dieGap = isInch ? 0.01 : 0.25;

    let targetBox = detectedArtBox;

    if ((!targetBox || (!targetBox.dielineOnly && (forceDielineOnly || trimHeader))) && jobId) {
      try {
        const res = await detectArtworkMargins(jobId);
        if (res.success && res.detected && res.margins) {
          targetBox = res.margins;
          if (res.dielineMargins) {
            targetBox.dielineOnly = res.dielineMargins;
          }
        }
      } catch (err) {
        console.error("Auto detect margins error:", err);
      }
    }

    if (targetBox) {
      const activeSource = ((forceDielineOnly || trimHeader) && targetBox.dielineOnly) ? targetBox.dielineOnly : targetBox;
      const topVal = Math.round(activeSource.topMM * factor * roundFactor) / roundFactor;
      const botVal = Math.round(activeSource.bottomMM * factor * roundFactor) / roundFactor;
      const leftVal = Math.round(activeSource.leftMM * factor * roundFactor) / roundFactor;
      const rightVal = Math.round(activeSource.rightMM * factor * roundFactor) / roundFactor;
      setTrimTop(topVal);
      setTrimBottom(botVal);
      setTrimLeft(leftVal);
      setTrimRight(rightVal);
      setBoxGutterX(dieGap);
      setBoxGutterY(dieGap);

      const effW = Math.max(1, Math.round((sourcePdfPageWidthMM - (leftVal + rightVal) * (isInch ? 25.4 : 1)) * 10) / 10);
      const effH = Math.max(1, Math.round((sourcePdfPageHeightMM - (topVal + botVal) * (isInch ? 25.4 : 1)) * 10) / 10);
      const effWDisp = isInch ? `${(effW / 25.4).toFixed(2)}"` : `${effW} mm`;
      const effHDisp = isInch ? `${(effH / 25.4).toFixed(2)}"` : `${effH} mm`;

      setMarginDetectionResult({
        success: true,
        msg: `Detected artwork footprint: ${effWDisp} × ${effHDisp} (Top ${topVal}${isInch ? '"' : 'mm'}, Bottom ${botVal}${isInch ? '"' : 'mm'}, Left ${leftVal}${isInch ? '"' : 'mm'}, Right ${rightVal}${isInch ? '"' : 'mm'}). Applied 0.25 mm margin between boxes.`
      });
      setDetectingMargins(false);
      return;
    }

    try {
      const srcW = isInch ? (sourcePdfPageWidthMM / 25.4) : sourcePdfPageWidthMM;
      const srcH = isInch ? (sourcePdfPageHeightMM / 25.4) : sourcePdfPageHeightMM;
      const flatW = boxFlatDimensions.flatW;
      const flatH = boxFlatDimensions.flatH;
      const diffW = Math.max(0, srcW - flatW);
      const diffH = Math.max(0, srcH - flatH);
      const halfW = Math.round((diffW / 2) * roundFactor) / roundFactor;
      const halfH = Math.round((diffH / 2) * roundFactor) / roundFactor;
      setTrimTop(halfH);
      setTrimBottom(halfH);
      setTrimLeft(halfW);
      setTrimRight(halfW);
      setBoxGutterX(dieGap);
      setBoxGutterY(dieGap);
      setMarginDetectionResult({
        success: true,
        msg: `Fitted to dieline footprint: ${flatW} × ${flatH} ${isInch ? 'inch' : 'mm'} (Trimmed ${halfH}${isInch ? '"' : 'mm'} top/bottom, ${halfW}${isInch ? '"' : 'mm'} sides). Applied 0.25 mm margin in between boxes.`
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDetectingMargins(false);
    }
  };

  // ─── Execute Imposition ─────────────────────────────────────────────────
  const handleRunImposition = async () => {
    setImposing(true);
    setError(null);

    // Auto-select minimum sheet size if current sheet is out of size
    let effSheetW = parseFloat(sheetWidth);
    let effSheetH = parseFloat(sheetHeight);
    let effPreset = sheetPreset;
    let effOrient = sheetOrientation;
    let effIsCustom = sheetPreset === 'CUSTOM';

    if (!minSheetNeeded.fitsCurrent) {
      const best = minSheetNeeded.bestSheet;
      effSheetW = best.width;
      effSheetH = best.height;
      effPreset = best.name;
      effOrient = best.orientation;
      effIsCustom = best.isCustom;

      setSheetWidth(effSheetW);
      setSheetHeight(effSheetH);
      setSheetPreset(effPreset);
      setSheetOrientation(effOrient);
      setCustomSheet(effIsCustom);
    }

    const isBoxMode = partMode === 'BOX';
    const isInchPackaging = isBoxMode && packagingUnit === 'inch';
    const trimFactor = isInchPackaging ? 25.4 : 1;
    const tTopMM = (parseFloat(trimTop) || 0) * trimFactor;
    const tBottomMM = (parseFloat(trimBottom) || 0) * trimFactor;
    const tLeftMM = (parseFloat(trimLeft) || 0) * trimFactor;
    const tRightMM = (parseFloat(trimRight) || 0) * trimFactor;
    const gxMM = isBoxMode 
      ? (isInchPackaging 
          ? ((parseFloat(boxGutterX) != null && !isNaN(parseFloat(boxGutterX))) ? parseFloat(boxGutterX) * 25.4 : 0) 
          : ((parseFloat(boxGutterX) != null && !isNaN(parseFloat(boxGutterX))) ? parseFloat(boxGutterX) : 0)) 
      : parseFloat(gutterX || 0);
    const gyMM = isBoxMode 
      ? (isInchPackaging 
          ? ((parseFloat(boxGutterY) != null && !isNaN(parseFloat(boxGutterY))) ? parseFloat(boxGutterY) * 25.4 : 0) 
          : ((parseFloat(boxGutterY) != null && !isNaN(parseFloat(boxGutterY))) ? parseFloat(boxGutterY) : 0)) 
      : parseFloat(gutterY || 0);

    const config = {
      productCategory: isBoxMode ? 'BOX' : 'BOOK',
      sheet: {
        width: effSheetW,
        height: effSheetH,
        unit: 'mm',
        orientation: effOrient,
        preset: effPreset,
        isCustom: effIsCustom
      },
      bookSize: {
        width: isBoxMode ? effectiveBoxDimensions.effW : parseFloat(bookWidth),
        height: isBoxMode ? effectiveBoxDimensions.effH : parseFloat(bookHeight),
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
        unit: packagingUnit,
        boxStyle,
        length: parseFloat(boxLength) || (packagingUnit === 'inch' ? 4.09 : 100),
        width: parseFloat(boxWidth) || (packagingUnit === 'inch' ? 1.57 : 60),
        height: parseFloat(boxHeight) || (packagingUnit === 'inch' ? 4.72 : 140),
        glueTab: parseFloat(glueTabWidth) || (packagingUnit === 'inch' ? 0.52 : 15),
        tuckFlap: parseFloat(tuckFlapHeight) || (packagingUnit === 'inch' ? 1.5 : 15),
        flatWidth: boxFlatDimensions.flatW,
        flatHeight: boxFlatDimensions.flatH,
        effectiveWidth: effectiveBoxDimensions.effW,
        effectiveHeight: effectiveBoxDimensions.effH,
        trimTop: parseFloat(trimTop) || 0,
        trimBottom: parseFloat(trimBottom) || 0,
        trimLeft: parseFloat(trimLeft) || 0,
        trimRight: parseFloat(trimRight) || 0,
        trimTopMM: tTopMM,
        trimBottomMM: tBottomMM,
        trimLeftMM: tLeftMM,
        trimRightMM: tRightMM,
        trimMargins: {
          top: tTopMM,
          bottom: tBottomMM,
          left: tLeftMM,
          right: tRightMM
        },
        interlockMode,
        dielineOverlay,
        tightCadPack: Boolean(removeWhiteSpace || (parseFloat(trimTop) > 0 || parseFloat(trimBottom) > 0 || parseFloat(trimLeft) > 0 || parseFloat(trimRight) > 0)),
        removeWhiteSpace,
        trimHeader,
        headerHeightMM: (parseFloat(headerTrimHeight) || (packagingUnit === 'inch' ? 0.75 : 20.0)) * (packagingUnit === 'inch' ? 25.4 : 1),
        interlockShiftX: parseFloat(interlockShiftX) || 0,
        interlockShiftY: parseFloat(interlockShiftY) || 0,
        layoutShiftX: parseFloat(layoutShiftX) || 0,
        layoutShiftY: parseFloat(layoutShiftY) || 0,
        upOffsets: upOffsets || {},
        pageAllocation: pageAllocation || {},
        multiPageGang: Boolean(multiPageGang && sourcePdfPageCount > 1),
        gutterX: gxMM,
        gutterY: gyMM,
        orderQuantity: parseInt(orderQuantity, 10) || 1000
      } : undefined,
      trimMargins: isBoxMode ? {
        top: tTopMM,
        bottom: tBottomMM,
        left: tLeftMM,
        right: tRightMM
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
        horizontal: gxMM,
        vertical: gyMM,
        unit: 'mm'
      },
      fitMode: fitMode || 'NONE',
      printTechnology,
      cropMarks: {
        enabled: isBoxMode ? false : cropMarks,
        length: parseFloat(cropMarkLength || 5),
        offset: parseFloat(cropMarkOffset || 3),
        unit: 'mm'
      },
      marks: {
        jobTitle: activeJob?.originalFileName || uploadedFile?.name || 'BDE 1140 _ Acuzie 100 Ml MAIN FILE_EXPANDED_FINAL',
        crop: isBoxMode ? false : cropMarks,
        registrationMarks: false,
        registration: false,
        colorBars: isBoxMode ? false : colorBars,
        colorBar: isBoxMode ? false : colorBars,
        cameraMarks: (!isBoxMode && cameraMarks) ? {
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
        foldMarks: isBoxMode ? false : foldMarks,
        digitalBarcode: isBoxMode ? false : digitalBarcode,
        printTechnology,
        isBoxJob: isBoxMode,
        dielineOverlay: partMode === 'KEYLINE' ? true : dielineOverlay,
        coverStudio: partMode === 'COVER' ? {
          spineWidth: calculatedSpine,
          hasFlaps,
          flapWidth: hasFlaps ? parseFloat(flapWidth) : 0,
          paperCaliper: parseFloat(paperCaliper)
        } : undefined,
        unit: packagingUnit
      },
      keylines: keylineElements,
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
            onClick={() => { setPartMode('TEXT'); setSignatureIndex(0); setDielineOverlay(false); }}
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
            onClick={() => { setPartMode('COVER'); setSignatureIndex(0); setDielineOverlay(false); }}
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
            onClick={() => {
              setPartMode('BOX');
              setSignatureIndex(0);
              setWorkStyle('SINGLE_SIDED');
              setPackagingUnit('inch');
              setSheetPreset('18×25"');
              setSheetWidth(635);
              setSheetHeight(457.2);
              setSheetOrientation('LANDSCAPE');
              setBoxCols(2);
              setBoxRows(2);
              setBoxLength(4.09);
              setBoxWidth(1.57);
              setBoxHeight(4.72);
              setGlueTabWidth(0.52);
              setTuckFlapHeight(1.5);
              setInterlockMode('INTERLOCKING');
              setDielineOverlay(true);
              setCropMarks(false);
              setColorBars(false);
              setCameraMarks(false);
              setFoldMarks(false);
              setDigitalBarcode(false);
            }}
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

      {/* ─── Non-Tech Operator Quick-Bar: Press Sheet & UPS Yield Selector ─── */}
      {(partMode === 'BOX' || partMode === 'COVER') && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#101726] via-[#141F32] to-[#101726] border border-cyan-500/40 shadow-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Zap className="w-4 h-4 text-cyan-400" />
              Sheet & UPS Yield:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: '20×28"', label: '20×28"', ups: '2 UPS', badge: 'Min Sheet', w: 508, h: 711.2, cols: 2, rows: 1 },
                { name: '20×30"', label: '20×30"', ups: '3 UPS', badge: 'High Yield', w: 508, h: 762, cols: 3, rows: 1 },
                { name: '23×36"', label: '23×36"', ups: '4/6 UPS', w: 584, h: 914, cols: 2, rows: 2 },
                { name: '28×40"', label: '28×40"', ups: '8 UPS', w: 711, h: 1016, cols: 4, rows: 2 },
                { name: '18×25"', label: '18×25"', ups: '2/4 UPS', w: 635, h: 457.2, cols: 2, rows: 2 },
              ].map((sz) => {
                const isSelected = sheetPreset === sz.name;
                return (
                  <button
                    key={sz.name}
                    type="button"
                    onClick={() => {
                      setSheetPreset(sz.name);
                      setSheetWidth(sz.w);
                      setSheetHeight(sz.h);
                      setSheetOrientation('LANDSCAPE');
                      if (partMode === 'BOX') {
                        setBoxCols(sz.cols);
                        setBoxRows(sz.rows);
                      }
                      setCustomSheet(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/30'
                        : 'bg-[#182338] text-slate-300 border-[#2A3A54] hover:border-cyan-500/50 hover:text-white'
                    }`}
                  >
                    <span>{sz.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    }`}>
                      {sz.ups}
                    </span>
                    {sz.badge && (
                      <span className={`text-[9px] px-1 py-0.2 rounded ${
                        isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {sz.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Generate Output Action */}
          <button
            type="button"
            disabled={imposing}
            onClick={handleRunImposition}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-bold font-mono text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            {imposing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating Output...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Generate Imposition Output (1-Click)</span>
              </>
            )}
          </button>
        </div>
      )}

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
                    const sigMax = calculateMaxPageSizeForSignature(sheetWidth, sheetHeight, preset.pages);
                    return (
                      <button
                        key={preset.pages}
                        onClick={() => { setSelectedLayout(preset.pages); setSignatureIndex(0); }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${isSelected
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                            : 'bg-[#10141D] border-[#233045] text-slate-400 hover:border-[#2B3C57] hover:text-slate-200'
                          }`}
                        title={`${preset.name}: Max page size on current sheet is ${sigMax.pageW_in}" × ${sigMax.pageH_in}" (${sigMax.pageW_mm} × ${sigMax.pageH_mm} mm)`}
                      >
                        <span className="text-base font-bold font-mono">{preset.label}</span>
                        <span className="text-[10px] text-slate-400 truncate w-full">{preset.cols}×{preset.rows} Duplex</span>
                        <span className="text-[9px] font-mono text-emerald-400 font-semibold mt-0.5">
                          {sigMax.pageW_in}"×{sigMax.pageH_in}"
                        </span>
                        {preset.badge && (
                          <span className="text-[8px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300 mt-0.5">
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
                <div className="flex items-center gap-2">
                  {onOpenGangModal && (
                    <button
                      type="button"
                      onClick={onOpenGangModal}
                      className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold border border-emerald-400 flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                      title="Open Multi-File Gang Run Imposition Studio"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>📦 Multi-File Gang Optimizer</span>
                    </button>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    N-Up Packaging
                  </span>
                </div>
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

              {/* Unit Toggle & Acuzie 1-Click Preset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-300 font-bold">Measurement Unit</span>
                  <div className="flex items-center gap-1 bg-[#10141D] p-1 rounded-lg border border-[#233045]">
                    <button
                      type="button"
                      onClick={() => handlePackagingUnitToggle('inch')}
                      className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-all ${packagingUnit === 'inch' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      inch (")
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePackagingUnitToggle('mm')}
                      className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-all ${packagingUnit === 'mm' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      mm
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPackagingUnit('inch');
                      setBoxStyle('RTE');
                      setBoxLength(4.09);
                      setBoxWidth(1.57);
                      setBoxHeight(4.72);
                      setGlueTabWidth(0.52);
                      setTuckFlapHeight(1.5);
                      setBoxCols(2);
                      setBoxRows(2);
                      setInterlockMode('INTERLOCKING');
                      setDielineOverlay(true);
                      setSheetPreset('18×25"');
                      setSheetWidth(635);
                      setSheetHeight(457.2);
                      setSheetOrientation('LANDSCAPE');
                      setCropMarks(false);
                      setColorBars(false);
                      setCameraMarks(false);
                      setFoldMarks(false);
                      setDigitalBarcode(false);
                      setBoxGuttersLinked(false);
                      setLayoutShiftX(0);
                      setLayoutShiftY(0);
                      // Apply 0.25" (6.35 mm) sheet margins
                      const qMargin = 6.35;
                      setMarginTop(qMargin);
                      setMarginBottom(qMargin);
                      setMarginLeft(qMargin);
                      setMarginRight(qMargin);
                      handleTightFit3mm();
                    }}
                    className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Acuzie (4-Up 18×25")</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPackagingUnit('inch');
                      setBoxStyle('RTE');
                      setBoxLength(4.26);
                      setBoxWidth(2.56);
                      setBoxHeight(5.12);
                      setGlueTabWidth(0.59);
                      setTuckFlapHeight(1.38); // 35mm
                      setBoxCols(2);
                      setBoxRows(2);
                      setInterlockMode('INTERLOCKING');
                      setDielineOverlay(true);
                      setSheetPreset('20×30"');
                      setSheetWidth(508);
                      setSheetHeight(762);
                      setSheetOrientation('PORTRAIT');
                      setCropMarks(false);
                      setColorBars(false);
                      setCameraMarks(false);
                      setFoldMarks(false);
                      setDigitalBarcode(false);
                      setBoxGuttersLinked(false);
                      setLayoutShiftX(0);
                      setLayoutShiftY(0);
                      // Apply 0.25" (6.35 mm) sheet margins
                      const qMargin = 6.35;
                      setMarginTop(qMargin);
                      setMarginBottom(qMargin);
                      setMarginLeft(qMargin);
                      setMarginRight(qMargin);
                      handleTightFit3mm();
                    }}
                    className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/50 hover:border-blue-400 text-blue-300 hover:text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Pluvya (4-Up 20×30")</span>
                  </button>
                </div>
              </div>

              {/* 3D Box Dimensions (L x W x H) */}
              <div className="p-3 rounded-xl bg-[#10141D] border border-[#233045] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                    Finished 3D Box Dimensions ({packagingUnit === 'inch' ? 'inch' : 'mm'})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Length (L):</span>
                    <input
                      type="number"
                      step={packagingUnit === 'inch' ? '0.01' : '1'}
                      value={boxLength}
                      onChange={(e) => setBoxLength(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Width (W):</span>
                    <input
                      type="number"
                      step={packagingUnit === 'inch' ? '0.01' : '1'}
                      value={boxWidth}
                      onChange={(e) => setBoxWidth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Height/Depth:</span>
                    <input
                      type="number"
                      step={packagingUnit === 'inch' ? '0.01' : '1'}
                      value={boxHeight}
                      onChange={(e) => setBoxHeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1E293B]">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Glue Tab:</span>
                    <input
                      type="number"
                      step={packagingUnit === 'inch' ? '0.01' : '1'}
                      value={glueTabWidth}
                      onChange={(e) => setGlueTabWidth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-0.5">Tuck Flaps:</span>
                    <input
                      type="number"
                      step={packagingUnit === 'inch' ? '0.01' : '1'}
                      value={tuckFlapHeight}
                      onChange={(e) => setTuckFlapHeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                {/* Calculated Flat Dieline Footprint */}
                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Calculated Flat Dieline:</span>
                  <span className="text-xs font-mono text-emerald-300 font-bold">
                    {boxFlatDimensions.flatW} × {boxFlatDimensions.flatH} {packagingUnit === 'inch' ? '"' : 'mm'}
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
                    onChange={(e) => {
                      const newMode = e.target.value;
                      setInterlockMode(newMode);
                      if (newMode === 'INTERLOCKING' || newMode === 'DUTCH') {
                        if (boxGutterY >= 0) {
                          const isInch = packagingUnit === 'inch';
                          const tuck = (parseFloat(tuckFlapHeight) || (isInch ? 1.38 : 35)) * (isInch ? 25.4 : 1);
                          const nestY_MM = -Math.max(0, tuck - 3.0);
                          const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
                          handleBoxGutterYChange(nestY);
                          handleBoxGutterXChange(isInch ? 0.118 : 3.0);
                          setBoxGuttersLinked(false);
                        }
                      } else if (newMode === 'STANDARD') {
                        if (boxGutterY < 0) {
                          handleBoxGutterYChange(packagingUnit === 'inch' ? 0.118 : 3.0);
                        }
                      }
                    }}
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

                  <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                    dielineOverlay
                      ? 'bg-[#121E33] border-cyan-500/50 shadow-sm shadow-cyan-950/40'
                      : 'bg-[#141C2A] border-[#233045]'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="dielineOverlay"
                        checked={dielineOverlay}
                        onChange={(e) => setDielineOverlay(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="dielineOverlay" className="text-xs font-mono font-semibold text-slate-100 cursor-pointer block">
                          Key Die Lines (Dieline Overlay & CAD Dimensions)
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Draws vector Cut (Red), Crease (Blue) scorelines and precise panel dimensions (L, W, H, Glue, Tuck).
                        </p>
                      </div>
                    </div>
                    {dielineOverlay && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 font-semibold uppercase tracking-wider shrink-0">
                        ACTIVE
                      </span>
                    )}
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

              {/* ─── Packaging Press Sheet & 0.25" Margins (Quick Stock Selection) ─── */}
              <div className="p-3.5 rounded-xl bg-[#0D131F] border border-cyan-500/40 space-y-3 shadow-lg shadow-cyan-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Press Sheet Stock & 0.25" Margins
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
                    {sheetWidth} × {sheetHeight} mm ({(sheetWidth / 25.4).toFixed(1)}" × {(sheetHeight / 25.4).toFixed(1)}")
                  </span>
                </div>

                <p className="text-[10px] font-mono text-slate-400 leading-tight">
                  Select your press sheet stock (e.g. 20×30", 20×26", 23×36") and apply standard 0.25" sheet margins on all 4 sides.
                </p>

                {/* Quick Packaging Sheet Presets with Green / Light Green / Light Yellow Visual Ranking */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-400 block font-semibold uppercase">Quick Sheet Presets:</span>
                    <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 1st: Green • 2nd: Light Green • 3rd: Light Yellow
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    {[
                      { name: '20×28"', label: '20 × 28"', desc: '508 × 711 mm • 2 UPS', w: 508, h: 711.2, rank: 1, rankBadge: '★ Best', rankColor: 'green' },
                      { name: '20×30"', label: '20 × 30"', desc: '508 × 762 mm • 3 UPS', w: 508, h: 762, rank: 2, rankBadge: '2nd Best', rankColor: 'light-green' },
                      { name: '25×38"', label: '25 × 38"', desc: '635 × 965 mm • 4 UPS', w: 635, h: 965, rank: 3, rankBadge: '3rd Best', rankColor: 'light-yellow' },
                      { name: '23×36"', label: '23 × 36"', desc: '584 × 914 mm', w: 584, h: 914 },
                      { name: '18×25"', label: '18 × 25"', desc: '457 × 635 mm', w: 635, h: 457.2 },
                      { name: '28×40"', label: '28 × 40"', desc: '711 × 1016 mm', w: 711, h: 1016 },
                    ].map((sz) => {
                      const isSelected = sheetPreset === sz.name;
                      const isR1 = sz.rank === 1;
                      const isR2 = sz.rank === 2;
                      const isR3 = sz.rank === 3;

                      let btnBorder = 'border-[#233045] bg-[#141C2A] text-slate-300 hover:text-white hover:border-slate-500';
                      if (isSelected) {
                        btnBorder = 'bg-gradient-to-r from-cyan-950 to-blue-950 border-cyan-400 text-white font-bold shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400';
                      } else if (isR1) {
                        btnBorder = 'border-emerald-500/80 bg-emerald-950/30 text-emerald-200 hover:border-emerald-400';
                      } else if (isR2) {
                        btnBorder = 'border-lime-500/70 bg-lime-950/25 text-lime-200 hover:border-lime-400';
                      } else if (isR3) {
                        btnBorder = 'border-yellow-400/70 bg-yellow-950/20 text-yellow-200 hover:border-yellow-300';
                      }

                      return (
                        <button
                          key={sz.name}
                          type="button"
                          onClick={() => {
                            const p = SHEET_PRESETS.find(x => x.name === sz.name) || sz;
                            handleSelectSheetPreset(p);
                          }}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${btnBorder}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{sz.label}</span>
                            {sz.rankBadge && (
                              <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                                isR1 ? 'bg-emerald-500 text-slate-950' : isR2 ? 'bg-lime-400 text-slate-950' : 'bg-yellow-400 text-slate-950'
                              }`}>
                                {sz.rankBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[8px] text-slate-400">{sz.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sheet Selector Dropdown & Orientation & Margins Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">All Sheet Sizes</label>
                    <select
                      value={sheetPreset}
                      onChange={(e) => {
                        const p = SHEET_PRESETS.find(x => x.name === e.target.value);
                        if (p) handleSelectSheetPreset(p);
                      }}
                      className="w-full bg-[#141C2A] border border-[#233045] rounded-lg px-2 py-1 text-xs font-mono text-white"
                    >
                      {SHEET_PRESETS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Sheet Feed Orientation</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSheetOrientation('PORTRAIT')}
                        className={`py-1 px-2 rounded-lg border text-[11px] font-mono font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          sheetOrientation === 'PORTRAIT'
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                            : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>↕ Portrait</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSheetOrientation('LANDSCAPE')}
                        className={`py-1 px-2 rounded-lg border text-[11px] font-mono font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          sheetOrientation === 'LANDSCAPE'
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                            : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>↔ Landscape</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Apply 0.25" Margin All Button & Status */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141C2A] border border-[#233045]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-300">
                      Sheet Margins: <strong className="text-cyan-300">{marginTop === 6.35 && marginBottom === 6.35 && marginLeft === 6.35 && marginRight === 6.35 ? '0.25" All (6.35 mm)' : `${marginTop}T / ${marginBottom}B / ${marginLeft}L / ${marginRight}R mm`}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyQuarterInchSheetMargins}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    title="Apply 0.25 inch (6.35 mm) margin to all 4 sides"
                  >
                    <span>📐 Apply 0.25" Margin All</span>
                  </button>
                </div>
              </div>

              {/* ─── In-Between Box Gap & Spacing (Horizontal & Vertical Whitespace Trimming) ─── */}
              <div className="p-3.5 rounded-xl bg-[#0D131F] border border-cyan-500/40 space-y-3 shadow-lg shadow-cyan-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      In-Between Box Spacing & Gap Trimming
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBoxGuttersLinked(prev => !prev)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer ${
                      boxGuttersLinked
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                    }`}
                    title={boxGuttersLinked ? "Horizontal & Vertical gaps are linked" : "Adjust horizontal and vertical gaps independently"}
                  >
                    {boxGuttersLinked ? <Link2 className="w-3 h-3 text-cyan-400" /> : <Unlink className="w-3 h-3 text-amber-400" />}
                    <span>{boxGuttersLinked ? 'Gaps Linked' : 'Independent'}</span>
                  </button>
                </div>

                <p className="text-[10px] font-mono text-slate-400 leading-tight">
                  Trim or eliminate white space in between boxes both horizontally (between columns) and vertically (between rows).
                </p>

                {/* Quick Gaps Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const val = packagingUnit === 'inch' ? 0.197 : 5.0;
                      handleBoxGutterXChange(val);
                      handleBoxGutterYChange(val);
                    }}
                    className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                      Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.197 : 5.0)) < 0.01
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30 font-extrabold'
                        : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-600'
                    }`}
                    title="Strict 5.0 mm total space between adjacent ups (Standard for 2-Up)"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{packagingUnit === 'inch' ? '0.197" (5.0 mm Gap - 2-Up)' : '5.0 mm Gap (Strict for 2-Up)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const val = packagingUnit === 'inch' ? 0.098 : 2.5;
                      handleBoxGutterXChange(val);
                      handleBoxGutterYChange(val);
                    }}
                    className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                      Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.098 : 2.5)) < 0.01
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/30 font-extrabold'
                        : 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-600'
                    }`}
                    title="Strict 2.5 mm uniform space between all adjacent ups (Standard for 4-Up)"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{packagingUnit === 'inch' ? '0.098" (2.5 mm Uniform - 4-Up)' : '2.5 mm Uniform Gap (Strict for 4-Up)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const isInch = packagingUnit === 'inch';
                      const tuck = (parseFloat(tuckFlapHeight) || (isInch ? 1.38 : 35)) * (isInch ? 25.4 : 1);
                      const clearance = 3.0; // exact 3mm clearance
                      const nestY_MM = -Math.max(0, tuck - clearance);
                      const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
                      const g3 = isInch ? 0.118 : 3.0;
                      handleBoxGutterXChange(g3);
                      handleBoxGutterYChange(nestY);
                      setInterlockShiftX(0);
                      setInterlockShiftY(0);
                      setInterlockMode('INTERLOCKING');
                      setBoxGuttersLinked(false);
                    }}
                    className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                      interlockMode === 'INTERLOCKING' &&
                      boxGutterY < 0 &&
                      Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold border-indigo-400 shadow-indigo-600/40'
                        : 'bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border-indigo-600'
                    }`}
                    title="Nests interlocking cartons with strict 3.0 mm die clearance overall between opposing tuck flaps"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{packagingUnit === 'inch' ? '🔄 Strict 0.118" Interlock (3mm Overall)' : '🔄 Strict 3.0 mm Interlock Gap Overall'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const val = packagingUnit === 'inch' ? 0.118 : 3.0;
                      handleBoxGutterXChange(val);
                      handleBoxGutterYChange(val);
                      setBoxGuttersLinked(true);
                    }}
                    className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                      Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01 &&
                      Math.abs(parseFloat(boxGutterY) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01
                        ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white border-emerald-400 shadow-emerald-600/40 font-extrabold'
                        : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-600'
                    }`}
                    title="Strict 3.0 mm (0.118 in) uniform gap between cartons in both X (columns) and Y (rows)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{packagingUnit === 'inch' ? '📐 Exact 0.118" Gap Overall (X & Y)' : '📐 Exact 3.0 mm Gap Overall (Both X & Y)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleBoxGutterXChange(0);
                      handleBoxGutterYChange(0);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#141C2A] hover:bg-[#1E293B] text-slate-300 font-mono text-[10px] border border-[#233045] transition-all cursor-pointer"
                  >
                    0.00{packagingUnit === 'inch' ? '"' : 'mm'} (Butt-Cut)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const val = packagingUnit === 'inch' ? 0.315 : 8.0;
                      handleBoxGutterXChange(val);
                      handleBoxGutterYChange(val);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#141C2A] hover:bg-[#1E293B] text-slate-300 font-mono text-[10px] border border-[#233045] transition-all cursor-pointer"
                  >
                    {packagingUnit === 'inch' ? '0.315" (8mm)' : '8.0 mm'} Wide
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const val = packagingUnit === 'inch' ? 0.25 : 6.0;
                      handleBoxGutterXChange(val);
                      handleBoxGutterYChange(val);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#141C2A] hover:bg-[#1E293B] text-slate-300 font-mono text-[10px] border border-[#233045] transition-all cursor-pointer"
                  >
                    {packagingUnit === 'inch' ? '1/4"' : '6mm Wide'}
                  </button>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setInterlockMode('INTERLOCKING');
                        if (boxGutterY >= 0) {
                          const isInch = packagingUnit === 'inch';
                          const tuck = (parseFloat(tuckFlapHeight) || (isInch ? 1.38 : 35)) * (isInch ? 25.4 : 1);
                          const nestY_MM = -Math.max(0, tuck - 3.0);
                          const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
                          handleBoxGutterYChange(nestY);
                          handleBoxGutterXChange(isInch ? 0.118 : 3.0);
                          setBoxGuttersLinked(false);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        interlockMode === 'INTERLOCKING'
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                          : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                      }`}
                      title="180° alternating rows (Dutch) for tight flap interlocking"
                    >
                      <span>🔄 180° Interlock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInterlockMode('STANDARD');
                        if (boxGutterY < 0) {
                          handleBoxGutterYChange(packagingUnit === 'inch' ? 0.118 : 3.0);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        interlockMode === 'STANDARD'
                          ? 'bg-slate-700 border-slate-400 text-white shadow-sm'
                          : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                      }`}
                      title="0° all ups uniform straight"
                    >
                      <span>⬆️ 0° Uniform</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const isInch = packagingUnit === 'inch';
                      const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
                      const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
                      const clearanceMM = 3.0; // Strict 3.0 mm (0.118") die clearance
                      const nestY_MM = -Math.max(0, tuckMM - clearanceMM);
                      const nestY = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
                      handleBoxGutterYChange(nestY);
                      handleBoxGutterXChange(isInch ? 0.118 : 3.0);
                      setInterlockMode('INTERLOCKING');
                      setTrimHeader(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] border transition-all cursor-pointer shadow-sm flex items-center gap-1 ${
                      boxGutterY < 0 && Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01
                        ? 'bg-indigo-600 text-white font-extrabold border-indigo-400 shadow-indigo-600/30'
                        : 'bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border-indigo-700'
                    }`}
                    title="Nests interlocking tuck flaps into opposing rows with exact 3.0 mm die clearance"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Auto-Nest (3.0 mm Flap Clearance)</span>
                  </button>
                </div>

                {/* In-Between Controls: Horizontal Gap & Vertical Gap */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Horizontal Gap (Between Columns) */}
                  <div className="p-2 rounded-lg bg-[#141C2A] border border-[#233045] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <label className="text-cyan-300 font-bold flex items-center gap-1">
                        <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                        <span>Horizontal Gap</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={packagingUnit === 'inch' ? 3 : 75}
                          step={packagingUnit === 'inch' ? 0.01 : 0.5}
                          value={boxGutterX}
                          onChange={(e) => handleBoxGutterXChange(e.target.value)}
                          className="w-14 bg-[#10141D] border border-[#233045] focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                        />
                        <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={packagingUnit === 'inch' ? 2 : 50}
                      step={packagingUnit === 'inch' ? 0.01 : 0.5}
                      value={boxGutterX}
                      onChange={(e) => handleBoxGutterXChange(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                    <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleBoxGutterXChange(0)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          boxGutterX === 0
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm shadow-emerald-500/30'
                            : 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:text-white'
                        }`}
                        title="Zero Gap between cartons (Touch / Butt-Cut)"
                      >
                        0.00 (Zero Gap)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterXChange(packagingUnit === 'inch' ? 0.197 : 5.0)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.197 : 5.0)) < 0.01
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                        title="Strict 5.0 mm space between products"
                      >
                        {packagingUnit === 'inch' ? '5mm' : '5.0mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterXChange(packagingUnit === 'inch' ? 0.098 : 2.5)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.098 : 2.5)) < 0.01
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                        title="2.5 mm spacing between products"
                      >
                        {packagingUnit === 'inch' ? '2.5mm' : '2.5mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterXChange(packagingUnit === 'inch' ? 0.118 : 3.0)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                      >
                        {packagingUnit === 'inch' ? '3mm' : '3.0mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterXChange(packagingUnit === 'inch' ? 0.315 : 8.0)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.315 : 8.0)) < 0.01
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                      >
                        {packagingUnit === 'inch' ? '8mm' : '8.0mm'}
                      </button>
                    </div>
                  </div>

                  {/* Vertical Gap (Between Rows) */}
                  <div className="p-2 rounded-lg bg-[#141C2A] border border-[#233045] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <label className="text-cyan-300 font-bold flex items-center gap-1">
                        <MoveVertical className="w-3 h-3 text-cyan-400" />
                        <span>Vertical Gap</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={packagingUnit === 'inch' ? -3 : -75}
                          max={packagingUnit === 'inch' ? 3 : 75}
                          step={packagingUnit === 'inch' ? 0.01 : 0.5}
                          value={boxGutterY}
                          onChange={(e) => handleBoxGutterYChange(e.target.value)}
                          className="w-14 bg-[#10141D] border border-[#233045] focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                        />
                        <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={packagingUnit === 'inch' ? -2 : -50}
                      max={packagingUnit === 'inch' ? 2 : 50}
                      step={packagingUnit === 'inch' ? 0.01 : 0.5}
                      value={boxGutterY}
                      onChange={(e) => handleBoxGutterYChange(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                    <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleBoxGutterYChange(0)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          boxGutterY === 0
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm shadow-emerald-500/30'
                            : 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:text-white'
                        }`}
                        title="Zero Gap between cartons (Touch / Butt-Cut)"
                      >
                        0.00 (Zero Gap)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterYChange(packagingUnit === 'inch' ? 0.197 : 5.0)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterY) - (packagingUnit === 'inch' ? 0.197 : 5.0)) < 0.01
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                        title="Strict 5.0 mm space between products"
                      >
                        {packagingUnit === 'inch' ? '5mm' : '5.0mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterYChange(packagingUnit === 'inch' ? 0.098 : 2.5)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterY) - (packagingUnit === 'inch' ? 0.098 : 2.5)) < 0.01
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                        title="2.5 mm spacing between products"
                      >
                        {packagingUnit === 'inch' ? '2.5mm' : '2.5mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterYChange(packagingUnit === 'inch' ? 0.118 : 3.0)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterY) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                      >
                        {packagingUnit === 'inch' ? '3mm' : '3.0mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBoxGutterYChange(packagingUnit === 'inch' ? 0.315 : 8.0)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          Math.abs(parseFloat(boxGutterY) - (packagingUnit === 'inch' ? 0.315 : 8.0)) < 0.01
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                      >
                        {packagingUnit === 'inch' ? '8mm' : '8.0mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const isInch = packagingUnit === 'inch';
                          const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
                          const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
                          const nestY_MM = -Math.max(0, tuckMM - 3.0);
                          const rounded = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
                          handleBoxGutterYChange(rounded);
                          handleBoxGutterXChange(isInch ? 0.118 : 3.0);
                          setInterlockMode('INTERLOCKING');
                          setTrimHeader(true);
                        }}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          boxGutterY < 0 ? 'bg-indigo-600 text-white font-bold border-indigo-400' : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                        title="Nest interlocking flaps with exact 3.0 mm clearance"
                      >
                        Nest (3mm)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const isInch = packagingUnit === 'inch';
                          const rawTuck = parseFloat(tuckFlapHeight) || (isInch ? 1.5 : 35);
                          const tuckMM = isInch ? rawTuck * 25.4 : (rawTuck < 5 ? rawTuck * 25.4 : rawTuck);
                          const nestY_MM = -Math.max(0, tuckMM - 5.0);
                          const rounded = isInch ? Math.round((nestY_MM / 25.4) * 100) / 100 : Math.round(nestY_MM * 10) / 10;
                          handleBoxGutterYChange(rounded);
                          handleBoxGutterXChange(isInch ? 0.197 : 5.0);
                          setInterlockMode('INTERLOCKING');
                          setTrimHeader(true);
                        }}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                          boxGutterY < 0 ? 'bg-indigo-950 border-indigo-600 text-indigo-300' : 'bg-[#10141D] border-[#1E293B] text-slate-400 hover:text-white'
                        }`}
                        title="Nest interlocking flaps with exact 5.0 mm clearance"
                      >
                        Nest (5mm)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real-time Gap Status Badge */}
                <div className="p-2.5 rounded-lg bg-[#141C2A] border border-[#1E293B] flex items-center justify-between text-[10px] font-mono flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-cyan-400 font-bold">↔ Gap X: {boxGutterX}{packagingUnit === 'inch' ? '"' : ' mm'}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-cyan-400 font-bold">↕ Gap Y: {boxGutterY}{packagingUnit === 'inch' ? '"' : ' mm'}</span>
                  </div>
                  {Math.abs(parseFloat(boxGutterX) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01 &&
                   Math.abs(parseFloat(boxGutterY) - (packagingUnit === 'inch' ? 0.118 : 3.0)) < 0.01 && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>✓ Exact 3.0 mm Uniform Gap Overall</span>
                    </span>
                  )}
                </div>

                {/* ─── Interactive Layout Positioning & Individual Up Drag Nudge ─── */}
                <div className="p-3.5 rounded-xl bg-[#141C2A] border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-white flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <Move className="w-4 h-4 text-cyan-400" />
                      <span>DRAG & NUDGE (INDIVIDUAL UPS & SHEET)</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      {selectedUpIndex !== null ? (
                        <span className="text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                          Selected: UP #{selectedUpIndex + 1}
                          {upOffsets?.[selectedUpIndex] ? ` (X: ${upOffsets[selectedUpIndex].x || 0}mm, Y: ${upOffsets[selectedUpIndex].y || 0}mm)` : ' (0,0)'}
                        </span>
                      ) : (
                        <span className="text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                          Target: Entire Sheet
                          {(layoutShiftX !== 0 || layoutShiftY !== 0) ? ` (X: ${layoutShiftX}mm, Y: ${layoutShiftY}mm)` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] font-mono text-slate-400 leading-tight">
                    Click any carton on the preview to drag it individually, or select an Up below to nudge with D-pad arrows.
                  </p>

                  {/* Up Selection Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400 mr-1">Target:</span>
                    {Array.from({ length: (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2) }).map((_, uIdx) => {
                      const hasShift = Boolean(upOffsets?.[uIdx]?.x || upOffsets?.[uIdx]?.y);
                      const isSel = selectedUpIndex === uIdx;
                      return (
                        <button
                          key={`up-sel-pill-${uIdx}`}
                          type="button"
                          onClick={() => setSelectedUpIndex(uIdx)}
                          className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isSel
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm shadow-amber-500/30'
                              : hasShift
                                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500'
                                : 'bg-[#10141D] text-slate-400 border-[#233045] hover:text-white'
                          }`}
                        >
                          <span>UP #{uIdx + 1}</span>
                          {hasShift && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedUpIndex(null)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        selectedUpIndex === null
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                          : 'bg-[#10141D] text-slate-400 border-[#233045] hover:text-white'
                      }`}
                      title="Nudge entire sheet layout"
                    >
                      ALL (Sheet)
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    {/* D-Pad Arrow Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedUpIndex !== null) {
                            setUpOffsets(prev => ({
                              ...prev,
                              [selectedUpIndex]: {
                                x: Math.round(((prev[selectedUpIndex]?.x || 0) - nudgeStep) * 10) / 10,
                                y: prev[selectedUpIndex]?.y || 0
                              }
                            }));
                          } else {
                            setLayoutShiftX(prev => Math.round((prev - nudgeStep) * 10) / 10);
                          }
                        }}
                        className="w-7 h-7 rounded bg-[#10141D] hover:bg-[#1E293B] border border-[#233045] text-slate-200 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                        title={`Nudge Left (-${nudgeStep}mm)`}
                      >
                        ⬅️
                      </button>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedUpIndex !== null) {
                              setUpOffsets(prev => ({
                                ...prev,
                                [selectedUpIndex]: {
                                  x: prev[selectedUpIndex]?.x || 0,
                                  y: Math.round(((prev[selectedUpIndex]?.y || 0) - nudgeStep) * 10) / 10
                                }
                              }));
                            } else {
                              setLayoutShiftY(prev => Math.round((prev - nudgeStep) * 10) / 10);
                            }
                          }}
                          className="w-7 h-6 rounded bg-[#10141D] hover:bg-[#1E293B] border border-[#233045] text-slate-200 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                          title={`Nudge Up (+${nudgeStep}mm)`}
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedUpIndex !== null) {
                              setUpOffsets(prev => ({
                                ...prev,
                                [selectedUpIndex]: {
                                  x: prev[selectedUpIndex]?.x || 0,
                                  y: Math.round(((prev[selectedUpIndex]?.y || 0) + nudgeStep) * 10) / 10
                                }
                              }));
                            } else {
                              setLayoutShiftY(prev => Math.round((prev + nudgeStep) * 10) / 10);
                            }
                          }}
                          className="w-7 h-6 rounded bg-[#10141D] hover:bg-[#1E293B] border border-[#233045] text-slate-200 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                          title={`Nudge Down (-${nudgeStep}mm)`}
                        >
                          ⬇️
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedUpIndex !== null) {
                            setUpOffsets(prev => ({
                              ...prev,
                              [selectedUpIndex]: {
                                x: Math.round(((prev[selectedUpIndex]?.x || 0) + nudgeStep) * 10) / 10,
                                y: prev[selectedUpIndex]?.y || 0
                              }
                            }));
                          } else {
                            setLayoutShiftX(prev => Math.round((prev + nudgeStep) * 10) / 10);
                          }
                        }}
                        className="w-7 h-7 rounded bg-[#10141D] hover:bg-[#1E293B] border border-[#233045] text-slate-200 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                        title={`Nudge Right (+${nudgeStep}mm)`}
                      >
                        ➡️
                      </button>
                    </div>

                    {/* Step size selector */}
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <span className="text-slate-500">Step:</span>
                      {[0.5, 1.0, 5.0].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNudgeStep(s)}
                          className={`px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                            nudgeStep === s ? 'bg-cyan-600 text-white border-cyan-400 font-bold' : 'bg-[#10141D] text-slate-400 border-[#233045]'
                          }`}
                        >
                          {s}mm
                        </button>
                      ))}
                    </div>

                    {/* Reset Buttons */}
                    <div className="flex items-center gap-1">
                      {selectedUpIndex !== null ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUpOffsets(prev => {
                              const next = { ...prev };
                              delete next[selectedUpIndex];
                              return next;
                            });
                          }}
                          className="px-2 py-1 rounded bg-[#10141D] hover:bg-[#1E293B] text-amber-300 hover:text-white border border-[#233045] text-[10px] font-mono font-bold transition-all cursor-pointer"
                          title="Reset selected UP offset to default grid"
                        >
                          🎯 Reset UP #{selectedUpIndex + 1}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setLayoutShiftX(0); setLayoutShiftY(0); }}
                          className="px-2 py-1 rounded bg-[#10141D] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#233045] text-[10px] font-mono font-bold transition-all cursor-pointer"
                          title="Reset position to perfect sheet center"
                        >
                          🎯 Center Sheet
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUpOffsets({});
                          setLayoutShiftX(0);
                          setLayoutShiftY(0);
                        }}
                        className="px-2 py-1 rounded bg-[#10141D] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#233045] text-[10px] font-mono transition-all cursor-pointer"
                        title="Reset all individual up shifts and sheet center"
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── Multi-Page Combo Gang Imposition Section (For Multi-Page PDFs) ─── */}
                {sourcePdfPageCount > 1 && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#141C2A] border border-emerald-500/50 space-y-3 shadow-lg shadow-emerald-950/20">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-white flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>MULTI-PAGE COMBO GANG ({sourcePdfPageCount} PAGES DETECTED)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMultiPageGang(prev => !prev)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          multiPageGang
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-[#10141D] text-slate-400 border-[#233045]'
                        }`}
                      >
                        {multiPageGang ? '✓ COMBO GANG ACTIVE' : 'STEP & REPEAT'}
                      </button>
                    </div>

                    <p className="text-[10px] font-mono text-slate-400 leading-tight">
                      {multiPageGang
                        ? `Each up on this sheet holds a different page design from your ${sourcePdfPageCount}-page file.`
                        : `Step & repeat mode: Repeat Page 1 across all ups.`}
                    </p>

                    {multiPageGang && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Array.from({ length: (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2) }).map((_, uIdx) => {
                            const defaultPage = Math.min(sourcePdfPageCount, uIdx + 1);
                            const curPage = pageAllocation[uIdx] || defaultPage;
                            return (
                              <div key={`page-assign-${uIdx}`} className="p-2 rounded-lg bg-[#10141D] border border-[#233045] text-[10px] font-mono space-y-1">
                                <div className="flex items-center justify-between text-slate-400 font-bold">
                                  <span>UP #{uIdx + 1}</span>
                                  <span className="text-emerald-400">Page {curPage}</span>
                                </div>
                                <select
                                  value={curPage}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setPageAllocation(prev => ({ ...prev, [uIdx]: val }));
                                  }}
                                  className="w-full bg-[#141C2A] border border-[#233045] rounded px-1.5 py-1 text-white font-bold text-xs"
                                >
                                  {Array.from({ length: sourcePdfPageCount }, (_, pI) => (
                                    <option key={pI + 1} value={pI + 1}>
                                      Page {pI + 1}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              const alloc = {};
                              const totalUps = (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2);
                              for (let i = 0; i < totalUps; i++) {
                                alloc[i] = Math.min(sourcePdfPageCount, i + 1);
                              }
                              setPageAllocation(alloc);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
                          >
                            🎯 Auto-Assign Pages 1–{Math.min(sourcePdfPageCount, (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2))}
                          </button>
                          {sourcePdfPageCount > (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2) && (
                            <span className="text-amber-300">
                              Remaining {sourcePdfPageCount - (parseInt(boxCols, 10) || 2) * (parseInt(boxRows, 10) || 2)} page(s) flow to Sheet 2
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Artwork Margins & Crop / Trim (Remove Wasted Space) ─── */}
              <div className="p-3.5 rounded-xl bg-[#0D131F] border border-cyan-500/40 space-y-3 shadow-lg shadow-cyan-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Artwork Margins & Trim (Space Recovery)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrimLinked(prev => !prev)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer ${
                      trimLinked
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-white'
                    }`}
                    title={trimLinked ? "Top & Bottom margins are synchronized" : "Adjust top and bottom margins independently"}
                  >
                    {trimLinked ? <Link2 className="w-3 h-3 text-cyan-400" /> : <Unlink className="w-3 h-3 text-amber-400" />}
                    <span>{trimLinked ? 'Margins Linked' : 'Independent'}</span>
                  </button>
                </div>

                <p className="text-[10px] font-mono text-slate-400 leading-tight">
                  Trim all white spaces except the content (e.g. in a 20×30 sheet, extract only the single 9×11 object and trim the rest), set zero box gap, and apply 0.25" sheet margins all around.
                </p>

                {/* Quick Presets Bar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTightFit3mm}
                    disabled={detectingMargins}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/50 transition-all cursor-pointer disabled:opacity-50"
                    title="Tight fit content, set 3.0 mm (0.118 in) in-between gap, 180° interlocking alternating rows, and 0.25 in sheet margins"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>{detectingMargins ? 'Fitting...' : '✨ Tight Fit (3mm Interlock)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTightenCadPack}
                    disabled={detectingMargins}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
                    title="Automatically removes all blank margins, takes single 1-up object content, applies 0.25 inch sheet margin, and sets zero gap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{detectingMargins ? 'Tightening...' : '✨ Zero Gaps & Tight CAD Pack'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyQuarterInchSheetMargins}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    title="Apply 0.25 inch (6.35 mm) margin to all 4 sides of the press sheet"
                  >
                    <span>📐 0.25" Sheet Margin All</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleTrimHeader}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      trimHeader
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-[#141C2A] text-amber-300 border-amber-500/50 hover:bg-amber-950/40'
                    }`}
                    title="Trim off top title block, KLD text, or slug line (works for both vector key lines and image artwork)"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{trimHeader ? '✓ Title Header Trimmed' : 'Trim Title Header (Keylines & Images)'}</span>
                  </button>

                  {trimHeader && (
                    <div className="flex items-center gap-1 bg-[#141C2A] border border-amber-500/40 rounded-lg px-2 py-1 text-[10px] font-mono text-amber-300 shadow-sm">
                      <span className="text-[9px] text-slate-400">Header H:</span>
                      <input
                        type="number"
                        step={packagingUnit === 'inch' ? 0.05 : 1}
                        min="0"
                        value={headerTrimHeight}
                        onChange={(e) => handleHeaderTrimHeightChange(e.target.value)}
                        className="w-12 bg-[#10141D] border border-amber-500/50 rounded px-1 py-0.2 text-[10px] font-mono text-white text-right"
                      />
                      <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAutoDetectMargins(false)}
                    disabled={detectingMargins}
                    className="px-2.5 py-1 rounded-lg bg-[#141C2A] hover:bg-[#1E293B] text-cyan-300 font-mono text-[10px] font-semibold border border-cyan-800/60 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Scissors className="w-3 h-3 text-cyan-400" />
                    <span>{detectingMargins ? 'Detecting...' : 'Fit Content Only'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrimTop(0);
                      setTrimBottom(0);
                      setTrimLeft(0);
                      setTrimRight(0);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#141C2A] hover:bg-rose-950/50 text-rose-300 font-mono text-[10px] border border-rose-900/50 transition-all cursor-pointer"
                  >
                    Reset Margins
                  </button>
                </div>

                {marginDetectionResult && (
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                    ✓ {marginDetectionResult.msg}
                  </div>
                )}

                {/* 4-Sided Artwork Trim Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Top Margin Trim */}
                  <div className="p-2 rounded-lg bg-[#141C2A] border border-[#233045] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <label className="text-cyan-300 font-bold flex items-center gap-1">
                        <MoveVertical className="w-3 h-3 text-cyan-400" />
                        <span>Trim Top</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={packagingUnit === 'inch' ? 5 : 200}
                          step={packagingUnit === 'inch' ? 0.01 : 0.5}
                          value={trimTop}
                          onChange={(e) => handleTrimTopChange(e.target.value)}
                          className="w-14 bg-[#10141D] border border-[#233045] focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                        />
                        <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={packagingUnit === 'inch' ? 4 : 150}
                      step={packagingUnit === 'inch' ? 0.01 : 0.5}
                      value={trimTop}
                      onChange={(e) => handleTrimTopChange(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Bottom Margin Trim */}
                  <div className="p-2 rounded-lg bg-[#141C2A] border border-[#233045] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <label className="text-cyan-300 font-bold flex items-center gap-1">
                        <MoveVertical className="w-3 h-3 text-cyan-400" />
                        <span>Trim Bottom</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={packagingUnit === 'inch' ? 5 : 200}
                          step={packagingUnit === 'inch' ? 0.01 : 0.5}
                          value={trimBottom}
                          onChange={(e) => handleTrimBottomChange(e.target.value)}
                          className="w-14 bg-[#10141D] border border-[#233045] focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                        />
                        <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={packagingUnit === 'inch' ? 4 : 150}
                      step={packagingUnit === 'inch' ? 0.01 : 0.5}
                      value={trimBottom}
                      onChange={(e) => handleTrimBottomChange(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Left Margin Trim */}
                  <div className="p-2 rounded-lg bg-[#141C2A] border border-[#233045] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <label className="text-slate-300 font-bold flex items-center gap-1">
                        <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                        <span>Trim Left</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={packagingUnit === 'inch' ? 5 : 150}
                          step={packagingUnit === 'inch' ? 0.01 : 0.5}
                          value={trimLeft}
                          onChange={(e) => handleTrimLeftChange(e.target.value)}
                          className="w-14 bg-[#10141D] border border-[#233045] focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                        />
                        <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={packagingUnit === 'inch' ? 4 : 100}
                      step={packagingUnit === 'inch' ? 0.01 : 0.5}
                      value={trimLeft}
                      onChange={(e) => handleTrimLeftChange(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Right Margin Trim */}
                  <div className="p-2 rounded-lg bg-[#141C2A] border border-[#233045] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <label className="text-slate-300 font-bold flex items-center gap-1">
                        <MoveHorizontal className="w-3 h-3 text-cyan-400" />
                        <span>Trim Right</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={packagingUnit === 'inch' ? 5 : 150}
                          step={packagingUnit === 'inch' ? 0.01 : 0.5}
                          value={trimRight}
                          onChange={(e) => handleTrimRightChange(e.target.value)}
                          className="w-14 bg-[#10141D] border border-[#233045] focus:border-cyan-400 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right"
                        />
                        <span className="text-[9px] text-slate-400">{packagingUnit === 'inch' ? '"' : 'mm'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={packagingUnit === 'inch' ? 4 : 100}
                      step={packagingUnit === 'inch' ? 0.01 : 0.5}
                      value={trimRight}
                      onChange={(e) => handleTrimRightChange(e.target.value)}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Real-time Dimensions & Space Recovered Badge */}
                <div className="p-2.5 rounded-lg bg-[#141C2A] border border-[#1E293B] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Original Client PDF:</span>
                    <span className="text-slate-300 font-semibold">
                      {effectiveBoxDimensions.srcW} × {effectiveBoxDimensions.srcH} mm
                      {packagingUnit === 'inch' && ` (${(effectiveBoxDimensions.srcW / 25.4).toFixed(2)}" × ${(effectiveBoxDimensions.srcH / 25.4).toFixed(2)}")`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Effective Trimmed Footprint:</span>
                    <span className="text-emerald-400 font-bold">
                      {effectiveBoxDimensions.effW} × {effectiveBoxDimensions.effH} mm
                      {packagingUnit === 'inch' && ` (${(effectiveBoxDimensions.effW / 25.4).toFixed(2)}" × ${(effectiveBoxDimensions.effH / 25.4).toFixed(2)}")`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#1E293B]">
                    <span className="text-cyan-400 font-semibold">Wasted Space Recovered:</span>
                    <span className="text-emerald-300 font-bold">
                      ↕ -{effectiveBoxDimensions.savedH} mm {packagingUnit === 'inch' && `(-${(effectiveBoxDimensions.savedH / 25.4).toFixed(2)}")`} / ↔ -{effectiveBoxDimensions.savedW} mm {packagingUnit === 'inch' && `(-${(effectiveBoxDimensions.savedW / 25.4).toFixed(2)}")`}
                    </span>
                  </div>
                </div>
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

            {/* Auto-Select Minimum Sheet Size Action */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => applyMinimumSheetSize()}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer ${
                  !minSheetNeeded.fitsCurrent
                    ? 'bg-gradient-to-r from-amber-950/80 via-rose-950/70 to-amber-950/80 border-amber-500 text-amber-200 animate-pulse shadow-lg shadow-amber-950/50'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/50 text-emerald-300'
                }`}
                title="Automatically selects the minimum sheet size where this imposition fits cleanly"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Minimum Sheet Size</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] text-cyan-200">
                  {minSheetNeeded.bestSheet.name} ({minSheetNeeded.bestSheet.width} × {minSheetNeeded.bestSheet.height} mm)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFitSheetToLayout()}
                className="w-full py-1.5 px-3 rounded-xl border border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-[11px] font-mono font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm"
                title="Sets custom sheet dimensions to tightly enclose the layout with press margins"
              >
                <span className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fit Custom Sheet to Layout</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Exact Tight Footprint
                </span>
              </button>

              {!minSheetNeeded.fitsCurrent && (
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/70 text-[11px] font-mono text-amber-200 space-y-1.5 shadow-md">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Layout Out of Sheet Bounds!</span>
                  </div>
                  <p className="text-[10px] text-amber-300/80 leading-tight">
                    Current sheet ({sheetWidth} × {sheetHeight} mm) is smaller than layout requirement (<strong className="text-white">{minSheetNeeded.reqW} × {minSheetNeeded.reqH} mm</strong>).
                  </p>
                  <button
                    type="button"
                    onClick={() => applyMinimumSheetSize()}
                    className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow"
                  >
                    <span>Click to Fit: Apply {minSheetNeeded.bestSheet.name} ({minSheetNeeded.bestSheet.width} × {minSheetNeeded.bestSheet.height} mm)</span>
                  </button>
                </div>
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

            {/* Page Placement Scaling / Fit Mode */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-slate-400">Page Placement Scaling</label>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  {fitMode === 'SCALE_TO_FIT' ? 'Scale to Fit' : '1:1 Actual Size'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFitMode('NONE')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${fitMode === 'NONE'
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                >
                  <span>100% Actual 1:1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('SCALE_TO_FIT')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${fitMode === 'SCALE_TO_FIT'
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 font-bold'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                >
                  <span>Scale to Fit Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── 2. Finished Book Size Setup (Book Mode Only) ─────────────── */}
          {partMode !== 'BOX' && (
            <>
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

            {/* Dynamic Maximum Page Size for Selected Signature on Current Sheet */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-cyan-950/40 border border-emerald-500/50 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Max Page Size for {selectedLayout}PP on {sheetPreset}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-bold">
                  {maxPageSize.standardName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-mono font-bold text-emerald-300">
                    {maxPageSize.pageW_in}" × {maxPageSize.pageH_in}"
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    ({maxPageSize.pageW_mm} × {maxPageSize.pageH_mm} mm)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBookWidth(maxPageSize.pageW_mm);
                    setBookHeight(maxPageSize.pageH_mm);
                    setBookPreset('MAX_FIT');
                    setCustomBook(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-all cursor-pointer shadow flex items-center gap-1"
                  title="Apply the calculated maximum page size for this signature and sheet"
                >
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>Apply Max Size</span>
                </button>
              </div>

              <p className="text-[10px] font-mono text-slate-400 leading-tight">
                Includes all press allowances (2" on length, 1" on width) across {maxPageSize.cols} cols × {maxPageSize.rows} rows.
              </p>
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
                onClick={handleApplyQuarterInchSheetMargins}
                className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold border border-emerald-500/60 shadow-sm"
                title="Apply 0.25 inch (6.35 mm) margin to all 4 sides"
              >
                0.25" All (6.35mm)
              </button>
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
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CENTER COLUMN: INTERACTIVE PREPRESS SHEET PREVIEW CANVAS (6 COLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 xl:col-span-6 min-w-0">
          <div className="glass-panel rounded-2xl p-3 shadow-2xl flex flex-col min-h-[calc(100vh-130px)]">
            <SheetPreview
              partMode={partMode}
              jobTitle={activeJob?.originalFileName || uploadedFile?.name || 'BDE 1140 _ Acuzie 100 Ml MAIN FILE_EXPANDED_FINAL'}
              sheetWidth={sheetWidth}
              sheetHeight={sheetHeight}
              columns={partMode === 'BOX' ? boxCols : columns}
              rows={partMode === 'BOX' ? boxRows : rows}
              marginTop={marginTop}
              marginBottom={marginBottom}
              marginLeft={marginLeft}
              marginRight={marginRight}
              gutterX={partMode === 'BOX' ? (packagingUnit === 'inch' ? (parseFloat(boxGutterX) || 0) * 25.4 : (parseFloat(boxGutterX) || 0)) : gutterX}
              gutterY={partMode === 'BOX' ? (packagingUnit === 'inch' ? (parseFloat(boxGutterY) || 0) * 25.4 : (parseFloat(boxGutterY) || 0)) : gutterY}
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
              pageViewports={pageViewports}
              thumbnailsLoading={thumbnailsLoading}
              thumbnailsProgress={thumbnailsProgress}
              pageRotation={pageRotation}
              pageOrientation={pageOrientation}
              bookWidth={parseFloat(bookWidth)}
              bookHeight={parseFloat(bookHeight)}
              bookPreset={bookPreset}
              keylineElements={keylineElements}
              coverParams={{
                spineWidth: calculatedSpine,
                flapWidth,
                hasFlaps,
                bodyPageCount: totalBookPages,
                coverStock: '80gsm'
              }}
              boxParams={{
                unit: packagingUnit,
                boxStyle,
                length: parseFloat(boxLength) || (packagingUnit === 'inch' ? 4.09 : 100),
                width: parseFloat(boxWidth) || (packagingUnit === 'inch' ? 1.57 : 60),
                height: parseFloat(boxHeight) || (packagingUnit === 'inch' ? 4.72 : 140),
                glueTab: parseFloat(glueTabWidth) || (packagingUnit === 'inch' ? 0.52 : 15),
                tuckFlap: parseFloat(tuckFlapHeight) || (packagingUnit === 'inch' ? 1.5 : 15),
                flatWidth: boxFlatDimensions.flatW,
                flatHeight: boxFlatDimensions.flatH,
                effectiveBoxWidth: effectiveBoxDimensions.effW,
                effectiveBoxHeight: effectiveBoxDimensions.effH,
                sourcePdfWidth: sourcePdfPageWidthMM,
                sourcePdfHeight: sourcePdfPageHeightMM,
                trimTop: parseFloat(trimTop) || 0,
                trimBottom: parseFloat(trimBottom) || 0,
                trimLeft: parseFloat(trimLeft) || 0,
                trimRight: parseFloat(trimRight) || 0,
                trimTopMM: (parseFloat(trimTop) || 0) > 0 ? (parseFloat(trimTop) * (packagingUnit === 'inch' ? 25.4 : 1)) : ((trimHeader && detectedArtBox?.dielineOnly?.topMM) || detectedArtBox?.topMM || 0),
                trimBottomMM: (parseFloat(trimBottom) || 0) > 0 ? (parseFloat(trimBottom) * (packagingUnit === 'inch' ? 25.4 : 1)) : (detectedArtBox?.dielineOnly?.bottomMM || detectedArtBox?.bottomMM || 0),
                trimLeftMM: (parseFloat(trimLeft) || 0) > 0 ? (parseFloat(trimLeft) * (packagingUnit === 'inch' ? 25.4 : 1)) : (detectedArtBox?.dielineOnly?.leftMM || detectedArtBox?.leftMM || 0),
                trimRightMM: (parseFloat(trimRight) || 0) > 0 ? (parseFloat(trimRight) * (packagingUnit === 'inch' ? 25.4 : 1)) : (detectedArtBox?.dielineOnly?.rightMM || detectedArtBox?.rightMM || 0),
                cropTopMM: (parseFloat(trimTop) || 0) > 0 ? (parseFloat(trimTop) * (packagingUnit === 'inch' ? 25.4 : 1)) : ((trimHeader && detectedArtBox?.dielineOnly?.topMM) || detectedArtBox?.topMM || 0),
                cropBottomMM: (parseFloat(trimBottom) || 0) > 0 ? (parseFloat(trimBottom) * (packagingUnit === 'inch' ? 25.4 : 1)) : (detectedArtBox?.dielineOnly?.bottomMM || detectedArtBox?.bottomMM || 0),
                cropLeftMM: (parseFloat(trimLeft) || 0) > 0 ? (parseFloat(trimLeft) * (packagingUnit === 'inch' ? 25.4 : 1)) : (detectedArtBox?.dielineOnly?.leftMM || detectedArtBox?.leftMM || 0),
                cropRightMM: (parseFloat(trimRight) || 0) > 0 ? (parseFloat(trimRight) * (packagingUnit === 'inch' ? 25.4 : 1)) : (detectedArtBox?.dielineOnly?.rightMM || detectedArtBox?.rightMM || 0),
                gutterX: partMode === 'BOX' ? (packagingUnit === 'inch' ? (parseFloat(boxGutterX) || 0) * 25.4 : (parseFloat(boxGutterX) || 0)) : gutterX,
                gutterY: partMode === 'BOX' ? (packagingUnit === 'inch' ? (parseFloat(boxGutterY) || 0) * 25.4 : (parseFloat(boxGutterY) || 0)) : gutterY,
                interlockMode,
                dielineOverlay,
                removeWhiteSpace,
                interlockShiftX,
                interlockShiftY,
                layoutShiftX,
                layoutShiftY,
                upOffsets,
                pageAllocation,
                multiPageGang
              }}
              layoutShiftX={layoutShiftX}
              layoutShiftY={layoutShiftY}
              onLayoutShiftChange={(sx, sy) => {
                setLayoutShiftX(sx);
                setLayoutShiftY(sy);
              }}
              upOffsets={upOffsets}
              onUpOffsetChange={(upIdx, x, y) => {
                setUpOffsets(prev => ({
                  ...prev,
                  [upIdx]: { x, y }
                }));
              }}
              selectedUpIndex={selectedUpIndex}
              onSelectUp={(upIdx) => setSelectedUpIndex(upIdx)}
              onSwapUps={handleSwapUps}
              onPageChangeForUp={handlePageChangeForUp}
              pageAllocation={pageAllocation}
              multiPageGang={Boolean(multiPageGang && sourcePdfPageCount > 1)}
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
                <span className="text-slate-400">{isBoxJob ? 'Sheet ' : 'Sig '}</span>
                <strong className="text-cyan-300">
                  {signatureIndex + 1} / {totalSignatures}
                </strong>
                <span className="text-slate-500 text-[10px] block">
                  {isBoxJob
                    ? `Page ${signatureIndex + 1} (${boxCols * boxRows}-Up)`
                    : `Pages ${signatureIndex * layoutPages + 1}–${Math.min((signatureIndex + 1) * layoutPages, totalBookPages)}`}
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
              {partMode !== 'BOX' && (
                <>
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
                </>
              )}
              {partMode === 'BOX' && (
                <div className="col-span-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Packaging Mode: Camera & crop marks hidden (clean die-cut layout)</span>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={colorBars} onChange={(e) => setColorBars(e.target.checked)} className="rounded accent-cyan-400" />
                <span className="text-amber-300 font-semibold">CMYK Bars</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={jobSlug} onChange={(e) => setJobSlug(e.target.checked)} className="rounded accent-cyan-400" />
                <span>Job Slug</span>
              </label>
              {partMode !== 'BOX' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={foldMarks} onChange={(e) => setFoldMarks(e.target.checked)} className="rounded accent-cyan-400" />
                  <span>Fold & Knife Marks</span>
                </label>
              )}
              {partMode !== 'BOX' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={digitalBarcode} onChange={(e) => setDigitalBarcode(e.target.checked)} className="rounded accent-cyan-400" />
                  <span className="text-emerald-300 font-semibold">Auto-Cut Barcode</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dielineOverlay}
                  onChange={(e) => setDielineOverlay(e.target.checked)}
                  className="rounded accent-rose-400"
                />
                <span className="flex items-center gap-1 font-semibold">
                  <Box className="w-3.5 h-3.5 text-rose-400" />
                  <span className={dielineOverlay ? 'text-rose-300' : 'text-slate-300'}>Key Die Lines</span>
                </span>
              </label>
              {partMode === 'TEXT' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={collatingMarks} onChange={(e) => setCollatingMarks(e.target.checked)} className="rounded accent-cyan-400" />
                  <span className="text-cyan-300">Spine Collation</span>
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
            {keylineElements && keylineElements.length > 0 && (
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/5">
                <span>Keyline Die Overlay:</span>
                <strong className="text-fuchsia-400">{keylineElements.length} Objects Loaded</strong>
              </div>
            )}

            {/* Quick Access: Upload Dieline or Open Keyline Studio */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <input
                type="file"
                ref={impositionKeylineFileRef}
                onChange={handleUploadKeylineFile}
                accept=".json,.svg,application/json,image/svg+xml"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => impositionKeylineFileRef.current?.click()}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Upload Keyline CAD file (.json or .svg) to overlay on press sheet"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>Upload Dieline</span>
              </button>
              {onOpenKeylineStudio && (
                <button
                  type="button"
                  onClick={onOpenKeylineStudio}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-fuchsia-950/40 hover:bg-fuchsia-900/60 text-fuchsia-300 hover:text-fuchsia-100 border border-fuchsia-700/50 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Open Independent Keyline Drawing Studio to draw or edit keylines"
                >
                  <Scissors className="w-3 h-3 text-fuchsia-400" />
                  <span>{keylineElements.length > 0 ? 'Edit in Studio' : 'Draw Keylines'}</span>
                </button>
              )}
            </div>
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

          {/* Out of size auto-fit indicator */}
          {!minSheetNeeded.fitsCurrent && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-[10px] font-mono text-amber-300 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Current sheet is too small. Will auto-apply minimum sheet ({minSheetNeeded.bestSheet.name} {minSheetNeeded.bestSheet.width}×{minSheetNeeded.bestSheet.height} mm) on impose.</span>
              </span>
              <button
                type="button"
                onClick={() => applyMinimumSheetSize()}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 cursor-pointer transition-all"
              >
                Apply Now
              </button>
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
                      ? `Impose ${boxMetrics.boxesPerSheet * totalBookPages} Boxes (${totalBookPages} Sheets × ${boxMetrics.boxesPerSheet}-Up)`
                      : `Impose ${totalSignatures} Book Signatures`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Imposition Success Notification & Actions */}
          {result && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-mono shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white text-sm">Imposition Complete!</span>
                </div>
                <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700 font-bold">
                  {parseFloat(boxGutterX) === 0 ? 'ZERO GAPS (BUTT-CUT)' : `${boxGutterX}${packagingUnit === 'inch' ? '"' : ' mm'} DIE GAP`}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 m-0">
                Imposed press sheet generated with high-precision die clearance. Ready for proofing and platemaking.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onProceedToOutput}
                  className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-bold font-mono transition-all text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Imposed Sheet (Step 06)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>

  );
}
