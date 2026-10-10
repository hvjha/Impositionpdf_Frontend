import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, BookOpen, Layers, Bookmark } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
 * CIP4 / PREPS STANDARD FOLD PATTERN DEFINITIONS FOR FRONTEND PREVIEW
 * ═══════════════════════════════════════════════════════════════════════════ */

// 16PP CIP4 F16-1: 4 columns × 2 rows duplex (8 front, 8 back)
const PATTERN_16PP_MAP = {
  cols: 4,
  rows: 2,
  front: [
    { page: 5, row: 0, col: 0, rot: 180 },
    { page: 12, row: 0, col: 1, rot: 180 },
    { page: 9, row: 0, col: 2, rot: 180 },
    { page: 8, row: 0, col: 3, rot: 180 },
    { page: 4, row: 1, col: 0, rot: 0 },
    { page: 13, row: 1, col: 1, rot: 0 },
    { page: 16, row: 1, col: 2, rot: 0 },
    { page: 1, row: 1, col: 3, rot: 0 },
  ],
  back: [
    { page: 7, row: 0, col: 0, rot: 180 },
    { page: 10, row: 0, col: 1, rot: 180 },
    { page: 11, row: 0, col: 2, rot: 180 },
    { page: 6, row: 0, col: 3, rot: 180 },
    { page: 2, row: 1, col: 0, rot: 0 },
    { page: 15, row: 1, col: 1, rot: 0 },
    { page: 14, row: 1, col: 2, rot: 0 },
    { page: 3, row: 1, col: 3, rot: 0 },
  ]
};

// 32PP CIP4 F32-1: 4 columns × 4 rows duplex (16 front, 16 back)
const PATTERN_32PP_MAP = {
  cols: 4,
  rows: 4,
  front: [
    { page: 5, row: 0, col: 0, rot: 180 }, { page: 28, row: 0, col: 1, rot: 180 }, { page: 21, row: 0, col: 2, rot: 180 }, { page: 12, row: 0, col: 3, rot: 180 },
    { page: 4, row: 1, col: 0, rot: 0 }, { page: 29, row: 1, col: 1, rot: 0 }, { page: 20, row: 1, col: 2, rot: 0 }, { page: 13, row: 1, col: 3, rot: 0 },
    { page: 8, row: 2, col: 0, rot: 180 }, { page: 25, row: 2, col: 1, rot: 180 }, { page: 24, row: 2, col: 2, rot: 180 }, { page: 9, row: 2, col: 3, rot: 180 },
    { page: 1, row: 3, col: 0, rot: 0 }, { page: 32, row: 3, col: 1, rot: 0 }, { page: 17, row: 3, col: 2, rot: 0 }, { page: 16, row: 3, col: 3, rot: 0 }
  ],
  back: [
    { page: 11, row: 0, col: 0, rot: 180 }, { page: 22, row: 0, col: 1, rot: 180 }, { page: 27, row: 0, col: 2, rot: 180 }, { page: 6, row: 0, col: 3, rot: 180 },
    { page: 14, row: 1, col: 0, rot: 0 }, { page: 19, row: 1, col: 1, rot: 0 }, { page: 30, row: 1, col: 2, rot: 0 }, { page: 3, row: 1, col: 3, rot: 0 },
    { page: 10, row: 2, col: 0, rot: 180 }, { page: 23, row: 2, col: 1, rot: 180 }, { page: 26, row: 2, col: 2, rot: 180 }, { page: 7, row: 2, col: 3, rot: 180 },
    { page: 15, row: 3, col: 0, rot: 0 }, { page: 18, row: 3, col: 1, rot: 0 }, { page: 31, row: 3, col: 2, rot: 0 }, { page: 2, row: 3, col: 3, rot: 0 }
  ]
};

// 8PP CIP4 F8-1: 2 columns × 2 rows duplex (4 front, 4 back)
const PATTERN_8PP_MAP = {
  cols: 2,
  rows: 2,
  front: [
    { page: 8, row: 0, col: 0, rot: 0 },
    { page: 1, row: 0, col: 1, rot: 0 },
    { page: 2, row: 1, col: 0, rot: 0 },
    { page: 7, row: 1, col: 1, rot: 0 }
  ],
  back: [
    { page: 6, row: 0, col: 0, rot: 0 },
    { page: 3, row: 0, col: 1, rot: 0 },
    { page: 4, row: 1, col: 0, rot: 0 },
    { page: 5, row: 1, col: 1, rot: 0 }
  ]
};

// 4PP CIP4 F4-1 Folio: 2 columns × 1 row duplex (2 front, 2 back)
const PATTERN_4PP_MAP = {
  cols: 2,
  rows: 1,
  front: [
    { page: 4, row: 0, col: 0, rot: 0 },
    { page: 1, row: 0, col: 1, rot: 0 }
  ],
  back: [
    { page: 2, row: 0, col: 0, rot: 0 },
    { page: 3, row: 0, col: 1, rot: 0 }
  ]
};

// ─── Resolve Page Placements for Signature Layouts ─────────────────────────
function resolveSignaturePlacements({
  layoutPages,
  totalPages,
  signatureIndex,
  side,
  impositionMode,
  cols,
  rows,
  workStyle
}) {
  const isSimplex = workStyle === 'SIMPLEX' || workStyle === 'SINGLE_SIDED';
  const perSide = cols * rows;

  if (isSimplex && side === 'BACK') {
    return Array.from({ length: perSide }, () => ({ page: null, rot: 0 }));
  }

  // Preps CIP4 Signature schemes (16PP, 32PP, 8PP, 4PP)
  let pattern = null;
  if (layoutPages === 16) pattern = PATTERN_16PP_MAP;
  else if (layoutPages === 32) pattern = PATTERN_32PP_MAP;
  else if (layoutPages === 8) pattern = PATTERN_8PP_MAP;
  else if (layoutPages === 4 && impositionMode !== 'N_UP') pattern = PATTERN_4PP_MAP;

  if (pattern && (impositionMode === 'PERFECT_BINDING' || impositionMode === 'BOOKLET' || impositionMode === 'SADDLE_STITCH' || impositionMode === 'SIGNATURE')) {
    const sideEntries = side === 'FRONT' ? pattern.front : pattern.back;
    const baseOffset = signatureIndex * layoutPages;

    const result = new Array(perSide).fill(null).map(() => ({ page: null, rot: 0 }));
    sideEntries.forEach((entry) => {
      const cellIndex = entry.row * pattern.cols + entry.col;
      const actualPage = baseOffset + entry.page;
      result[cellIndex] = {
        page: actualPage <= totalPages ? actualPage : null,
        rot: entry.rot || 0
      };
    });
    return result;
  }

  // Digital Cut & Stack scheme (for continuous feed or high-speed digital engines)
  if (impositionMode === 'CUT_AND_STACK') {
    const sheetsTotal = Math.max(1, Math.ceil(totalPages / (isSimplex ? perSide : perSide * 2)));
    return Array.from({ length: perSide }, (_, cellIdx) => {
      let pg = null;
      if (isSimplex) {
        pg = 1 + (cellIdx * sheetsTotal) + signatureIndex;
      } else {
        const stackOffset = cellIdx * (sheetsTotal * 2);
        const sheetOffset = signatureIndex * 2;
        pg = (side === 'FRONT' ? 1 : 2) + stackOffset + sheetOffset;
      }
      return {
        page: pg <= totalPages ? pg : null,
        rot: 0
      };
    });
  }

  // Default Sequential N-Up
  const pagesPerSheet = isSimplex ? perSide : perSide * 2;
  const offset = isSimplex ? 0 : (side === 'FRONT' ? 0 : perSide);
  const startPage = signatureIndex * pagesPerSheet + offset;

  return Array.from({ length: perSide }, (_, i) => {
    const pg = startPage + i + 1;
    let rot = 0;
    if (workStyle === 'WORK_AND_TUMBLE' && side === 'BACK') {
      rot = 180;
    }
    return {
      page: pg <= totalPages ? pg : null,
      rot
    };
  });
}

