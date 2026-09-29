import React, { useState } from 'react';
import { Terminal, ChevronUp, ChevronDown, Activity, CheckCircle, Database } from 'lucide-react';

export default function ConsoleDrawer({ logs }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E131D]/95 backdrop-blur-md border-t border-[#232E40] transition-all">
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-2 flex items-center justify-between cursor-pointer hover:bg-[#151D2C] transition-colors select-none"
      >
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Terminal className="w-4 h-4" />
            <span>PREPRESS CONSOLE LOGS</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>GridFS Storage: Connected</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{logs.length} events logged</span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronUp className="w-4 h-4 text-cyan-400" />}
        </div>
      </div>

      {/* Drawer content */}
      {isOpen && (
        <div className="h-48 px-6 py-3 bg-[#0B0E16] overflow-y-auto font-mono text-[11px] space-y-1 text-left border-t border-[#1C2636]">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No events logged yet. Upload a PDF file to begin tracking...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start gap-3 py-0.5">
                <span className="text-slate-600 shrink-0">[{log.time}]</span>
                <span className={`shrink-0 font-bold ${
                  log.type === 'SUCCESS' ? 'text-emerald-400' :
                  log.type === 'ERROR' ? 'text-rose-400' :
                  log.type === 'WARN' ? 'text-amber-400' :
                  'text-cyan-400'
                }`}>
                  [{log.type}]
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
