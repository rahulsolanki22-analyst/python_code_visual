import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
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
  const timelineRef = useRef(null);

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

  // Autoscroll timeline to keep active dot centered
  useEffect(() => {
    if (timelineRef.current) {
      const container = timelineRef.current;
      const activeDot = container.querySelector(`[data-step="${currentStep}"]`);
      if (activeDot) {
        const containerWidth = container.clientWidth;
        const activeOffset = activeDot.offsetLeft;
        const activeWidth = activeDot.clientWidth;
        container.scrollTo({
          left: activeOffset - containerWidth / 2 + activeWidth / 2,
          behavior: "smooth"
        });
      }
    }
  }, [currentStep]);

  const handleFirst = () => {
    setIsPlaying(false);
    onChangeStep(1);
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setIsPlaying(false);
      onChangeStep(currentStep - 1);
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

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setIsPlaying(false);
      onChangeStep(currentStep + 1);
    }
  };

  const handleLast = () => {
    setIsPlaying(false);
    onChangeStep(totalSteps);
  };

  const handleRestart = () => {
    onChangeStep(1);
    setIsPlaying(true);
  };

  const percentProgress = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="w-full bg-dark-900 border border-white/5 rounded-2xl p-4 flex flex-col gap-3.5 shadow-premium select-none">
      
      {/* 1. Interactive Timeline Scrubber */}
      <div 
        ref={timelineRef}
        className="w-full overflow-x-auto scrollbar-none py-3 px-2 bg-dark-950 rounded-xl border border-white/5 relative"
      >
        <div 
          className="relative flex items-center justify-between min-h-[24px]"
          style={{ 
            minWidth: "100%", 
            width: totalSteps > 15 ? `${totalSteps * 24}px` : "100%",
            paddingLeft: "12px",
            paddingRight: "12px"
          }}
        >
          {/* Background Track Line */}
          <div className="absolute left-3 right-3 h-0.5 bg-dark-800 rounded-full" />

          {/* Progress Fill Line */}
          <motion.div 
            className="absolute left-3 h-0.5 bg-brand-blue rounded-full origin-left"
            animate={{ width: `${percentProgress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          {/* Dots */}
          {Array.from({ length: totalSteps }, (_, i) => {
            const step = i + 1;
            const isCompleted = step <= currentStep;
            const isActive = step === currentStep;

            return (
              <button
                key={step}
                data-step={step}
                onClick={() => {
                  setIsPlaying(false);
                  onChangeStep(step);
                }}
                title={`Jump to Step ${step}`}
                className="relative w-6 h-6 flex items-center justify-center z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/70 rounded-full group"
              >
                {/* Hover ring */}
                <span className="absolute inset-0 rounded-full bg-brand-blue/10 scale-0 group-hover:scale-100 transition-transform duration-200" />

                {/* Animated active highlight ring */}
                {isActive && (
                  <motion.span
                    layoutId="activeTimelineDot"
                    className="absolute w-4 h-4 rounded-full bg-brand-blue/20 border border-brand-blue shadow-glow-blue z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}

                {/* Inner dot */}
                <span 
                  className={`w-2 h-2 rounded-full z-10 transition-all duration-200 ${
                    isActive 
                      ? "bg-brand-blue scale-125" 
                      : isCompleted 
                      ? "bg-brand-blue/70 group-hover:bg-brand-blue" 
                      : "bg-dark-700 group-hover:bg-slate-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
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
        <div className="flex items-center gap-2">
          {/* First Button */}
          <button
            onClick={handleFirst}
            disabled={currentStep === 1}
            title="First Step"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-blue bg-white/5 hover:bg-brand-blue/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-slate-400 transition-all duration-200 border border-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50"
          >
            <ChevronsLeft size={16} />
          </button>

          {/* Prev Button */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            title="Previous Step [←]"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-blue bg-white/5 hover:bg-brand-blue/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-slate-400 transition-all duration-200 border border-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayToggle}
            title={isPlaying ? "Pause [Space]" : "Play [Space]"}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 ${
              isPlaying 
                ? "bg-brand-blue hover:bg-brand-blue/90 shadow-glow-blue border border-brand-blue/20 focus-visible:ring-brand-blue" 
                : "bg-brand-purple hover:bg-brand-purple/90 shadow-glow-purple border border-brand-purple/20 focus-visible:ring-brand-purple"
            }`}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-[1px]" />}
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={currentStep === totalSteps}
            title="Next Step [→]"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-blue bg-white/5 hover:bg-brand-blue/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-slate-400 transition-all duration-200 border border-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50"
          >
            <ChevronRight size={16} />
          </button>

          {/* Last Button */}
          <button
            onClick={handleLast}
            disabled={currentStep === totalSteps}
            title="Last Step"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-blue bg-white/5 hover:bg-brand-blue/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-slate-400 transition-all duration-200 border border-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50"
          >
            <ChevronsRight size={16} />
          </button>

          {/* Restart Button */}
          <button
            onClick={handleRestart}
            title="Restart Simulation"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-blue bg-white/5 hover:bg-brand-blue/10 transition-all duration-200 border border-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 ml-1"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Speed Dropdown */}
        <div className="flex items-center gap-1.5 bg-dark-950 px-2.5 py-1.5 rounded-xl border border-white/5 shadow-inner focus-within:ring-2 focus-within:ring-brand-blue/50 transition duration-150">
          <Clock size={14} className="text-slate-400" />
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer pr-1"
          >
            <option value={0.5} className="bg-dark-900 text-slate-300">0.5x Speed</option>
            <option value={1} className="bg-dark-900 text-slate-300">1.0x Speed</option>
            <option value={2} className="bg-dark-900 text-slate-300">2.0x Speed</option>
            <option value={4} className="bg-dark-900 text-slate-300">4.0x Speed</option>
          </select>
        </div>

      </div>
    </div>
  );
}
