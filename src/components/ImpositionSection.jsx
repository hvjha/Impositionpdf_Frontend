import React, { useState } from 'react';
import { 
  Grid, 
  Layers, 
  Printer, 
  Sliders, 
  Check, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  RefreshCw,
  Maximize2,
  FileCheck,
  Scissors
} from 'lucide-react';
import { imposePdfJob } from '../services/api';

const SHEET_PRESETS = [
  { name: 'SRA3 (320 × 450 mm)', width: 320, height: 450 },
  { name: 'A3+ (329 × 483 mm)', width: 329, height: 483 },
  { name: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { name: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { name: 'Custom Sheet', width: 350, height: 500 },
];

export default function ImpositionSection({ jobId, onImpositionSuccess, onProceedToOutput }) {
  const [sheetPreset, setSheetPreset] = useState('SRA3 (320 × 450 mm)');
  const [sheetWidth, setSheetWidth] = useState(320);
  const [sheetHeight, setSheetHeight] = useState(450);

  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(2);

  const [gutterX, setGutterX] = useState(3);
  const [gutterY, setGutterY] = useState(3);

  const [marginTop, setMarginTop] = useState(10);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [marginRight, setMarginRight] = useState(10);

  const [bleed, setBleed] = useState(3);
  const [cropMarkLength, setCropMarkLength] = useState(5);
  const [cropMarkOffset, setCropMarkOffset] = useState(3);

  const [workStyle, setWorkStyle] = useState('SIMPLEX');
  const [cropMarks, setCropMarks] = useState(true);
  const [registrationMarks, setRegistrationMarks] = useState(true);
  const [colorBars, setColorBars] = useState(true);
  const [jobSlug, setJobSlug] = useState(true);

  const [imposing, setImposing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSelectSheetPreset = (preset) => {
    setSheetPreset(preset.name);
    setSheetWidth(preset.width);
    setSheetHeight(preset.height);
  };

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
      setError(err.message || 'Failed to execute N-up sheet imposition.');
    } finally {
      setImposing(false);
    }
  };

  const totalPagesPerSheet = columns * rows;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium mb-2">
          <Grid className="w-3.5 h-3.5" /> PHASE 5: N-UP SHEET IMPOSITION STUDIO
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight m-0">
          Press Sheet Layout & Print Marks Engine
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
          Impose multiple artwork pages onto commercial press sheets with precision gutters, sheet margins, bleed, crop mark length & registration targets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Left Column: Sheet & Grid Specs */}
        <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-5 text-left space-y-4">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Maximize2 className="w-4 h-4" /> Press Sheet Preset
          </h4>

          {/* Sheet Presets */}
          <div className="grid grid-cols-1 gap-2">
            {SHEET_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSheetPreset(p)}
                className={`flex items-center justify-between p-2.5 rounded-xl border font-mono text-xs transition-all ${
                  sheetPreset === p.name
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-[#182234] border-[#26354D] text-slate-300 hover:bg-[#1E2B40]'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-slate-400">{p.width}×{p.height}mm</span>
              </button>
            ))}
          </div>

          {/* Custom Sheet Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Sheet Width (mm)</label>
              <input
                type="number"
                value={sheetWidth}
                onChange={(e) => setSheetWidth(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Sheet Height (mm)</label>
              <input
                type="number"
                value={sheetHeight}
                onChange={(e) => setSheetHeight(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Bleed Control */}
          <div className="pt-2 border-t border-[#233045]">
            <label className="text-[11px] font-mono text-cyan-300 block mb-1 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" /> Bleed (mm)
            </label>
            <input
              type="number"
              step="0.5"
              value={bleed}
              onChange={(e) => setBleed(e.target.value)}
              className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Center Column: N-Up Grid & Margins */}
        <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-5 text-left space-y-4">
          <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Grid className="w-4 h-4" /> Grid N-Up & Gutters
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Columns</label>
              <input
                type="number"
                min="1"
                max="10"
                value={columns}
                onChange={(e) => setColumns(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Rows</label>
              <input
                type="number"
                min="1"
                max="10"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">X Gutter (mm)</label>
              <input
                type="number"
                step="0.5"
                value={gutterX}
                onChange={(e) => setGutterX(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Y Gutter (mm)</label>
              <input
                type="number"
                step="0.5"
                value={gutterY}
                onChange={(e) => setGutterY(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Margins Inputs */}
          <div className="pt-2 border-t border-[#233045]">
            <span className="text-[11px] font-mono text-emerald-400 block mb-2 font-bold">Sheet Margins (mm)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Top</label>
                <input
                  type="number"
                  value={marginTop}
                  onChange={(e) => setMarginTop(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Bottom</label>
                <input
                  type="number"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Left</label>
                <input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Right</label>
                <input
                  type="number"
                  value={marginRight}
                  onChange={(e) => setMarginRight(e.target.value)}
                  className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-emerald-400 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#1A2436] border border-[#2A3B56] text-center">
            <span className="text-xs text-slate-400 block font-mono">LAYOUT DENSITY:</span>
            <span className="text-lg font-bold text-cyan-300 font-mono">
              {columns} × {rows} = {totalPagesPerSheet} Up
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Pages per Press Sheet</span>
          </div>
        </div>

        {/* Right Column: Print Marks & Work Style */}
        <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-5 text-left flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Printer className="w-4 h-4" /> Registration Marks & Style
            </h4>

            <div className="space-y-2 mb-4">
              {[
                { label: 'Cut / Crop Marks', state: cropMarks, setState: setCropMarks },
                { label: 'Registration Targets', state: registrationMarks, setState: setRegistrationMarks },
                { label: 'Color Separation Bars', state: colorBars, setState: setColorBars },
                { label: 'Job Metadata / Slug Text', state: jobSlug, setState: setJobSlug },
              ].map((m, idx) => (
                <label key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#182234] border border-[#26354D] cursor-pointer text-xs font-mono">
                  <span className="text-slate-200">{m.label}</span>
                  <input
                    type="checkbox"
                    checked={m.state}
                    onChange={(e) => m.setState(e.target.checked)}
                    className="accent-cyan-400 w-4 h-4"
                  />
                </label>
              ))}
            </div>

            {/* Crop Mark Length & Offset Inputs */}
            {cropMarks && (
              <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-[#182234] rounded-lg border border-[#26354D]">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Mark Length (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cropMarkLength}
                    onChange={(e) => setCropMarkLength(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-indigo-400 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Mark Offset (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cropMarkOffset}
                    onChange={(e) => setCropMarkOffset(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-indigo-400 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Work Style Selection */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Work Style</label>
              <select
                value={workStyle}
                onChange={(e) => setWorkStyle(e.target.value)}
                className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              >
                <option value="SIMPLEX">Simplex (Single-Sided)</option>
                <option value="DUPLEX">Duplex (Double-Sided)</option>
                <option value="WORK_AND_TURN">Work and Turn</option>
                <option value="WORK_AND_TUMBLE">Work and Tumble</option>
                <option value="PERFECTOR">Perfector</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={imposing}
              onClick={handleRunImposition}
              className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
                imposing
                  ? 'bg-[#1C2638] text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20 hover:scale-[1.01]'
              }`}
            >
              {imposing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Imposed Press Sheet...
                </>
              ) : (
                <>
                  <Grid className="w-4 h-4" /> Execute Imposition Engine
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success & Proceed */}
      {result && (
        <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-left flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white m-0">Imposition Sheet Rendered</h4>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                {totalPagesPerSheet}-Up layout generated with registration marks. Output stored in GridFS.
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
