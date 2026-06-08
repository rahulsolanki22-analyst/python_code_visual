import React, { useRef, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { 
  Play, 
  RotateCcw, 
  Settings, 
  Save, 
  FileCode, 
  Check, 
  Eye, 
  EyeOff, 
  Type, 
  ShieldCheck,
  Upload,
  Info
} from "lucide-react";

const checkCodeForDriver = (codeText) => {
  if (!codeText) return null;
  const hasClass = codeText.includes("class ");
  const hasDef = codeText.includes("def ");
  
  if (!hasClass && !hasDef) return null;

  const lines = codeText.split("\n");
  let hasCall = false;
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    // Check if line is at top level
    const isIndented = line.startsWith(" ") || line.startsWith("\t");
    if (!isIndented) {
      const isDecl = trimmed.startsWith("def ") || 
                     trimmed.startsWith("class ") || 
                     trimmed.startsWith("import ") || 
                     trimmed.startsWith("from ") || 
                     trimmed.startsWith("pass");
      if (!isDecl) {
        hasCall = true;
        break;
      }
    }
  }

  if (hasCall) return null;

  let suggestedDriver = "\n\n# Sample execution driver\n";
  if (hasClass) {
    const classMatch = codeText.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : "Solution";
    
    const methodMatch = codeText.match(/def\s+(\w+)\s*\(([^)]*)\):/);
    if (methodMatch) {
      const methodName = methodMatch[1];
      const params = methodMatch[2].split(",").map(p => p.trim()).filter(p => p && p !== "self" && p !== "object");
      
      suggestedDriver += `obj = ${className}()\n`;
      
      if (methodName === "twoSum") {
        suggestedDriver += `result = obj.twoSum(nums=[2, 7, 11, 15], target=9)\nprint("twoSum Result:", result)\n`;
      } else if (params.length > 0) {
        const dummyArgs = params.map(p => {
          if (p === "nums" || p === "arr") return "[2, 7, 11, 15]";
          if (p === "target") return "9";
          if (p === "s") return '"hello"';
          if (p === "n") return "5";
          return "None";
        });
        suggestedDriver += `result = obj.${methodName}(${dummyArgs.join(", ")})\nprint("Result:", result)\n`;
      } else {
        suggestedDriver += `result = obj.${methodName}()\nprint("Result:", result)\n`;
      }
    } else {
      suggestedDriver += `obj = ${className}()\n`;
    }
  } else {
    const funcMatch = codeText.match(/def\s+(\w+)\s*\(([^)]*)\):/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const params = funcMatch[2].split(",").map(p => p.trim()).filter(p => p);
      
      if (funcName === "bubble_sort" || funcName === "sort") {
        suggestedDriver += `arr = [5, 2, 9, 1]\n${funcName}(arr)\nprint("Sorted:", arr)\n`;
      } else if (params.length > 0) {
        const dummyArgs = params.map(p => {
          if (p === "nums" || p === "arr") return "[5, 2, 9, 1]";
          if (p === "target") return "9";
          if (p === "n") return "5";
          return "None";
        });
        suggestedDriver += `result = ${funcName}(${dummyArgs.join(", ")})\nprint("Result:", result)\n`;
      } else {
        suggestedDriver += `result = ${funcName}()\nprint("Result:", result)\n`;
      }
    }
  }

  return suggestedDriver;
};

