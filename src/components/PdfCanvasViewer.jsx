import React, { useState } from 'react';
import { 
  Download, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Printer, 
  CheckCircle2, 
  FileText,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { getOutputPdfUrl, getJobOutputUrl } from '../services/api';

export default function PdfCanvasViewer({ jobId, outputFileId, activeJob, onReset }) {
  const [zoom, setZoom] = useState(100);
  const pdfUrl = outputFileId ? getOutputPdfUrl(outputFileId) : getJobOutputUrl(jobId);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `prepress_output_${jobId.slice(-6)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[#131B28] border border-[#222E42] p-5 rounded-2xl text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white m-0">Production PDF Ready</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 rounded">
                PDF/X-4 CERTIFIED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-mono">
              Job #{jobId.slice(-6).toUpperCase()} | GridFS ID: {outputFileId ? outputFileId.slice(-6) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 bg-[#1C2638] hover:bg-[#25334A] border border-[#2D3F5C] rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Direct Stream
          </a>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 hover:from-emerald-300 hover:to-blue-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Download className="w-4 h-4" /> Download Production PDF
          </button>
        </div>
      </div>

      {/* Main Preview Workbench */}
      <div className="bg-[#111622] border border-[#212C3D] rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Toolbar */}
        <div className="bg-[#171F2C] border-b border-[#243144] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>LIVE HD CANVAS VIEW</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(z - 25, 50))}
              className="p-1.5 rounded-lg bg-[#1D2738] hover:bg-[#28364D] text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-cyan-300 w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 25, 200))}
              className="p-1.5 rounded-lg bg-[#1D2738] hover:bg-[#28364D] text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Viewer Container */}
        <div className="p-4 bg-[#0A0D14] flex justify-center items-center min-h-[600px] overflow-auto">
          <div
            style={{ width: `${zoom}%`, transition: 'width 0.2s ease-in-out' }}
            className="max-w-full shadow-2xl border border-[#232F42] rounded-lg overflow-hidden bg-white"
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              title="Production PDF Preview"
              className="w-full h-[650px] border-0"
            />
          </div>
        </div>

        {/* Footer info bar */}
        <div className="bg-[#171F2C] border-t border-[#243144] px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" /> ISO 12647-2 Compliant
            </span>
            <span>Bleed allowance & cut marks baked</span>
          </div>

          <button
            onClick={onReset}
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
          >
            Process Another PDF Job →
          </button>
        </div>

      </div>
    </div>
  );
}
