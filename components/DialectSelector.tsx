import React from 'react';
import type { Dialect } from '../types';

interface DialectSelectorProps {
  selectedDialect: Dialect;
  onDialectChange: (dialect: Dialect) => void;
  disabled: boolean;
}

export const DialectSelector: React.FC<DialectSelectorProps> = ({ selectedDialect, onDialectChange, disabled }) => {
  const baseClasses = "hacker-button-primary px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">[ DUBBING DIALECT ]</h3>
      <p className="text-sm text-green-400/70 mb-3">// Select Arabic dialect for output.</p>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          onClick={() => onDialectChange('standard')}
          disabled={disabled}
          className={`${baseClasses} rounded-l-md ${selectedDialect === 'standard' ? 'active' : ''}`}
        >
          الفصحى (Standard)
        </button>
        <button
          type="button"
          onClick={() => onDialectChange('egyptian')}
          disabled={disabled}
          className={`${baseClasses} rounded-r-md ${selectedDialect === 'egyptian' ? 'active' : ''}`}
        >
          العامية المصرية (Egyptian)
        </button>
      </div>
    </div>
  );
};