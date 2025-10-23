import React from 'react';

// For now, only Arabic is supported.
type TargetLanguage = 'arabic';

interface TargetLanguageSelectorProps {
  selectedLanguage: TargetLanguage;
  onLanguageChange: (language: TargetLanguage) => void;
  disabled: boolean;
}

export const TargetLanguageSelector: React.FC<TargetLanguageSelectorProps> = ({ selectedLanguage, onLanguageChange, disabled }) => {
  const baseClasses = "px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed";
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-gray-100">Target Language</h3>
      <p className="text-sm text-gray-400 mb-3">Choose the language to dub the video into.</p>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          disabled={disabled}
          className={`${baseClasses} rounded-l-lg bg-teal-600 text-white`}
        >
          Arabic
        </button>
        <button
          type="button"
          disabled={true}
          className={`${baseClasses} rounded-r-lg bg-gray-700 text-gray-400 hover:bg-gray-600`}
          title="More languages coming soon!"
        >
          More (Soon)
        </button>
      </div>
    </div>
  );
};
