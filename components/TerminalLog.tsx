import React, { useState, useEffect, useRef } from 'react';
import type { ProcessStep, Step } from '../types';

interface TerminalLogProps {
  currentStep: ProcessStep;
  steps: Step[];
  error: string | null;
}

const BOOT_SEQUENCE = [
  "Booting SYS.Dubber.v2.5 kernel...",
  "Initializing AI core...",
  "Loading neural network models...",
  "Establishing secure connection to Gemini API...",
  "Connection successful. Awaiting input.",
  "---"
];

const getTimestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

export const TerminalLog: React.FC<TerminalLogProps> = ({ currentStep, steps, error }) => {
  const [logLines, setLogLines] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const stepStatusRef = useRef<Record<string, 'pending' | 'running' | 'done' | 'error'>>({});

  // Initialize step statuses
  useEffect(() => {
    steps.forEach(step => {
      stepStatusRef.current[step.key] = 'pending';
    });
  }, [steps]);

  // Initial boot sequence effect
  useEffect(() => {
    let bootIndex = 0;
    const interval = setInterval(() => {
      if (bootIndex < BOOT_SEQUENCE.length) {
        setLogLines(prev => [...prev, `[${getTimestamp()}] [INFO] ${BOOT_SEQUENCE[bootIndex]}`]);
        bootIndex++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Effect to update logs based on currentStep
  useEffect(() => {
    if (currentStep === 'idle' || currentStep === 'regenerating') return;

    // Find the current active step index
    const currentStepIndex = steps.findIndex(s => s.key === currentStep);

    // Update previous steps to 'done'
    for (let i = 0; i < currentStepIndex; i++) {
        const step = steps[i];
        if (stepStatusRef.current[step.key] === 'running') {
            setLogLines(prev => {
                const newLogs = [...prev];
                // Replace the last line (the "running" line) with a "done" line
                newLogs[newLogs.length - 1] = `[${getTimestamp()}] [SUCCESS] ${step.label}... Complete.`;
                return newLogs;
            });
            stepStatusRef.current[step.key] = 'done';
        }
    }
    
    // Handle the current step if it's new
    if (currentStep !== 'done' && currentStep !== 'error' && stepStatusRef.current[currentStep] === 'pending') {
        const currentStepConfig = steps.find(s => s.key === currentStep);
        if (currentStepConfig) {
            setLogLines(prev => [...prev, `[${getTimestamp()}] [RUNNING] ${currentStepConfig.label}...`]);
            stepStatusRef.current[currentStep] = 'running';
        }
    }
    
    // Handle final states
    if (currentStep === 'done') {
        const lastRunningStep = steps.find(s => stepStatusRef.current[s.key] === 'running');
        if (lastRunningStep) {
             setLogLines(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1] = `[${getTimestamp()}] [SUCCESS] ${lastRunningStep.label}... Complete.`;
                return [...newLogs, `[${getTimestamp()}] [INFO] All processes finished successfully.`];
            });
            stepStatusRef.current[lastRunningStep.key] = 'done';
        }
    }

    if (currentStep === 'error' && error) {
        const lastRunningStep = steps.find(s => stepStatusRef.current[s.key] === 'running');
         if (lastRunningStep) {
             setLogLines(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1] = `[${getTimestamp()}] [FAILED] ${lastRunningStep.label}... Failed.`;
                return [...newLogs, `[${getTimestamp()}] [ERROR] ${error}`];
            });
            stepStatusRef.current[lastRunningStep.key] = 'error';
        } else {
             setLogLines(prev => [...prev, `[${getTimestamp()}] [ERROR] ${error}`]);
        }
    }

  }, [currentStep, steps, error]);

  // Auto-scroll effect
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logLines]);

  const renderLine = (line: string) => {
      let colorClass = 'text-green-400/80';
      if (line.includes('[RUNNING]')) colorClass = 'text-cyan-400';
      else if (line.includes('[SUCCESS]')) colorClass = 'text-green-400 font-bold';
      else if (line.includes('[ERROR]') || line.includes('[FAILED]')) colorClass = 'text-red-400 font-bold';
      return <p className={`whitespace-pre-wrap ${colorClass}`}>{`> ${line}`}</p>;
  }

  return (
    <div className="mt-8 p-4 hacker-container rounded-md font-mono text-sm">
      <div 
        ref={logContainerRef}
        className="w-full h-48 overflow-y-auto pr-2"
        aria-live="polite" 
        aria-atomic="false"
      >
        {logLines.map((line, index) => (
            <div key={index}>{renderLine(line)}</div>
        ))}
      </div>
      <div className="mt-2 border-t border-[var(--border-color)] pt-2">
        <p className="text-green-400 blinking-cursor">
          {currentStep === 'analyzing' || currentStep === 'translating' || currentStep === 'dubbing' ? 'Executing...' : 'Awaiting command...'}
        </p>
      </div>
    </div>
  );
};
