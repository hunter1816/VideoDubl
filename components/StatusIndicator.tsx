import React from 'react';
import type { ProcessStep, Step } from '../types';

interface StatusIndicatorProps {
  currentStep: ProcessStep;
  steps: Step[];
}

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const LoaderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ currentStep, steps }) => {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  if (currentStep === 'idle') return null;

  return (
    <div className="mt-8 p-6 hacker-container rounded-md">
      <h3 className="text-xl font-semibold mb-4 text-green-300 tracking-wider">[ PROCESS LOG ]</h3>
      <ol className="relative border-l border-[var(--border-color)]">
        {steps.map((step, index) => {
          const isCompleted = currentStepIndex > index || currentStep === 'done';
          const isActive = currentStepIndex === index && currentStep !== 'done';
          
          return (
            <li key={step.key} className="mb-6 ml-6">
              <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-black ${
                isCompleted ? 'bg-green-500 shadow-[0_0_10px_var(--primary-color)]' : isActive ? 'bg-cyan-500 shadow-[0_0_10px_var(--secondary-color)]' : 'bg-gray-700'
              }`}>
                {isCompleted ? <CheckCircleIcon className="w-5 h-5 text-black" /> : isActive ? <LoaderIcon className="w-5 h-5 text-black animate-spin" /> : <div className="w-3 h-3 bg-gray-500 rounded-full"></div>}
              </span>
              <h4 className={`font-semibold ${isCompleted ? 'text-green-400' : isActive ? 'text-cyan-400' : 'text-gray-500'}`}>{`> ${step.label}`}</h4>
            </li>
          );
        })}
      </ol>
      {currentStep === 'error' && (
        <div className="mt-4 p-4 text-red-300 bg-red-900/50 border border-red-500 rounded-md">
          &gt; <span className='font-bold'>ERROR:</span> Process terminated. Please check logs and retry.
        </div>
      )}
    </div>
  );
};