
import React, { useCallback, useState } from 'react';

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
    <div className={`mt-8 ${disabled ? 'cursor-not-allowed' : ''}`}>
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center w-full h-48 px-4 transition bg-gray-800 border-2 ${isDragging ? 'border-teal-400' : 'border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-500 focus:outline-none ${disabled ? 'opacity-50' : ''}`}
      >
        <span className="flex items-center space-x-2">
          <UploadCloudIcon className="w-8 h-8 text-gray-500" />
          <span className="font-medium text-gray-400">
            Drop video to attach, or <span className="text-teal-400 underline">browse</span>
          </span>
        </span>
        <input type="file" name="file_upload" className="hidden" accept="video/*" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};
