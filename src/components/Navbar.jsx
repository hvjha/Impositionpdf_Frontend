import React from 'react';
import { 
  Printer, 
  FolderArchive,
  User,
  LogOut,
  Zap,
  FileText,
  Scissors,
  Layers
} from 'lucide-react';

export default function Navbar({ 
  isBackendOnline, 
  activeJob, 
  user,
  onReset,
  onOpenHistory,
  onLogout,
  onOpenKeylineStudio,
  isKeylineStudioOpen,
  onOpenGangModal
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        
        {/* Brand Logo & Title */}
        <div className="header-brand">
          <div className="header-logo">
            <div className="header-logo-icon">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div className="header-logo-pulse" />
          </div>

          <div>
            <div className="header-brand-title">
              <h1 className="header-title">
                PREPRESS<span className="text-purple-400">AUTO</span>
              </h1>
              <span className="header-version">v2.4</span>
            </div>
            <p className="header-subtitle">
              India, Semi Bold
            </p>
          </div>
        </div>

        {/* Center: Document Info */}
        {activeJob && (
          <div className="header-doc-info">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="header-doc-label">Document:</span>
            <span className="header-doc-name">
              {activeJob.originalFileName || `Job #${activeJob.jobId?.slice(-6).toUpperCase()}`}
            </span>
            <div className="header-divider" />
            <span className={`header-status ${isBackendOnline ? 'online' : 'offline'}`}>
              <span className={`header-status-dot ${isBackendOnline ? 'online' : 'offline'}`} />
              {activeJob.status || 'READY'}
            </span>
          </div>
        )}

        {!activeJob && (
          <div className="header-doc-info">
            <span className="header-doc-label">STATUS:</span>
            <span className={`header-status ${isBackendOnline ? 'online' : 'offline'}`}>
              <span className={`header-status-dot ${isBackendOnline ? 'online' : 'offline'}`} />
              {isBackendOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        )}

        {/* Right Actions */}
        <div className="header-actions">
          {/* Independent Keyline / Dieline Drawing Studio */}
          <button
            type="button"
            onClick={onOpenKeylineStudio}
            className={`header-btn ${isKeylineStudioOpen ? 'border-fuchsia-500/80 bg-fuchsia-950/60 text-fuchsia-300 ring-1 ring-fuchsia-500/40' : 'hover:border-fuchsia-500/40 text-slate-300 hover:text-fuchsia-300'}`}
            title="Open Independent Keyline & Dieline Drawing Studio"
          >
            <Scissors className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="hidden sm:inline">Keyline Studio</span>
          </button>

          {/* Multi-File Gang Run Imposition Studio */}
          <button
            type="button"
            onClick={onOpenGangModal}
            className="header-btn hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300"
            title="Multi-File Gang Run & Combo Sheet Optimizer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Gang Run (2-4 Files)</span>
          </button>

          <button onClick={onOpenHistory} className="header-btn" title="Archives & History">
            <FolderArchive className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Archives</span>
          </button>

          {activeJob && (
            <button onClick={onReset} className="header-btn" title="Start New Job">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Job</span>
            </button>
          )}

          {user && (
            <div className="header-user hidden lg:flex">
              <div className="header-user-avatar">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="header-user-info">
                <div className="header-user-name">{user.username}</div>
                <div className="header-user-role">Operator</div>
              </div>
            </div>
          )}

          <button onClick={onLogout} className="header-btn header-btn-logout" title="Sign out">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
