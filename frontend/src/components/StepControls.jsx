import React, { useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Clock
} from "lucide-react";

export default function StepControls({
  currentStep,
  totalSteps,
  onChangeStep,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
}) {
  const playTimer = useRef(null);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 1000 / speed;
      playTimer.current = setInterval(() => {
        if (currentStep < totalSteps) {
          onChangeStep(currentStep + 1);
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    } else {
      if (playTimer.current) clearInterval(playTimer.current);
    }

    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [isPlaying, currentStep, totalSteps, speed, onChangeStep, setIsPlaying]);

  const handlePrev = () => {
    if (currentStep > 1) {
      setIsPlaying(false);
      onChangeStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setIsPlaying(false);
      onChangeStep(currentStep + 1);
    }
  };

  const handlePlayToggle = () => {
    if (currentStep >= totalSteps && !isPlaying) {
      onChangeStep(1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    onChangeStep(1);
  };

  const percentProgress = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="w-full bg-dark-900 border border-white/5 rounded-2xl p-4 flex flex-col gap-3.5 shadow-premium select-none">
      
      {/* 1. Timeline Scrubber */}
      <div className="w-full flex items-center gap-3">
        <span className="text-xs text-slate-400 font-mono font-semibold uppercase select-none">Start</span>
        <div className="relative flex-1 group">
          <input
            type="range"
            min={1}
            max={totalSteps || 1}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              onChangeStep(parseInt(e.target.value, 10));
            }}
            className="w-full h-1 bg-dark-950 rounded-lg appearance-none cursor-pointer accent-brand-blue focus:outline-none border border-white/5 transition-all duration-150"
            style={{
              background: `linear-gradient(to right, var(--color-brand-blue, #3b82f6) 0%, var(--color-brand-blue, #3b82f6) ${percentProgress}%, var(--bg-border, #121826) ${percentProgress}%, var(--bg-border, #121826) 100%)`
            }}
          />
        </div>
        <span className="text-xs text-slate-400 font-mono font-semibold uppercase select-none">End</span>
      </div>

      {/* 2. Controls Row */}
      <div className="flex items-center justify-between gap-4 mt-0.5 flex-wrap">
        
        {/* Step Indicator Counter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">Step</span>
          <span className="text-xs font-bold font-mono text-brand-blue">{currentStep}</span>
          <span className="text-slate-500 font-bold">/</span>
          <span className="text-xs font-bold text-slate-400 font-mono">{totalSteps}</span>
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={currentStep === 1}
            title="Reset [R]"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 border border-white/5 cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>

          {/* Prev button */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            title="Step Back [←]"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 border border-white/5 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayToggle}
            title={isPlaying ? "Pause [Space]" : "Play [Space]"}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition duration-200 shadow-md cursor-pointer ${
              isPlaying 
                ? "bg-brand-blue hover:bg-brand-blue/90 shadow-glow-blue border border-brand-blue/20" 
                : "bg-brand-purple hover:bg-brand-purple/90 shadow-glow-purple border border-brand-purple/20"
            }`}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-[1px]" />}
          </button>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={currentStep === totalSteps}
            title="Step Forward [→]"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 border border-white/5 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Autoplay Speed Option */}
        <div className="flex items-center gap-1 bg-dark-950 p-1.5 rounded-xl border border-white/5 shadow-inner">
          <Clock size={16} className="text-slate-400 ml-1.5 mr-0.5" />
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${
                speed === s
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
