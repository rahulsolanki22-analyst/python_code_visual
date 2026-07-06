import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid } from "lucide-react";
import { resolveValueString } from "./VariableList";

export default function ArrayVisualizer({ variables, prevVariables, heap, prevHeap }) {
  // Find all list/array variables in the active scope
  const listVars = [];
  
  if (variables) {
    Object.entries(variables).forEach(([name, val]) => {
      if (val && typeof val === "object" && val.type === "ref") {
        const heapObj = heap[val.id];
        if (heapObj && (heapObj.type === "list" || heapObj.type === "tuple")) {
          listVars.push({
            name,
            refId: val.id,
            type: heapObj.type,
            items: heapObj.value
          });
        }
      }
    });
  }

  if (listVars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/5 rounded-xl bg-dark-900/10 select-none">
        <Grid size={22} className="text-slate-600 mb-2" />
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider opacity-65">No arrays / lists in active scope.</span>
      </div>
    );
  }

  const getPrevItems = (varName) => {
    if (!prevVariables || !(varName in prevVariables)) return null;
    const val = prevVariables[varName];
    if (val && typeof val === "object" && val.type === "ref") {
      const heapObj = prevHeap ? prevHeap[val.id] : null;
      if (heapObj && (heapObj.type === "list" || heapObj.type === "tuple")) {
        return heapObj.value;
      }
    }
    return null;
  };

  // Helper to extract variable names currently pointing to this index
  const getPointersForIndex = (index) => {
    const ptrs = [];
    if (!variables) return ptrs;
    
    Object.entries(variables).forEach(([name, val]) => {
      if (typeof val === "number" && val === index) {
        // Only include variables that are common search/sorting indices to keep noise low
        if (["i", "j", "low", "mid", "high", "left", "right", "idx", "p", "q", "k"].includes(name)) {
          ptrs.push(name);
        }
      }
    });

    // Add virtual j+1 pointer when inside nested sorting loops comparing j with j+1
    if ("j" in variables && typeof variables.j === "number" && index === variables.j + 1) {
      ptrs.push("j+1");
    }

    return ptrs;
  };

  const getHighlightState = (index, ptrs, items) => {
    if (!variables) return "normal";

    // Active comparison: mid, j, or j+1
    if (ptrs.includes("mid") || ptrs.includes("j") || ptrs.includes("j+1")) {
      return "comparison";
    }
    // Current element: i, idx, curr, p
    if (ptrs.includes("i") || ptrs.includes("idx") || ptrs.includes("curr") || ptrs.includes("p")) {
      return "current";
    }

    // Visited elements
    // 1. If i is in variables:
    if ("i" in variables && typeof variables.i === "number") {
      const iVal = variables.i;
      const isBubble = "j" in variables;
      const isInsertion = "key" in variables;

      if (isBubble && index >= items.length - iVal) {
        return "visited"; // Bubble sort sorted portion at end
      }
      if (isInsertion && index < iVal) {
        return "visited"; // Insertion sort sorted portion at start
      }
      if (!isBubble && !isInsertion && index < iVal) {
        return "visited"; // General left-to-right loops
      }
    }

    // 2. Binary search interval outside [low, high]:
    if ("low" in variables && typeof variables.low === "number" && "high" in variables && typeof variables.high === "number") {
      const low = variables.low;
      const high = variables.high;
      if (index < low || index > high) {
        return "visited"; // Discarded search space
      }
    }

    return "normal";
  };

  return (
    <div className="flex flex-col gap-6">
      {listVars.map((listVar) => {
        const prevItems = getPrevItems(listVar.name);
        const items = listVar.items;
        
        // Compute changed cell indices compared to previous step
        const changedIndices = [];
        if (prevItems) {
          const maxLen = Math.max(items.length, prevItems.length);
          for (let i = 0; i < maxLen; i++) {
            if (JSON.stringify(items[i]) !== JSON.stringify(prevItems[i])) {
              changedIndices.push(i);
            }
          }
        }

        return (
          <div
            key={listVar.name}
            className="p-4 bg-dark-900 border border-white/5 rounded-2xl flex flex-col gap-4 shadow-glass-inner"
          >
            {/* Header: Array Details */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2 select-none">
              <span className="text-[10px] font-black font-mono text-brand-cyan uppercase tracking-wider">
                {listVar.name} <span className="text-[8px] text-slate-500 font-bold lowercase">({listVar.type}, size: {items.length})</span>
              </span>
            </div>

            {/* Boxes Display with Pointers */}
            <div className="flex flex-wrap gap-5 py-4 items-start justify-center">
              <AnimatePresence initial={false}>
                {items.map((item, index) => {
                  const isChanged = changedIndices.includes(index);
                  const itemStr = resolveValueString(item, heap);
                  const isNestedRef = item && typeof item === "object" && item.type === "ref";
                  const ptrs = getPointersForIndex(index);
                  const isPointed = ptrs.length > 0;
                  
                  // Compute highlight state
                  const state = getHighlightState(index, ptrs, items);

                  // Determine colors based on state
                  let targetBg = "var(--box-bg)";
                  let targetBorder = "var(--box-border)";
                  let targetShadow = "none";

                  if (isChanged) {
                    targetBg = "rgba(6, 182, 212, 0.15)";
                    targetBorder = "rgba(6, 182, 212, 0.6)";
                    targetShadow = "0 0 16px rgba(6, 182, 212, 0.25)";
                  } else if (state === "comparison") {
                    targetBg = "rgba(245, 158, 11, 0.15)";
                    targetBorder = "rgba(245, 158, 11, 0.6)";
                    targetShadow = "0 0 16px rgba(245, 158, 11, 0.25)";
                  } else if (state === "current") {
                    targetBg = "rgba(59, 130, 246, 0.15)";
                    targetBorder = "rgba(59, 130, 246, 0.6)";
                    targetShadow = "var(--shadow-glow-blue)";
                  } else if (state === "visited") {
                    targetBg = "rgba(16, 185, 129, 0.08)";
                    targetBorder = "rgba(16, 185, 129, 0.4)";
                    targetShadow = "none";
                  }

                  let textClass = "text-slate-700 dark:text-slate-300";
                  if (isChanged) {
                    textClass = "text-brand-cyan font-black";
                  } else if (state === "comparison") {
                    textClass = "text-amber-600 dark:text-amber-400 font-extrabold";
                  } else if (state === "current") {
                    textClass = "text-brand-blue font-black";
                  } else if (state === "visited") {
                    textClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                  } else if (isNestedRef) {
                    textClass = "text-brand-purple font-bold";
                  }

                  return (
                    <motion.div
                      key={`cell-${listVar.name}-${index}`}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex flex-col items-center min-w-[64px]"
                    >
                      {/* Pointer Markers above the box */}
                      {isPointed ? (
                        <motion.div 
                          initial={{ y: -5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="flex flex-col items-center mb-1.5 select-none w-full min-h-[48px] justify-end"
                        >
                          <div className="flex flex-wrap gap-1 justify-center mb-1 max-w-[64px]">
                            {ptrs.map(ptr => (
                              <span 
                                key={ptr} 
                                className="px-1.5 py-0.5 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue rounded text-[9px] font-extrabold uppercase shadow-sm truncate max-w-[60px] text-center"
                                title={ptr}
                              >
                                {ptr}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-brand-blue font-black leading-none animate-bounce">↓</span>
                        </motion.div>
                      ) : (
                        // Fixed spacer anchor to avoid grid jump updates when index moves
                        <div className="h-[48px] w-1" />
                      )}

                      {/* Element Value Box */}
                      <motion.div
                        animate={{
                          scale: (isChanged || state === "current" || state === "comparison") ? [1, 1.05, 1] : 1,
                          backgroundColor: targetBg,
                          borderColor: targetBorder,
                          boxShadow: targetShadow
                        }}
                        transition={{ duration: 0.3 }}
                        className={`w-16 h-16 rounded-xl border flex items-center justify-center font-mono text-base select-all cursor-default transition-colors duration-300 ${textClass}`}
                      >
                        {itemStr}
                      </motion.div>

                      {/* Index Label */}
                      <span className="text-[9px] text-slate-500 font-mono font-bold mt-1.5 select-none">
                        idx {index}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
