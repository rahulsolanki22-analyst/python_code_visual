import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid } from "lucide-react";
import { resolveValueString } from "./VariableList";

export default function ArrayVisualizer({ variables, prevVariables, heap }) {
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
      const heapObj = heap[val.id];
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
    return ptrs;
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
            <div className="flex flex-wrap gap-3 py-2 items-start justify-start">
              <AnimatePresence initial={false}>
                {items.map((item, index) => {
                  const isChanged = changedIndices.includes(index);
                  const itemStr = resolveValueString(item, heap);
                  const isNestedRef = item && typeof item === "object" && item.type === "ref";
                  const ptrs = getPointersForIndex(index);
                  const isPointed = ptrs.length > 0;

                  return (
                    <motion.div
                      key={`cell-${listVar.name}-${index}`}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex flex-col items-center min-w-[52px]"
                    >
                      {/* Element Value Box */}
                      <motion.div
                        animate={{
                          scale: isChanged ? [1, 1.1, 1] : 1,
                          backgroundColor: isChanged 
                            ? "rgba(6, 182, 212, 0.12)" /* Cyan for comparison/changes */
                            : isPointed 
                            ? "rgba(59, 130, 246, 0.08)" /* Blue for pointer-active */
                            : isNestedRef
                            ? "rgba(139, 92, 246, 0.08)" /* Purple for reference */
                            : "var(--box-bg)",  /* Theme-aware box background */
                          borderColor: isChanged 
                            ? "rgba(6, 182, 212, 0.5)" 
                            : isPointed 
                            ? "rgba(59, 130, 246, 0.4)" 
                            : isNestedRef
                            ? "rgba(139, 92, 246, 0.3)"
                            : "var(--box-border)",  /* Theme-aware box border */
                          boxShadow: isChanged
                            ? "0 0 12px rgba(6, 182, 212, 0.15)"
                            : isPointed
                            ? "0 0 12px rgba(59, 130, 246, 0.15)"
                            : "none"
                        }}
                        transition={{ duration: 0.3 }}
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono font-black text-sm select-all cursor-default ${
                          isChanged 
                            ? "text-brand-cyan" 
                            : isPointed
                            ? "text-brand-blue"
                            : isNestedRef
                            ? "text-brand-purple"
                            : "text-emerald-300"
                        }`}
                      >
                        {itemStr}
                      </motion.div>

                      {/* Index Label */}
                      <span className="text-[9px] text-slate-500 font-mono font-bold mt-1.5 select-none">
                        idx {index}
                      </span>

                      {/* Pointer Markers */}
                      {isPointed ? (
                        <motion.div 
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="flex flex-col items-center mt-1 select-none w-full"
                        >
                          <span className="text-[9px] text-brand-blue font-black leading-none">↑</span>
                          <div className="flex flex-col gap-1 items-center mt-1 w-full">
                            {ptrs.map(ptr => (
                              <span 
                                key={ptr} 
                                className="px-1.5 py-0.5 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue rounded text-[8px] font-bold leading-none uppercase shadow-sm truncate max-w-[50px] text-center"
                                title={ptr}
                              >
                                {ptr}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ) : (
                        // Fixed spacer anchor to avoid grid jump updates when index moves
                        <div className="h-9 w-1" />
                      )}
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
