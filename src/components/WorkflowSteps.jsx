import React from 'react';
import { 
  UploadCloud, 
  Search, 
  CheckCircle2, 
  Crop, 
  Grid, 
  Download,
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

export default function WorkflowSteps({ currentStep, setStep, maxAllowedStep }) {
  return (
    <div className="w-full bg-[#111622] border-b border-[#212C3D] py-3 px-6 overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[700px]">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = step.id <= maxAllowedStep;

          return (
            <React.Fragment key={step.id}>
              <button
                disabled={!isClickable}
                onClick={() => setStep(step.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : isCompleted
                    ? 'bg-[#182130] hover:bg-[#202B3F] border border-[#2B3B54] text-slate-200'
                    : 'bg-[#121824]/60 border border-transparent text-slate-500 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#1C2536] text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold font-mono text-slate-400">0{step.id}</span>
                    <span
                      className={`text-xs font-bold ${
                        isActive
                          ? 'text-cyan-300'
                          : isCompleted
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {step.desc}
                  </span>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
