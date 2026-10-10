import React from 'react';
import { 
  Printer, 
  ShieldCheck, 
  Zap,
  FolderArchive,
  User,
  LogOut,
  Layers,
  UploadCloud
} from 'lucide-react';

export default function Navbar({ 
  isBackendOnline, 
  activeJob, 
  user,
  onReset,
  onOpenHistory,
  onLogout 
}) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 sm:px-6 py-2.5 backdrop-blur-xl">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0F141C] rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white m-0">
                PREPRESS<span className="text-cyan-400">STUDIO</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 rounded-md">
                v2.4 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 font-medium hidden sm:block">
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

        {/* Right Actions: History, User Profile, Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Dual History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-[#1A2332] hover:bg-[#253247] border border-[#2D3C54] hover:border-cyan-500/50 rounded-lg transition-all cursor-pointer shadow-sm"
            title="Open Upload History & Output Imposition History"
          >
            <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Archives & History</span>
            <span className="sm:hidden">Archives</span>
          </button>

          {/* New Job Reset */}
          {activeJob && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1A2332] hover:bg-[#253247] border border-[#2D3C54] rounded-lg transition-all"
              title="Start New Job"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Job</span>
            </button>
          )}

          {/* User Profile Badge */}
          {user && (
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#243144]">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-300">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left font-mono">
                <div className="text-xs font-bold text-slate-200 leading-tight">
                  {user.username}
                </div>
                <div className="text-[10px] text-cyan-400 leading-tight">
                  Operator
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#191C24] hover:bg-rose-950/60 border border-[#293242] hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Sign out of station"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>

      </div>
    </header>
  );
}
