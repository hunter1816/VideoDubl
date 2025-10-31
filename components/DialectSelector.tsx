import React from 'react';
import type { Dialect } from '../types';
import { useI18n } from '../i18n';

interface DialectSelectorProps {
  selectedDialect: Dialect;
  onDialectChange: (dialect: Dialect) => void;
  disabled: boolean;
}

export const DialectSelector: React.FC<DialectSelectorProps> = ({ selectedDialect, onDialectChange, disabled }) => {
  const { t } = useI18n();
  const baseClasses = "hacker-button-primary px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">{t('dubbingDialect')}</h3>
      <p className="text-sm text-green-400/70 mb-3">{t('dubbingDialectDesc')}</p>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          onClick={() => onDialectChange('standard')}
          disabled={disabled}
          className={`${baseClasses} rounded-s-md ${selectedDialect === 'standard' ? 'active' : ''}`}
        >
          {t('standardArabic')}
        </button>
        <button
          type="button"
          onClick={() => onDialectChange('egyptian')}
          disabled={disabled}
          className={`${baseClasses} rounded-e-md ${selectedDialect === 'egyptian' ? 'active' : ''}`}
        >
          {t('egyptianArabic')}
        </button>
      </div>
    </div>
  );
};
