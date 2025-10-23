import React from 'react';

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
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full border border-gray-700">
        <div className="flex items-center gap-4">
            <div className="bg-yellow-900/50 p-2 rounded-full">
                <AlertTriangleIcon className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-100">Language Confirmation</h2>
        </div>
        <p className="mt-4 text-gray-300">
          The detected video language is{' '}
          <strong className="font-semibold text-yellow-400">{detectedLanguage}</strong>.
        </p>
        <p className="mt-2 text-gray-400 text-sm">
          This application is optimized for translating from English. While we can attempt to process this video, the translation and dubbing quality may vary.
        </p>
        <p className="mt-4 font-medium text-gray-300">
          Do you want to proceed with dubbing to Arabic?
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-sm font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};
