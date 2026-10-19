import React, { useState, useMemo } from 'react';
import {
  Package,
  X,
  Sparkles,
  Check,
  Rotate3d,
  Layers,
  Ruler,
  Maximize2,
  Sliders,
  Info,
  Box,
  Spline,
  ArrowRight
} from 'lucide-react';
import {
  BOX_STYLES,
  BOX_PRESETS,
  generateBoxDieline
} from '../utils/boxDielineGenerator';

export default function BoxKeylineModal({
  isOpen,
  onClose,
  onApplyDieline,
  sheetWidth = 635,
  sheetHeight = 457.2
}) {
  const [selectedStyle, setSelectedStyle] = useState('RTE');
  const [activePreset, setActivePreset] = useState('medicine');

  // Box Dimensions in millimeters
  const [length, setLength] = useState(70);
  const [width, setWidth] = useState(40);
  const [height, setHeight] = useState(120);
  const [glueTab, setGlueTab] = useState(15);
  const [tuckFlap, setTuckFlap] = useState(24);
  const [dustFlap, setDustFlap] = useState(20);

  // Preview Mode: '2d' flat dieline or '3d' folded box
  const [previewMode, setPreviewMode] = useState('2d');
  const [rotX, setRotX] = useState(25);
  const [rotY, setRotY] = useState(-35);

  // Apply Industry Preset
  const handleApplyPreset = (preset) => {
    setActivePreset(preset.id);
    setSelectedStyle(preset.style);
    setLength(preset.length);
    setWidth(preset.width);
    setHeight(preset.height);
    if (preset.glueTab) setGlueTab(preset.glueTab);
    if (preset.tuckFlap) setTuckFlap(preset.tuckFlap);
    if (preset.dustFlap) setDustFlap(preset.dustFlap);
  };

  // Generate Keylines for Preview & Canvas
  const dielineResult = useMemo(() => {
    return generateBoxDieline(selectedStyle, sheetWidth, sheetHeight, {
      length,
      width,
      height,
      glueTab,
      tuckFlap,
      dustFlap
    });
  }, [selectedStyle, sheetWidth, sheetHeight, length, width, height, glueTab, tuckFlap, dustFlap]);

  const { elements = [], dimensions = {} } = dielineResult;

  // Calculate bounding box for SVG preview
  const previewBounds = useMemo(() => {
    if (elements.length === 0) return { minX: 0, minY: 0, maxX: sheetWidth, maxY: sheetHeight, w: sheetWidth, h: sheetHeight };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      if (el.type === 'rect' || el.type === 'roundrect') {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      } else if (el.type === 'line' || el.type === 'measure') {
        minX = Math.min(minX, el.x1, el.x2);
        minY = Math.min(minY, el.y1, el.y2);
        maxX = Math.max(maxX, el.x1, el.x2);
        maxY = Math.max(maxY, el.y1, el.y2);
      } else if (el.type === 'curve') {
        minX = Math.min(minX, el.x1, el.x2, el.cx);
        minY = Math.min(minY, el.y1, el.y2, el.cy);
        maxX = Math.max(maxX, el.x1, el.x2, el.cx);
        maxY = Math.max(maxY, el.y1, el.y2, el.cy);
      }
    });

    const pad = 15;
    const w = Math.max(50, maxX - minX + pad * 2);
    const h = Math.max(50, maxY - minY + pad * 2);
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad, w, h };
  }, [elements, sheetWidth, sheetHeight]);

  if (!isOpen) return null;

  const fitsOnSheet =
    (dimensions.totalW || 100) <= sheetWidth &&
    (dimensions.totalH || 100) <= sheetHeight;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0D121F] border border-fuchsia-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-fuchsia-950/60 overflow-hidden text-slate-200 font-sans">
        {/* ─── Top Modal Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-slate-900 via-fuchsia-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono m-0">
                  Draw Packaging Box Keyline (CAD Dieline)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-700 font-semibold">
                  Vector Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono m-0">
                Parametric folding carton keylines with precision cut rules, score creases, curved flaps & glue tabs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Box Style Tabs ──────────────────────────────────────────────── */}
        <div className="px-4 py-2 bg-[#121826] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
          {BOX_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  setSelectedStyle(style.id);
                  setActivePreset(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white border-fuchsia-400 shadow-md shadow-fuchsia-950/40'
                    : 'bg-[#182032] text-slate-400 hover:text-white border-[#243048] hover:border-slate-500'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Industry Quick Presets ──────────────────────────────────────── */}
        <div className="px-4 py-2 bg-[#0F1523] border-b border-white/5 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-500 shrink-0">Quick Presets:</span>
          {BOX_PRESETS.map((p) => {
            const isCurrent = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500 font-bold'
                    : 'bg-[#151D2D] text-slate-400 hover:text-white border-[#222E45]'
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* ─── Main 2-Column Content ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-y-auto flex-1">
          {/* LEFT COLUMN: Numeric Controls & Dimension Sliders (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-fuchsia-400">
                  <Sliders className="w-4 h-4" />
                  <span>CARTON DIMENSIONS (MM)</span>
                </span>
                <span className="text-[10px] text-slate-400">Tolerance ±0.2mm</span>
              </div>

              {/* Length L */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300">Length (L) - Front Panel</span>
                  <span className="text-fuchsia-400 font-bold">{length} mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="30"
                    max="240"
                    step="1"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="20"
                    max="400"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 20)}
                    className="w-16 bg-[#10141D] border border-[#243048] rounded px-2 py-1 text-xs text-white text-right font-mono"
                  />
                </div>
              </div>

              {/* Width W */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300">Width (W) - Side Panel Depth</span>
                  <span className="text-cyan-400 font-bold">{width} mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="20"
                    max="180"
                    step="1"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 15)}
                    className="w-16 bg-[#10141D] border border-[#243048] rounded px-2 py-1 text-xs text-white text-right font-mono"
                  />
                </div>
              </div>

              {/* Height H */}
              {selectedStyle !== 'PILLOW' && (
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Height (H) - Tube Length</span>
                    <span className="text-emerald-400 font-bold">{height} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="40"
                      max="320"
                      step="1"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="30"
                      max="500"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 30)}
                      className="w-16 bg-[#10141D] border border-[#243048] rounded px-2 py-1 text-xs text-white text-right font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Glue Tab & Flap Settings */}
              {selectedStyle !== 'PILLOW' && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Glue Tab (G)</label>
                    <input
                      type="number"
                      value={glueTab}
                      onChange={(e) => setGlueTab(parseFloat(e.target.value) || 10)}
                      className="w-full bg-[#10141D] border border-[#243048] rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Tuck Flap (F)</label>
                    <input
                      type="number"
                      value={tuckFlap}
                      onChange={(e) => setTuckFlap(parseFloat(e.target.value) || 15)}
                      className="w-full bg-[#10141D] border border-[#243048] rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Dust Flap</label>
                    <input
                      type="number"
                      value={dustFlap}
                      onChange={(e) => setDustFlap(parseFloat(e.target.value) || 15)}
                      className="w-full bg-[#10141D] border border-[#243048] rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footprint & Fit Status */}
            <div className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
              fitsOnSheet
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span>Dieline Flat Footprint:</span>
                <span>
                  {Math.round(dimensions.totalW || (length * 2 + width * 2 + glueTab))} ×{' '}
                  {Math.round(dimensions.totalH || (height + (width + tuckFlap) * 2))} mm
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Canvas Sheet Size:</span>
                <span>{sheetWidth} × {sheetHeight} mm</span>
              </div>
              <div className="text-[10px] pt-1 border-t border-white/5 flex items-center gap-1 font-semibold">
                {fitsOnSheet ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Keyline fits comfortably inside current press sheet.</span>
                  </>
                ) : (
                  <>
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Carton footprint exceeds canvas sheet. Select larger sheet preset.</span>
                  </>
                )}
              </div>
            </div>

            {/* CAD Layer Inks Legend */}
            <div className="p-3 rounded-xl bg-[#141C2A] border border-[#233045] text-[11px] font-mono space-y-1.5">
              <span className="text-slate-400 font-bold block mb-1">PREPRESS SPOT INKS LEGEND</span>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#E6007A]" />
                  <span>Magenta: Thru-Cut Line</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#009EE3]" />
                  <span>Cyan: Crease Fold Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                  <span>Violet: Adhesive Glue Seam</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                  <span>Blue: CAD Measurement</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Live Preview (Flat 2D & Folded 3D) (7 cols) */}
          <div className="md:col-span-7 flex flex-col space-y-2 min-h-[380px]">
            {/* View Switcher Bar */}
            <div className="flex items-center justify-between bg-[#121826] p-1.5 rounded-xl border border-white/5 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('2d')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    previewMode === '2d'
                      ? 'bg-fuchsia-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>2D Flat Dieline CAD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('3d')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    previewMode === '3d'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Rotate3d className="w-3.5 h-3.5" />
                  <span>3D Folded Carton Preview</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 pr-2">
                {elements.length} Vector Elements Generated
              </div>
            </div>

            {/* Preview Box Container */}
            <div className="flex-1 bg-[#090D16] border border-[#1E293B] rounded-2xl p-2 relative flex items-center justify-center overflow-hidden min-h-[340px]">
              {previewMode === '2d' ? (
                /* ─── 2D FLAT DIELINE CAD SCHEMATIC ─── */
                <svg
                  viewBox={`${previewBounds.minX} ${previewBounds.minY} ${previewBounds.w} ${previewBounds.h}`}
                  className="w-full h-full max-h-[420px]"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                >
                  <defs>
                    <pattern id="modalHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#8B5CF6" strokeWidth="1" strokeOpacity="0.4" />
                    </pattern>
                  </defs>

                  {/* Render Elements */}
                  {elements.map((el) => {
                    if (el.type === 'rect') {
                      return (
                        <rect
                          key={el.id}
                          x={el.x}
                          y={el.y}
                          width={el.width}
                          height={el.height}
                          stroke={el.strokeColor}
                          strokeWidth={el.strokeWidth || 1}
                          strokeDasharray={el.strokeDash || undefined}
                          fill={el.fillMode === 'hatch_diagonal' ? 'url(#modalHatch)' : 'none'}
                        />
                      );
                    }
                    if (el.type === 'line') {
                      return (
                        <line
                          key={el.id}
                          x1={el.x1}
                          y1={el.y1}
                          x2={el.x2}
                          y2={el.y2}
                          stroke={el.strokeColor}
                          strokeWidth={el.strokeWidth || 1}
                          strokeDasharray={el.strokeDash || undefined}
                        />
                      );
                    }
                    if (el.type === 'curve') {
                      const d = `M ${el.x1} ${el.y1} Q ${el.cx} ${el.cy} ${el.x2} ${el.y2}`;
                      return (
                        <path
                          key={el.id}
                          d={d}
                          stroke={el.strokeColor}
                          strokeWidth={el.strokeWidth || 1}
                          strokeDasharray={el.strokeDash || undefined}
                          fill="none"
                        />
                      );
                    }
                    if (el.type === 'text') {
                      return (
                        <text
                          key={el.id}
                          x={el.x}
                          y={el.y}
                          fill={el.color || '#E6007A'}
                          fontSize={el.fontSize || 10}
                          fontWeight={el.fontWeight || 'normal'}
                          fontFamily="monospace"
                        >
                          {el.text}
                        </text>
                      );
                    }
                    if (el.type === 'measure') {
                      return (
                        <g key={el.id} opacity="0.6">
                          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="#3B82F6" strokeWidth="0.8" />
                          <circle cx={el.x1} cy={el.y1} r="1.5" fill="#3B82F6" />
                          <circle cx={el.x2} cy={el.y2} r="1.5" fill="#3B82F6" />
                        </g>
                      );
                    }
                    return null;
                  })}
                </svg>
              ) : (
                /* ─── 3D FOLDED CARTON WIREFRAME PREVIEW ─── */
                <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
                  <div className="text-[10px] font-mono text-slate-400 absolute top-2 left-2">
                    Isometric 3D Folded Simulation ({length}×{width}×{height}mm)
                  </div>

                  {/* 3D Isometric SVG Projection of Box */}
                  <svg viewBox="-180 -140 360 280" className="w-full h-full max-h-[360px]">
                    <defs>
                      <linearGradient id="frontGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#2E1065" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.9" />
                      </linearGradient>
                      <linearGradient id="topGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4C1D95" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#312E81" stopOpacity="0.95" />
                      </linearGradient>
                      <linearGradient id="sideGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
                      </linearGradient>
                    </defs>

                    {/* Scale factors for 3D isometric view */}
                    {(() => {
                      const maxDim = Math.max(length, width, height, 80);
                      const s = 140 / maxDim;
                      const sL = (length * s) * 0.9;
                      const sW = (width * s) * 0.8;
                      const sH = (height * s) * 0.9;

                      // Isometric Projection Coordinates:
                      // Angle 30 degrees: cos(30) = 0.866, sin(30) = 0.5
                      const dxL = sL * 0.866;
                      const dyL = sL * 0.5;

                      const dxW = -sW * 0.866;
                      const dyW = sW * 0.5;

                      const topCenterY = -sH / 2;

                      // Points of Front Panel (Face facing bottom-right):
                      // [0, topCenterY] -> [dxL, topCenterY + dyL] -> [dxL, topCenterY + dyL + sH] -> [0, topCenterY + sH]
                      const pTopCenter = [0, topCenterY];
                      const pTopRight = [dxL, topCenterY + dyL];
                      const pTopLeft = [dxW, topCenterY + dyW];
                      const pTopBack = [dxL + dxW, topCenterY + dyL + dyW];

                      const pBotCenter = [0, topCenterY + sH];
                      const pBotRight = [dxL, topCenterY + dyL + sH];
                      const pBotLeft = [dxW, topCenterY + dyW + sH];

                      return (
                        <g>
                          {/* 1. TOP PANEL (LID) */}
                          <polygon
                            points={`${pTopCenter[0]},${pTopCenter[1]} ${pTopRight[0]},${pTopRight[1]} ${pTopBack[0]},${pTopBack[1]} ${pTopLeft[0]},${pTopLeft[1]}`}
                            fill="url(#topGrad)"
                            stroke="#E6007A"
                            strokeWidth="1.5"
                          />
                          <text
                            x={pTopBack[0] / 2}
                            y={topCenterY + dyW / 2 + 3}
                            fill="#F472B6"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            TOP LID ({length}×{width})
                          </text>

                          {/* 2. SIDE PANEL (LEFT) */}
                          <polygon
                            points={`${pTopCenter[0]},${pTopCenter[1]} ${pTopLeft[0]},${pTopLeft[1]} ${pBotLeft[0]},${pBotLeft[1]} ${pBotCenter[0]},${pBotCenter[1]}`}
                            fill="url(#sideGrad)"
                            stroke="#009EE3"
                            strokeWidth="1.5"
                          />
                          <text
                            x={dxW / 2}
                            y={topCenterY + sH / 2 + dyW / 2}
                            fill="#38BDF8"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            SIDE ({width}×{height})
                          </text>

                          {/* 3. FRONT PANEL (RIGHT) */}
                          <polygon
                            points={`${pTopCenter[0]},${pTopCenter[1]} ${pTopRight[0]},${pTopRight[1]} ${pBotRight[0]},${pBotRight[1]} ${pBotCenter[0]},${pBotCenter[1]}`}
                            fill="url(#frontGrad)"
                            stroke="#E6007A"
                            strokeWidth="2"
                          />
                          <text
                            x={dxL / 2}
                            y={topCenterY + sH / 2 + dyL / 2 - 6}
                            fill="#F43F5E"
                            fontSize="11"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            FRONT PANEL
                          </text>
                          <text
                            x={dxL / 2}
                            y={topCenterY + sH / 2 + dyL / 2 + 10}
                            fill="#CBD5E1"
                            fontSize="8"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {length} × {height} mm
                          </text>

                          {/* Crease score lines on 3D box (Cyan dashed) */}
                          <line
                            x1={pTopCenter[0]}
                            y1={pTopCenter[1]}
                            x2={pBotCenter[0]}
                            y2={pBotCenter[1]}
                            stroke="#009EE3"
                            strokeWidth="2"
                            strokeDasharray="4,3"
                          />
                          <line
                            x1={pTopCenter[0]}
                            y1={pTopCenter[1]}
                            x2={pTopRight[0]}
                            y2={pTopRight[1]}
                            stroke="#009EE3"
                            strokeWidth="1.5"
                            strokeDasharray="4,3"
                          />

                          {/* Front Dimension Labels */}
                          <text
                            x={dxL / 2 + 12}
                            y={topCenterY + sH + dyL / 2 + 16}
                            fill="#E2E8F0"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            L = {length}mm
                          </text>
                          <text
                            x={dxW / 2 - 28}
                            y={topCenterY + sH + dyW / 2 + 16}
                            fill="#E2E8F0"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            W = {width}mm
                          </text>
                          <text
                            x={dxL + 8}
                            y={topCenterY + dyL + sH / 2}
                            fill="#E2E8F0"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            H = {height}mm
                          </text>
                        </g>
                      );
                    })()}
                  </svg>

                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-white/10 mt-2">
                    ✨ Realistic packaging carton assembled from flat dieline
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Bottom Actions Bar ──────────────────────────────────────────── */}
        <div className="p-4 border-t border-white/10 bg-[#0C101A] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="font-bold text-white">{elements.length} keyline elements ready.</span>
            <span>All Bézier curves, creases, glue flaps, and dimensions included.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyDieline(elements, false); // Replace
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all flex-1 sm:flex-initial"
            >
              <Sparkles className="w-4 h-4" />
              <span>Draw Box Keyline on Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
