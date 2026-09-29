import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// ─── Page ordering engines for different imposition modes ────────────────
function getPageOrder(mode, totalPages, pagesPerSheet, sheetIndex, side, workStyle) {
  const cols = pagesPerSheet.cols;
  const rows = pagesPerSheet.rows;
  const perSide = cols * rows;
  const isSimplex = workStyle === 'SIMPLEX' || workStyle === 'SINGLE_SIDED';

  // For simplex mode, only FRONT has pages — BACK is always blank
  if (isSimplex && side === 'BACK') {
    return Array.from({ length: perSide }, () => null);
  }

  switch (mode) {
    case 'SADDLE_STITCH':
      return getSaddleStitchOrder(totalPages, cols, rows, sheetIndex, side);
    case 'PERFECT_BINDING':
      return getPerfectBindingOrder(totalPages, perSide, sheetIndex, side, isSimplex);
    case 'CUT_AND_STACK':
      return getCutAndStackOrder(totalPages, perSide, sheetIndex, side, isSimplex);
    case 'STEP_AND_REPEAT':
      return getStepAndRepeatOrder(perSide);
    case 'N_UP':
    default:
      return getNUpOrder(totalPages, perSide, sheetIndex, side, isSimplex);
  }
}

function getNUpOrder(totalPages, perSide, sheetIndex, side, isSimplex) {
  // Simplex: each sheet has perSide pages (front only)
  // Duplex: each sheet has perSide*2 pages (front + back)
  const pagesPerSheet = isSimplex ? perSide : perSide * 2;
  const offset = isSimplex ? 0 : (side === 'FRONT' ? 0 : perSide);
  const startPage = sheetIndex * pagesPerSheet + offset;
  return Array.from({ length: perSide }, (_, i) => {
    const pg = startPage + i + 1;
    return pg <= totalPages ? pg : null;
  });
}

function getSaddleStitchOrder(totalPages, cols, rows, sheetIndex, side) {
  // Round up to nearest multiple of 4
  const roundedPages = Math.ceil(totalPages / 4) * 4;
  const totalSheets = roundedPages / 4;
  const pages = [];

  if (cols === 2 && rows === 1) {
    // Standard 2-up booklet
    if (side === 'FRONT') {
      const left = roundedPages - (sheetIndex * 2);
      const right = sheetIndex * 2 + 1;
      pages.push(left <= totalPages ? left : null);
      pages.push(right <= totalPages ? right : null);
    } else {
      const left = sheetIndex * 2 + 2;
      const right = roundedPages - (sheetIndex * 2) - 1;
      pages.push(left <= totalPages ? left : null);
      pages.push(right <= totalPages ? right : null);
    }
  } else if (cols === 2 && rows === 2) {
    // 4-up saddle stitch (8 pages per physical sheet)
    const pagesPerPhysicalSheet = 8;
    const baseIdx = sheetIndex * pagesPerPhysicalSheet;
    if (side === 'FRONT') {
      // Top row: last pair, first pair
      pages.push(roundedPages - baseIdx > 0 ? roundedPages - baseIdx : null);
      pages.push(baseIdx + 1 <= totalPages ? baseIdx + 1 : null);
      // Bottom row
      pages.push(baseIdx + 4 <= totalPages ? baseIdx + 4 : null);
      pages.push(roundedPages - baseIdx - 3 > 0 ? roundedPages - baseIdx - 3 : null);
    } else {
      pages.push(baseIdx + 2 <= totalPages ? baseIdx + 2 : null);
      pages.push(roundedPages - baseIdx - 1 > 0 ? roundedPages - baseIdx - 1 : null);
      pages.push(roundedPages - baseIdx - 2 > 0 ? roundedPages - baseIdx - 2 : null);
      pages.push(baseIdx + 3 <= totalPages ? baseIdx + 3 : null);
    }
  } else {
    // Fallback to N-up
    return getNUpOrder(totalPages, cols * rows, sheetIndex, side, false);
  }

  return pages;
}