// ─── SVG Drawing Helpers ───────────────────────────────────────────────────
function CropMarksSVG({ x, y, length, offset, cellW, cellH }) {
  const ml = length;
  const mo = offset;
  const marks = [
    `M${x - mo},${y} L${x - mo - ml},${y}`,
    `M${x},${y - mo} L${x},${y - mo - ml}`,
    `M${x + cellW + mo},${y} L${x + cellW + mo + ml},${y}`,
    `M${x + cellW},${y - mo} L${x + cellW},${y - mo - ml}`,
    `M${x - mo},${y + cellH} L${x - mo - ml},${y + cellH}`,
    `M${x},${y + cellH + mo} L${x},${y + cellH + mo + ml}`,
    `M${x + cellW + mo},${y + cellH} L${x + cellW + mo + ml},${y + cellH}`,
    `M${x + cellW},${y + cellH + mo} L${x + cellW},${y + cellH + mo + ml}`
  ];
  return <path d={marks.join(' ')} stroke="#222" strokeWidth="0.3" fill="none" />;
}


function ColorBar({ x, y, width, height }) {
  const colors = [
    '#00FFFF', '#FF00FF', '#FFFF00', '#000000',
    '#FF0000', '#00FF00', '#0000FF', '#FF8800',
    '#888888', '#CCCCCC', '#00FFFF', '#FF00FF', '#FFFF00', '#000000'
  ];
  const segW = width / colors.length;
  return (
    <g>
      {colors.map((c, i) => (
        <rect key={i} x={x + i * segW} y={y} width={segW} height={height} fill={c} stroke="none" />
      ))}
      <rect x={x} y={y} width={width} height={height} fill="none" stroke="#333" strokeWidth="0.15" />
    </g>
  );
}

