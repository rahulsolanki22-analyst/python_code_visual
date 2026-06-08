import React from "react";

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
  const [editingKey, setEditingKey] = React.useState(null);
  const [editValue, setEditValue] = React.useState("");

  if (varKeys.length === 0) {
    return (
      <div className="text-xs text-slate-400 font-bold italic py-1 select-none">
        No active variables in scope
      </div>
    );
  }

  const hasChanged = (key) => {
    if (!prevVariables || !(key in prevVariables)) return true;
    return JSON.stringify(variables[key]) !== JSON.stringify(prevVariables[key]);
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {varKeys.map((key) => {
        const value = variables[key];
        const changed = hasChanged(key);
        const resolvedStr = resolveValueString(value, heap);
        const isRef = value && typeof value === "object" && value.type === "ref";

        if (editingKey === key) {
          return (
            <form
              key={key}
              onSubmit={(e) => {
                e.preventDefault();
                if (onMutateVariable) {
                  onMutateVariable(key, editValue);
                }
                setEditingKey(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-brand-blue/50 bg-brand-blue/10 animate-in fade-in duration-150"
            >
              <span className="font-bold text-slate-400 select-none text-xs">{key}</span>
              <span className="text-slate-500 select-none">:</span>
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => setEditingKey(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingKey(null);
                }}
                className="bg-dark-950 text-slate-200 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono w-24 focus:outline-none focus:border-brand-blue/80"
              />
            </form>
          );
        }

        return (
          <div
            key={key}
            onDoubleClick={() => {
              if (onMutateVariable) {
                setEditingKey(key);
                setEditValue(resolvedStr);
              }
            }}
            title={onMutateVariable ? "Double-click to mutate variable value" : ""}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all duration-300 ${
              onMutateVariable ? "cursor-edit select-none hover:border-brand-blue/30" : ""
            } ${
              changed
                ? "bg-brand-blue/10 border-brand-blue/30 text-brand-blue shadow-glow-blue active-execution-glow"
                : "bg-dark-900/60 border-white/5 text-slate-300"
            }`}
          >
            <span className="font-bold text-slate-400 select-none">{key}</span>
            <span className="text-slate-600 select-none">:</span>
            <span
              className={`font-bold ${
                isRef && heap[value.id]?.type === "object"
                  ? "text-brand-purple"
                  : isRef
                  ? "text-brand-blue"
                  : "text-emerald-300"
              }`}
            >
              {resolvedStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}