function getPerfectBindingOrder(totalPages, perSide, sheetIndex, side, isSimplex) {
  const pagesPerSheet = isSimplex ? perSide : perSide * 2;
  const offset = isSimplex ? 0 : (side === 'FRONT' ? 0 : perSide);
  const startPage = sheetIndex * pagesPerSheet + offset;
  return Array.from({ length: perSide }, (_, i) => {
    const pg = startPage + i + 1;
    return pg <= totalPages ? pg : null;
  });
}

function getCutAndStackOrder(totalPages, perSide, sheetIndex, side, isSimplex) {
  const pagesPerSheet = isSimplex ? perSide : perSide * 2;
  const totalSheets = Math.max(1, Math.ceil(totalPages / pagesPerSheet));
  const pages = [];
  for (let i = 0; i < perSide; i++) {
    const pg = side === 'FRONT'
      ? i * totalSheets + sheetIndex + 1
      : (i + perSide) * totalSheets + sheetIndex + 1;
    pages.push(pg <= totalPages ? pg : null);
  }
  return pages;
}

function getStepAndRepeatOrder(perSide) {
  return Array.from({ length: perSide }, () => 1);
}

// ─── Rotation logic per page position ────────────────────────────────────
function getPageRotation(mode, side, row, col, workStyle) {
  // Work and Tumble turns the paper head-to-foot (vertical axis),
  // which inverts the back side by 180 degrees.
  if (workStyle === 'WORK_AND_TUMBLE' && side === 'BACK') {
    return 180;
  }

  // Head-to-head booklet folding:
  // In saddle stitch or signature booklet layouts with 2 or more rows,
  // top row pages are oriented head-to-head (180°) so they fold correctly at the spine.
  if ((mode === 'SADDLE_STITCH' || mode === 'PERFECT_BINDING') && row === 0) {
    return 180;
  }

  // Standard N-UP, Step and Repeat, Cut and Stack, and Sheetwise layouts:
  // All pages remain upright (0°).
  return 0;
}

// ─── SVG Drawing Helpers ─────────────────────────────────────────────────
function CropMarksSVG({ x, y, length, offset, cellW, cellH }) {
  const ml = length;
  const mo = offset;
  const marks = [];
  // Top-left
  marks.push(`M${x - mo},${y} L${x - mo - ml},${y}`);
  marks.push(`M${x},${y - mo} L${x},${y - mo - ml}`);
  // Top-right
  marks.push(`M${x + cellW + mo},${y} L${x + cellW + mo + ml},${y}`);
  marks.push(`M${x + cellW},${y - mo} L${x + cellW},${y - mo - ml}`);
  // Bottom-left
  marks.push(`M${x - mo},${y + cellH} L${x - mo - ml},${y + cellH}`);
  marks.push(`M${x},${y + cellH + mo} L${x},${y + cellH + mo + ml}`);
  // Bottom-right
  marks.push(`M${x + cellW + mo},${y + cellH} L${x + cellW + mo + ml},${y + cellH}`);
  marks.push(`M${x + cellW},${y + cellH + mo} L${x + cellW},${y + cellH + mo + ml}`);

  return <path d={marks.join(' ')} stroke="#333" strokeWidth="0.3" fill="none" />;
}

function RegistrationMark({ cx, cy, size = 3 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={size} fill="none" stroke="#333" strokeWidth="0.25" />
      <circle cx={cx} cy={cy} r={size * 0.3} fill="#333" />
      <line x1={cx - size * 1.5} y1={cy} x2={cx + size * 1.5} y2={cy} stroke="#333" strokeWidth="0.2" />
      <line x1={cx} y1={cy - size * 1.5} x2={cx} y2={cy + size * 1.5} stroke="#333" strokeWidth="0.2" />
    </g>
  );
}

