import React from "react";
import { Layers, ChevronRight, Activity } from "lucide-react";

export default function StackFrames({
  scopes,
  selectedFrameIndex,
  setSelectedFrameIndex,
}) {
  if (!scopes || scopes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-500 select-none">
        <span className="text-xs italic font-medium opacity-65">No active execution scopes</span>
      </div>
    );
  }

  // Reverse list order (global scope at bottom, newest call frames at the top)
  const frames = scopes
    .map((scope, index) => ({ ...scope, index }))
    .reverse();

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden min-h-0">
      {/* Card Header Title */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-white/5 flex-none select-none">
        <div className="flex items-center gap-1.5">
          <Layers size={13} className="text-blue-400" />
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
            Active Scopes
          </span>
        </div>
        <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-bold">
          Depth: {scopes.length - 1}
        </span>
      </div>
      
      {/* Stack Cards Area */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 min-h-0">
        {frames.map((frame) => {
          const isActive = frame.index === selectedFrameIndex;
          const isGlobal = frame.name === "<module>";
          const frameLabel = isGlobal ? "global scope" : `${frame.name}()`;
          const isNewest = frame.index === scopes.length - 1;

          return (
            <button
              key={frame.index}
              onClick={() => setSelectedFrameIndex(frame.index)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left font-mono transition-all duration-300 relative overflow-hidden group ${
                isActive
                  ? "bg-blue-600/10 border-blue-500/50 shadow-glow-blue"
                  : "bg-dark-800/20 border-white/5 hover:border-white/10 text-gray-400 hover:text-gray-200 hover:bg-dark-800/40"
              }`}
            >
              {/* Stack Card Details */}
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="relative">
                  <span
                    className={`w-2 h-2 rounded-full block ${
                      isGlobal ? "bg-emerald-500" : "bg-indigo-400"
                    }`}
                  />
                  {isNewest && (
                    <span className="absolute top-0 left-0 w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                  )}
                </div>
                
                <span
                  className={`text-xs font-bold truncate ${
                    isActive ? "text-blue-300" : "text-gray-300 group-hover:text-gray-100"
                  }`}
                >
                  {frameLabel}
                </span>
              </div>
              
              {/* Line and State Badges */}
              <div className="flex items-center gap-2 shrink-0 select-none">
                <span className="text-[9px] bg-dark-950/80 text-gray-500 px-2 py-0.5 rounded-md border border-white/5">
                  line {frame.line}
                </span>
                
                {isNewest && (
                  <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Activity size={8} className="animate-pulse" />
                    <span>Exec</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
