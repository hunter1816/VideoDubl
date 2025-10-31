import React from 'react';
import type { TargetLanguage } from '../types';
import { useI18n, Translations } from '../i18n';

interface TargetLanguageSelectorProps {
  selectedLanguage: TargetLanguage;
  onLanguageChange: (language: TargetLanguage) => void;
  disabled: boolean;
}

const LANGUAGES: { key: TargetLanguage; labelKey: keyof Translations }[] = [
    { key: 'arabic', labelKey: 'arabic' },
    { key: 'spanish', labelKey: 'spanish' },
    { key: 'french', labelKey: 'french' },
];

export const TargetLanguageSelector: React.FC<TargetLanguageSelectorProps> = ({ selectedLanguage, onLanguageChange, disabled }) => {
  const { t } = useI18n();
  const baseClasses = "hacker-button-primary px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">{t('targetLanguage')}</h3>
      <p className="text-sm text-green-400/70 mb-3">{t('targetLanguageDesc')}</p>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        {LANGUAGES.map((lang, index) => (
            <button
                key={lang.key}
                type="button"
                onClick={() => onLanguageChange(lang.key)}
                disabled={disabled}
                className={`${baseClasses} 
                    ${index === 0 ? 'rounded-s-md' : ''} 
                    ${index === LANGUAGES.length - 1 ? 'rounded-e-md' : 'border-e-0'}
                    ${selectedLanguage === lang.key ? 'active' : ''}`}
            >
                {t(lang.labelKey)}
            </button>
        ))}
      </div>
    </div>
  );
};
