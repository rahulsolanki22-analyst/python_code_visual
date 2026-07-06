import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Code2, Variable, Sparkles } from "lucide-react";
import { generateExplanation } from "../utils/explanationGenerator";

export default function StepExplanation({ currentStepData, nextStepData, prevStepData, codeLines, heap }) {
  const data = generateExplanation(currentStepData, nextStepData, prevStepData, codeLines, heap);

  if (!currentStepData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-dark-900 border border-white/5 rounded-2xl p-5 shadow-glass-inner flex flex-col gap-4 w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 select-none">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
            <Lightbulb size={16} className="animate-pulse" />
          </div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Step Explanation
          </span>
        </div>
        <span className="text-[9px] bg-white/5 px-2 py-0.5 border border-white/5 rounded-full font-mono text-slate-400 font-bold uppercase tracking-wider">
          Step telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Current Line & Variables */}
        <div className="md:col-span-1 flex flex-col gap-3.5">
          {/* Current Line Code Block */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
              <Code2 size={12} className="text-brand-cyan" />
              <span>Current Line (Line {currentStepData.line})</span>
            </span>
            <div className="bg-dark-950 border border-white/5 rounded-xl p-3 font-mono text-xs text-brand-cyan font-bold select-all overflow-x-auto whitespace-pre scrollbar-none">
              {data.lineCode || "# execution completed"}
            </div>
          </div>

          {/* Variables Involved */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
              <Variable size={12} className="text-brand-purple" />
              <span>Variables in Line</span>
            </span>
            {data.variablesInvolved.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                {data.variablesInvolved.map((v) => (
                  <span
                    key={v.name}
                    className="px-2.5 py-1 bg-dark-950 border border-white/5 rounded-lg text-[10px] font-mono text-slate-300"
                  >
                    <span className="font-extrabold text-slate-400">{v.name}</span>
                    <span className="text-slate-600 mx-1">:</span>
                    <span className="font-extrabold text-emerald-400">{v.value}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 italic select-none py-1">
                No active variables evaluated in this line.
              </span>
            )}
          </div>
        </div>

        {/* Right Column: English Explanation & What Changes */}
        <div className="md:col-span-2 flex flex-col gap-3.5 justify-between">
          {/* Plain English Explanation */}
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              <span>Execution Detail</span>
            </span>
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-medium bg-dark-950/40 p-3 rounded-xl border border-white/5 flex-1 min-h-[50px] flex items-center">
              {data.explanation}
            </p>
          </div>

          {/* Changes after this step */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
              What Changes Next
            </span>
            <div className="bg-dark-950/20 border border-white/5 rounded-xl p-3 text-xs text-slate-400 leading-relaxed font-mono font-medium">
              {data.changes}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
