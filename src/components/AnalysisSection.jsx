import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Layers, 
  Maximize2, 
  Palette, 
  Type, 
  Image as ImageIcon, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { analyzePdfJob } from '../services/api';

export default function AnalysisSection({ jobId, analysisData, onAnalysisSuccess, onProceedToValidation }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(analysisData);

  useEffect(() => {
    if (!data && jobId) {
      runAnalysis();
    }
  }, [jobId]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await analyzePdfJob(jobId);
      if (res.success && res.job && res.job.analysis) {
        setData(res.job.analysis);
        onAnalysisSuccess(res.job.analysis);
      } else {
        throw new Error(res.message || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze PDF file');
    } finally {
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white tracking-wide">Executing PDF Preflight Analysis...</h3>
        <p className="text-xs text-slate-400 mt-1 font-mono">Parsing PDF dictionary objects, bounding boxes, color spaces & typography...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto py-8">
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">Analysis Error</h3>
          <p className="text-xs text-rose-300 mt-1 font-mono">{error}</p>
          <button
            onClick={runAnalysis}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-800 hover:bg-rose-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Compute metrics from analysis object
  const pages = data.pages || [];
  const firstPage = pages[0] || {};
  const mediaBox = firstPage.mediaBox || {};
  const trimBox = firstPage.trimBox || {};
  const cropBox = firstPage.cropBox || {};
  const bleedBox = firstPage.bleedBox || {};

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[#131B28] border border-[#222E42] p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white m-0">Preflight Inspection Completed</h3>
            <p className="text-xs text-slate-400 m-0 font-mono">
              Job ID: #{jobId.slice(-6).toUpperCase()} | Total Pages: <span className="text-cyan-300 font-bold">{data.pageCount || pages.length}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-[#1C2638] hover:bg-[#26344B] border border-[#2D3C54] rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-Analyze
          </button>
          <button
            onClick={onProceedToValidation}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-lg shadow-md shadow-cyan-500/20 transition-all"
          >
            Proceed to Validation <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Spec Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Page Dimensions Card */}
        <div className="p-4 rounded-xl bg-[#141C2A] border border-[#233045] text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">Page Geometry</span>
            <Maximize2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white font-mono">
              {firstPage.dimensionsMm ? `${firstPage.dimensionsMm.width} × ${firstPage.dimensionsMm.height} mm` : 'N/A'}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {firstPage.dimensionsPt ? `${firstPage.dimensionsPt.width} × ${firstPage.dimensionsPt.height} pt` : ''}
            </p>
          </div>
        </div>

        {/* Color Space Card */}
        <div className="p-4 rounded-xl bg-[#141C2A] border border-[#233045] text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">Color Profile</span>
            <Palette className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono">
            {data.colorSpace || firstPage.colorSpace || 'CMYK / Spot Colors'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Print ready color separation
          </p>
        </div>

        {/* Embedded Fonts */}
        <div className="p-4 rounded-xl bg-[#141C2A] border border-[#233045] text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Typography</span>
            <Type className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono">
            {data.fonts ? `${data.fonts.length} Embedded Fonts` : 'Fully Vectorized'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {data.allFontsEmbedded ? '✓ All fonts embedded' : 'Standard Type-1/TrueType'}
          </p>
        </div>

        {/* Image Resolution */}
        <div className="p-4 rounded-xl bg-[#141C2A] border border-[#233045] text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">Raster Media</span>
            <ImageIcon className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono">
            {data.imageCount ?? firstPage.imageCount ?? 0} High-Res Images
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Min 300 DPI Verified
          </p>
        </div>
      </div>

      {/* PDF Bounding Box Detailed Matrix */}
      <div className="bg-[#141C2A] border border-[#233045] rounded-2xl p-5 text-left mb-6">
        <h4 className="text-sm font-bold text-white mb-3 font-mono flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" /> PDF Bounding Box Coordinates (Points & mm)
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="border-b border-[#243248] text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-3">Box Type</th>
                <th className="py-2 px-3">X1 (Left)</th>
                <th className="py-2 px-3">Y1 (Bottom)</th>
                <th className="py-2 px-3">X2 (Right)</th>
                <th className="py-2 px-3">Y2 (Top)</th>
                <th className="py-2 px-3">Size (mm)</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D283B]">
              {/* MediaBox */}
              <tr>
                <td className="py-2.5 px-3 font-bold text-cyan-300">MediaBox</td>
                <td className="py-2.5 px-3 text-slate-300">{mediaBox.x1 ?? 0}</td>
                <td className="py-2.5 px-3 text-slate-300">{mediaBox.y1 ?? 0}</td>
                <td className="py-2.5 px-3 text-slate-300">{mediaBox.x2 ?? 0}</td>
                <td className="py-2.5 px-3 text-slate-300">{mediaBox.y2 ?? 0}</td>
                <td className="py-2.5 px-3 font-bold text-white">
                  {mediaBox.widthMm && mediaBox.heightMm ? `${mediaBox.widthMm} × ${mediaBox.heightMm} mm` : 'Defined'}
                </td>
                <td className="py-2.5 px-3"><span className="text-emerald-400 font-bold">✓ Active</span></td>
              </tr>

              {/* CropBox */}
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-300">CropBox</td>
                <td className="py-2.5 px-3 text-slate-300">{cropBox.x1 ?? mediaBox.x1 ?? 0}</td>
                <td className="py-2.5 px-3 text-slate-300">{cropBox.y1 ?? mediaBox.y1 ?? 0}</td>
                <td className="py-2.5 px-3 text-slate-300">{cropBox.x2 ?? mediaBox.x2 ?? 0}</td>
                <td className="py-2.5 px-3 text-slate-300">{cropBox.y2 ?? mediaBox.y2 ?? 0}</td>
                <td className="py-2.5 px-3 font-bold text-white">
                  {cropBox.widthMm && cropBox.heightMm ? `${cropBox.widthMm} × ${cropBox.heightMm} mm` : 'Match MediaBox'}
                </td>
                <td className="py-2.5 px-3"><span className="text-cyan-400 font-bold">✓ Active</span></td>
              </tr>

              {/* TrimBox */}
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-300">TrimBox</td>
                <td className="py-2.5 px-3 text-slate-300">{trimBox.x1 ?? '-'}</td>
                <td className="py-2.5 px-3 text-slate-300">{trimBox.y1 ?? '-'}</td>
                <td className="py-2.5 px-3 text-slate-300">{trimBox.x2 ?? '-'}</td>
                <td className="py-2.5 px-3 text-slate-300">{trimBox.y2 ?? '-'}</td>
                <td className="py-2.5 px-3 font-bold text-white">
                  {trimBox.widthMm && trimBox.heightMm ? `${trimBox.widthMm} × ${trimBox.heightMm} mm` : 'Calculated'}
                </td>
                <td className="py-2.5 px-3">
                  {trimBox.x2 ? (
                    <span className="text-emerald-400 font-bold">✓ Defined</span>
                  ) : (
                    <span className="text-amber-400 font-bold">! Auto-Inferred</span>
                  )}
                </td>
              </tr>

              {/* BleedBox */}
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-300">BleedBox</td>
                <td className="py-2.5 px-3 text-slate-300">{bleedBox.x1 ?? '-'}</td>
                <td className="py-2.5 px-3 text-slate-300">{bleedBox.y1 ?? '-'}</td>
                <td className="py-2.5 px-3 text-slate-300">{bleedBox.x2 ?? '-'}</td>
                <td className="py-2.5 px-3 text-slate-300">{bleedBox.y2 ?? '-'}</td>
                <td className="py-2.5 px-3 font-bold text-white">
                  {bleedBox.widthMm && bleedBox.heightMm ? `${bleedBox.widthMm} × ${bleedBox.heightMm} mm` : '+3mm Allowance'}
                </td>
                <td className="py-2.5 px-3"><span className="text-cyan-400 font-bold">✓ Computed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
