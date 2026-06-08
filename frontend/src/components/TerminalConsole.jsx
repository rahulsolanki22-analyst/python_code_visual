import React, { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export default function TerminalConsole({ stdout }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [stdout]);

  return (
    <div className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3 font-mono text-xs text-slate-300 select-none shadow-sm flex-none">
      <div className="flex items-center gap-1.5 text-emerald-400 font-bold select-none shrink-0 border-r border-white/5 pr-3">
        <Terminal size={16} className="animate-pulse" />
        <span>stdout</span>
      </div>
      <div className="flex-1 overflow-x-auto whitespace-nowrap overflow-y-hidden text-emerald-300 font-medium scrollbar-hide py-0.5">
        {stdout ? (
          <span className="select-text">
            {stdout.replace(/\n$/, "").replace(/\n/g, " | ")}
            <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-400/80 animate-pulse" />
          </span>
        ) : (
          <span className="text-slate-400 font-semibold italic">Console output stream empty</span>
        )}
        <div ref={terminalEndRef} className="inline-block" />
      </div>
    </div>
  );
}
