import React from 'react';
import { useI18n } from '../i18n';

interface LanguageConfirmationModalProps {
  detectedLanguage: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
);

export const LanguageConfirmationModal: React.FC<LanguageConfirmationModalProps> = ({ detectedLanguage, onConfirm, onCancel }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog">
      <div className="hacker-container rounded-md shadow-xl p-6 sm:p-8 max-w-md w-full border border-yellow-500/50 shadow-[0_0_20px_rgba(255,255,0,0.3)]">
        <div className="flex items-center gap-4">
            <div className="bg-yellow-900/50 p-2 rounded-full">
                <AlertTriangleIcon className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-300 tracking-wider">{t('confirmRequired')}</h2>
        </div>
        <p className="mt-4 text-green-300">
          {t('detectedLanguage')}{' '}
          <strong className="font-semibold text-yellow-400">{detectedLanguage}</strong>.
        </p>
        <p className="mt-2 text-green-400/70 text-sm">
          {t('detectedLanguageWarning')}
        </p>
        <p className="mt-4 font-medium text-green-200">
          {t('proceedPrompt')}
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="hacker-button-default px-6 py-2 text-sm font-semibold rounded-md"
          >
            {t('abort')}
          </button>
          <button
            onClick={onConfirm}
            className="hacker-button-primary active px-6 py-2 text-sm font-semibold rounded-md"
          >
            {t('proceed')}
          </button>
        </div>
      </div>
    </div>
  );
};
