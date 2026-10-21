import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  Eye,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getOutputPdfUrl, getJobOutputUrl } from '../services/api';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export default function PdfCanvasViewer({ jobId, outputFileId, activeJob, onReset }) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetDetails, setSheetDetails] = useState({ width: 0, height: 0 });
  const [localBlobUrl, setLocalBlobUrl] = useState(null);
  const [viewMode, setViewMode] = useState('NATIVE'); // 'NATIVE' | 'CANVAS'

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Determine stream URL
  const pdfUrl = outputFileId ? getOutputPdfUrl(outputFileId) : (jobId ? getJobOutputUrl(jobId) : null);

  // Load the PDF document via robust fetch arrayBuffer to avoid Web Worker cross-origin/stream errors
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      if (!pdfUrl) {
        setLoading(false);
        setError('No production output file identifier was received. Please generate imposition.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch raw binary buffer directly in main window thread
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status} ${response.statusText || 'Error'} while fetching imposed PDF.`);
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        if (!buffer || buffer.byteLength === 0) {
          throw new Error('Imposed PDF document is empty (0 bytes).');
        }

        // Create a local Object URL for instant browser rendering & download fallback
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setLocalBlobUrl(objectUrl);

        // Load into PDF.js via raw Uint8Array so worker NEVER needs to perform network requests
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          disableRange: true,
          disableStream: true,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);

        // Extract first page size
        try {
          const firstPage = await pdf.getPage(1);
          setSheetDetails({
            width: Math.round(firstPage.view[2] * 0.352778),
            height: Math.round(firstPage.view[3] * 0.352778),
          });
        } catch { }

      } catch (err) {
        if (!cancelled) {
          console.error('[PdfCanvasViewer] Error loading output PDF:', err);
          setError(err.message || 'Failed to render imposed PDF preview.');
          // Auto-fallback to native embedded preview if localBlobUrl was created
          setViewMode('NATIVE');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch { }
      }
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [pdfUrl]);

  // Render current page onto HTML5 canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDocRef.current || !canvasRef.current || viewMode !== 'CANVAS') return;

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch { }
      }

      const page = await pdfDocRef.current.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const pageWidthPt = (page.view && page.view[2]) || 1000;
      const targetDisplayWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - 140, 1100) : 1000;
      const fitScale = targetDisplayWidth / Math.max(100, pageWidthPt);
      const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
      const baseScale = (zoom / 100) * fitScale;
      const viewport = page.getViewport({ scale: baseScale * pixelRatio });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

      setSheetDetails({
        width: Math.round(page.view[2] * 0.352778),
        height: Math.round(page.view[3] * 0.352778),
      });

      // Clear with white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.warn('[PdfCanvasViewer] Render error:', err);
      }
    }
  }, [currentPage, zoom, viewMode]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = localBlobUrl || pdfUrl;
    link.download = `prepress_imposed_sheet_${jobId ? jobId.slice(-6) : 'output'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4">

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[#131B28] border border-[#222E42] p-5 rounded-2xl text-left shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white m-0">Imposition Sheet Generated</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 rounded">
                PDF/X-4 READY
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60 rounded">
                {(activeJob?.config?.boxConfig?.gutterX === 0 || activeJob?.config?.gutter?.horizontal === 0) ? 'ZERO GAPS (BUTT-CUT)' : (activeJob?.config?.boxConfig?.gutterX ? `${activeJob.config.boxConfig.gutterX} MM DIE GAP` : 'ZERO GAPS (BUTT-CUT)')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-mono">
              Job #{jobId ? jobId.slice(-6).toUpperCase() : 'N/A'} | Output ID: {outputFileId ? outputFileId.slice(-6) : 'N/A'}
              {sheetDetails.width > 0 && ` | Sheet: ${sheetDetails.width} × ${sheetDetails.height} mm`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <a
            href={localBlobUrl || pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 bg-[#1C2638] hover:bg-[#25334A] border border-[#2D3F5C] rounded-xl transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
          </a>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 hover:from-emerald-300 hover:to-blue-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" /> Download Production PDF
          </button>
        </div>
      </div>

      {/* Main Preview Workbench */}
      <div className="bg-[#111622] border border-[#212C3D] rounded-2xl overflow-hidden shadow-2xl">

        {/* Toolbar */}
        <div className="bg-[#171F2C] border-b border-[#243144] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">

          {/* Left: View Mode Selector & Status */}
          <div className="flex items-center gap-3 text-xs font-mono text-slate-300 flex-wrap">
            <div className="flex items-center bg-[#0D121B] border border-[#233144] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('CANVAS')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'CANVAS'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>HD Canvas View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('NATIVE')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'NATIVE'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Native PDF Viewer</span>
              </button>
            </div>

            {totalPages > 1 && viewMode === 'CANVAS' && (
              <div className="flex items-center gap-1.5 bg-[#0D121B] border border-[#233144] rounded-lg px-2 py-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous Sheet Side"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-cyan-300 font-bold px-1">
                  Sheet Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next Sheet Side"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Zoom controls for canvas view */}
          {viewMode === 'CANVAS' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(z - 25, 25))}
                className="p-1.5 rounded-lg bg-[#1D2738] hover:bg-[#28364D] text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-cyan-300 w-12 text-center font-bold">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 25, 200))}
                className="p-1.5 rounded-lg bg-[#1D2738] hover:bg-[#28364D] text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="px-2 py-1 text-[10px] font-mono rounded bg-[#1D2738] hover:bg-[#28364D] text-slate-300 border border-[#2E3E58] transition-colors"
                title="Reset Zoom"
              >
                100%
              </button>
            </div>
          )}
        </div>

        {/* Viewport Container */}
        <div className="p-4 sm:p-6 bg-[#0A0D14] flex justify-center items-center min-h-[640px] overflow-auto relative">

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0D14]/90 z-20 gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-slate-300">Rendering production sheet canvas...</p>
            </div>
          )}

          {/* MODE 1: HTML5 Canvas */}
          {viewMode === 'CANVAS' && !error && (
            <div className="shadow-2xl rounded-sm border border-[#333] bg-white transition-transform overflow-auto max-w-full">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>
          )}

          {/* MODE 2 or FALLBACK: Embedded Native PDF Document View */}
          {(viewMode === 'NATIVE' || error) && (
            <div className="w-full h-[700px] rounded-xl overflow-hidden border border-[#222E42] bg-[#141C2A]">
              {localBlobUrl || pdfUrl ? (
                <iframe
                  src={`${localBlobUrl || pdfUrl}#toolbar=1&navpanes=0`}
                  title="Imposed PDF Output Preview"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-sm font-bold text-rose-300 mb-2">Imposed PDF Output Not Found</p>
                  <p className="text-xs font-mono text-slate-400 mb-4">{error || 'Please run imposition in Step 05 to generate the production sheet.'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sheet side switcher tabs */}
        {totalPages > 1 && viewMode === 'CANVAS' && (
          <div className="bg-[#131A26] border-t border-[#1F2A3A] px-4 py-2 flex items-center justify-center gap-2 overflow-x-auto">
            {Array.from({ length: totalPages }, (_, i) => {
              const sheetNum = Math.floor(i / 2) + 1;
              const sideLabel = i % 2 === 0 ? 'FRONT' : 'BACK';
              const isSelected = currentPage === i + 1;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer ${isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                      : 'bg-[#182130] border-[#29384E] text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Sheet {sheetNum} ({sideLabel})
                </button>
              );
            })}
          </div>
        )}

        {/* Footer info bar */}
        <div className="bg-[#171F2C] border-t border-[#243144] px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" /> ISO 12647-2 Compliant
            </span>
            <span>{(activeJob?.config?.boxConfig?.gutterX === 0 || activeJob?.config?.gutter?.horizontal === 0) ? 'Zero gap (butt-cut tight CAD pack) between adjacent cartons baked' : (activeJob?.config?.boxConfig?.gutterX ? `Strict ${activeJob.config.boxConfig.gutterX} mm die gap between adjacent objects baked` : 'Zero gap (butt-cut tight CAD pack) between adjacent cartons baked')}</span>
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
