import React, { useState, useEffect } from 'react';
import { 
  Crop, 
  Maximize2, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  Scissors,
  Box,
  AlertTriangle
} from 'lucide-react';
import { cropPdfJob } from '../services/api';

const PRESETS = [
  { name: 'Business Card (3.5 × 2.0 in)', width: 3.5, height: 2.0, unit: 'inch' },
  { name: 'US Letter Trim (8.0 × 10.5 in)', width: 8.0, height: 10.5, unit: 'inch' },
  { name: 'Photo Card (8.0 × 5.5 in)', width: 8.0, height: 5.5, unit: 'inch' },
  { name: 'A4 Flyer (210 × 297 mm)', width: 210, height: 297, unit: 'mm' },
  { name: 'A5 Booklet (148 × 210 mm)', width: 148, height: 210, unit: 'mm' },
];

export default function CropSection({ jobId, analysisData, onCropSuccess, onProceedToImposition }) {
  const [strategy, setStrategy] = useState('EXPLICIT');
  
  // Bleed Margins (for box strategies)
  const [bleedTop, setBleedTop] = useState(3);
  const [bleedBottom, setBleedBottom] = useState(3);
  const [bleedLeft, setBleedLeft] = useState(3);
  const [BleedRight, setBleedRight] = useState(3);

  // Explicit Crop Rectangle (for EXPLICIT strategy)
  const [rectX, setRectX] = useState(0.25);
  const [rectY, setRectY] = useState(0.25);
  const [rectWidth, setRectWidth] = useState(8);
  const [rectHeight, setRectHeight] = useState(5.5);
  const [rectUnit, setRectUnit] = useState('inch');

  // Source page info
  const [sourceDimensions, setSourceDimensions] = useState(null);
  const [autoDetectedInfo, setAutoDetectedInfo] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState(null);
  const [cropResult, setCropResult] = useState(null);

  // Auto-detect crop rule from analysis data if available
  useEffect(() => {
    if (analysisData && analysisData.pages && analysisData.pages.length > 0) {
      const page1 = analysisData.pages[0];
      const trimBox = page1.trimBox || page1.boxes?.trim;
      const mediaBox = page1.mediaBox || page1.boxes?.media;

      const srcW_pt = page1.source?.widthPt || mediaBox?.width || page1.width || 612;
      const srcH_pt = page1.source?.heightPt || mediaBox?.height || page1.height || 792;
      
      const srcW_in = Number((srcW_pt / 72).toFixed(2));
      const srcH_in = Number((srcH_pt / 72).toFixed(2));

      setSourceDimensions({
        widthPt: srcW_pt,
        heightPt: srcH_pt,
        widthIn: srcW_in,
        heightIn: srcH_in
      });

      if (trimBox && trimBox.width && trimBox.height) {
        const inW = Number((trimBox.width / 72).toFixed(2));
        const inH = Number((trimBox.height / 72).toFixed(2));
        const inX = Number(((trimBox.x || 0) / 72).toFixed(2));
        const inY = Number(((trimBox.y || 0) / 72).toFixed(2));

        // Clamp width & height so (x+w) <= sourceW and (y+h) <= sourceH
        const safeW = Math.min(inW, Math.max(0.5, srcW_in - inX));
        const safeH = Math.min(inH, Math.max(0.5, srcH_in - inY));

        setRectX(inX);
        setRectY(inY);
        setRectWidth(safeW);
        setRectHeight(safeH);
        setRectUnit('inch');
        setAutoDetectedInfo(`TrimBox detected: ${safeW} × ${safeH} in (${trimBox.width.toFixed(1)} × ${trimBox.height.toFixed(1)} pt). Fits source page (${srcW_in} × ${srcH_in} in).`);
      } else if (mediaBox && mediaBox.width && mediaBox.height) {
        const inX = 0.25;
        const inY = 0.25;
        const safeW = Math.max(0.5, Number((srcW_in - 0.5).toFixed(2)));
        const safeH = Math.max(0.5, Number((srcH_in - 0.5).toFixed(2)));

        setRectX(inX);
        setRectY(inY);
        setRectWidth(safeW);
        setRectHeight(safeH);
        setRectUnit('inch');
        setAutoDetectedInfo(`MediaBox detected: ${srcW_in} × ${srcH_in} in. Calculated safe trim (${safeW} × ${safeH} in).`);
      }
    }
  }, [analysisData]);

  // Validation logic to check if target box fits within source page
  const checkBoundsExceeded = () => {
    if (!sourceDimensions || strategy !== 'EXPLICIT') return null;

    let x = parseFloat(rectX || 0);
    let y = parseFloat(rectY || 0);
    let w = parseFloat(rectWidth || 0);
    let h = parseFloat(rectHeight || 0);

    // Convert to points for comparison
    let mult = rectUnit === 'inch' ? 72 : (rectUnit === 'mm' ? (72 / 25.4) : 1);
    let x_pt = x * mult;
    let y_pt = y * mult;
    let w_pt = w * mult;
    let h_pt = h * mult;

    let overflowX = (x_pt + w_pt) > (sourceDimensions.widthPt + 0.01);
    let overflowY = (y_pt + h_pt) > (sourceDimensions.heightPt + 0.01);

    if (overflowX || overflowY) {
      let maxW_in = Number(((sourceDimensions.widthPt - x_pt) / mult).toFixed(2));
      let maxH_in = Number(((sourceDimensions.heightPt - y_pt) / mult).toFixed(2));
      return {
        overflowX,
        overflowY,
        maxW: Math.max(0, maxW_in),
        maxH: Math.max(0, maxH_in)
      };
    }

    return null;
  };

  const boundsWarning = checkBoundsExceeded();

  const handleApplyCrop = async () => {
    setCropping(true);
    setError(null);

    const cropRule = strategy === 'EXPLICIT' ? {
      enabled: true,
      strategy: 'EXPLICIT',
      rectangle: {
        x: parseFloat(rectX || 0),
        y: parseFloat(rectY || 0),
        width: parseFloat(rectWidth || 8),
        height: parseFloat(rectHeight || 5.5),
        unit: rectUnit || 'inch'
      }
    } : {
      enabled: true,
      strategy,
      bleed: {
        top: parseFloat(bleedTop || 0),
        bottom: parseFloat(bleedBottom || 0),
        left: parseFloat(bleedLeft || 0),
        right: parseFloat(BleedRight || 0)
      }
    };

    try {
      const res = await cropPdfJob(jobId, cropRule);
      if (res.success && res.job) {
        setCropResult(res.job.crop || res.job);
        onCropSuccess(res.job);
      } else {
        throw new Error(res.message || 'Crop failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to crop PDF.');
    } finally {
      setCropping(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      {/* Header Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium mb-2">
          <Scissors className="w-3.5 h-3.5" /> PHASE 4: PRECISION CROP & BLEED CORRECTION
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight m-0">
          Crop & Bleed Boundary Engine
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
          Trim excess whitespace or specify explicit coordinate geometry so artwork extends seamlessly to cut boundaries during commercial prepress.
        </p>

        {sourceDimensions && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-blue-950/50 border border-blue-800/50 text-blue-300 text-xs font-mono">
              SOURCE PAGE: {sourceDimensions.widthIn} × {sourceDimensions.heightIn} in ({sourceDimensions.widthPt.toFixed(1)} × {sourceDimensions.heightPt.toFixed(1)} pt)
            </span>
          </div>
        )}

        {autoDetectedInfo && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{autoDetectedInfo}</span>
          </div>
        )}
      </div>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Strategy Column */}
        <div className="md:col-span-2 bg-[#141C2A] border border-[#233045] rounded-2xl p-5 text-left space-y-4">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4" /> Cropping Strategy
          </h4>

          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'EXPLICIT', title: 'Explicit Rectangle Geometry (Auto-Detected / Custom)', desc: 'Applies exact x, y offsets and width/height dimensions with unit selection.' },
              { id: 'TRIM_BOX_PLUS_BLEED', title: 'TrimBox + Bleed Allowance (Recommended)', desc: 'Crops exactly around PDF TrimBox with extra bleed margin.' },
              { id: 'MEDIA_BOX_MINUS_BLEED', title: 'MediaBox Bleed Trimming', desc: 'Trims outer edges from MediaBox to eliminate excess sheet margins.' },
              { id: 'MANUAL_CROPBOX', title: 'Explicit CropBox Geometry', desc: 'Uses PDF CropBox metadata bounds for exact sizing.' },
              { id: 'AUTO_DETECT', title: 'Auto-Detect Artwork Bleeds', desc: 'Scans non-white graphics bounding box to compute ideal trim.' },
            ].map((st) => (
              <label
                key={st.id}
                onClick={() => setStrategy(st.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  strategy === st.id
                    ? 'bg-cyan-950/50 border-cyan-500/60 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-[#182234] border-[#26354D] text-slate-300 hover:bg-[#1F2C42]'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value={st.id}
                  checked={strategy === st.id}
                  onChange={() => setStrategy(st.id)}
                  className="mt-1 accent-cyan-400"
                />
                <div>
                  <p className="text-xs font-bold text-white m-0">{st.title}</p>
                  <p className="text-[11px] text-slate-400 m-0 font-mono mt-0.5">{st.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Preset Buttons */}
          <div className="pt-2 border-t border-[#233045]">
            <span className="text-[11px] font-mono text-slate-400 block mb-2 font-bold font-mono">Size Presets (Auto-Fitted)</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setStrategy('EXPLICIT');
                    setRectUnit(p.unit);
                    setRectX(0.25);
                    setRectY(0.25);
                    if (sourceDimensions) {
                      let srcW = p.unit === 'inch' ? sourceDimensions.widthIn : (sourceDimensions.widthPt * 25.4 / 72);
                      let srcH = p.unit === 'inch' ? sourceDimensions.heightIn : (sourceDimensions.heightPt * 25.4 / 72);
                      setRectWidth(Math.min(p.width, Number((srcW - 0.25).toFixed(2))));
                      setRectHeight(Math.min(p.height, Number((srcH - 0.25).toFixed(2))));
                    } else {
                      setRectWidth(p.width);
                      setRectHeight(p.height);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono bg-[#1C273A] hover:bg-[#273752] text-slate-300 border border-[#2B3C57] rounded-lg transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Controls Column: Explicit Geometry OR Bleed Margins */}
        <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-5 text-left flex flex-col justify-between">
          {strategy === 'EXPLICIT' ? (
            <div>
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Box className="w-4 h-4" /> Explicit Rectangle Bounds
              </h4>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Measurement Unit</label>
                  <select
                    value={rectUnit}
                    onChange={(e) => setRectUnit(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  >
                    <option value="inch">Inches (in)</option>
                    <option value="mm">Millimeters (mm)</option>
                    <option value="pt">Points (pt)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">X Offset ({rectUnit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rectX}
                      onChange={(e) => setRectX(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Y Offset ({rectUnit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rectY}
                      onChange={(e) => setRectY(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Width ({rectUnit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rectWidth}
                      onChange={(e) => setRectWidth(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Height ({rectUnit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rectHeight}
                      onChange={(e) => setRectHeight(e.target.value)}
                      className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Overflow warning banner */}
              {boundsWarning && (
                <div className="p-3 mb-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Boundaries Exceeded
                  </div>
                  Target rectangle exceeds source page height/width.
                  <button
                    onClick={() => {
                      if (boundsWarning.maxW > 0) setRectWidth(boundsWarning.maxW);
                      if (boundsWarning.maxH > 0) setRectHeight(boundsWarning.maxH);
                    }}
                    className="mt-1.5 block w-full py-1 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-center transition-colors"
                  >
                    Auto-Fit to Safe Limits ({boundsWarning.maxW} × {boundsWarning.maxH} {rectUnit})
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#1A2436] border border-[#2A3B56] text-[11px] text-slate-300 font-mono">
                <span className="text-cyan-400 font-bold block mb-1">TARGET CROP BOX:</span>
                Offset: ({rectX}, {rectY}) {rectUnit}
                <br />
                Dimensions: {rectWidth} × {rectHeight} {rectUnit}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Crop className="w-4 h-4" /> Bleed Margins (mm)
              </h4>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Top Bleed</label>
                  <input
                    type="number"
                    step="0.5"
                    value={bleedTop}
                    onChange={(e) => setBleedTop(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Bottom Bleed</label>
                  <input
                    type="number"
                    step="0.5"
                    value={bleedBottom}
                    onChange={(e) => setBleedBottom(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Left Bleed</label>
                  <input
                    type="number"
                    step="0.5"
                    value={bleedLeft}
                    onChange={(e) => setBleedLeft(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Right Bleed</label>
                  <input
                    type="number"
                    step="0.5"
                    value={BleedRight}
                    onChange={(e) => setBleedRight(e.target.value)}
                    className="w-full bg-[#1A2436] border border-[#2B3C57] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1A2436] border border-[#2A3B56] text-[11px] text-slate-300 font-mono">
                <span className="text-cyan-400 font-bold block mb-1">BLEED TOTAL:</span>
                +{parseFloat(bleedLeft) + parseFloat(BleedRight)} mm Width allowance
                <br />
                +{parseFloat(bleedTop) + parseFloat(bleedBottom)} mm Height allowance
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              disabled={cropping}
              onClick={handleApplyCrop}
              className={`w-full py-3 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
                cropping
                  ? 'bg-[#1C2638] text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
              }`}
            >
              {cropping ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing Crop Engine...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" /> Apply Precision Crop
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Crop Result Summary & Next Button */}
      {cropResult && (
        <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-left flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white m-0">PDF Cropped Successfully</h4>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Output generated and stored in GridFS. Ready for sheet imposition layout.
              </p>
            </div>
          </div>

          <button
            onClick={onProceedToImposition}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
          >
            Proceed to Imposition Engine <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
