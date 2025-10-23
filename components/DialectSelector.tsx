import React from 'react';
import type { Dialect } from '../types';

interface DialectSelectorProps {
  selectedDialect: Dialect;
  onDialectChange: (dialect: Dialect) => void;
  disabled: boolean;
}

export const DialectSelector: React.FC<DialectSelectorProps> = ({ selectedDialect, onDialectChange, disabled }) => {
  const baseClasses = "px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const activeClasses = "bg-teal-600 text-white";
  const inactiveClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-gray-100">Dubbing Dialect</h3>
      <p className="text-sm text-gray-400 mb-3">Choose the Arabic dialect for the final audio track.</p>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <button
          type="button"
          onClick={() => onDialectChange('standard')}
          disabled={disabled}
          className={`${baseClasses} rounded-l-lg ${selectedDialect === 'standard' ? activeClasses : inactiveClasses}`}
        >
          الفصحى (Standard)
        </button>
        <button
          type="button"
          onClick={() => onDialectChange('egyptian')}
          disabled={disabled}
          className={`${baseClasses} rounded-r-lg ${selectedDialect === 'egyptian' ? activeClasses : inactiveClasses}`}
        >
          العامية المصرية (Egyptian)
        </button>
      </div>
    </div>
  );
};