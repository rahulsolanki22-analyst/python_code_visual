import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Terminal, 
  Layers, 
  Variable, 
  Code2, 
  Cpu, 
  BookOpen, 
  Keyboard,
  Info,
  ListFilter,
  Sun,
  Moon,
  Sparkles,
  BarChart3,
  Network,
  Edit2
} from "lucide-react";

import EditorPanel from "./components/EditorPanel";
import StepControls from "./components/StepControls";
import VariableList from "./components/VariableList";
import StackFrames from "./components/StackFrames";
import ArrayVisualizer from "./components/ArrayVisualizer";
import HeapVisualizer from "./components/HeapVisualizer";
import TerminalConsole from "./components/TerminalConsole";

import { EXAMPLES } from "./constants/examples";
import { visualizeCode } from "./services/api";


export default function App() {
  const [code, setCode] = useState(EXAMPLES.bubble_sort.code);
  const [selectedExample, setSelectedExample] = useState("bubble_sort");



  // Theme state defaulting to light
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("dsa_visualizer_theme") || "light";
  });

  // Sync theme with HTML class
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    localStorage.setItem("dsa_visualizer_theme", theme);
  }, [theme]);


  
  // Trace states
  const [trace, setTrace] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [showShortcutsHUD, setShowShortcutsHUD] = useState(false);
  const [activeTab, setActiveTab] = useState("auto"); // "auto", "array", "heap", "stack", "variables"

  // Dynamic code changer switching to custom code
  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    if (selectedExample !== "custom" && newCode !== EXAMPLES[selectedExample]?.code) {
      setSelectedExample("custom");
    }
  }, [selectedExample]);

  // Load example code template
  const handleExampleChange = (e) => {
    const key = e.target.value;
    setSelectedExample(key);
    setCode(EXAMPLES[key].code);
    handleReset();
  };

  // Reset trace state
  const handleReset = useCallback(() => {
    setTrace(null);
    setAnalysis(null);
    setCurrentStep(1);
    setIsPlaying(false);
    setError(null);
    setSelectedFrameIndex(0);
    setActiveTab("auto");
  }, []);

  // API visualize code trigger
  const handleVisualize = async () => {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    
    const res = await visualizeCode(code);
    setLoading(false);

    if (res.success && res.trace && res.trace.length > 0) {
      setTrace(res.trace);
      setCurrentStep(1);
      if (res.analysis) {
        setAnalysis(res.analysis);
      } else {
        setAnalysis(null);
      }
      if (res.error) {
        setError(res.error);
      }
    } else {
      setError(res.error || "Failed to execute python code trace.");
      setTrace(null);
      setAnalysis(null);
    }
  };

  const handleMutateVariable = async (varName, newValueRaw) => {
    let parsedValue;
    try {
      if (newValueRaw.trim().startsWith("[") || newValueRaw.trim().startsWith("{")) {
        parsedValue = JSON.parse(newValueRaw);
      } else if (newValueRaw.toLowerCase() === "true") {
        parsedValue = true;
      } else if (newValueRaw.toLowerCase() === "false") {
        parsedValue = false;
      } else if (newValueRaw.toLowerCase() === "none") {
        parsedValue = null;
      } else if (!isNaN(newValueRaw) && newValueRaw.trim() !== "") {
        parsedValue = Number(newValueRaw);
      } else {
        let strVal = newValueRaw.trim();
        if ((strVal.startsWith('"') && strVal.endsWith('"')) || (strVal.startsWith("'") && strVal.endsWith("'"))) {
          strVal = strVal.slice(1, -1);
        }
        parsedValue = strVal;
      }
    } catch (e) {
      parsedValue = newValueRaw;
    }

    setLoading(true);
    setError(null);
    setIsPlaying(false);

    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
      const response = await fetch(`${apiBase}/visualize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          max_steps: 1000,
          timeout: 2.0,
          target_step: currentStep,
          mutated_variables: { [varName]: parsedValue }
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const res = await response.json();
      setLoading(false);

      if (res.success && res.trace && res.trace.length > 0) {
        setTrace(res.trace);
        if (res.analysis) {
          setAnalysis(res.analysis);
        }
      } else {
        setError(res.error || "Failed to execute python code trace mutation.");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to connect to the backend server.");
    }
  };

  const handleNext = useCallback(() => {
    const totalSteps = trace ? trace.length : 0;
    if (totalSteps && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [trace, currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Sync selected frame index on trace step updates
  useEffect(() => {
    if (trace && trace[currentStep - 1]) {
      const stepData = trace[currentStep - 1];
      const scopes = stepData.scopes || [];
      setSelectedFrameIndex(scopes.length - 1);
    }
  }, [currentStep, trace]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const target = e.target;

      const isTyping = (el) => {
        if (!el) return false;
        const tagName = el.tagName;
        return (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          el.isContentEditable ||
          el.classList?.contains("inputarea") ||
          (typeof el.closest === "function" && el.closest(".monaco-editor"))
        );
      };

      if (isTyping(activeEl) || isTyping(target)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trace, currentStep, isPlaying, handleNext, handlePrev, handleReset]);

  // Derive active step states
  const currentStepData = trace ? trace[Math.min(currentStep, trace.length) - 1] : null;
  const prevStepData = (trace && currentStep > 1) ? trace[Math.min(currentStep - 1, trace.length) - 1] : null;

  const activeLine = currentStepData ? currentStepData.line : null;
  const scopes = currentStepData ? currentStepData.scopes : [];
  const heap = currentStepData ? currentStepData.heap : {};
  const stdout = currentStepData ? currentStepData.stdout : "";

  // Variables resolution
  const selectedScope = scopes[selectedFrameIndex] || null;
  const variables = selectedScope ? selectedScope.variables : {};
  const prevSelectedScope = prevStepData?.scopes?.[selectedFrameIndex] || null;
  const prevVariables = prevSelectedScope ? prevSelectedScope.variables : {};

  // Retrieve algorithm metadata
  const currentExample = EXAMPLES[selectedExample];

  const displayTime = useMemo(() => {
    if (analysis) return analysis.time_complexity;
    if (selectedExample !== "custom") return currentExample.timeComplexity;
    return "N/A";
  }, [selectedExample, currentExample, analysis]);

  const displaySpace = useMemo(() => {
    if (analysis) return analysis.space_complexity;
    if (selectedExample !== "custom") return currentExample.spaceComplexity;
    return "N/A";
  }, [selectedExample, currentExample, analysis]);

  // Helper to identify content types
  const hasHeapNodes = useMemo(() => {
    return Object.values(heap).some(obj => obj && obj.type === "object");
  }, [heap]);

  const hasLists = useMemo(() => {
    return Object.values(variables).some(
      val => val && typeof val === "object" && val.type === "ref" && heap[val.id] && (heap[val.id].type === "list" || heap[val.id].type === "tuple")
    );
  }, [variables, heap]);

  // Smart visualization tab selection
  const computedTab = useMemo(() => {
    if (activeTab !== "auto") return activeTab;
    if (hasHeapNodes) return "heap";
    if (hasLists) return "array";
    if (scopes.length > 2) return "stack";
    return "variables";
  }, [activeTab, hasHeapNodes, hasLists, scopes.length]);

  return (
    <div className="h-screen bg-dark-950 text-slate-100 flex flex-col subpixel-antialiased overflow-hidden select-none">
      
      {/* Top Navigation Bar */}
      <header className="px-6 py-3 bg-dark-900 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 flex-none z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-blue/10 rounded-xl border border-brand-blue/20 text-brand-blue shadow-glow-blue">
            <Cpu size={18} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-100 leading-none">
              PYTHON DSA VISUALIZER
            </h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Interactive Algorithm Learning Platform
            </p>
          </div>
        </div>

        {/* Header Options & Metrics */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end">
          {(trace || selectedExample === "custom") && (
            <div className="hidden md:flex items-center gap-2 select-none">
              {/* Time Complexity */}
              <div className="px-2.5 py-1 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[11px] font-bold rounded-lg uppercase tracking-wider">
                Time: {displayTime}
              </div>

              {/* Space Complexity */}
              <div className="px-2.5 py-1 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[11px] font-bold rounded-lg uppercase tracking-wider">
                Space: {displaySpace}
              </div>
            </div>
          )}

          {/* Algorithm Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedExample}
              onChange={handleExampleChange}
              disabled={loading}
              className="text-xs font-bold bg-dark-800 hover:bg-dark-700 text-slate-200 px-3 py-1.5 rounded-xl border border-white/5 focus:outline-none focus:ring-1 focus:ring-brand-blue/40 transition duration-150 cursor-pointer shadow-sm"
            >
              {Object.entries(EXAMPLES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.category} › {val.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle button */}
          <button
            onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
            className="p-2 rounded-xl border bg-white/5 border-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-200 transition duration-150 cursor-pointer"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>




          {/* Keyboard HUD button */}
          <button
            onClick={() => setShowShortcutsHUD(!showShortcutsHUD)}
            className={`p-2 rounded-xl border text-slate-500 hover:text-slate-200 transition duration-150 ${
              showShortcutsHUD ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 hover:bg-white/10"
            }`}
            title="Keyboard Shortcuts"
          >
            <Keyboard size={14} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 w-full grid grid-cols-1 lg:grid-cols-10 gap-6 overflow-hidden min-h-0 relative">
        
        {/* Keyboard Shortcuts HUD */}
        {showShortcutsHUD && (
          <div className="absolute top-4 right-6 bg-dark-900 border border-white/10 p-4 rounded-2xl shadow-premium z-50 flex flex-col gap-3 font-mono text-[10px] w-64 select-none animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 pb-1 border-b border-white/5 flex items-center justify-between">
              <span>Shortcuts HUD</span>
              <span className="text-[7px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">active</span>
            </span>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Play / Pause</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 border border-white/10 rounded font-black text-slate-200">Space</kbd>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Step Forward</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 border border-white/10 rounded font-black text-slate-200">→</kbd>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Step Backward</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 border border-white/10 rounded font-black text-slate-200">←</kbd>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Reset Trace</span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 border border-white/10 rounded font-black text-slate-200">R</kbd>
            </div>
          </div>
        )}

        {/* Left Column: Monaco Code Editor (~40% space) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          {/* Algorithm Info Card */}
          <div className="bg-dark-900 border border-white/5 rounded-2xl p-4 text-xs text-slate-400 shadow-glass-inner flex flex-col gap-1.5 flex-none">
            <div className="flex items-center gap-2 text-slate-300 select-none">
              <BookOpen size={14} className="text-brand-cyan" />
              <span className="font-bold tracking-wider uppercase text-[11px] sm:text-xs">Algorithm details</span>
            </div>
            <p className="leading-relaxed text-xs sm:text-[13px] text-slate-300">
              <span className="font-bold text-slate-200">{currentExample.name}:</span>{" "}
              {currentExample.description}
            </p>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col gap-4">
            <EditorPanel
              code={code}
              setCode={handleCodeChange}
              activeLine={activeLine}
              isVisualizing={!!trace}
              onVisualize={handleVisualize}
              onReset={handleReset}
              loading={loading}
              error={error}
              theme={theme}
              warnings={analysis ? analysis.warnings : []}
            />
          </div>
        </div>

        {/* Right Column: Visualization Canvas Workspace (~60% space) */}
        <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden min-h-0">
          {trace ? (
            <>
              {/* Visualization Stage Container */}
              <div className="flex-1 bg-dark-900 border border-white/5 rounded-2xl p-5 flex flex-col gap-5 overflow-hidden min-h-0 shadow-premium relative">
                
                {/* Visualizer Adaptive Tab Switcher Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-none select-none">
                  {/* Selector Tabs */}
                  <div className="flex items-center gap-1 bg-dark-950 p-1.5 rounded-xl border border-white/5">
                    <button
                      onClick={() => setActiveTab("auto")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 uppercase flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "auto"
                          ? "bg-brand-blue text-white shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Sparkles size={14} className={activeTab === "auto" ? "text-amber-300" : "text-amber-500"} />
                      <span>Auto ({computedTab})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("array")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 uppercase flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "array"
                          ? "bg-brand-blue text-white shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <BarChart3 size={14} />
                      <span>Array</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("heap")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 uppercase flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "heap"
                          ? "bg-brand-blue text-white shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Network size={14} />
                      <span>Heap Graph</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("stack")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 uppercase flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "stack"
                          ? "bg-brand-blue text-white shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Layers size={14} />
                      <span>Stack</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("insights")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 uppercase flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "insights"
                          ? "bg-brand-blue text-white shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Info size={14} />
                      <span>Insights</span>
                    </button>
                  </div>

                  {/* Step counter info badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-950 border border-white/5 text-slate-400 text-xs font-mono font-bold rounded-lg uppercase tracking-wider shadow-inner">
                    <span>Step {currentStep} of {trace ? trace.length : 1}</span>
                  </div>
                </div>

                {/* Main Tab Render Window */}
                <div className="flex-1 overflow-y-auto min-h-0 relative pr-1 scrollbar-thin">
                  {computedTab === "array" && (
                    <div className="animate-in fade-in duration-200 flex flex-col gap-4">
                      <ArrayVisualizer
                        variables={variables}
                        prevVariables={prevVariables}
                        heap={heap}
                      />
                    </div>
                  )}

                  {computedTab === "heap" && (
                    <div className="animate-in fade-in duration-200">
                      <div className="h-[360px]">
                        <HeapVisualizer variables={variables} heap={heap} />
                      </div>
                    </div>
                  )}

                  {computedTab === "stack" && (
                    <div className="animate-in fade-in duration-200">
                      <div className="h-full">
                        <StackFrames
                          scopes={scopes}
                          selectedFrameIndex={selectedFrameIndex}
                          setSelectedFrameIndex={setSelectedFrameIndex}
                        />
                      </div>
                    </div>
                  )}

                  {computedTab === "variables" && (
                    <div className="bg-dark-950/40 p-4 rounded-xl border border-white/5 animate-in fade-in duration-200">
                      <>
                        <div className="flex items-center gap-1.5 pb-2 border-b border-white/5 mb-3 select-none">
                          <Variable size={16} className="text-brand-cyan" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Local Variables ({selectedScope ? selectedScope.name : "none"})
                          </span>
                        </div>
                        <VariableList
                          variables={variables}
                          prevVariables={prevVariables}
                          heap={heap}
                          onMutateVariable={handleMutateVariable}
                        />
                      </>
                    </div>
                  )}

                  {computedTab === "insights" && (
                    <div className="bg-dark-950/40 p-4 rounded-xl border border-white/5 animate-in fade-in duration-200 flex flex-col gap-4">
                      <>
                        <div className="flex items-center gap-1.5 pb-2 border-b border-white/5 select-none">
                          <Info size={16} className="text-brand-blue" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Hybrid Analysis & Insights
                          </span>
                        </div>
                        
                        {/* Complexity Card */}
                        <div className="grid grid-cols-2 gap-3.5 select-none">
                          <div className="p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-xl flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated Time Complexity</span>
                            <span className="text-lg font-extrabold text-brand-blue mt-1">{displayTime}</span>
                          </div>
                          <div className="p-3 bg-brand-purple/5 border border-brand-purple/10 rounded-xl flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated Space Complexity</span>
                            <span className="text-lg font-extrabold text-brand-purple mt-1">{displaySpace}</span>
                          </div>
                        </div>

                        {/* Execution Telemetry Card */}
                        {analysis && (
                          <div className="p-4 bg-dark-900 border border-white/5 rounded-xl flex flex-col gap-3 select-none">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Execution Telemetry</span>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                              <div className="p-2 bg-dark-950 border border-white/5 rounded-lg">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Steps</div>
                                <div className="text-sm font-bold text-slate-200">{analysis.metrics.step_count}</div>
                              </div>
                              <div className="p-2 bg-dark-950 border border-white/5 rounded-lg">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Stack Depth</div>
                                <div className="text-sm font-bold text-slate-200">{analysis.metrics.max_stack_depth}</div>
                              </div>
                              <div className="p-2 bg-dark-950 border border-white/5 rounded-lg">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Heap Objects</div>
                                <div className="text-sm font-bold text-slate-200">{analysis.metrics.max_heap_objects}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Warnings & Suggestions Card */}
                        <div className="p-4 bg-dark-900 border border-white/5 rounded-xl flex flex-col gap-2.5">
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider select-none">Code Quality & Warnings</span>
                          {analysis && analysis.warnings && analysis.warnings.length > 0 ? (
                            <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                              {analysis.warnings.map((warn, i) => (
                                <li key={i} className="text-xs text-amber-200 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg flex items-start gap-2 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5 animate-pulse" />
                                  <span>{warn}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex items-center gap-2 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                              <span>No code issues detected. Execution trace is clean and optimized!</span>
                            </div>
                          )}
                        </div>

                        {/* Performance Suggestions Card */}
                        <div className="p-4 bg-dark-900 border border-white/5 rounded-xl flex flex-col gap-2.5">
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider select-none">Performance Optimizer Advice</span>
                          {analysis && analysis.suggestions && analysis.suggestions.length > 0 ? (
                            <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                              {analysis.suggestions.map((sug, i) => (
                                <li key={i} className="text-xs text-brand-cyan bg-brand-cyan/5 border border-brand-cyan/10 p-2.5 rounded-lg flex items-start gap-2 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0 mt-1.5 animate-pulse" />
                                  <span>{sug.text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs text-slate-500 bg-white/5 border border-white/5 p-3 rounded-lg flex items-center gap-2 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                              <span>No performance suggestions. Code layout is efficient.</span>
                            </div>
                          )}
                        </div>
                      </>
                    </div>
                  )}
                </div>

                {/* Small footer variable drawer when Heap/Array is focused */}
                {["array", "heap"].includes(computedTab) && (
                  <div className="flex-none bg-dark-950/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-white/5 mb-2.5 select-none">
                      <Variable size={16} className="text-brand-cyan" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Scope Variables ({selectedScope ? selectedScope.name : "none"})
                      </span>
                    </div>
                    <VariableList
                      variables={variables}
                      prevVariables={prevVariables}
                      heap={heap}
                      onMutateVariable={handleMutateVariable}
                    />
                  </div>
                )}

              </div>

              {/* Minimal stdout printer Console */}
              <TerminalConsole stdout={stdout} />

              {/* Centered Step Controls HUD */}
              <div className="flex-none flex justify-center w-full">
                <div className="w-full">
                  <StepControls
                    currentStep={currentStep}
                    totalSteps={trace.length}
                    onChangeStep={setCurrentStep}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    speed={speed}
                    setSpeed={setSpeed}
                  />
                </div>
              </div>
            </>
          ) : (
            // Landing / Empty State view
            <div className="glass-panel-premium border border-white/5 rounded-2xl p-12 text-center shadow-premium flex flex-col items-center justify-center gap-5 flex-1 select-none relative overflow-hidden dot-grid">
              
              <div className="absolute top-10 left-10 w-48 h-48 bg-brand-blue/5 rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-10 w-48 h-48 bg-brand-purple/5 rounded-full blur-3xl" />

              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-blue shadow-glow-blue flex-none z-10">
                <Code2 size={28} className="animate-pulse" />
              </div>
              
              <div className="z-10 flex flex-col gap-2 max-w-sm">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Run your code to see visualization
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Select an algorithm template from the dropdown, customize it in the editor, and click <span className="text-brand-blue font-bold">"Run Trace"</span> to start.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-2.5 z-10 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">Auto-detected Heap Nodes</span>
                <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">Framer Animations</span>
                <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">Line Highlights</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-2.5 border-t border-white/5 bg-dark-950 text-center select-none text-[10px] text-slate-500 font-mono flex-none tracking-widest uppercase">
        Python DSA Visualizer • Education Platform
      </footer>
    </div>
  );
}
