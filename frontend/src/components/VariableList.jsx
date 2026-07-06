import React, { useEffect, useState, useRef } from "react";
import { motion, animate } from "framer-motion";

// Helper component to animate numeric values smoothly
function AnimatedNumber({ value }) {
  const [displayVal, setDisplayVal] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    const prevNum = Number(prev);
    const currNum = Number(value);

    if (!isNaN(prevNum) && !isNaN(currNum) && prev !== value) {
      const controls = animate(prevNum, currNum, {
        duration: 0.3, // 300ms animation duration
        onUpdate: (latest) => {
          const isInteger = Number.isInteger(currNum) && Number.isInteger(prevNum);
          setDisplayVal(isInteger ? Math.round(latest) : parseFloat(latest.toFixed(2)));
        }
      });
      return () => controls.stop();
    } else {
      setDisplayVal(value);
    }
  }, [value]);

  return <span>{displayVal}</span>;
}

// Helper to stringify values recursively, resolving references inside lists/dicts
export function resolveValueString(val, heap) {
  if (val && typeof val === "object" && val.type === "ref") {
    const heapObj = heap[val.id];
    if (!heapObj) return `Ref(id:${val.id.slice(-3)})`;
    
    if (heapObj.type === "list") {
      return "[" + heapObj.value.map(v => resolveValueString(v, heap)).join(", ") + "]";
    }
    if (heapObj.type === "tuple") {
      return "(" + heapObj.value.map(v => resolveValueString(v, heap)).join(", ") + ")";
    }
    if (heapObj.type === "set") {
      return "{" + heapObj.value.map(v => resolveValueString(v, heap)).join(", ") + "}";
    }
    if (heapObj.type === "dict") {
      return "{" + Object.entries(heapObj.value).map(([k, v]) => `'${k}': ${resolveValueString(v, heap)}`).join(", ") + "}";
    }
    if (heapObj.type === "object") {
      return `${heapObj.class}(...)`;
    }
  }
  if (val === null) return "None";
  if (typeof val === "boolean") return val ? "True" : "False";
  if (typeof val === "string") return `"${val}"`;
  return String(val);
}

export default function VariableList({ variables, prevVariables, heap, onMutateVariable }) {
  const varKeys = Object.keys(variables || {}).sort();
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (varKeys.length === 0) {
    return (
      <div className="text-xs text-slate-400 font-bold italic py-4 text-center select-none bg-dark-800/40 border border-dashed border-white/5 rounded-xl w-full">
        No active variables in scope
      </div>
    );
  }

  const hasChanged = (key) => {
    if (!prevVariables || !(key in prevVariables)) return true;
    return JSON.stringify(variables[key]) !== JSON.stringify(prevVariables[key]);
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3 w-full">
      {varKeys.map((key) => {
        const value = variables[key];
        const changed = hasChanged(key);
        const resolvedStr = resolveValueString(value, heap);
        const isRef = value && typeof value === "object" && value.type === "ref";
        const isNumber = typeof value === "number";

        if (editingKey === key) {
          return (
            <motion.form
              key={key}
              layout
              onSubmit={(e) => {
                e.preventDefault();
                if (onMutateVariable) {
                  onMutateVariable(key, editValue);
                }
                setEditingKey(null);
              }}
              className="flex flex-col justify-between p-3 rounded-xl border border-brand-blue/50 bg-brand-blue/10 min-h-[64px] animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between select-none">
                <span className="font-bold text-[10px] tracking-wider text-slate-400 uppercase">
                  {key}
                </span>
                <span className="text-[8px] font-bold text-brand-blue uppercase">Edit</span>
              </div>
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => setEditingKey(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingKey(null);
                }}
                className="bg-dark-950 text-slate-200 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono w-full focus:outline-none focus:border-brand-blue/80 mt-1"
              />
            </motion.form>
          );
        }

        return (
          <motion.div
            key={key}
            layout
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: changed ? [1, 1.03, 1] : 1,
              borderColor: changed 
                ? ["rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 1)", "rgba(59, 130, 246, 0.4)"] 
                : "rgba(255, 255, 255, 0.05)",
              boxShadow: changed
                ? ["0 0 0px rgba(59, 130, 246, 0)", "0 0 20px rgba(59, 130, 246, 0.4)", "0 0 8px rgba(59, 130, 246, 0.15)"]
                : "none"
            }}
            transition={{ 
              scale: { type: "spring", stiffness: 350, damping: 25 },
              borderColor: { duration: 0.3, ease: "easeInOut" },
              boxShadow: { duration: 0.3, ease: "easeInOut" }
            }}
            onDoubleClick={() => {
              if (onMutateVariable) {
                setEditingKey(key);
                setEditValue(resolvedStr);
              }
            }}
            title={onMutateVariable ? "Double-click to mutate variable value" : ""}
            className={`relative group flex flex-col justify-between p-3 rounded-xl border transition-all duration-350 min-h-[64px] ${
              onMutateVariable ? "cursor-pointer select-none" : ""
            } ${
              changed
                ? "bg-brand-blue/10 text-brand-blue active-execution-glow"
                : "bg-dark-800 text-slate-300 hover:border-white/10 hover:bg-dark-800/80"
            }`}
          >
            {/* Top Row: Name and optional changed badge */}
            <div className="flex items-center justify-between gap-2 select-none">
              <span className="font-bold text-[10px] tracking-wider text-slate-400 uppercase truncate">
                {key}
              </span>
              {changed && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
              )}
            </div>

            {/* Bottom Row: Resolved Value */}
            <div className="mt-1 flex items-baseline justify-between overflow-hidden">
              <span
                className={`font-mono text-xs font-bold truncate ${
                  isRef && heap[value.id]?.type === "object"
                    ? "text-brand-purple"
                    : isRef
                    ? "text-brand-blue"
                    : "text-emerald-300"
                }`}
                title={resolvedStr}
              >
                {isNumber ? <AnimatedNumber value={value} /> : resolvedStr}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