function ColorBar({ x, y, width, height }) {
  const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FF8800', '#884400', '#888888', '#CCCCCC', '#00FFFF', '#FF00FF', '#FFFF00', '#000000'];
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

function FoldArrow({ x, y, direction, size = 6 }) {
  const s = size;
  let points;
  if (direction === 'down') {
    points = `${x},${y - s / 2} ${x + s / 2},${y + s / 2} ${x - s / 2},${y + s / 2}`;
  } else if (direction === 'right') {
    points = `${x - s / 2},${y} ${x + s / 2},${y - s / 2} ${x + s / 2},${y + s / 2}`;
  } else if (direction === 'up') {
    points = `${x},${y + s / 2} ${x + s / 2},${y - s / 2} ${x - s / 2},${y - s / 2}`;
  } else {
    points = `${x + s / 2},${y} ${x - s / 2},${y - s / 2} ${x - s / 2},${y + s / 2}`;
  }
  return <polygon points={points} fill="#FF8800" opacity="0.7" />;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function SheetPreview({
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
  registrationMarks = true,
  colorBars = true,
  workStyle = 'SIMPLEX',
  impositionMode = 'N_UP',
  totalPages = 16,
  sheetIndex = 0,
  pageLabel = '',
  onSheetChange,
  thumbnails = [],
  thumbnailsLoading = false,
  thumbnailsProgress = 0,
}) {
  const [activeSide, setActiveSide] = useState('FRONT');
  const [showMargins, setShowMargins] = useState(true);
  const [showGutters, setShowGutters] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [showArtwork, setShowArtwork] = useState(true);

  const isDuplex = workStyle !== 'SIMPLEX' && workStyle !== 'SINGLE_SIDED';

  const layout = useMemo(() => {
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

  const pages = useMemo(() => {
    return getPageOrder(
      impositionMode,
      parseInt(totalPages) || 16,
      { cols: layout.c, rows: layout.r },
      parseInt(sheetIndex) || 0,
      activeSide,
      workStyle
    );
  }, [impositionMode, totalPages, layout.c, layout.r, sheetIndex, activeSide, workStyle]);

  // SVG padding around sheet for marks
  const pad = 20;
  const vbW = layout.sw + pad * 2;
  const vbH = layout.sh + pad * 2;

  // Detect page size label
  const cellWmm = layout.cellW;
  const cellHmm = layout.cellH;
  const getPageSizeLabel = () => {
    const sizes = [
      { name: 'A3', w: 297, h: 420 },
      { name: 'A4', w: 210, h: 297 },
      { name: 'A5', w: 148, h: 210 },
      { name: 'A6', w: 105, h: 148 },
      { name: 'B5', w: 176, h: 250 },
      { name: 'Letter', w: 216, h: 279 },
    ];
    for (const s of sizes) {
      if ((Math.abs(cellWmm - s.w) < 15 && Math.abs(cellHmm - s.h) < 15) ||
          (Math.abs(cellWmm - s.h) < 15 && Math.abs(cellHmm - s.w) < 15)) {
        return s.name;
      }
    }
    return `${Math.round(cellWmm)}×${Math.round(cellHmm)}`;
  };
  const sizeLabel = pageLabel || getPageSizeLabel();

  // Total sheets calculation
  const perSide = layout.c * layout.r;
  const pagesPerPhysicalSheet = isDuplex ? perSide * 2 : perSide;
  const totalSheets = Math.ceil((parseInt(totalPages) || 16) / pagesPerPhysicalSheet);

  return (
    <div className="w-full">
      {/* Controls bar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        {/* Side toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSide('FRONT')}
            className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-all ${
              activeSide === 'FRONT'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                : 'bg-[#1A2436] border-[#2B3C57] text-slate-400 hover:text-slate-200'
            }`}
          >
            FRONT
          </button>
          {isDuplex && (
            <button
              onClick={() => setActiveSide('BACK')}
              className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-all ${
                activeSide === 'BACK'
                  ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300'
                  : 'bg-[#1A2436] border-[#2B3C57] text-slate-400 hover:text-slate-200'
              }`}
            >
              BACK
            </button>
          )}
        </div>

        {/* Sheet info */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span>Sheet {(parseInt(sheetIndex) || 0) + 1} of {totalSheets}</span>
          <span>|</span>
          <span>{layout.c}×{layout.r} = {perSide} Up</span>
          <span>|</span>
          <span>{Math.round(layout.sw)}×{Math.round(layout.sh)} mm</span>
        </div>

        {/* Overlay & Artwork toggles */}
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
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                showArtwork
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-[#1A2436] border-[#2B3C57] text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle between real PDF page artwork and schematic wireframe"
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
              className={`px-2 py-1 text-[9px] font-mono rounded border transition-all ${
                t.state
                  ? 'bg-[#1A2436] border-cyan-800/50 text-cyan-400'
                  : 'bg-[#111] border-[#2B3C57] text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-[#3A3A3A] rounded-2xl overflow-hidden border border-[#555] shadow-2xl">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-auto"
          style={{ maxHeight: '520px' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Press table texture */}
          <rect x="0" y="0" width={vbW} height={vbH} fill="#4A4A4A" />
          <defs>
            <pattern id="gridDots" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.3" fill="rgba(255,255,255,0.08)" />
            </pattern>
            {layout.cells.map((cell, ci) => (
              <clipPath id={`cell-clip-${ci}`} key={`clip-${ci}`}>
                <rect
                  x={pad + cell.x}
                  y={pad + cell.y}
                  width={cell.w}
                  height={cell.h}
                  rx="0.5"
                />
              </clipPath>
            ))}
          </defs>
          <rect x="0" y="0" width={vbW} height={vbH} fill="url(#gridDots)" />

          {/* Sheet shadow */}
          <rect
            x={pad + 2}
            y={pad + 2}
            width={layout.sw}
            height={layout.sh}
            rx="1"
            fill="rgba(0,0,0,0.3)"
          />

          {/* Sheet paper */}
          <rect
            x={pad}
            y={pad}
            width={layout.sw}
            height={layout.sh}
            rx="0.5"
            fill="white"
            stroke="#ccc"
            strokeWidth="0.3"
          />

          {/* Color bars at top */}
          {colorBars && (
            <ColorBar
              x={pad + layout.ml}
              y={pad + 1}
              width={layout.printableW}
              height={Math.min(3, layout.mt * 0.4)}
            />
          )}

          {/* Color bars at bottom */}
          {colorBars && (
            <ColorBar
              x={pad + layout.ml}
              y={pad + layout.sh - 1 - Math.min(3, layout.mb * 0.4)}
              width={layout.printableW}
              height={Math.min(3, layout.mb * 0.4)}
            />
          )}

          {/* Margin boundary (dashed) */}
          {showMargins && (
            <rect
              x={pad + layout.ml}
              y={pad + layout.mt}
              width={layout.printableW}
              height={layout.printableH}
              fill="none"
              stroke="#00BCD4"
              strokeWidth="0.25"
              strokeDasharray="3 2"
              opacity="0.5"
            />
          )}

          {/* Bleed zones */}
          {showBleed && layout.bl > 0 && layout.cells.map((cell, ci) => (
            <rect
              key={`bleed-${ci}`}
              x={pad + cell.x - layout.bl}
              y={pad + cell.y - layout.bl}
              width={cell.w + layout.bl * 2}
              height={cell.h + layout.bl * 2}
              fill="rgba(255, 60, 60, 0.08)"
              stroke="#FF5555"
              strokeWidth="0.15"
              strokeDasharray="1.5 1"
            />
          ))}

          {/* Gutter lines */}
          {showGutters && layout.c > 1 && Array.from({ length: layout.c - 1 }, (_, i) => {
            const gx_pos = pad + layout.ml + (i + 1) * layout.cellW + (i + 0.5) * layout.gx;
            return (
              <line
                key={`gv-${i}`}
                x1={gx_pos}
                y1={pad + layout.mt}
                x2={gx_pos}
                y2={pad + layout.mt + layout.printableH}
                stroke="#999"
                strokeWidth="0.2"
                strokeDasharray="2 1.5"
              />
            );
          })}

          {showGutters && layout.r > 1 && Array.from({ length: layout.r - 1 }, (_, i) => {
            const gy_pos = pad + layout.mt + (i + 1) * layout.cellH + (i + 0.5) * layout.gy;
            return (
              <line
                key={`gh-${i}`}
                x1={pad + layout.ml}
                y1={gy_pos}
                x2={pad + layout.ml + layout.printableW}
                y2={gy_pos}
                stroke="#999"
                strokeWidth="0.2"
                strokeDasharray="2 1.5"
              />
            );
          })}

          {/* Page cells */}
          {layout.cells.map((cell, ci) => {
            const pageNum = pages[ci];
            const rotation = getPageRotation(impositionMode, activeSide, cell.row, cell.col, workStyle);
            const cx = pad + cell.x + cell.w / 2;
            const cy = pad + cell.y + cell.h / 2;
            const thumbUrl = (pageNum && thumbnails && thumbnails[pageNum - 1]) || null;
            const hasArtwork = Boolean(thumbUrl && showArtwork);

            return (
              <g key={`cell-${ci}`}>
                {/* Cell background */}
                <rect
                  x={pad + cell.x}
                  y={pad + cell.y}
                  width={cell.w}
                  height={cell.h}
                  fill={pageNum ? (hasArtwork ? '#FFFFFF' : (activeSide === 'FRONT' ? '#B8C8E8' : '#C8B8E8')) : '#E8E8E8'}
                  stroke="#8899BB"
                  strokeWidth="0.3"
                  rx="0.5"
                />

                {/* If artwork thumbnail is available and enabled, render actual PDF page */}
                {hasArtwork ? (
                  <g clipPath={`url(#cell-clip-${ci})`}>
                    <g transform={rotation ? `rotate(${rotation}, ${cx}, ${cy})` : undefined}>
                      <image
                        href={thumbUrl}
                        x={pad + cell.x}
                        y={pad + cell.y}
                        width={cell.w}
                        height={cell.h}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </g>

                    {/* Page badge overlay in bottom-left */}
                    <rect
                      x={pad + cell.x + 2}
                      y={pad + cell.y + cell.h - 9}
                      width={Math.max(16, String(pageNum).length * 4.5 + 8)}
                      height={7}
                      rx="1.5"
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="0.2"
                    />
                    <text
                      x={pad + cell.x + 2 + Math.max(16, String(pageNum).length * 4.5 + 8) / 2}
                      y={pad + cell.y + cell.h - 4.2}
                      textAnchor="middle"
                      fontSize="3.8"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill="#38BDF8"
                    >
                      P.{pageNum}
                    </text>

                    {/* Rotation indicator if rotated */}
                    {rotation !== 0 && (
                      <g>
                        <rect
                          x={pad + cell.x + cell.w - 18}
                          y={pad + cell.y + 2}
                          width={16}
                          height={6}
                          rx="1"
                          fill="rgba(15, 23, 42, 0.85)"
                          stroke="rgba(251, 146, 60, 0.4)"
                          strokeWidth="0.2"
                        />
                        <text
                          x={pad + cell.x + cell.w - 10}
                          y={pad + cell.y + 6.2}
                          fontSize="3.2"
                          fontFamily="monospace"
                          fill="#FB923C"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          ↻{rotation}°
                        </text>
                      </g>
                    )}
                  </g>
                ) : (
                  /* Schematic wireframe view */
                  pageNum && (
                    <g transform={rotation ? `rotate(${rotation}, ${cx}, ${cy})` : undefined}>
                      {/* Large page number */}
                      <text
                        x={cx}
                        y={cy + (cell.h > 60 ? 8 : 4)}
                        textAnchor="middle"
                        fontSize={Math.min(cell.w, cell.h) * 0.35}
                        fontWeight="bold"
                        fontFamily="monospace"
                        fill="rgba(255,255,255,0.6)"
                        stroke="rgba(100,120,180,0.3)"
                        strokeWidth="0.5"
                      >
                        {pageNum}
                      </text>

                      {/* Page size label */}
                      <text
                        x={pad + cell.x + 3}
                        y={pad + cell.y + cell.h - 3}
                        fontSize={Math.min(cell.w, cell.h) * 0.08}
                        fontFamily="monospace"
                        fill="rgba(80,90,120,0.7)"
                      >
                        {sizeLabel}
                      </text>

                      {/* Rotation indicator */}
                      {rotation !== 0 && (
                        <text
                          x={pad + cell.x + cell.w - 5}
                          y={pad + cell.y + 6}
                          fontSize={Math.min(cell.w, cell.h) * 0.06}
                          fontFamily="monospace"
                          fill="rgba(200,100,50,0.8)"
                          textAnchor="end"
                        >
                          ↻{rotation}°
                        </text>
                      )}
                    </g>
                  )
                )}

                {/* Empty / Blank page indicator */}
                {!pageNum && (
                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fontSize={Math.min(cell.w, cell.h) * 0.12}
                    fontFamily="monospace"
                    fill="rgba(150,150,150,0.6)"
                  >
                    BLANK
                  </text>
                )}

                {/* Cell grid coordinate / index tag */}
                <text
                  x={pad + cell.x + 2}
                  y={pad + cell.y + Math.min(cell.w, cell.h) * 0.08 + 2}
                  fontSize={Math.min(cell.w, cell.h) * 0.06}
                  fontFamily="monospace"
                  fill={hasArtwork ? 'rgba(15, 23, 42, 0.6)' : 'rgba(80,90,120,0.5)'}
                >
                  [{ci + 1}]
                </text>
              </g>
            );
          })}

          {/* Crop marks */}
          {cropMarks && layout.cells.map((cell, ci) => (
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

          {/* Registration marks at four corners */}
          {registrationMarks && (
            <>
              <RegistrationMark cx={pad + layout.ml / 2} cy={pad + layout.mt / 2} size={Math.min(3, layout.ml * 0.3)} />
              <RegistrationMark cx={pad + layout.sw - layout.mr / 2} cy={pad + layout.mt / 2} size={Math.min(3, layout.mr * 0.3)} />
              <RegistrationMark cx={pad + layout.ml / 2} cy={pad + layout.sh - layout.mb / 2} size={Math.min(3, layout.ml * 0.3)} />
              <RegistrationMark cx={pad + layout.sw - layout.mr / 2} cy={pad + layout.sh - layout.mb / 2} size={Math.min(3, layout.mr * 0.3)} />
            </>
          )}

          {/* Fold arrows for booklet modes */}
          {impositionMode === 'SADDLE_STITCH' && layout.r === 2 && (
            <>
              <FoldArrow
                x={pad + layout.sw / 2 - 4}
                y={pad + layout.mt + layout.cellH + layout.gy / 2}
                direction="up"
                size={4}
              />
              <FoldArrow
                x={pad + layout.sw / 2 + 4}
                y={pad + layout.mt + layout.cellH + layout.gy / 2}
                direction="down"
                size={4}
              />
            </>
          )}

          {/* Side label watermark */}
          <text
            x={pad + layout.sw / 2}
            y={pad + layout.sh + pad * 0.7}
            textAnchor="middle"
            fontSize="5"
            fontFamily="monospace"
            fill="rgba(255,255,255,0.35)"
            fontWeight="bold"
          >
            {activeSide === 'FRONT' ? 'FRONT SIDE' : 'BACK SIDE'} — SHEET {(parseInt(sheetIndex) || 0) + 1}
          </text>
        </svg>
      </div>

      {/* Signature tabs (for multi-sheet jobs) */}
      {totalSheets > 1 && (
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono text-slate-500 mr-2 shrink-0">FORMS:</span>
          {Array.from({ length: Math.min(totalSheets, 12) }, (_, i) => (
            <button
              key={i}
              onClick={() => onSheetChange?.(i)}
              className={`px-2 py-1 text-[9px] font-mono rounded border shrink-0 transition-all ${
                i === (parseInt(sheetIndex) || 0)
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                  : 'bg-[#1A2436] border-[#2B3C57] text-slate-400 hover:text-slate-200'
              }`}
            >
              {String(i + 1).padStart(2, '0')} {activeSide === 'FRONT' ? 'F' : 'B'}
            </button>
          ))}
          {totalSheets > 12 && <span className="text-[9px] text-slate-500 font-mono">+{totalSheets - 12} more</span>}
        </div>
      )}
    </div>
  );
}
