
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);


export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="mt-8 p-4 bg-red-900/50 border border-red-600 rounded-lg flex items-start space-x-3">
      <AlertTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
      <div>
        <h3 className="font-semibold text-red-300">An Error Occurred</h3>
        <p className="text-red-400">{message}</p>
      </div>
    </div>
  );
};
