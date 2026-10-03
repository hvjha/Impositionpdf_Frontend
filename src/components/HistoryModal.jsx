import React, { useState, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  Layers, 
  Download, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sliders, 
  Printer, 
  Sparkles,
  Compass,
  FileCheck
} from 'lucide-react';
import { getJobHistory, getJobDetails, deleteJob, getSourcePdfUrl, getOutputPdfUrl } from '../services/api';

export default function HistoryModal({ isOpen, onClose, onLoadJob, onInspectOutput, onReimposeJob }) {
  const [uploadHistory, setUploadHistory] = useState([]);
  const [outputHistory, setOutputHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobHistory();
      if (data.success) {
        setUploadHistory(data.uploadHistory || []);
        setOutputHistory(data.outputHistory || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load job history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle Load Uploaded Job
  const handleLoadUploadedJob = async (jobId) => {
    setActionLoadingId(jobId);
    try {
      const res = await getJobDetails(jobId);
      if (res.success && res.job) {
        onLoadJob(res.job);
        onClose();
      }
    } catch (err) {
      alert(`Could not load job: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Job
  const handleDeleteJob = async (jobId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}" and all associated files?`)) {
      return;
    }
    setActionLoadingId(jobId);
    try {
      await deleteJob(jobId);
      await fetchHistory();
    } catch (err) {
      alert(`Failed to delete job: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter histories by search query
  const filteredUploads = uploadHistory.filter((item) => 
    item.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.jobId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOutputs = outputHistory.filter((item) => 
    item.outputFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.bindingStyle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.jobId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-7xl max-h-[92vh] bg-[#0C1017] border border-[#243144] rounded-2xl flex flex-col shadow-2xl shadow-black overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#1E293B] bg-[#0F141F] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight m-0">
                  Prepress Production Archives
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded">
                  Dual History
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">
                Left: Upload History • Right: Output Imposition History
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs & files..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#141B26] border border-[#273549] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-2 rounded-lg bg-[#141B26] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#273549] transition-all"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#141B26] hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-[#273549] hover:border-rose-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Split Content Viewport */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B] overflow-hidden">
          
          {/* ═════════════════════════════════════════════════════════════════
           * LEFT COLUMN: UPLOAD HISTORY
           * ═════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col h-full overflow-hidden bg-[#0A0E15]">
            {/* Column Header */}
            <div className="px-5 py-3 bg-[#0D121C] border-b border-[#1A2433] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <UploadCloud className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase m-0">
                  Upload History
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50 rounded-full">
                {filteredUploads.length} {filteredUploads.length === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredUploads.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <UploadCloud className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">No upload history found</p>
                  <p className="text-xs text-slate-500 mt-1">Upload a PDF to see it archived here</p>
                </div>
              ) : (
                filteredUploads.map((item) => (
                  <div
                    key={item.jobId}
                    className="p-3.5 rounded-xl bg-[#111722] hover:bg-[#151D2A] border border-[#212E40] hover:border-cyan-800/60 transition-all flex flex-col gap-2.5 group"
                  >
                    {/* Top Row: File Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/50 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors m-0" title={item.originalFileName}>
                            {item.originalFileName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                            <span>{formatBytes(item.fileSize)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border shrink-0 ${
                        item.status === 'COMPLETED' 
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                          : item.status === 'VALIDATED' || item.status === 'ANALYZED'
                          ? 'bg-blue-950/70 text-blue-300 border-blue-800/60'
                          : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Meta Specs (Page count, dimensions) */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                      {item.pageCount && (
                        <span className="px-2 py-0.5 bg-[#172030] text-slate-300 rounded border border-[#24334A]">
                          📄 {item.pageCount} Pages
                        </span>
                      )}
                      {item.dimensions && (
                        <span className="px-2 py-0.5 bg-[#172030] text-slate-300 rounded border border-[#24334A]">
                          📐 {item.dimensions}
                        </span>
                      )}
                      <span className="text-slate-500 font-mono text-[10px]">
                        ID: #{item.jobId.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1C2637]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLoadUploadedJob(item.jobId)}
                          disabled={actionLoadingId === item.jobId}
                          className="px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-850 border border-cyan-800/70 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span>Load in Studio</span>
                        </button>

                        <a
                          href={getSourcePdfUrl(item.jobId)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-[#17212E] hover:bg-[#202C3D] border border-[#26364A] rounded-lg flex items-center gap-1.5 transition-all"
                          title="Download original uploaded source PDF"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>Source</span>
                        </a>
                      </div>

                      <button
                        onClick={() => handleDeleteJob(item.jobId, item.originalFileName)}
                        disabled={actionLoadingId === item.jobId}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                        title="Delete this job from archives"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
           * RIGHT COLUMN: OUTPUT HISTORY
           * ═════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col h-full overflow-hidden bg-[#0A0E15]">
            {/* Column Header */}
            <div className="px-5 py-3 bg-[#0D121C] border-b border-[#1A2433] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase m-0">
                  Output History (Imposed PDFs)
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/50 rounded-full">
                {filteredOutputs.length} {filteredOutputs.length === 1 ? 'Imposition' : 'Impositions'}
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredOutputs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Layers className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">No output imposition history found</p>
                  <p className="text-xs text-slate-500 mt-1">Run Imposition on any PDF to generate output sheets</p>
                </div>
              ) : (
                filteredOutputs.map((item) => (
                  <div
                    key={item.outputFileId || item.jobId}
                    className="p-3.5 rounded-xl bg-[#111722] hover:bg-[#151D2A] border border-[#212E40] hover:border-indigo-800/60 transition-all flex flex-col gap-2.5 group"
                  >
                    {/* Top Row: File Name & Imposition Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Layers className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors m-0" title={item.outputFileName}>
                            {item.outputFileName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                            <span>From: {item.originalFileName}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded uppercase shrink-0">
                        {item.layoutPages}PP Ready
                      </span>
                    </div>

                    {/* Prepress Imposition Specs Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-[#172030] text-indigo-300 rounded border border-[#273750] font-semibold">
                        📑 {item.layoutPages}PP Section
                      </span>
                      <span className="px-2 py-0.5 bg-[#172030] text-slate-300 rounded border border-[#273750]">
                        📚 {item.bindingStyle.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 bg-[#172030] text-slate-300 rounded border border-[#273750]">
                        🖨️ {item.sheetWidth} × {item.sheetHeight} {item.sheetUnit}
                      </span>
                      <span className="px-2 py-0.5 bg-cyan-950/70 text-cyan-300 rounded border border-cyan-800/50">
                        🧭 {item.pageOrientation || 'AUTO'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1C2637]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (onInspectOutput) {
                              onInspectOutput(item);
                              onClose();
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/70 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Inspect in Viewer</span>
                        </button>

                        <a
                          href={getOutputPdfUrl(item.outputFileId)}
                          target="_blank"
                          rel="noreferrer"
                          download={item.outputFileName}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-[#17212E] hover:bg-[#202C3D] border border-[#26364A] rounded-lg flex items-center gap-1.5 transition-all"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>Download Imposed</span>
                        </a>
                      </div>

                      {onReimposeJob && (
                        <button
                          onClick={() => {
                            onReimposeJob(item);
                            onClose();
                          }}
                          className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                          title="Open in Imposition Studio to adjust layout"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Re-impose</span>
                        </button>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3 bg-[#0A0E16] border-t border-[#1A2433] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Storage Engine: MongoDB GridFS (2GB Max Object)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#141B26] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#273549] text-xs font-semibold transition-all cursor-pointer"
          >
            Close Archives
          </button>
        </div>

      </div>
    </div>
  );
}
