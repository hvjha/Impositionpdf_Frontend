import React from 'react';
import { 
  Printer, 
  Activity, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Navbar({ isBackendOnline, activeJob, currentStep, onReset }) {
  return (
    <header className="sticky top-0 z-50 bg-[#0F141C]/90 backdrop-blur-md border-b border-[#242F42] px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0F141C] rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0">
                PREPRESS<span className="text-cyan-400">STUDIO</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 rounded-md">
                v2.4 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 font-medium">
              Automated Print Workflow & Imposition Engine
            </p>
          </div>
        </div>

        {/* Center Active Job & Status */}
        <div className="hidden md:flex items-center gap-4 bg-[#161D2A] border border-[#2A374D] px-4 py-1.5 rounded-full text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">STATUS:</span>
            {isBackendOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                ONLINE (PORT 8000)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                BACKEND DISCONNECTED
              </span>
            )}
          </div>

          {activeJob && (
            <>
              <div className="w-px h-3.5 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400">JOB ID:</span>
                <span className="text-cyan-300 font-bold tracking-wider">
                  #{activeJob.jobId ? activeJob.jobId.slice(-6).toUpperCase() : 'N/A'}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-sans font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded">
                  {activeJob.status || 'READY'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {activeJob && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1A2332] hover:bg-[#253247] border border-[#2D3C54] rounded-lg transition-all"
              title="Start New Job"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              New Job
            </button>
          )}

          <div className="flex items-center gap-2 bg-[#131A26] border border-[#243144] px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            PDF/X-4 Ready
          </div>
        </div>

      </div>
    </header>
  );
}