export default function EditorPanel({
  code,
  setCode,
  activeLine,
  isVisualizing,
  onVisualize,
  onReset,
  loading,
  error,
  theme,
  warnings = [],
  badge,
  headerControls
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [monaco, setMonaco] = useState(null);
  const decorationsRef = useRef([]);

  // Editor configuration states
  const [fontSize, setFontSize] = useState(14);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Custom Snippet States
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDriverWarning, setShowDriverWarning] = useState(false);
  const [suggestedDriver, setSuggestedDriver] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCode(event.target.result);
        onReset();
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    const driver = checkCodeForDriver(code);
    if (driver) {
      setSuggestedDriver(driver);
      setShowDriverWarning(true);
    } else {
      setShowDriverWarning(false);
      setSuggestedDriver("");
    }
  }, [code]);

  const handleAppendDriver = () => {
    if (suggestedDriver) {
      setCode(prev => prev.trimEnd() + suggestedDriver);
      setShowDriverWarning(false);
      onReset();
    }
  };

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    setMonaco(monacoInstance);

    // Bind focus listeners
    editor.onDidFocusEditorText(() => setIsFocused(true));
    editor.onDidBlurEditorText(() => setIsFocused(false));
  };

  // Synchronize execution line highlighting
  useEffect(() => {
    if (editorRef.current && monaco && activeLine) {
      const editor = editorRef.current;
      
      const newDecorations = [
        {
          range: new monaco.Range(activeLine, 1, activeLine, 1),
          options: {
            isWholeLine: true,
            className: "active-execution-line-premium",
            glyphMarginClassName: "active-execution-glyph-premium"
          }
        }
      ];

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );

      editor.revealLineInCenterIfOutsideViewport(activeLine);
    } else if (editorRef.current && !activeLine) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }
  }, [activeLine, monaco]);

  // Save code snippet to localStorage
  const handleSaveSnippet = () => {
    try {
      localStorage.setItem("dsa_visualizer_saved_code", code);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save snippet:", e);
    }
  };

  // Load code snippet from localStorage
  const handleLoadSavedSnippet = () => {
    const saved = localStorage.getItem("dsa_visualizer_saved_code");
    if (saved) {
      setCode(saved);
      onReset();
    }
  };

  const hasSavedCode = !!localStorage.getItem("dsa_visualizer_saved_code");

  return (
    <div 
      className={`flex flex-col h-full bg-dark-900 border rounded-2xl overflow-hidden transition-all duration-300 ${
        isFocused 
          ? "border-brand-blue/50 shadow-glow-blue" 
          : "border-white/5 shadow-premium"
      }`}
    >
      {/* Sleek IDE Header Bar */}
      <div className="flex items-center justify-between px-4 bg-dark-950/80 border-b border-white/5 flex-none select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            {/* Active File Tab */}
            <div className="flex items-center gap-2 px-4 py-3.5 bg-dark-900 border-r border-white/5 border-t-2 border-t-brand-blue text-slate-200 text-xs font-mono select-none">
              <FileCode size={14} className="text-amber-500" />
              <span>solution.py</span>
              {isVisualizing && (
                <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded ml-1 animate-pulse flex items-center gap-0.5" title="Click Reset (circular arrow) to edit code">
                  <span>🔒 locked</span>
                </span>
              )}
            </div>
            {/* Secondary Saved Snippet Tab */}
            {hasSavedCode && (
              <button 
                onClick={handleLoadSavedSnippet}
                className="flex items-center gap-1.5 px-3 py-3.5 text-slate-500 hover:text-slate-300 text-xs font-mono border-r border-white/5 transition duration-150 cursor-pointer"
                title="Load last saved code snippet"
              >
                <span>saved_snippet.py</span>
              </button>
            )}
          </div>
          
          {headerControls}

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-md text-[9px] font-mono select-none">
            <ShieldCheck size={10} />
            <span>Sandbox Secure</span>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 py-2">
          {badge && (
            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono uppercase font-black mr-1 select-none ${
              badge.includes("A") 
                ? "bg-brand-blue/15 border border-brand-blue/30 text-brand-blue" 
                : "bg-brand-purple/15 border border-brand-purple/30 text-brand-purple"
            }`}>
              {badge}
            </span>
          )}
          {/* Settings Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border text-slate-400 hover:text-slate-200 transition duration-150 cursor-pointer ${
                showSettings ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 hover:bg-white/10"
              }`}
              title="Editor Settings"
            >
              <Settings size={14} />
            </button>

            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-dark-900 border border-white/10 rounded-xl p-3 shadow-premium z-50 flex flex-col gap-2.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Editor Settings</span>
                
                {/* Font Size Selector */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Type size={14} className="text-slate-400" />
                    <span>Font Size</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setFontSize(Math.max(12, fontSize - 1))} 
                      className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-[10px] hover:bg-white/10 cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs w-4 text-center">{fontSize}</span>
                    <button 
                      onClick={() => setFontSize(Math.min(20, fontSize + 1))} 
                      className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-[10px] hover:bg-white/10 cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Minimap Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    {minimapEnabled ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-400" />}
                    <span>Minimap</span>
                  </div>
                  <button
                    onClick={() => setMinimapEnabled(!minimapEnabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      minimapEnabled 
                        ? "bg-brand-blue/20 border border-brand-blue/30 text-brand-blue" 
                        : "bg-white/5 border border-white/10 text-slate-400"
                    }`}
                  >
                    {minimapEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || isVisualizing}
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition duration-150 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Upload python script (.py)"
          >
            <Upload size={14} />
          </button>

          {/* Save Snippet Button */}
          <button
            onClick={handleSaveSnippet}
            disabled={loading}
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition duration-150 flex items-center justify-center cursor-pointer"
            title="Save snippet to cache"
          >
            {saveSuccess ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
          </button>

          {/* Reset Button */}
          {isVisualizing && (
            <button
              onClick={onReset}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition duration-150 cursor-pointer"
              title="Reset Visualizer"
            >
              <RotateCcw size={14} />
            </button>
          )}

          {/* Run Button */}
          <button
            onClick={onVisualize}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition duration-150 glow-btn cursor-pointer ${
              loading
                ? "bg-brand-blue/50 text-white/50 cursor-not-allowed"
                : "bg-brand-blue hover:bg-brand-blue/90 text-white hover:shadow-glow-blue"
            }`}
          >
            <Play size={12} fill="currentColor" />
            <span>{loading ? "Tracing..." : "Run Trace"}</span>
          </button>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="flex-1 relative min-h-0 bg-dark-950 flex flex-col">
        {showDriverWarning && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 flex flex-col gap-1.5 shrink-0 select-none">
            <div className="flex items-center gap-1.5 font-bold">
              <Info size={14} className="text-amber-400 shrink-0 animate-pulse" />
              <span>Execution Call Missing</span>
            </div>
            <p className="opacity-90 leading-normal">
              You defined a LeetCode class or custom function but did not execute it. We need to run it with sample inputs to visualize it.
            </p>
            <button
              onClick={handleAppendDriver}
              className="text-left font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Click here to automatically append a sample test runner at the bottom
            </button>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".py" 
          className="hidden" 
        />
        <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme={theme === "light" ? "vs" : "vs-dark"}
          value={code}
          onChange={(val) => setCode(val || "")}
          onMount={handleEditorDidMount}
          options={{
            readOnly: isVisualizing,
            minimap: { enabled: minimapEnabled },
            fontSize: fontSize,
            lineNumbers: "on",
            glyphMargin: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 22,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 12 },
            automaticLayout: true,
            colors: {
              "editor.background": theme === "light" ? "#ffffff" : "#0b0f19"
            }
          }}
        />
      </div>
    </div>

      {/* Warnings Output Card */}
      {warnings && warnings.length > 0 && (
        <div className="p-4 bg-amber-500/5 border-t border-amber-500/20 text-amber-200 text-xs font-mono max-h-[140px] overflow-y-auto select-text">
          <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Static Analysis Warnings ({warnings.length})</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 mt-1.5 opacity-90 leading-relaxed">
            {warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error Output Card */}
      {error && (
        <div className="p-4 bg-red-950/20 border-t border-red-500/20 text-red-200 text-xs font-mono max-h-[140px] overflow-y-auto select-text">
          <div className="font-bold text-red-400 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Trace Execution Error</span>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed opacity-95">{error}</div>
        </div>
      )}

      {/* Dynamic line highlights style sheet */}
      <style>{`
        .active-execution-line-premium {
          background-color: rgba(59, 130, 246, 0.08) !important;
          border-left: 2px solid #3b82f6 !important;
          box-shadow: inset 8px 0 16px -8px rgba(59, 130, 246, 0.2) !important;
          width: 100% !important;
          transition: background-color 0.2s ease, border-left-color 0.2s ease;
        }
        .active-execution-glyph-premium {
          background-color: #3b82f6 !important;
          border-radius: 50% !important;
          width: 6px !important;
          height: 6px !important;
          margin-top: 8px !important;
          margin-left: 7px !important;
          box-shadow: 0 0 8px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.5) !important;
        }
      `}</style>
    </div>
  );
}
