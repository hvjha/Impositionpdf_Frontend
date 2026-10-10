import React from 'react';
import { 
  UploadCloud, 
  Search, 
  CheckCircle2, 
  Crop, 
  Grid, 
  Download,
  Settings,
  ChevronRight
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Upload PDF', icon: UploadCloud, desc: 'Source Ingestion' },
  { id: 2, title: 'Analysis', icon: Search, desc: 'Box Specs & Fonts' },
  { id: 3, title: 'Preflight', icon: CheckCircle2, desc: 'Validation & Checks' },
  { id: 4, title: 'Crop & Bleed', icon: Crop, desc: 'Trim & Margins' },
  { id: 5, title: 'Imposition', icon: Grid, desc: 'N-Up Grid & Marks' },
  { id: 6, title: 'Production PDF', icon: Download, desc: 'High-Res Output' },
];

export default function WorkflowSteps({ currentStep, setStep, maxAllowedStep, isCollapsed = false }) {
  return (
    <nav className="sidebar-nav flex flex-col h-full">
      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-1 py-3 px-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = step.id <= maxAllowedStep;

          return (
            <button
              key={step.id}
              disabled={!isClickable}
              onClick={() => setStep(step.id)}
              className={`sidebar-nav-item group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                isActive
                  ? 'sidebar-nav-active'
                  : isCompleted
                  ? 'sidebar-nav-completed'
                  : 'sidebar-nav-disabled'
              }`}
              title={step.desc}
            >
              <div
                className={`sidebar-nav-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                    : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold font-mono text-slate-500">0{step.id}</span>
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? 'text-purple-300'
                          : isCompleted
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    {step.desc}
                  </span>
                </div>
              )}

              {!isCollapsed && isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-purple-400 ml-auto shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Settings at bottom */}
      <div className="px-2 pb-3 border-t border-white/[0.06] pt-3 mt-auto">
        <button
          className="sidebar-nav-item flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer hover:bg-white/[0.04]"
          title="Settings"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] text-slate-500 border border-white/[0.06]">
            <Settings className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <span className="text-xs font-bold text-slate-400">Settings</span>
          )}
        </button>
      </div>
    </nav>
  );
}
