import React from 'react';
import type { TargetLanguage } from '../types';

interface TargetLanguageSelectorProps {
  selectedLanguage: TargetLanguage;
  onLanguageChange: (language: TargetLanguage) => void;
  disabled: boolean;
}

const LANGUAGES: { key: TargetLanguage; label: string }[] = [
    { key: 'arabic', label: 'Arabic' },
    { key: 'spanish', label: 'Spanish' },
    { key: 'french', label: 'French' },
];

export const TargetLanguageSelector: React.FC<TargetLanguageSelectorProps> = ({ selectedLanguage, onLanguageChange, disabled }) => {
  const baseClasses = "hacker-button-primary px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">[ TARGET LANGUAGE ]</h3>
      <p className="text-sm text-green-400/70 mb-3">// Select language for dubbing.</p>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        {LANGUAGES.map((lang, index) => (
            <button
                key={lang.key}
                type="button"
                onClick={() => onLanguageChange(lang.key)}
                disabled={disabled}
                className={`${baseClasses} 
                    ${index === 0 ? 'rounded-l-md' : ''} 
                    ${index === LANGUAGES.length - 1 ? 'rounded-r-md' : 'border-r-0'}
                    ${selectedLanguage === lang.key ? 'active' : ''}`}
            >
                {lang.label}
            </button>
        ))}
      </div>
    </div>
  );
};