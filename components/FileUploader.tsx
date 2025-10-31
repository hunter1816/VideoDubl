import React, { useCallback, useState } from 'react';
import { useI18n } from '../i18n';

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
}

const UploadCloudIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>
  </svg>
);


export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useI18n();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [disabled, onFileSelect]);

  return (
    <div className={`${disabled ? 'cursor-not-allowed' : ''}`}>
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center w-full h-48 px-4 transition bg-transparent border-2 ${isDragging ? 'border-green-400 border-solid shadow-[0_0_15px_var(--primary-color)]' : 'border-[var(--border-color)]'} border-dashed rounded-md appearance-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-green-400/70'}`}
      >
        <span className="flex items-center space-x-2">
          <UploadCloudIcon className="w-8 h-8 text-green-400/70" />
          <span className="font-medium text-green-400/70">
            {t('dropVideo')}{' '}
            <span className="text-green-400 underline">{t('browseSystem')}</span>
          </span>
        </span>
        <input type="file" name="file_upload" className="hidden" accept="video/*" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};
