import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  Zap,
  HardDrive,
  FolderArchive,
  Scissors,
  Sparkles,
  Package,
  BookOpen
} from 'lucide-react';
import { uploadPdfFile, analyzePdfJob } from '../services/api';
import ProductAndSheetModal from './ProductAndSheetModal';

export default function UploadSection({ onUploadSuccess, onOpenHistory, onOpenKeylineStudio }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('Fast Ingesting Source PDF...');
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Post-Upload Product & Sheet Wizard Modal State ─────────────────────
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [uploadedJob, setUploadedJob] = useState(null);
  const [uploadedAnalysis, setUploadedAnalysis] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please drop a valid PDF file (.pdf)');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Only PDF files are supported.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgressText('Uploading & Ingesting PDF file...');
    setError(null);

    try {
      const res = await uploadPdfFile(file);
      if (res.success && res.job) {
        setUploadedJob(res.job);

        // Instantly perform preflight analysis to detect finished dimensions
        setUploadProgressText('Inspecting finished dimensions & boxes...');
        let analysisData = null;
        try {
          const analysisRes = await analyzePdfJob(res.job.jobId);
          if (analysisRes?.success && analysisRes?.job?.analysis) {
            analysisData = analysisRes.job.analysis;
            setUploadedAnalysis(analysisData);
          }
        } catch {
          // If analysis has a minor hiccup, proceed gracefully with fallback dimensions
        }

        // Open the user-friendly Product & Sheet Optimizer modal
        setIsSetupModalOpen(true);
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload PDF file to backend.');
    } finally {
      setUploading(false);
    }
  };

  // Called when user selects Book Cover or Box & clicks "Proceed to Imposition"
  const handleProceedFromSetup = (setupOptions) => {
    setIsSetupModalOpen(false);
    if (uploadedJob && file) {
      onUploadSuccess(uploadedJob, file, setupOptions);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-mono font-medium mb-3">
          <Zap className="w-3.5 h-3.5" /> PHASE 1: PRODUCTION PDF INGESTION
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight m-0">
          Upload Source Artwork & Dielines
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
          Upload high-resolution PDF artwork for automated preflight analysis, trim/bleed box extraction, crop correction, and sheet imposition layout.
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragActive
            ? 'border-cyan-400 bg-cyan-950/40 shadow-xl shadow-cyan-500/20 glass-glow-cyan'
            : file
            ? 'border-emerald-500/60 bg-emerald-950/30'
            : 'border-white/10 hover:border-cyan-400/60 glass-panel hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-[#1A2538] border border-[#2B3B57] flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>

        {!file ? (
          <>
            <p className="text-base font-semibold text-slate-200 m-0">
              Drag & drop your PDF file here, or <span className="text-cyan-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Supports single-page & multi-page PDF files up to 2 GB
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 bg-[#1A2436] border border-[#2B3B56] px-4 py-3 rounded-xl max-w-md w-full mb-3 text-left">
              <FileText className="w-8 h-8 text-cyan-400 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate m-0">{file.name}</p>
                <p className="text-xs text-slate-400 m-0 font-mono">{formatBytes(file.size)}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
            <p className="text-xs text-cyan-300 font-medium">
              Click to replace file or proceed with upload below
            </p>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center">
        <button
          disabled={!file || uploading}
          onClick={handleUpload}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg ${
            !file || uploading
              ? 'bg-[#1C2638] text-slate-500 cursor-not-allowed border border-[#2A3952]'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:scale-[1.02] cursor-pointer'
          }`}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{uploadProgressText}</span>
            </>
          ) : (
            <>
              Start Prepress Setup & Optimizer <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-xs tracking-wide glass-card hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer ml-3"
          >
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <span>Browse Archives</span>
          </button>
        )}
      </div>

      {/* Standalone Keyline Designer Callout */}
      {onOpenKeylineStudio && (
        <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-fuchsia-950/40 via-purple-950/30 to-slate-900 border border-fuchsia-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30 shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0 flex items-center gap-2">
                Need to Design a Keyline / Dieline First?
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-600/40">
                  Independent CAD Canvas
                </span>
              </h3>
              <p className="text-xs text-slate-300 m-0 mt-0.5">
                Draw cut & crease rules, add text labels, choose spot colors & fills, drag & resize shapes, and download vector SVG/JSON CAD—or optionally impose when ready.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenKeylineStudio}
            className="px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs font-mono transition-all shadow-md shadow-fuchsia-600/30 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Open Keyline Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        <div className="p-4 rounded-xl glass-card text-left">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1 font-mono">
            <HardDrive className="w-4 h-4" /> INSTANT STORAGE
          </div>
          <p className="text-xs text-slate-400 m-0">
            Streams large PDFs in ~10ms with background cloud synchronization.
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card text-left">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1 font-mono">
            <ShieldCheck className="w-4 h-4" /> PREFLIGHT INSPECTION
          </div>
          <p className="text-xs text-slate-400 m-0">
            Extracts MediaBox, TrimBox, BleedBox, color spaces & embedded fonts.
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card text-left">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1 font-mono">
            <Zap className="w-4 h-4" /> IMPOSITION ENGINE
          </div>
          <p className="text-xs text-slate-400 m-0">
            Auto-calculates N-up grid placement with minimum press sheets (20×28", 20×30") & yield.
          </p>
        </div>
      </div>

      {/* ─── Production Setup & Sheet Yield Optimizer Modal ─────────────── */}
      {isSetupModalOpen && (
        <ProductAndSheetModal
          isOpen={isSetupModalOpen}
          onClose={() => setIsSetupModalOpen(false)}
          file={file}
          job={uploadedJob}
          analysisData={uploadedAnalysis}
          onProceed={handleProceedFromSetup}
        />
      )}
    </div>
  );
}
