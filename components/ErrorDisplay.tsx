import React from 'react';
import { useI18n } from '../i18n';

interface ErrorDisplayProps {
  message: string;
}

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);


export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="mt-8 p-4 bg-black border border-red-500 rounded-md flex items-start space-x-3 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
      <AlertTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
      <div>
        <h3 className="font-semibold text-red-300">{t('systemError')}</h3>
        <p className="text-red-400">&gt; {message}</p>
      </div>
    </div>
  );
};
