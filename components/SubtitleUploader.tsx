import React, { useRef } from 'react';
import { useI18n } from '../i18n';

interface SubtitleUploaderProps {
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  disabled: boolean;
}

const FileTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
        <path d="M10 9H8"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
    </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export const SubtitleUploader: React.FC<SubtitleUploaderProps> = ({ selectedFile, onFileChange, disabled }) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files?.[0] || null);
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = ""; // Clear the file input
    }
  };

  return (
    <div className={`${disabled ? 'cursor-not-allowed' : ''}`}>
      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">{t('uploadSubtitles')} <span className="text-sm text-green-400/50">{t('optional')}</span></h3>
      <p className="text-sm text-green-400/70 mb-3">{t('uploadSubtitlesDesc')}</p>
      
      {selectedFile ? (
        <div className="flex items-center justify-between w-full h-16 px-4 bg-green-900/20 border-2 border-[var(--border-color)] rounded-md">
          <div className="flex items-center space-x-3">
            <FileTextIcon className="w-6 h-6 text-green-400/80 flex-shrink-0" />
            <span className="font-medium text-green-300 truncate">{selectedFile.name}</span>
          </div>
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-red-500 disabled:opacity-50"
            aria-label="Remove selected file"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <label
          className={`flex justify-center w-full h-16 px-4 transition bg-transparent border-2 border-[var(--border-color)] border-dashed rounded-md appearance-none cursor-pointer hover:border-green-400/70 focus:outline-none ${disabled ? 'opacity-50' : ''}`}
        >
          <span className="flex items-center space-x-2">
            <FileTextIcon className="w-6 h-6 text-green-400/70" />
            <span className="font-medium text-green-400/70">
              {t('selectSrtFile')}
            </span>
          </span>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept=".srt" 
            onChange={handleFileSelect} 
            disabled={disabled} 
          />
        </label>
      )}
    </div>
  );
};
