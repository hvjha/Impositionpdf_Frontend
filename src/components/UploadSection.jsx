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
  FolderArchive
} from 'lucide-react';
import { uploadPdfFile } from '../services/api';

export default function UploadSection({ onUploadSuccess, onOpenHistory }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
    setError(null);

    try {
      const res = await uploadPdfFile(file);
      if (res.success && res.job) {
        onUploadSuccess(res.job, file);
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload PDF file to backend.');
    } finally {
      setUploading(false);
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
            ? 'border-cyan-400 bg-cyan-950/30 shadow-xl shadow-cyan-500/10'
            : file
            ? 'border-emerald-500/60 bg-emerald-950/20'
            : 'border-[#29364C] hover:border-cyan-500/60 bg-[#121926]/80 hover:bg-[#162030]'
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
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:scale-[1.02]'
          }`}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Fast Ingesting Source PDF...
            </>
          ) : (
            <>
              Start Prepress Analysis <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-xs tracking-wide bg-[#151D2A] hover:bg-[#1D2738] text-slate-300 hover:text-white border border-[#27364D] transition-all cursor-pointer"
          >
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <span>Browse Previous Uploads & Impositions</span>
          </button>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        <div className="p-4 rounded-xl bg-[#131B28] border border-[#222E42] text-left">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1 font-mono">
            <HardDrive className="w-4 h-4" /> GRIDFS STORAGE
          </div>
          <p className="text-xs text-slate-400 m-0">
            Streams large PDFs directly into MongoDB GridFS without memory bottlenecks.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#131B28] border border-[#222E42] text-left">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1 font-mono">
            <ShieldCheck className="w-4 h-4" /> PREFLIGHT INSPECTION
          </div>
          <p className="text-xs text-slate-400 m-0">
            Extracts MediaBox, TrimBox, BleedBox, color spaces & embedded font schemas.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#131B28] border border-[#222E42] text-left">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1 font-mono">
            <Zap className="w-4 h-4" /> IMPOSITION ENGINE
          </div>
          <p className="text-xs text-slate-400 m-0">
            Auto-calculates N-up grid placement with cut marks, registration targets & color bars.
          </p>
        </div>
      </div>
    </div>
  );
}