function CameraMark({ cx, cy, radius = 5, color = '#000000', borderColor = '#000000' }) {
  const outerBorderRadius = radius + 1.5;
  return (
    <g className="camera-mark-fiducial">
      {/* Outer border ring with white contrast backing */}
      <circle
        cx={cx}
        cy={cy}
        r={outerBorderRadius}
        fill="#FFFFFF"
        stroke={borderColor}
        strokeWidth="0.5"
      />
      {/* 5 mm radius circle filled with color with an outer border */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={color}
        stroke={borderColor}
        strokeWidth="0.3"
      />
    </g>
  );
}

// ─── Kodak Preps Spine Collation Step Mark ─────────────────────────────────
function CollationMarkSVG({ x, y, width = 3, height = 8 }) {
  return (
    <g className="collation-spine-mark" title="Kodak Collation Spine Mark">
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        fill="#0F172A"
        stroke="#38BDF8"
        strokeWidth="0.3"
      />
      <rect
        x={x - width / 4}
        y={y - height / 4}
        width={width / 2}
        height={height / 2}
        fill="#38BDF8"
      />
    </g>
  );
}

// ─── Kodak Fold Marks (Tick marks at folding axes) ─────────────────────────
function FoldMarksSVG({ sw, sh, pad, minX, maxX, minY, maxY }) {
  const tickLen = 5;
  const cx = pad + sw / 2;
  const cy = pad + sh / 2;
  return (
    <g className="fold-knife-marks" stroke="#334155" strokeWidth="0.4" strokeDasharray="1.5 1">
      {/* Top centerline fold tick */}
      <line x1={cx} y1={pad} x2={cx} y2={pad + Math.min(tickLen, minY)} />
      {/* Bottom centerline fold tick */}
      <line x1={cx} y1={pad + sh} x2={cx} y2={pad + sh - Math.min(tickLen, sh - maxY)} />
      {/* Left centerline fold tick */}
      <line x1={pad} y1={cy} x2={pad + Math.min(tickLen, minX)} y2={cy} />
      {/* Right centerline fold tick */}
      <line x1={pad + sw} y1={cy} x2={pad + sw - Math.min(tickLen, sw - maxX)} y2={cy} />
    </g>
  );
}

// ─── Digital Cutter Finishing Barcode (Duplo / Horizon / Zünd) ─────────────
function DigitalBarcodeSVG({ x, y, width = 45, height = 4.5, label = 'DIGI-CUT' }) {
  const bars = [2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3];
  let curX = x;
  return (
    <g className="digital-barcode">
      {bars.map((w, i) => {
        const barX = curX;
        curX += w * 0.7;
        return i % 2 === 0 ? (
          <rect key={i} x={barX} y={y} width={w * 0.7} height={height} fill="#0F172A" />
        ) : null;
      })}
      <text
        x={x + width / 2}
        y={y + height + 2.5}
        fontSize="2.2"
        fontFamily="monospace"
        fill="#64748B"
        textAnchor="middle"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
}

// ─── Packaging Box Dieline Vector Overlay SVG ──────────────────────────────
function BoxCellDielineOverlay({ x, y, w, h, rot = 0, boxStyle = 'RTE', dielineOverlay = true, cellIndex = 1 }) {
  if (!dielineOverlay) return null;

  const padX = w * 0.08;
  const padY = h * 0.08;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const glueW = innerW * 0.08;
  const panelW = (innerW - glueW) / 4;
  const tuckH = innerH * 0.12;
  const mainH = innerH - tuckH * 2;

  const cx = x + w / 2;
  const cy = y + h / 2;

  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`} className="box-dieline-group">
      {/* 3mm Bleed Boundary (Green) */}
      <rect
        x={x + 1}
        y={y + 1}
        width={w - 2}
        height={h - 2}
        fill="none"
        stroke="#10B981"
        strokeWidth="0.3"
        strokeDasharray="2 1"
      />

      {/* Main Die-Cut Outer Line (Red) */}
      <rect
        x={x + padX}
        y={y + padY}
        width={innerW}
        height={innerH}
        fill="rgba(239, 68, 68, 0.03)"
        stroke="#EF4444"
        strokeWidth="0.5"
      />

      {/* Internal Crease / Fold Score Lines (Blue Dashed) */}
      {[1, 2, 3].map((i) => (
        <line
          key={i}
          x1={x + padX + glueW + i * panelW}
          y1={y + padY + tuckH}
          x2={x + padX + glueW + i * panelW}
          y2={y + padY + tuckH + mainH}
          stroke="#3B82F6"
          strokeWidth="0.4"
          strokeDasharray="1.5 1.5"
        />
      ))}

      {/* Glue Tab Fold Line */}
      <line
        x1={x + padX + glueW}
        y1={y + padY}
        x2={x + padX + glueW}
        y2={y + padY + innerH}
        stroke="#3B82F6"
        strokeWidth="0.4"
        strokeDasharray="1.5 1.5"
      />

      {/* Top & Bottom Tuck Flap Creases */}
      <line
        x1={x + padX + glueW}
        y1={y + padY + tuckH}
        x2={x + padX + innerW}
        y2={y + padY + tuckH}
        stroke="#3B82F6"
        strokeWidth="0.4"
        strokeDasharray="1.5 1.5"
      />
      <line
        x1={x + padX + glueW}
        y1={y + padY + tuckH + mainH}
        x2={x + padX + innerW}
        y2={y + padY + tuckH + mainH}
        stroke="#3B82F6"
        strokeWidth="0.4"
        strokeDasharray="1.5 1.5"
      />

      {/* Box Panel Badge */}
      <rect
        x={cx - 18}
        y={cy - 5}
        width="36"
        height="10"
        rx="2"
        fill="rgba(15, 23, 42, 0.85)"
        stroke="#EF4444"
        strokeWidth="0.3"
      />
      <text
        x={cx}
        y={cy + 1}
        fill="#FCA5A5"
        fontSize="2.4"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        BOX #{cellIndex} ({rot}° {rot === 180 ? 'INTERLOCK' : ''})
      </text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function SheetPreview({
  partMode = 'TEXT', // 'TEXT' | 'COVER' | 'BOX'
  sheetWidth = 320,
  sheetHeight = 450,
  columns = 2,
  rows = 2,
  marginTop = 10,
  marginBottom = 10,
  marginLeft = 10,
  marginRight = 10,
  gutterX = 3,
  gutterY = 3,
  bleed = 3,
  cropMarks = true,
  cropMarkLength = 5,
  cropMarkOffset = 3,
  colorBars = true,
  cameraMarks = true,
  cameraMarkRadius = 5,
  cameraMarkSize = 10,
  cameraMarkOffset = 8,
  cameraMarkStyle = 'RING',
  cameraMarkPositions = 'CORNERS_AND_EDGES',
  collatingMarks = true,
  foldMarks = true,
  digitalBarcode = false,
  printTechnology = 'OFFSET',
  workStyle = 'SHEETWISE',
  impositionMode = 'PERFECT_BINDING',
  selectedLayout = 16,
  totalPages = 16,
  sheetIndex = 0,
  onSheetChange,
  thumbnails = [],
  thumbnailsLoading = false,
  thumbnailsProgress = 0,
  pageRotation = 0,
  pageOrientation = 'AUTO',
  bookWidth = null,
  bookHeight = null,
  bookPreset = null,
  // Cover studio parameters
  coverParams = {
    spineWidth: 5.3,
    flapWidth: 0,
    hasFlaps: false,
    bodyPageCount: 100,
    coverStock: '80gsm'
  },
  // Box studio parameters
  boxParams = {
    boxStyle: 'RTE',
    length: 100,
    width: 60,
    height: 140,
    glueTab: 15,
    tuckFlap: 15,
    flatWidth: 335,
    flatHeight: 176,
    interlockMode: 'INTERLOCKING',
    dielineOverlay: true
  }
}) {
  const [activeSide, setActiveSide] = useState('FRONT');
  const [showMargins, setShowMargins] = useState(true);
  const [showGutters, setShowGutters] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [showArtwork, setShowArtwork] = useState(true);

  const isDuplex = workStyle !== 'SIMPLEX' && workStyle !== 'SINGLE_SIDED';

  // ─── Standard Book Text Layout Geometry ─────────────────────────────────
  const textLayout = useMemo(() => {
    const sw = parseFloat(sheetWidth) || 320;
    const sh = parseFloat(sheetHeight) || 450;
    const mt = parseFloat(marginTop) || 0;
    const mb = parseFloat(marginBottom) || 0;
    const ml = parseFloat(marginLeft) || 0;
    const mr = parseFloat(marginRight) || 0;
    const gx = parseFloat(gutterX) || 0;
    const gy = parseFloat(gutterY) || 0;
    const bl = parseFloat(bleed) || 0;
    const c = Math.max(1, parseInt(columns) || 1);
    const r = Math.max(1, parseInt(rows) || 1);

    const printableW = sw - ml - mr;
    const printableH = sh - mt - mb;
    const cellW = (printableW - gx * (c - 1)) / c;
    const cellH = (printableH - gy * (r - 1)) / r;

    const cells = [];
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        cells.push({
          row,
          col,
          x: ml + col * (cellW + gx),
          y: mt + row * (cellH + gy),
          w: cellW,
          h: cellH,
          idx: row * c + col
        });
      }
    }

    return { sw, sh, mt, mb, ml, mr, gx, gy, bl, c, r, cellW, cellH, cells, printableW, printableH };
  }, [sheetWidth, sheetHeight, marginTop, marginBottom, marginLeft, marginRight, gutterX, gutterY, bleed, columns, rows]);

  // ─── Cover Spread Geometry ──────────────────────────────────────────────
  const coverLayout = useMemo(() => {
    const sw = parseFloat(sheetWidth) || 450;
    const sh = parseFloat(sheetHeight) || 320;
    const mt = parseFloat(marginTop) || 10;
    const mb = parseFloat(marginBottom) || 10;
    const ml = parseFloat(marginLeft) || 10;
    const mr = parseFloat(marginRight) || 10;
    const bl = parseFloat(bleed) || 3;

    const spineW = parseFloat(coverParams?.spineWidth) || 5.3;
    const flapW = coverParams?.hasFlaps ? (parseFloat(coverParams?.flapWidth) || 60) : 0;

    const printableW = sw - ml - mr;
    const printableH = sh - mt - mb;

    const panelsTotalWidth = (flapW * 2) + spineW;
    const bookW = (printableW - panelsTotalWidth) / 2;
    const bookH = printableH;

    let currentX = ml;
    const panels = [];

    if (coverParams?.hasFlaps && flapW > 0) {
      panels.push({
        type: 'LEFT_FLAP',
        label: activeSide === 'FRONT' ? 'Back Flap' : 'Inside Flap',
        x: currentX,
        y: mt,
        w: flapW,
        h: bookH
      });
      currentX += flapW;
    }

    panels.push({
      type: 'BACK_COVER',
      label: activeSide === 'FRONT' ? 'Back Cover (P.4)' : 'Inside Front (P.2)',
      pageNumber: activeSide === 'FRONT' ? 4 : 2,
      x: currentX,
      y: mt,
      w: bookW,
      h: bookH,
      hasBarcodeZone: activeSide === 'FRONT'
    });
    currentX += bookW;

    const spineX = currentX;
    panels.push({
      type: 'SPINE',
      label: `Spine: ${spineW.toFixed(1)}mm`,
      x: currentX,
      y: mt,
      w: spineW,
      h: bookH,
      isSpine: true
    });
    currentX += spineW;

    panels.push({
      type: 'FRONT_COVER',
      label: activeSide === 'FRONT' ? 'Front Cover (P.1)' : 'Inside Back (P.3)',
      pageNumber: activeSide === 'FRONT' ? 1 : 3,
      x: currentX,
      y: mt,
      w: bookW,
      h: bookH
    });
    currentX += bookW;

    if (coverParams?.hasFlaps && flapW > 0) {
      panels.push({
        type: 'RIGHT_FLAP',
        label: activeSide === 'FRONT' ? 'Front Flap' : 'Inside Flap',
        x: currentX,
        y: mt,
        w: flapW,
        h: bookH
      });
    }

    return {
      sw, sh, mt, mb, ml, mr, bl, printableW, printableH,
      spineW, spineX, bookWidth: bookW, bookHeight: bookH, panels
    };
  }, [sheetWidth, sheetHeight, marginTop, marginBottom, marginLeft, marginRight, bleed, coverParams, activeSide]);

  // ─── Box / Packaging Layout Geometry ──────────────────────────────────
  const boxLayout = useMemo(() => {
    const sw = parseFloat(sheetWidth) || 584;
    const sh = parseFloat(sheetHeight) || 914;
    const mt = parseFloat(marginTop) || 10;
    const mb = parseFloat(marginBottom) || 10;
    const ml = parseFloat(marginLeft) || 10;
    const mr = parseFloat(marginRight) || 10;
    const gx = parseFloat(gutterX) || 4;
    const gy = parseFloat(gutterY) || 4;
    const bl = parseFloat(bleed) || 3;
    const c = Math.max(1, parseInt(columns) || 2);
    const r = Math.max(1, parseInt(rows) || 3);

    const printableW = sw - ml - mr;
    const printableH = sh - mt - mb;
    const cellW = (printableW - gx * (c - 1)) / c;
    const cellH = (printableH - gy * (r - 1)) / r;

    const cells = [];
    const interlockMode = boxParams?.interlockMode || 'INTERLOCKING';

    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        let rot = 0;
        if (interlockMode === 'INTERLOCKING' || interlockMode === 'DUTCH') {
          rot = (row % 2 === 1) ? 180 : 0;
        } else if (interlockMode === 'HEAD_TO_HEAD') {
          rot = (row % 2 === 0) ? 180 : 0;
        }

        let shiftX = 0;
        let shiftY = 0;
        if (rot === 180) {
          shiftX = parseFloat(boxParams?.interlockShiftX || 0);
          shiftY = parseFloat(boxParams?.interlockShiftY || 0);
        }

        cells.push({
          row,
          col,
          x: ml + col * (cellW + gx) + shiftX,
          y: mt + row * (cellH + gy) + shiftY,
          w: cellW,
          h: cellH,
          rot,
          idx: row * c + col,
          page: activeSide === 'FRONT' ? 1 : (parseInt(totalPages, 10) >= 2 ? 2 : 1)
        });
      }
    }

    const flatW = parseFloat(boxParams?.flatWidth) || cellW;
    const flatH = parseFloat(boxParams?.flatHeight) || cellH;
    const boxArea = (c * r) * (flatW * flatH);
    const sheetArea = sw * sh;
    const efficiencyPct = Math.min(100, Math.round((boxArea / sheetArea) * 1000) / 10);
    const wastePct = Math.round((100 - efficiencyPct) * 10) / 10;

    return { sw, sh, mt, mb, ml, mr, gx, gy, bl, c, r, cellW, cellH, cells, printableW, printableH, efficiencyPct, wastePct };
  }, [sheetWidth, sheetHeight, marginTop, marginBottom, marginLeft, marginRight, gutterX, gutterY, bleed, columns, rows, boxParams, activeSide, totalPages]);

  // ─── Total Signatures / Forms ───────────────────────────────────────────
  const layoutPagesCount = parseInt(selectedLayout, 10) || 16;
  const totalBookPages = parseInt(totalPages, 10) || 16;
  const totalSignatures = Math.max(1, Math.ceil(totalBookPages / layoutPagesCount));

  // Resolved page cells for TEXT mode
  const textCells = useMemo(() => {
    return resolveSignaturePlacements({
      layoutPages: layoutPagesCount,
      totalPages: totalBookPages,
      signatureIndex: parseInt(sheetIndex, 10) || 0,
      side: activeSide,
      impositionMode,
      cols: textLayout.c,
      rows: textLayout.r,
      workStyle
    });
  }, [layoutPagesCount, totalBookPages, sheetIndex, activeSide, impositionMode, textLayout.c, textLayout.r, workStyle]);

  // SVG viewBox
  const pad = 20;
  const sw = partMode === 'COVER' ? coverLayout.sw : (partMode === 'BOX' ? boxLayout.sw : textLayout.sw);
  const sh = partMode === 'COVER' ? coverLayout.sh : (partMode === 'BOX' ? boxLayout.sh : textLayout.sh);
  const vbW = sw + pad * 2;
  const vbH = sh + pad * 2;

  const currentSigStart = (parseInt(sheetIndex, 10) || 0) * layoutPagesCount + 1;
  const currentSigEnd = Math.min(currentSigStart + layoutPagesCount - 1, totalBookPages);

  return (
    <div className="w-full">
      {/* ─── Top Control Bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        {/* Side toggle (Front / Back) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSide('FRONT')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${activeSide === 'FRONT'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/10'
                : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-slate-200'
              }`}
          >
            {partMode === 'COVER' ? 'OUTSIDE COVER' : 'FRONT SIDE'}
          </button>
          {isDuplex && (
            <button
              onClick={() => setActiveSide('BACK')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${activeSide === 'BACK'
                  ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 shadow-sm shadow-indigo-500/10'
                  : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-slate-200'
                }`}
            >
              {partMode === 'COVER' ? 'INSIDE COVER' : 'BACK SIDE'}
            </button>
          )}
        </div>

        {/* Form / Signature info badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#141C2A] border border-[#233045] text-xs font-mono text-slate-300">
          {partMode === 'COVER' ? (
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              Wraparound Cover Spread ({coverParams?.spineWidth?.toFixed(1) || '5.3'}mm Spine)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 flex-wrap">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-cyan-300">Signature {(parseInt(sheetIndex, 10) || 0) + 1} of {totalSignatures}</strong>
              <span className="text-slate-500">•</span>
              <span>Pages {currentSigStart}–{currentSigEnd}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{layoutPagesCount}PP {impositionMode}</span>
              {bookWidth && bookHeight ? (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-semibold">Book Trim: {bookWidth} × {bookHeight} mm</span>
                </>
              ) : null}
            </span>
          )}
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {thumbnailsLoading && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-950/80 border border-cyan-800 text-[10px] font-mono text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Rendering PDF {thumbnailsProgress}%</span>
            </div>
          )}

          {thumbnails && thumbnails.length > 0 && (
            <button
              onClick={() => setShowArtwork(!showArtwork)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all flex items-center gap-1.5 ${showArtwork
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-slate-200'
                }`}
              title="Toggle between real PDF artwork preview and schematic layout"
            >
              {showArtwork ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
              {showArtwork ? 'ARTWORK' : 'WIREFRAME'}
            </button>
          )}

          {[
            { label: 'Margins', state: showMargins, set: setShowMargins },
            { label: 'Gutters', state: showGutters, set: setShowGutters },
            { label: 'Bleed', state: showBleed, set: setShowBleed },
          ].map((t) => (
            <button
              key={t.label}
              onClick={() => t.set(!t.state)}
              className={`px-2 py-1 text-[9px] font-mono rounded border transition-all ${t.state
                  ? 'bg-[#1A2436] border-cyan-800/50 text-cyan-400'
                  : 'bg-[#10141D] border-[#233045] text-slate-500'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── SVG Canvas ─────────────────────────────────────────────────── */}
      <div className="relative bg-[#2D3139] rounded-2xl overflow-hidden border border-[#3E4552] shadow-2xl">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-auto"
          style={{ maxHeight: '540px' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Press table background */}
          <rect x="0" y="0" width={vbW} height={vbH} fill="#23272F" />

          {/* Grid pattern */}
          <defs>
            <pattern id="gridDots" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="0.4" fill="rgba(255,255,255,0.06)" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={vbW} height={vbH} fill="url(#gridDots)" />

          {/* Sheet drop shadow */}
          <rect
            x={pad + 2.5}
            y={pad + 2.5}
            width={sw}
            height={sh}
            rx="1.5"
            fill="rgba(0,0,0,0.4)"
          />

          {/* Physical Sheet Paper */}
          <rect
            x={pad}
            y={pad}
            width={sw}
            height={sh}
            rx="1"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.3"
          />

          {/* CMYK Color Bars */}
          {colorBars && (
            <>
              <ColorBar
                x={pad + (partMode === 'COVER' ? coverLayout.ml : textLayout.ml)}
                y={pad + 1.5}
                width={partMode === 'COVER' ? coverLayout.printableW : textLayout.printableW}
                height={Math.min(3, (partMode === 'COVER' ? coverLayout.mt : textLayout.mt) * 0.45)}
              />
              <ColorBar
                x={pad + (partMode === 'COVER' ? coverLayout.ml : textLayout.ml)}
                y={pad + sh - 1.5 - Math.min(3, (partMode === 'COVER' ? coverLayout.mb : textLayout.mb) * 0.45)}
                width={partMode === 'COVER' ? coverLayout.printableW : textLayout.printableW}
                height={Math.min(3, (partMode === 'COVER' ? coverLayout.mb : textLayout.mb) * 0.45)}
              />
            </>
          )}

          {/* Margins Boundary */}
          {showMargins && (
            <rect
              x={pad + (partMode === 'COVER' ? coverLayout.ml : textLayout.ml)}
              y={pad + (partMode === 'COVER' ? coverLayout.mt : textLayout.mt)}
              width={partMode === 'COVER' ? coverLayout.printableW : textLayout.printableW}
              height={partMode === 'COVER' ? coverLayout.printableH : textLayout.printableH}
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="0.25"
              strokeDasharray="3 2"
              opacity="0.6"
            />
          )}

          {/* ═════════════════════════════════════════════════════════════════
              COVER SPREAD RENDERING
             ═════════════════════════════════════════════════════════════════ */}
          {partMode === 'COVER' && (
            <g>
              {/* Bleed outline for full cover spread */}
              {showBleed && coverLayout.bl > 0 && (
                <rect
                  x={pad + coverLayout.ml - coverLayout.bl}
                  y={pad + coverLayout.mt - coverLayout.bl}
                  width={coverLayout.printableW + coverLayout.bl * 2}
                  height={coverLayout.printableH + coverLayout.bl * 2}
                  fill="rgba(239, 68, 68, 0.05)"
                  stroke="#EF4444"
                  strokeWidth="0.2"
                  strokeDasharray="2 1"
                />
              )}

              {/* Cover Panels */}
              {coverLayout.panels.map((panel, pIdx) => {
                const isSpine = panel.isSpine;
                const pageNum = panel.pageNumber;
                const thumbUrl = (pageNum && thumbnails && thumbnails[pageNum - 1]) || null;
                const hasArtwork = Boolean(thumbUrl && showArtwork);

                return (
                  <g key={`cov-panel-${pIdx}`}>
                    {/* Panel rectangle */}
                    <rect
                      x={pad + panel.x}
                      y={pad + panel.y}
                      width={panel.w}
                      height={panel.h}
                      fill={isSpine ? '#E2E8F0' : (hasArtwork ? '#FFFFFF' : '#EFF6FF')}
                      stroke={isSpine ? '#94A3B8' : '#64748B'}
                      strokeWidth="0.3"
                    />

                    {/* Spine score lines & fold creases */}
                    {isSpine && (
                      <g>
                        {/* Left fold crease */}
                        <line
                          x1={pad + panel.x}
                          y1={pad + panel.y - 4}
                          x2={pad + panel.x}
                          y2={pad + panel.y + panel.h + 4}
                          stroke="#EF4444"
                          strokeWidth="0.35"
                          strokeDasharray="2 1.5"
                        />
                        {/* Right fold crease */}
                        <line
                          x1={pad + panel.x + panel.w}
                          y1={pad + panel.y - 4}
                          x2={pad + panel.x + panel.w}
                          y2={pad + panel.y + panel.h + 4}
                          stroke="#EF4444"
                          strokeWidth="0.35"
                          strokeDasharray="2 1.5"
                        />
                        {/* Vertical spine title / fold indicator */}
                        <text
                          x={pad + panel.x + panel.w / 2}
                          y={pad + panel.y + panel.h / 2}
                          textAnchor="middle"
                          fontSize={Math.max(2.5, Math.min(4, panel.w * 0.45))}
                          fontFamily="monospace"
                          fontWeight="bold"
                          fill="#475569"
                          transform={`rotate(90, ${pad + panel.x + panel.w / 2}, ${pad + panel.y + panel.h / 2})`}
                        >
                          SPINE • {panel.w.toFixed(1)} mm
                        </text>
                      </g>
                    )}

                    {/* Panel Artwork Thumbnail */}
                    {!isSpine && hasArtwork && (
                      <g>
                        <image
                          href={thumbUrl}
                          x={pad + panel.x}
                          y={pad + panel.y}
                          width={panel.w}
                          height={panel.h}
                          preserveAspectRatio="xMidYMid meet"
                        />
                        <rect
                          x={pad + panel.x + 2}
                          y={pad + panel.y + 2}
                          width={panel.label.length * 3.8 + 6}
                          height={6}
                          rx="1"
                          fill="rgba(15, 23, 42, 0.85)"
                        />
                        <text
                          x={pad + panel.x + 4}
                          y={pad + panel.y + 6.2}
                          fontSize="3"
                          fontFamily="monospace"
                          fontWeight="bold"
                          fill="#38BDF8"
                        >
                          {panel.label}
                        </text>
                      </g>
                    )}

                    {/* Wireframe view if no artwork */}
                    {!isSpine && !hasArtwork && (
                      <g>
                        <text
                          x={pad + panel.x + panel.w / 2}
                          y={pad + panel.y + panel.h / 2 - 4}
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill="#334155"
                        >
                          {panel.label}
                        </text>
                        <text
                          x={pad + panel.x + panel.w / 2}
                          y={pad + panel.y + panel.h / 2 + 6}
                          textAnchor="middle"
                          fontSize="3.5"
                          fontFamily="monospace"
                          fill="#64748B"
                        >
                          {panel.w.toFixed(1)} × {panel.h.toFixed(1)} mm
                        </text>
                      </g>
                    )}

                    {/* Barcode Target Zone Box (Standard on Back Cover) */}
                    {panel.hasBarcodeZone && (
                      <g>
                        <rect
                          x={pad + panel.x + panel.w - 36}
                          y={pad + panel.y + panel.h - 26}
                          width={32}
                          height={22}
                          rx="1"
                          fill="rgba(255, 255, 255, 0.9)"
                          stroke="#64748B"
                          strokeWidth="0.25"
                          strokeDasharray="1.5 1"
                        />
                        <text
                          x={pad + panel.x + panel.w - 20}
                          y={pad + panel.y + panel.h - 15}
                          textAnchor="middle"
                          fontSize="2.5"
                          fontFamily="monospace"
                          fill="#475569"
                          fontWeight="bold"
                        >
                          ISBN / BARCODE
                        </text>
                        <text
                          x={pad + panel.x + panel.w - 20}
                          y={pad + panel.y + panel.h - 8}
                          textAnchor="middle"
                          fontSize="2"
                          fontFamily="monospace"
                          fill="#94A3B8"
                        >
                          ZONE
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Cover Bleed Marks & Crop Marks */}
              {cropMarks && (
                <CropMarksSVG
                  x={pad + coverLayout.ml}
                  y={pad + coverLayout.mt}
                  length={parseFloat(cropMarkLength) || 5}
                  offset={parseFloat(cropMarkOffset) || 2}
                  cellW={coverLayout.printableW}
                  cellH={coverLayout.printableH}
                />
              )}
            </g>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              BOX & PACKAGING STUDIO RENDERING (N-UP STEP-AND-REPEAT)
             ═════════════════════════════════════════════════════════════════ */}
          {partMode === 'BOX' && (
            <g>
              {boxLayout.cells.map((cell) => {
                const pageNum = cell.page;
                const thumbUrl = (pageNum && thumbnails && thumbnails[pageNum - 1]) || null;
                const hasArtwork = Boolean(thumbUrl && showArtwork);
                const cx = pad + cell.x + cell.w / 2;
                const cy = pad + cell.y + cell.h / 2;

                return (
                  <g key={`box-cell-${cell.idx}`}>
                    {/* Cell slot rectangle */}
                    <rect
                      x={pad + cell.x}
                      y={pad + cell.y}
                      width={cell.w}
                      height={cell.h}
                      fill={hasArtwork ? '#FFFFFF' : '#F8FAFC'}
                      stroke="#94A3B8"
                      strokeWidth="0.3"
                    />

                    {/* PDF Artwork Image (Rotated for Interlocking) */}
                    {hasArtwork && (
                      <image
                        href={thumbUrl}
                        x={pad + cell.x}
                        y={pad + cell.y}
                        width={cell.w}
                        height={cell.h}
                        preserveAspectRatio="xMidYMid meet"
                        transform={cell.rot ? `rotate(${cell.rot} ${cx} ${cy})` : undefined}
                      />
                    )}

                    {/* Vector Dieline Overlay */}
                    <BoxCellDielineOverlay
                      x={pad + cell.x}
                      y={pad + cell.y}
                      w={cell.w}
                      h={cell.h}
                      rot={cell.rot}
                      boxStyle={boxParams?.boxStyle || 'RTE'}
                      dielineOverlay={boxParams?.dielineOverlay !== false}
                      cellIndex={cell.idx + 1}
                    />

                    {/* Crop marks at cell corners */}
                    {cropMarks && (
                      <CropMarksSVG
                        x={pad + cell.x}
                        y={pad + cell.y}
                        length={parseFloat(cropMarkLength) || 5}
                        offset={parseFloat(cropMarkOffset) || 2}
                        cellW={cell.w}
                        cellH={cell.h}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              BOOK TEXT SIGNATURE RENDERING (16PP / 32PP / 8PP / 4PP / N-UP)
             ═════════════════════════════════════════════════════════════════ */}
          {partMode === 'TEXT' && (
            <g>
              {/* Bleed zones */}
              {showBleed && textLayout.bl > 0 && textLayout.cells.map((cell, ci) => (
                <rect
                  key={`bleed-${ci}`}
                  x={pad + cell.x - textLayout.bl}
                  y={pad + cell.y - textLayout.bl}
                  width={cell.w + textLayout.bl * 2}
                  height={cell.h + textLayout.bl * 2}
                  fill="rgba(239, 68, 68, 0.05)"
                  stroke="#EF4444"
                  strokeWidth="0.15"
                  strokeDasharray="1.5 1"
                />
              ))}

              {/* Gutters */}
              {showGutters && textLayout.c > 1 && Array.from({ length: textLayout.c - 1 }, (_, i) => {
                const gx_pos = pad + textLayout.ml + (i + 1) * textLayout.cellW + (i + 0.5) * textLayout.gx;
                return (
                  <line
                    key={`gv-${i}`}
                    x1={gx_pos}
                    y1={pad + textLayout.mt}
                    x2={gx_pos}
                    y2={pad + textLayout.mt + textLayout.printableH}
                    stroke="#94A3B8"
                    strokeWidth="0.2"
                    strokeDasharray="2 1.5"
                  />
                );
              })}

              {showGutters && textLayout.r > 1 && Array.from({ length: textLayout.r - 1 }, (_, i) => {
                const gy_pos = pad + textLayout.mt + (i + 1) * textLayout.cellH + (i + 0.5) * textLayout.gy;
                return (
                  <line
                    key={`gh-${i}`}
                    x1={pad + textLayout.ml}
                    y1={gy_pos}
                    x2={pad + textLayout.ml + textLayout.printableW}
                    y2={gy_pos}
                    stroke="#94A3B8"
                    strokeWidth="0.2"
                    strokeDasharray="2 1.5"
                  />
                );
              })}

              {/* Page Cells */}
              {textLayout.cells.map((cell, ci) => {
                const cellData = textCells[ci] || { page: null, rot: 0 };
                const pageNum = cellData.page;
                const effectiveRotation = ((cellData.rot || 0) + (parseInt(pageRotation, 10) || 0)) % 360;
                const cx = pad + cell.x + cell.w / 2;
                const cy = pad + cell.y + cell.h / 2;
                const thumbUrl = (pageNum && thumbnails && thumbnails[pageNum - 1]) || null;
                const hasArtwork = Boolean(thumbUrl && showArtwork);

                return (
                  <g key={`cell-${ci}`}>
                    {/* Cell boundary */}
                    <rect
                      x={pad + cell.x}
                      y={pad + cell.y}
                      width={cell.w}
                      height={cell.h}
                      fill={pageNum ? (hasArtwork ? '#FFFFFF' : (activeSide === 'FRONT' ? '#E0F2FE' : '#EEF2FF')) : '#F1F5F9'}
                      stroke="#94A3B8"
                      strokeWidth="0.3"
                      rx="0.5"
                    />

                    {/* Artwork image */}
                    {hasArtwork ? (
                      <g>
                        <g transform={effectiveRotation ? `rotate(${effectiveRotation}, ${cx}, ${cy})` : undefined}>
                          <image
                            href={thumbUrl}
                            x={pad + cell.x}
                            y={pad + cell.y}
                            width={cell.w}
                            height={cell.h}
                            preserveAspectRatio="xMidYMid meet"
                          />
                        </g>

                        {/* Page number badge */}
                        <rect
                          x={pad + cell.x + 2}
                          y={pad + cell.y + cell.h - 8}
                          width={Math.max(16, String(pageNum).length * 4.5 + 8)}
                          height={6.5}
                          rx="1.2"
                          fill="rgba(15, 23, 42, 0.88)"
                        />
                        <text
                          x={pad + cell.x + 2 + Math.max(16, String(pageNum).length * 4.5 + 8) / 2}
                          y={pad + cell.y + cell.h - 3.5}
                          textAnchor="middle"
                          fontSize="3.6"
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill="#38BDF8"
                        >
                          P.{pageNum}
                        </text>

                        {/* Rotation indicator */}
                        {effectiveRotation !== 0 && (
                          <g>
                            <rect
                              x={pad + cell.x + cell.w - 16}
                              y={pad + cell.y + 2}
                              width={14}
                              height={5.5}
                              rx="1"
                              fill="rgba(15, 23, 42, 0.88)"
                            />
                            <text
                              x={pad + cell.x + cell.w - 9}
                              y={pad + cell.y + 5.8}
                              fontSize="3"
                              fontFamily="monospace"
                              fill="#FB923C"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              ↻{effectiveRotation}°
                            </text>
                          </g>
                        )}
                      </g>
                    ) : (
                      /* Wireframe view */
                      pageNum && (
                        <g transform={effectiveRotation ? `rotate(${effectiveRotation}, ${cx}, ${cy})` : undefined}>
                          <text
                            x={cx}
                            y={cy + (cell.h > 60 ? 8 : 4)}
                            textAnchor="middle"
                            fontSize={Math.min(cell.w, cell.h) * 0.32}
                            fontWeight="bold"
                            fontFamily="monospace"
                            fill="#334155"
                          >
                            {pageNum}
                          </text>

                          {effectiveRotation !== 0 && (
                            <text
                              x={pad + cell.x + cell.w - 4}
                              y={pad + cell.y + 6}
                              fontSize={Math.min(cell.w, cell.h) * 0.08}
                              fontFamily="monospace"
                              fill="#EA580C"
                              textAnchor="end"
                              fontWeight="bold"
                            >
                              ↻{effectiveRotation}°
                            </text>
                          )}
                        </g>
                      )
                    )}

                    {/* Blank page placeholder */}
                    {!pageNum && (
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fontSize={Math.min(cell.w, cell.h) * 0.12}
                        fontFamily="monospace"
                        fill="#94A3B8"
                      >
                        BLANK
                      </text>
                    )}

                    {/* Position index */}
                    <text
                      x={pad + cell.x + 2}
                      y={pad + cell.y + 5}
                      fontSize="2.8"
                      fontFamily="monospace"
                      fill="#64748B"
                    >
                      #{ci + 1}
                    </text>
                  </g>
                );
              })}

              {/* Crop marks per cell */}
              {cropMarks && textLayout.cells.map((cell, ci) => (
                <CropMarksSVG
                  key={`cm-${ci}`}
                  x={pad + cell.x}
                  y={pad + cell.y}
                  length={parseFloat(cropMarkLength) || 5}
                  offset={parseFloat(cropMarkOffset) || 2}
                  cellW={cell.w}
                  cellH={cell.h}
                />
              ))}
            </g>
          )}

          {/* Optical Camera Marks (Safely positioned strictly within waste margins - NEVER overlapping book page) */}
          {cameraMarks && (() => {
            const ml = parseFloat(marginLeft) || 0;
            const mr = parseFloat(marginRight) || 0;
            const mt = parseFloat(marginTop) || 0;
            const mb = parseFloat(marginBottom) || 0;
            let camRad = parseFloat(cameraMarkRadius) || (parseFloat(cameraMarkSize) ? (parseFloat(cameraMarkSize) <= 6 ? parseFloat(cameraMarkSize) : parseFloat(cameraMarkSize) / 2) : 5) || 5;
            const clearance = 1.0; // 1mm safety gap from page content edges
            let effRad = camRad + 1.5;

            // Check margins
            const minMargin = Math.min(ml, mr, mt, mb);
            if (minMargin < effRad * 2 + clearance) {
              camRad = Math.max(1.5, (minMargin / 2) - clearance - 0.5);
              effRad = camRad + 1.0;
            }

            // Book pages bounding box in SVG coordinate space
            const pageBox = {
              left: pad + ml - clearance,
              right: pad + sw - mr + clearance,
              top: pad + mt - clearance,
              bottom: pad + sh - mb + clearance
            };

            const collidesWithBookPage = (x, y, r) => {
              return (
                x + r > pageBox.left &&
                x - r < pageBox.right &&
                y + r > pageBox.top &&
                y - r < pageBox.bottom
              );
            };

            const fiducials = [];
            const showEdges = cameraMarkPositions !== 'CORNERS';

            // Top-Left Corner
            const tlX = ml > effRad * 2 ? pad + ml / 2 : pad + effRad + clearance;
            const tlY = mt > effRad * 2 ? pad + mt / 2 : pad + effRad + clearance;
            if (!collidesWithBookPage(tlX, tlY, effRad)) {
              fiducials.push({ cx: tlX, cy: tlY });
            }

            // Top-Right Corner
            const trX = mr > effRad * 2 ? pad + sw - mr / 2 : pad + sw - effRad - clearance;
            const trY = mt > effRad * 2 ? pad + mt / 2 : pad + effRad + clearance;
            if (!collidesWithBookPage(trX, trY, effRad)) {
              fiducials.push({ cx: trX, cy: trY });
            }

            // Bottom-Left Corner
            const blX = ml > effRad * 2 ? pad + ml / 2 : pad + effRad + clearance;
            const blY = mb > effRad * 2 ? pad + sh - mb / 2 : pad + sh - effRad - clearance;
            if (!collidesWithBookPage(blX, blY, effRad)) {
              fiducials.push({ cx: blX, cy: blY });
            }

            // Bottom-Right Corner
            const brX = mr > effRad * 2 ? pad + sw - mr / 2 : pad + sw - effRad - clearance;
            const brY = mb > effRad * 2 ? pad + sh - mb / 2 : pad + sh - effRad - clearance;
            if (!collidesWithBookPage(brX, brY, effRad)) {
              fiducials.push({ cx: brX, cy: brY });
            }

            // Mid-Edge fiducials (strictly within waste margin strips)
            if (showEdges) {
              // Top edge
              if (mt >= effRad * 2 + clearance * 2) {
                const topX = pad + sw / 2;
                const topY = pad + mt / 2;
                if (!collidesWithBookPage(topX, topY, effRad)) fiducials.push({ cx: topX, cy: topY });
              }
              // Bottom edge
              if (mb >= effRad * 2 + clearance * 2) {
                const botX = pad + sw / 2;
                const botY = pad + sh - mb / 2;
                if (!collidesWithBookPage(botX, botY, effRad)) fiducials.push({ cx: botX, cy: botY });
              }
              // Left edge
              if (ml >= effRad * 2 + clearance * 2) {
                const leftX = pad + ml / 2;
                const leftY = pad + sh / 2;
                if (!collidesWithBookPage(leftX, leftY, effRad)) fiducials.push({ cx: leftX, cy: leftY });
              }
              // Right edge
              if (mr >= effRad * 2 + clearance * 2) {
                const rightX = pad + sw - mr / 2;
                const rightY = pad + sh / 2;
                if (!collidesWithBookPage(rightX, rightY, effRad)) fiducials.push({ cx: rightX, cy: rightY });
              }
            }

            return (
              <>
                {fiducials.map((f, i) => (
                  <CameraMark key={i} cx={f.cx} cy={f.cy} radius={camRad} />
                ))}
              </>
            );
          })()}

          {/* Kodak Preps Spine Collation Step Mark */}
          {collatingMarks && partMode === 'TEXT' && totalSignatures > 1 && (() => {
            const ml = parseFloat(marginLeft) || 0;
            const mr = parseFloat(marginRight) || 0;
            const mt = parseFloat(marginTop) || 0;
            const mb = parseFloat(marginBottom) || 0;
            const spineX = pad + (ml + sw - mr) / 2;
            const spineAvail = (sh - mt - mb);
            if (spineAvail < 30) return null;
            const startY = pad + mt + spineAvail * 0.15;
            const endY = pad + mt + spineAvail * 0.85;
            const currentSig = parseInt(sheetIndex, 10) || 0;
            const frac = totalSignatures > 1 ? currentSig / (totalSignatures - 1) : 0.5;
            const markY = startY + (endY - startY) * frac;
            return (
              <CollationMarkSVG
                x={spineX}
                y={markY}
                width={3.5}
                height={9}
              />
            );
          })()}

          {/* Kodak Fold & Knife Alignment Marks */}
          {foldMarks && (
            <FoldMarksSVG
              sw={sw}
              sh={sh}
              pad={pad}
              minX={parseFloat(marginLeft) || 0}
              maxX={sw - (parseFloat(marginRight) || 0)}
              minY={parseFloat(marginTop) || 0}
              maxY={sh - (parseFloat(marginBottom) || 0)}
            />
          )}

          {/* Automated Digital Cutter Barcode */}
          {(digitalBarcode || printTechnology === 'DIGITAL') && (() => {
            const mt = parseFloat(marginTop) || 0;
            if (mt >= 7) {
              return (
                <DigitalBarcodeSVG
                  x={pad + sw - (parseFloat(marginRight) || 12) - 45}
                  y={pad + 1.8}
                  width={42}
                  height={3.8}
                  label={`DIGI-CUT#SIG-${(parseInt(sheetIndex, 10) || 0) + 1}`}
                />
              );
            }
            return null;
          })()}

          {/* Digital Press Non-Printable Lead-Edge Gripper Safety Indicator */}
          {printTechnology === 'DIGITAL' && parseFloat(marginTop) < 4.5 && (
            <g className="digital-gripper-warning">
              <line
                x1={pad}
                y1={pad + 4.5}
                x2={pad + sw}
                y2={pad + 4.5}
                stroke="#F59E0B"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
              <rect
                x={pad + 5}
                y={pad + 1}
                width={50}
                height={3.2}
                fill="#78350F"
                rx="0.8"
              />
              <text
                x={pad + 6}
                y={pad + 3.2}
                fontSize="2"
                fontFamily="monospace"
                fill="#FDE68A"
                fontWeight="bold"
              >
                ⚠️ LEAD GRIPPER MARGIN &lt; 4.5mm
              </text>
            </g>
          )}

          {/* Prepress Sheet Slug Line */}
          <text
            x={pad + sw / 2}
            y={pad + sh + pad * 0.7}
            textAnchor="middle"
            fontSize="4.2"
            fontFamily="monospace"
            fill="#94A3B8"
            fontWeight="bold"
          >
            {partMode === 'COVER'
              ? `COVER SPREAD | ${activeSide === 'FRONT' ? 'OUTSIDE' : 'INSIDE'} | ${sw} × ${sh} mm`
              : `SIG ${(parseInt(sheetIndex, 10) || 0) + 1}/${totalSignatures} | ${activeSide} | PAGES ${currentSigStart}–${currentSigEnd} | ${layoutPagesCount}PP ${impositionMode} | SHEET ${sw} × ${sh} mm${bookWidth && bookHeight ? ` | BOOK TRIM ${bookWidth} × ${bookHeight} mm` : ''}`}
          </text>
        </svg>
      </div>

      {/* ─── Signature Navigation Tabs ─────────────────────────────────── */}
      {partMode === 'TEXT' && totalSignatures > 1 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-mono font-bold text-slate-400 mr-2 shrink-0 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            SIGNATURES ({totalSignatures}):
          </span>
          {Array.from({ length: totalSignatures }, (_, i) => {
            const sigStart = i * layoutPagesCount + 1;
            const sigEnd = Math.min(sigStart + layoutPagesCount - 1, totalBookPages);
            const isSelected = i === (parseInt(sheetIndex, 10) || 0);

            return (
              <button
                key={i}
                onClick={() => onSheetChange?.(i)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border shrink-0 transition-all ${isSelected
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold shadow-sm'
                    : 'bg-[#141C2A] border-[#233045] text-slate-400 hover:text-slate-200 hover:bg-[#1A2436]'
                  }`}
              >
                Sig {i + 1} ({sigStart}–{sigEnd})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
