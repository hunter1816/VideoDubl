
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
    <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-200">Processing Status</h3>
      <ol className="relative border-l border-gray-700">
        {steps.map((step, index) => {
          const isCompleted = currentStepIndex > index || currentStep === 'done';
          const isActive = currentStepIndex === index && currentStep !== 'done';
          const isError = currentStep === 'error' && isActive;
          
          return (
            <li key={step.key} className="mb-6 ml-6">
              <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-gray-800 ${
                isCompleted ? 'bg-teal-500' : isActive ? 'bg-blue-500' : 'bg-gray-600'
              }`}>
                {isCompleted ? <CheckCircleIcon className="w-5 h-5 text-white" /> : isActive ? <LoaderIcon className="w-5 h-5 text-white animate-spin" /> : null}
              </span>
              <h4 className={`font-semibold ${isCompleted || isActive ? 'text-white' : 'text-gray-400'}`}>{step.label}</h4>
            </li>
          );
        })}
      </ol>
      {currentStep === 'error' && (
        <div className="mt-4 p-4 text-red-300 bg-red-900/50 border border-red-500 rounded-md">
          An error occurred during processing. Please try again.
        </div>
      )}
    </div>
  );
};
