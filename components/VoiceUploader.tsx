import React, { useRef } from 'react';

interface VoiceUploaderProps {
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  disabled: boolean;
}

const MicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const FileIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

export const VoiceUploader: React.FC<VoiceUploaderProps> = ({ selectedFile, onFileChange, disabled }) => {
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
    <div className={`pt-6 border-t border-gray-700 ${disabled ? 'cursor-not-allowed' : ''}`}>
      <h3 className="text-lg font-semibold mb-2 text-gray-100">Upload Voice Sample <span className="text-sm text-gray-500">(Optional)</span></h3>
      <p className="text-sm text-gray-400 mb-3">For more accurate voice cloning, provide a 15-30 second audio clip of a speaker's voice.</p>
      
      {selectedFile ? (
        <div className="flex items-center justify-between w-full h-16 px-4 bg-gray-700 border-2 border-gray-600 rounded-md">
          <div className="flex items-center space-x-3">
            <FileIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-300 truncate">{selectedFile.name}</span>
          </div>
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-teal-500 disabled:opacity-50"
            aria-label="Remove selected file"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <label
          className={`flex justify-center w-full h-16 px-4 transition bg-gray-800 border-2 border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-500 focus:outline-none ${disabled ? 'opacity-50' : ''}`}
        >
          <span className="flex items-center space-x-2">
            <MicIcon className="w-6 h-6 text-gray-500" />
            <span className="font-medium text-gray-400">
              Select an audio file for voice cloning...
            </span>
          </span>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept="audio/*" 
            onChange={handleFileSelect} 
            disabled={disabled} 
          />
        </label>
      )}
    </div>
  );
};