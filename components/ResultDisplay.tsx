import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisResult, TranscriptionSegment, TargetLanguage, SpeakerProfile } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { base64ToUint8Array, createWavBlobFromPcm, createAudioBufferFromPcm, mergeVideoAndPcmAudio } from '../utils/media';
import { TTS_VOICES } from '../constants';
import { generateAudioClip } from '../services/geminiService';

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
);

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
    </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
    </svg>
);

const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2"/>
        <path d="M7 3v18"/>
        <path d="M3 7.5h4"/>
        <path d="M3 12h18"/>
        <path d="M3 16.5h4"/>
        <path d="M17 3v18"/>
        <path d="M17 7.5h4"/>
        <path d="M17 16.5h4"/>
    </svg>
);

const RefreshCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M3 21v-5h5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

const ChevronUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0 2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

const FileTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);

const LanguagesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
    </svg>
);

const FileDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
        <path d="M12 18v-6"/>
        <path d="m9 15 3 3 3-3"/>
    </svg>
);

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
);

const HelpCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
  </svg>
);

const PlusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);

const ArrowUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
);

const ArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
);

const LocateFixedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/>
      <line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/>
      <circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>
    </svg>
);

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

interface RenameConfirmationModalProps {
  oldId: string;
  newId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const RenameConfirmationModal: React.FC<RenameConfirmationModalProps> = ({ oldId, newId, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog">
      <div className="hacker-container rounded-md shadow-xl p-6 sm:p-8 max-w-md w-full border border-yellow-500/50 shadow-[0_0_20px_rgba(255,255,0,0.3)]">
        <div className="flex items-center gap-4">
            <div className="bg-yellow-900/50 p-2 rounded-full">
                <AlertTriangleIcon className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-300 tracking-wider">[ CONFIRM RENAME ]</h2>
        </div>
        <p className="mt-4 text-green-300">
          Are you sure you want to rename speaker{' '}
          <strong className="font-semibold text-yellow-400">"{oldId}"</strong> to <strong className="font-semibold text-yellow-400">"{newId}"</strong>?
        </p>
        <p className="mt-2 text-green-400/70 text-sm">
          // This will update the name across the entire application, including the transcription logs and voice assignments.
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="hacker-button-default px-6 py-2 text-sm font-semibold rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="hacker-button-primary active px-6 py-2 text-sm font-semibold rounded-md"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};


interface ResultDisplayProps {
  videoUrl: string;
  dubbedAudioData: string | null;
  analysisResult: AnalysisResult & { translatedTranscription?: TranscriptionSegment[] };
  editedTranslation: TranscriptionSegment[] | null;
  onTranslationChange: (index: number, updatedFields: Partial<TranscriptionSegment>) => void;
  onAddNewSegment: () => void;
  onSegmentReorder: (index: number, direction: 'up' | 'down') => void;
  voiceOverrides: Record<number, string>;
  onVoiceOverrideChange: (index: number, voiceName: string | null) => void;
  originalAudioUrl: string | null;
  voiceSelection: Record<string, string>;
  onVoiceChange: (speakerId: string, voiceName: string) => void;
  onSpeakerRename: (oldId: string, newId: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isVoiceCloningActive: boolean;
  targetLanguage: TargetLanguage;
  onReset: () => void;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

const formatSrtTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000).toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

interface EditableSpeakerNameProps {
    speakerId: string;
    onRename: (newId: string) => void;
    isEditingDisabled: boolean;
}

const EditableSpeakerName: React.FC<EditableSpeakerNameProps> = ({ speakerId, onRename, isEditingDisabled }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentName, setCurrentName] = useState(speakerId);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentName(speakerId);
    }, [speakerId]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);
    
    const handleConfirm = () => {
        const trimmedName = currentName.trim();
        if (trimmedName && trimmedName !== speakerId) {
            onRename(trimmedName);
        }
        setIsEditing(false);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            setCurrentName(speakerId);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                onBlur={handleConfirm}
                onKeyDown={handleKeyDown}
                className="font-medium text-green-300 bg-black rounded px-2 py-1 -ml-2 w-full hacker-input"
                disabled={isEditingDisabled}
                aria-label="Edit speaker name"
            />
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="font-medium text-green-300">{speakerId}</span>
            <button 
                onClick={() => !isEditingDisabled && setIsEditing(true)} 
                disabled={isEditingDisabled} 
                className="text-gray-400 hover:text-white disabled:opacity-50 p-1 -m-1 rounded-full"
                title="Edit speaker name"
                aria-label={`Edit name for ${speakerId}`}
            >
                <EditIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    videoUrl, 
    dubbedAudioData, 
    analysisResult, 
    editedTranslation,
    onTranslationChange,
    onAddNewSegment,
    onSegmentReorder,
    voiceOverrides,
    onVoiceOverrideChange,
    originalAudioUrl,
    voiceSelection,
    onVoiceChange,
    onSpeakerRename,
    onRegenerate,
    isRegenerating,
    isVoiceCloningActive,
    targetLanguage,
    onReset,
}) => {
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioOffset, setAudioOffset] = useState(0); // in milliseconds
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewingSegment, setPreviewingSegment] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<Record<string, string | null>>({});
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [previewMode, setPreviewMode] = useState<'dubbed' | 'original'>('dubbed');
  const [renameConfirmation, setRenameConfirmation] = useState<{oldId: string, newId: string} | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const prevTranslationLength = useRef(editedTranslation?.length ?? 0);
  
  useEffect(() => {
    const currentLength = editedTranslation?.length ?? 0;
    if (currentLength > prevTranslationLength.current) {
        // A segment was added, scroll to the bottom.
        const timer = setTimeout(() => {
            if (editorScrollRef.current) {
                editorScrollRef.current.scrollTo({
                    top: editorScrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100); // Delay to allow DOM update
        return () => clearTimeout(timer);
    }
    prevTranslationLength.current = currentLength;
  }, [editedTranslation]);

  const targetLanguageDisplay = targetLanguage.charAt(0).toUpperCase() + targetLanguage.slice(1);

  const handleTimeUpdate = (currentTime: number) => {
    if (!editedTranslation) return;
    const currentIndex = editedTranslation.findIndex(
        segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );
    setActiveSegmentIndex(currentIndex > -1 ? currentIndex : null);
  };

  const handleSegmentClick = (startTime: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = startTime;
          if (videoRef.current.paused) {
              videoRef.current.play().catch(console.error);
          }
      }
  };

  const handleSetTime = (index: number, type: 'start' | 'end') => {
      if (videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          if (type === 'start') {
              onTranslationChange(index, { startTime: currentTime });
          } else {
              onTranslationChange(index, { endTime: currentTime });
          }
      }
  };


  const handleRequestRename = (oldId: string, newId: string) => {
    if (!newId || oldId === newId) {
        return;
    }
    setRenameConfirmation({ oldId, newId });
  };

  const handleConfirmRename = () => {
      if (renameConfirmation) {
          onSpeakerRename(renameConfirmation.oldId, renameConfirmation.newId);
          setRenameConfirmation(null);
      }
  };

  const handleCancelRename = () => {
      setRenameConfirmation(null);
  };

  const handleDubbedDownload = () => {
    if (!dubbedAudioData) return;
    try {
      const pcmData = base64ToUint8Array(dubbedAudioData);
      const wavBlob = createWavBlobFromPcm(pcmData, 24000, 1, 16);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dubbed_audio.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to create and download WAV file:", error);
    }
  };

  const handleOriginalDownload = () => {
    if (!originalAudioUrl) return;
    const a = document.createElement('a');
    a.href = originalAudioUrl;
    a.download = 'original_audio.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDubbedVideoDownload = async () => {
    if (!dubbedAudioData || !videoUrl) return;
    setIsDownloadingVideo(true);
    try {
      const pcmData = base64ToUint8Array(dubbedAudioData);
      const videoBlob = await mergeVideoAndPcmAudio(videoUrl, pcmData);
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dubbed_video.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to merge and download video:", error);
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const handleExportSrt = () => {
    if (!editedTranslation) return;

    const srtContent = editedTranslation
      .map((segment, index) => {
        const startTime = formatSrtTime(segment.startTime);
        const endTime = formatSrtTime(segment.endTime);
        const text = segment.text;
        return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
      })
      .join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVoicePreview = async (speakerId: string) => {
    setPreviewingVoice(speakerId);
    setPreviewError(prev => ({ ...prev, [speakerId]: null }));

    try {
        const voiceName = voiceSelection[speakerId];
        const sampleSegment = analysisResult.translatedTranscription?.find((seg) => seg.speakerId === speakerId);
        if (!sampleSegment || !voiceName) throw new Error("No sample text available.");

        const audioBase64 = await generateAudioClip(sampleSegment.text, voiceName);
        if (!audioBase64) throw new Error("Could not generate preview.");

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const pcmData = base64ToUint8Array(audioBase64);
        const audioBuffer = await createAudioBufferFromPcm(pcmData, audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        source.onended = () => {
            audioContext.close().catch(console.error);
            setPreviewingVoice(null);
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Audio preview failed.";
        setPreviewError(prev => ({ ...prev, [speakerId]: message }));
        setTimeout(() => setPreviewError(prev => ({ ...prev, [speakerId]: null })), 4000);
        setPreviewingVoice(null);
    }
  };
  
  const handleSegmentPreview = async (segment: TranscriptionSegment, voiceOverride?: string) => {
    setPreviewingSegment(segment.startTime);
    try {
        const voiceName = voiceOverride || voiceSelection[segment.speakerId];
        if (!voiceName && !isVoiceCloningActive) throw new Error("No voice assigned.");

        const audioBase64 = await generateAudioClip(segment.text, voiceName);
        if (!audioBase64) throw new Error("Could not generate audio.");
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const pcmData = base64ToUint8Array(audioBase64);
        const audioBuffer = await createAudioBufferFromPcm(pcmData, audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        source.onended = () => {
            audioContext.close().catch(console.error);
            setPreviewingSegment(null);
        };
    } catch (err) {
        console.error("Failed to generate segment preview:", err);
        setPreviewingSegment(null);
    }
  };
  
  const buttonBaseClasses = "hacker-button-primary px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none";
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);

  const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }> = ({ title, icon, isExpanded, onToggle, children }) => (
    <div className="hacker-container rounded-md">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-xl font-semibold text-green-300 tracking-wider">{title}</h3>
        </div>
        {isExpanded ? <ChevronUpIcon className="w-6 h-6 text-green-400/70" /> : <ChevronDownIcon className="w-6 h-6 text-green-400/70" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-[var(--border-color)] animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
       {renameConfirmation && (
            <RenameConfirmationModal
                oldId={renameConfirmation.oldId}
                newId={renameConfirmation.newId}
                onConfirm={handleConfirmRename}
                onCancel={handleCancelRename}
            />
        )}
       <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
                 <button onClick={onReset} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md hacker-button-default" title="Return to upload a new video">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>New Upload</span>
                </button>
                <h2 className="text-2xl font-bold text-green-400 tracking-wider">
                    &gt; Dubbing Studio
                </h2>
            </div>
            <div className="flex items-center gap-3">
                 <button onClick={onRegenerate} disabled={isRegenerating || !dubbedAudioData} className="flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-secondary">
                      {isRegenerating ? <><RefreshCwIcon className="w-5 h-5 animate-spin" /> APPLYING...</> : <><RefreshCwIcon className="w-5 h-5" /> Apply All Edits</>}
                  </button>
            </div>
        </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 hacker-container rounded-md p-4 space-y-6">
            <div>
              {dubbedAudioData ? (
                <div>
                    <h3 className="text-xl font-semibold mb-3 text-green-300 tracking-wider">[ VIDEO PREVIEW ]</h3>
                    <div className="inline-flex rounded-md shadow-sm mb-4" role="group">
                        <button type="button" onClick={() => setPreviewMode('dubbed')} className={`${buttonBaseClasses} rounded-l-md ${previewMode === 'dubbed' ? 'active' : ''}`}>
                            Dubbed Version ({targetLanguageDisplay})
                        </button>
                        <button type="button" onClick={() => setPreviewMode('original')} className={`${buttonBaseClasses} rounded-r-md ${previewMode === 'original' ? 'active' : ''}`}>
                            Original Version
                        </button>
                    </div>
                    {previewMode === 'dubbed' ? (
                        <>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                playsInline
                                className="w-full h-auto rounded-lg shadow-2xl"
                                onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                            />
                            <VideoPlayer 
                                videoRef={videoRef} 
                                audioData={dubbedAudioData} 
                                playbackRate={playbackRate} 
                                audioOffset={audioOffset} 
                            />
                        </>
                    ) : (
                        <video key={videoUrl} src={videoUrl} controls playsInline className="w-full h-auto rounded-md shadow-2xl border border-[var(--border-color)]" />
                    )}
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ PROCESSING... ]</h3>
                  <p className="text-green-400/70 mb-4">Please wait while the initial dubbing is generated.</p>
                  <video src={videoUrl} controls playsInline muted className="w-full h-auto rounded-md shadow-2xl border border-[var(--border-color)]" />
                </>
              )}
            </div>

            {dubbedAudioData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--border-color)]">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-green-300 tracking-wider">[ DOWNLOAD ASSETS ]</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onClick={handleDubbedVideoDownload} disabled={!dubbedAudioData || isDownloadingVideo} className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-primary">
                                <FilmIcon className="w-5 h-5" />
                                {isDownloadingVideo ? 'COMPILING...' : 'Dubbed Video'}
                            </button>
                            <button onClick={handleDubbedDownload} disabled={!dubbedAudioData} className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-default">
                                <DownloadIcon className="w-5 h-5" />
                                Dubbed Audio
                            </button>
                            <button onClick={handleOriginalDownload} disabled={!originalAudioUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-default col-span-1 sm:col-span-2">
                                <DownloadIcon className="w-5 h-5" />
                                Original Audio
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xl font-semibold text-green-300 tracking-wider">[ SYNC CALIBRATION ]</h3>
                            <button
                                onClick={() => { setPlaybackRate(1.0); setAudioOffset(0); }}
                                className="hacker-button-default text-xs px-2 py-1 flex items-center gap-1 rounded-md"
                                title="Reset sync settings to default"
                            >
                                <RefreshCwIcon className="w-3 h-3"/>
                                Reset Sync
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="playback-rate" className="flex justify-between items-center text-sm font-medium text-green-400/80 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span>Playback Speed</span>
                                        <div className="relative group">
                                            <HelpCircleIcon className="w-4 h-4 text-green-400/50 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-center text-white bg-black border border-[var(--border-color)] rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                                Adjusts the video playback speed. The dubbed audio will attempt to match this speed. Useful for reviewing quickly or slowly.
                                            </div>
                                        </div>
                                    </div>
                                    <span className="bg-black px-2 py-1 rounded-sm">{playbackRate.toFixed(2)}x</span>
                                </label>
                                <input id="playback-rate" type="range" min="0.75" max="1.5" step="0.05" value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                                <label htmlFor="audio-offset" className="flex items-center gap-2 text-sm font-medium text-green-400/80 mb-1">
                                    <span>Audio Offset (ms)</span>
                                    <div className="relative group">
                                        <HelpCircleIcon className="w-4 h-4 text-green-400/50 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-center text-white bg-black border border-[var(--border-color)] rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                            Shifts the dubbed audio forward (negative values) or backward (positive values) in time. Use this to fine-tune lip-sync.
                                        </div>
                                    </div>
                                </label>
                                <input id="audio-offset" type="number" step="10" value={audioOffset} onChange={(e) => setAudioOffset(parseInt(e.target.value, 10) || 0)} className="hacker-input text-sm block w-full p-2.5" />
                                <p className="text-xs text-green-400/60 mt-1">// Positive values delay audio.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>


        <div className="lg:col-span-2 hacker-container rounded-md flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
              <h3 className="text-xl font-semibold text-green-300 tracking-wider flex items-center gap-3">
                <LanguagesIcon className="w-6 h-6 text-green-400/70"/>
                Translation Editor
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={onAddNewSegment} disabled={isRegenerating} className="hacker-button-default px-3 py-1 text-sm flex items-center gap-2" title="Add new translation segment">
                    <PlusCircleIcon className="w-4 h-4" />
                    <span>Add Segment</span>
                </button>
                <button onClick={handleExportSrt} disabled={!editedTranslation} className="hacker-button-default px-3 py-1 text-sm flex items-center gap-2" title="Export as SRT file">
                    <FileDownIcon className="w-4 h-4" />
                    <span>SRT</span>
                </button>
              </div>
            </div>
            
            <div ref={editorScrollRef} className="flex-grow overflow-y-auto p-4">
              {editedTranslation ? (
                  <ul className="space-y-4">
                      {editedTranslation.map((segment, index) => {
                          const originalSegment = analysisResult.transcription.find(t => t.startTime === segment.startTime && t.speakerId === segment.speakerId);
                          const speaker = analysisResult.speakers.find(s => s.id === segment.speakerId);
                          const defaultVoiceName = voiceSelection[segment.speakerId];
                          const defaultVoice = speaker ? TTS_VOICES[speaker.gender]?.find(v => v.name === defaultVoiceName) : null;
                          const defaultVoiceLabel = defaultVoice ? defaultVoice.label : "Default";

                          return (
                              <li 
                                  key={`${segment.speakerId}-${segment.startTime}-${index}`} 
                                  onClick={() => handleSegmentClick(segment.startTime)}
                                  className={`p-3 border rounded-md bg-black/20 space-y-3 cursor-pointer transition-all duration-200 hover:border-cyan-400/50 ${index === activeSegmentIndex ? 'border-cyan-400 shadow-[0_0_10px_var(--secondary-color)]' : 'border-[var(--border-color)]'}`}
                              >
                                  <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-2 flex-grow">
                                          <label htmlFor={`speaker-select-${index}`} className="text-sm font-medium text-cyan-300 flex-shrink-0">Speaker:</label>
                                          <select
                                              id={`speaker-select-${index}`}
                                              value={segment.speakerId}
                                              onChange={(e) => onTranslationChange(index, { speakerId: e.target.value })}
                                              onClick={(e) => e.stopPropagation()} // Prevent li click when changing speaker
                                              disabled={isRegenerating}
                                              className="hacker-select flex-grow text-sm p-1"
                                              aria-label={`Select speaker for segment ${index + 1}`}
                                          >
                                              {analysisResult.speakers.map(sp => (
                                                  <option key={sp.id} value={sp.id}>
                                                      {sp.id}
                                                  </option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                          <button
                                              onClick={(e) => { e.stopPropagation(); onSegmentReorder(index, 'up'); }}
                                              disabled={isRegenerating || index === 0}
                                              className="hacker-button-default p-1.5 disabled:opacity-30"
                                              title="Move segment up"
                                          >
                                              <ArrowUpIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                              onClick={(e) => { e.stopPropagation(); onSegmentReorder(index, 'down'); }}
                                              disabled={isRegenerating || !editedTranslation || index === editedTranslation.length - 1}
                                              className="hacker-button-default p-1.5 disabled:opacity-30"
                                              title="Move segment down"
                                          >
                                              <ArrowDownIcon className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-4 text-sm font-mono">
                                    <div className="flex items-center gap-2">
                                      <label htmlFor={`start-time-${index}`} className="text-green-400/80">Start:</label>
                                      <div className="flex items-center gap-1">
                                        <input 
                                            type="number" id={`start-time-${index}`} value={segment.startTime.toFixed(3)}
                                            onChange={(e) => onTranslationChange(index, { startTime: parseFloat(e.target.value) || 0 })}
                                            onBlur={(e) => { e.target.value = (parseFloat(e.target.value) || 0).toFixed(3); }}
                                            onClick={(e) => e.stopPropagation()} step="0.01" min="0"
                                            className="hacker-input w-24 p-1 text-center" disabled={isRegenerating}
                                        />
                                        <button onClick={(e) => { e.stopPropagation(); handleSetTime(index, 'start'); }} className="hacker-button-default p-1.5" title="Set start time from video"><LocateFixedIcon className="w-4 h-4" /></button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label htmlFor={`end-time-${index}`} className="text-green-400/80">End:</label>
                                      <div className="flex items-center gap-1">
                                        <input 
                                            type="number" id={`end-time-${index}`} value={segment.endTime.toFixed(3)}
                                            onChange={(e) => onTranslationChange(index, { endTime: parseFloat(e.target.value) || 0 })}
                                            onBlur={(e) => { e.target.value = (parseFloat(e.target.value) || 0).toFixed(3); }}
                                            onClick={(e) => e.stopPropagation()} step="0.01" min={segment.startTime}
                                            className="hacker-input w-24 p-1 text-center" disabled={isRegenerating}
                                        />
                                        <button onClick={(e) => { e.stopPropagation(); handleSetTime(index, 'end'); }} className="hacker-button-default p-1.5" title="Set end time from video"><LocateFixedIcon className="w-4 h-4" /></button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {originalSegment && <p className="text-green-400/70 text-sm bg-black p-2 rounded-md font-sans">"{originalSegment.text}"</p>}
                                  
                                  <textarea
                                      value={segment.text}
                                      onChange={(e) => onTranslationChange(index, { text: e.target.value })}
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={isRegenerating}
                                      className="hacker-input w-full p-2 text-base rounded-md"
                                      rows={3} lang="ar" dir="rtl"
                                      aria-label={`Edit translation for segment ${index + 1}`}
                                  />

                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <select
                                        id={`voice-override-${index}`}
                                        value={voiceOverrides[index] || 'default'}
                                        onChange={(e) => onVoiceOverrideChange(index, e.target.value === 'default' ? null : e.target.value)}
                                        disabled={isRegenerating}
                                        className="hacker-select flex-grow text-sm p-2"
                                        aria-label={`Override voice for segment ${index + 1}`}
                                    >
                                      <option value="default">Default ({defaultVoiceLabel})</option>
                                      <optgroup label="Male Voices">
                                        {TTS_VOICES.male.map(voice => <option key={voice.name} value={voice.name}>{voice.label}</option>)}
                                      </optgroup>
                                      <optgroup label="Female Voices">
                                        {TTS_VOICES.female.map(voice => <option key={voice.name} value={voice.name}>{voice.label}</option>)}
                                      </optgroup>
                                    </select>
                                    <button onClick={() => handleSegmentPreview(segment, voiceOverrides[index])} disabled={isRegenerating || previewingSegment === segment.startTime} className="hacker-button-default px-3 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 w-32">
                                      {previewingSegment === segment.startTime ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <><PlayIcon className="w-4 h-4" /> Preview</>}
                                    </button>
                                  </div>
                              </li>
                          );
                      })}
                  </ul>
              ) : (
                  <p className="text-center text-green-400/70">Generating translation...</p>
              )}
            </div>
        </div>
      </div>
      
      <CollapsibleSection title="Voice & Dubbing Configuration" icon={<SettingsIcon className="w-6 h-6 text-green-400/70"/>} isExpanded={isConfigExpanded} onToggle={() => setIsConfigExpanded(!isConfigExpanded)}>
        <div className="space-y-4">
            <p className="text-sm text-green-400/70">Detected Language: <span className="bg-black px-2 py-1 rounded">{analysisResult.language}</span></p>
            {isVoiceCloningActive && <div className="p-3 text-sm text-center border rounded-md text-cyan-300 border-cyan-500/50 bg-cyan-900/20"><p><strong>Voice cloning active.</strong> Using pre-built voices as fallback.</p></div>}
            <span className="font-semibold text-green-300">Assign voice profile ({analysisResult.speakers.length} found):</span>
              <ul className="space-y-3">
                {analysisResult.speakers.map(speaker => {
                    const voiceOptions = speaker.gender === 'male' ? TTS_VOICES.male : TTS_VOICES.female;
                    const isPreviewing = previewingVoice === speaker.id;
                    return (
                        <li key={speaker.id} className={`text-sm p-3 hacker-container border rounded-md space-y-2`}>
                            <div className="flex justify-between items-center">
                                <EditableSpeakerName speakerId={speaker.id} onRename={(newId) => handleRequestRename(speaker.id, newId)} isEditingDisabled={isRegenerating} />
                                <div className="flex-shrink-0">
                                    <span className="text-xs text-gray-400 capitalize">({speaker.gender})</span>
                                    {typeof speaker.confidence === 'number' && <span className="text-xs text-gray-500 ml-2">({(speaker.confidence * 100).toFixed(0)}% conf)</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select id={`voice-select-${speaker.id}`} value={voiceSelection[speaker.id] || ''} onChange={(e) => onVoiceChange(speaker.id, e.target.value)} disabled={isRegenerating || isPreviewing} aria-label={`Select voice for ${speaker.id}`} className="hacker-select flex-grow text-sm block p-2 disabled:cursor-not-allowed">
                                    {voiceOptions.map(voice => <option key={voice.name} value={voice.name}>{voice.label}</option>)}
                                </select>
                                <button onClick={() => handleVoicePreview(speaker.id)} disabled={isRegenerating || isPreviewing || !voiceSelection[speaker.id]} className="hacker-button-default px-3 py-2 text-sm font-semibold rounded-md flex items-center justify-center w-28">
                                    {isPreviewing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Preview'}
                                </button>
                            </div>
                            {previewError[speaker.id] && <p className="text-xs text-red-400 text-right pr-1">{previewError[speaker.id]}</p>}
                        </li>
                    );
                })}
            </ul>
        </div>
      </CollapsibleSection>
      
      <CollapsibleSection title="Original Transcription Log" icon={<FileTextIcon className="w-6 h-6 text-green-400/70"/>} isExpanded={isTranscriptionExpanded} onToggle={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}>
        <div className="max-h-60 overflow-y-auto text-sm font-mono">
            {analysisResult.transcription.map((segment, index) => (
            <div key={index} className="mb-2">
                <p className="text-cyan-400">[{formatTime(segment.startTime)} &gt; {formatTime(segment.endTime)}] {segment.speakerId}:</p>
                <p className="pl-2 text-green-300">{segment.text}</p>
            </div>
            ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};