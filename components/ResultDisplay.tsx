import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisResult, TranscriptionSegment, TargetLanguage } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { base64ToUint8Array, createWavBlobFromPcm, createAudioBufferFromPcm, mergeVideoAndPcmAudio } from '../utils/media';
import { TTS_VOICES } from '../constants';
import { generateAudioClip } from '../services/geminiService';

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
    </svg>
);

interface ResultDisplayProps {
  videoUrl: string;
  dubbedAudioData: string | null;
  analysisResult: AnalysisResult & { translatedTranscription?: TranscriptionSegment[] };
  originalAudioUrl: string | null;
  voiceSelection: Record<string, string>;
  onVoiceChange: (speakerId: string, voiceName: string) => void;
  onSpeakerRename: (oldId: string, newId: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isVoiceCloningActive: boolean;
  targetLanguage: TargetLanguage;
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
    </svg>
);

const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
);

const RefreshCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M3 21v-5h5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    </svg>
);

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
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
    originalAudioUrl,
    voiceSelection,
    onVoiceChange,
    onSpeakerRename,
    onRegenerate,
    isRegenerating,
    isVoiceCloningActive,
    targetLanguage
}) => {
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioOffset, setAudioOffset] = useState(0); // in milliseconds
  const [previewingSpeaker, setPreviewingSpeaker] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<Record<string, string | null>>({});
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [previewMode, setPreviewMode] = useState<'dubbed' | 'original'>('dubbed');
  
  const targetLanguageDisplay = targetLanguage.charAt(0).toUpperCase() + targetLanguage.slice(1);

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
        alert("Sorry, there was an error preparing the audio file for download.");
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
      a.download = 'dubbed_video.webm'; // WebM is more reliable for MediaRecorder output
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to merge and download video:", error);
      alert("Sorry, there was an error preparing the video file for download.");
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const handlePreview = async (speakerId: string) => {
    setPreviewingSpeaker(speakerId);
    setPreviewError(prev => ({ ...prev, [speakerId]: null })); // Clear previous error

    try {
        const voiceName = voiceSelection[speakerId];
        const sampleSegment = analysisResult.translatedTranscription?.find(
            (seg) => seg.speakerId === speakerId
        );

        if (!sampleSegment || !voiceName) {
            throw new Error("No sample text available.");
        }

        const audioBase64 = await generateAudioClip(sampleSegment.text, voiceName);

        if (!audioBase64) {
            throw new Error("Could not generate preview.");
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const pcmData = base64ToUint8Array(audioBase64);
        const audioBuffer = await createAudioBufferFromPcm(pcmData, audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        source.onended = () => {
            audioContext.close().catch(console.error);
            setPreviewingSpeaker(null);
        };

    } catch (err) {
        console.error("Failed to generate preview audio:", err);
        const message = err instanceof Error ? err.message : "Audio preview failed.";
        setPreviewError(prev => ({ ...prev, [speakerId]: message }));
        setTimeout(() => setPreviewError(prev => ({ ...prev, [speakerId]: null })), 4000);
        setPreviewingSpeaker(null);
    }
  };
  
  const baseClasses = "hacker-button-primary px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none";

  return (
    <div className="mt-8 p-6 hacker-container rounded-md animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-green-400 tracking-wider">
        {dubbedAudioData ? '>> PROCESS COMPLETE: OUTPUT READY' : '>> ANALYSIS COMPLETE: AWAITING COMMAND'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {dubbedAudioData ? (
            <div className='mb-4'>
                <h3 className="text-xl font-semibold mb-3 text-green-300 tracking-wider">[ VIDEO PREVIEW ]</h3>
                <div className="inline-flex rounded-md shadow-sm mb-4" role="group">
                    <button
                        type="button"
                        onClick={() => setPreviewMode('dubbed')}
                        className={`${baseClasses} rounded-l-md ${previewMode === 'dubbed' ? 'active' : ''}`}
                    >
                        Dubbed Version ({targetLanguageDisplay})
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewMode('original')}
                        className={`${baseClasses} rounded-r-md ${previewMode === 'original' ? 'active' : ''}`}
                    >
                        Original Version
                    </button>
                </div>
                
                {previewMode === 'dubbed' ? (
                    <VideoPlayer 
                        videoSrc={videoUrl} 
                        audioData={dubbedAudioData}
                        playbackRate={playbackRate}
                        audioOffset={audioOffset}
                    />
                ) : (
                    <video
                        key={videoUrl}
                        src={videoUrl}
                        controls
                        playsInline
                        className="w-full h-auto rounded-md shadow-2xl border border-[var(--border-color)]"
                    />
                )}
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ ORIGINAL VIDEO ]</h3>
              <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full h-auto rounded-md shadow-2xl border border-[var(--border-color)]"
              />
            </>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ VOICE CONFIGURATION ]</h3>
            <div className="p-4 rounded-md space-y-3 hacker-container border-0">
                 <div>
                    <p className="text-sm mb-3 text-green-400/70">Detected Language: <span className="bg-black px-2 py-1 rounded">{analysisResult.language}</span></p>
                    
                    {isVoiceCloningActive && (
                        <div className="p-3 mb-3 text-sm text-center border rounded-md text-cyan-300 border-cyan-500/50 bg-cyan-900/20">
                            <p><strong>Voice cloning active.</strong> Uploaded sample will be used for all speakers.</p>
                        </div>
                    )}

                    <span className="font-semibold text-green-300">Assign voice profile ({analysisResult.speakers.length} found):</span>
                     <ul className="mt-2 space-y-3">
                        {analysisResult.speakers.map(speaker => {
                            const voiceOptions = speaker.gender === 'male' ? TTS_VOICES.male : TTS_VOICES.female;
                            const isPreviewing = previewingSpeaker === speaker.id;
                            
                            return (
                                <li key={speaker.id} className={`text-sm p-3 hacker-container border rounded-md space-y-2 ${isVoiceCloningActive ? 'opacity-60' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <EditableSpeakerName
                                            speakerId={speaker.id}
                                            onRename={(newId) => onSpeakerRename(speaker.id, newId)}
                                            isEditingDisabled={isRegenerating || isVoiceCloningActive}
                                        />
                                        <div className="flex-shrink-0">
                                            <span className="text-xs text-gray-400 capitalize">({speaker.gender})</span>
                                            {typeof speaker.confidence === 'number' && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    ({(speaker.confidence * 100).toFixed(0)}% conf)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            id={`voice-select-${speaker.id}`}
                                            value={voiceSelection[speaker.id] || ''}
                                            onChange={(e) => onVoiceChange(speaker.id, e.target.value)}
                                            disabled={isRegenerating || isPreviewing || isVoiceCloningActive}
                                            aria-label={`Select voice for ${speaker.id}`}
                                            className="hacker-select flex-grow text-sm block p-2 disabled:cursor-not-allowed"
                                        >
                                            {voiceOptions.map(voice => (
                                                <option key={voice.name} value={voice.name}>{voice.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handlePreview(speaker.id)}
                                            disabled={isRegenerating || isPreviewing || !voiceSelection[speaker.id] || isVoiceCloningActive}
                                            className="hacker-button-default px-3 py-2 text-sm font-semibold rounded-md flex items-center justify-center w-28"
                                        >
                                            {isPreviewing ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                'Preview'
                                            )}
                                        </button>
                                    </div>
                                    {previewError[speaker.id] && (
                                        <p className="text-xs text-red-400 text-right pr-1">
                                            {previewError[speaker.id]}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                 </div>
            </div>
          </div>
          
          {dubbedAudioData && (
            <>
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ DUBBING CONTROL ]</h3>
                    <div className="p-4 rounded-md hacker-container border-0">
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-secondary"
                        >
                            {isRegenerating ? (
                                <>
                                    <RefreshCwIcon className="w-5 h-5 animate-spin" />
                                    REGENERATING AUDIO...
                                </>
                            ) : (
                                <>
                                    <RefreshCwIcon className="w-5 h-5" />
                                    Update Dubbed Audio
                                </>
                            )}
                        </button>
                    </div>
                </div>
              
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ DOWNLOAD ASSETS ]</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <button
                            onClick={handleDubbedVideoDownload}
                            disabled={!dubbedAudioData || isDownloadingVideo}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-primary"
                        >
                            <FilmIcon className="w-5 h-5" />
                            {isDownloadingVideo ? 'COMPILING...' : 'Dubbed Video'}
                        </button>
                        <button
                            onClick={handleDubbedDownload}
                            disabled={!dubbedAudioData}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-default"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Dubbed Audio
                        </button>
                        <button
                            onClick={handleOriginalDownload}
                            disabled={!originalAudioUrl}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-md hacker-button-default"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Original Audio
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ SYNC CALIBRATION ]</h3>
                    <div className="p-4 rounded-md space-y-4 hacker-container border-0">
                        <div>
                            <label htmlFor="playback-rate" className="flex justify-between text-sm font-medium text-green-400/80 mb-1">
                                <span>Playback Speed</span>
                                <span className="bg-black px-2 py-1 rounded-sm">{playbackRate.toFixed(2)}x</span>
                            </label>
                            <input
                                id="playback-rate"
                                type="range"
                                min="0.75"
                                max="1.5"
                                step="0.05"
                                value={playbackRate}
                                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <label htmlFor="audio-offset" className="block text-sm font-medium text-green-400/80 mb-1">Audio Offset (ms)</label>
                            <input
                                id="audio-offset"
                                type="number"
                                step="10"
                                value={audioOffset}
                                onChange={(e) => setAudioOffset(parseInt(e.target.value, 10) || 0)}
                                className="hacker-input text-sm block w-full p-2.5"
                            />
                             <p className="text-xs text-green-400/60 mt-1">// Positive values delay audio, negative values advance it.</p>
                        </div>
                    </div>
                </div>
            </>
          )}

          <div>
            <h3 className="text-xl font-semibold mb-2 text-green-300 tracking-wider">[ ORIGINAL TRANSCRIPTION LOG ]</h3>
            <div className="p-4 rounded-md max-h-60 overflow-y-auto text-sm hacker-container border-0 font-mono">
              {analysisResult.transcription.map((segment, index) => (
                <div key={index} className="mb-2">
                    <p className="text-cyan-400">
                        [{formatTime(segment.startTime)} &gt; {formatTime(segment.endTime)}] {segment.speakerId}:
                    </p>
                    <p className="pl-2 text-green-300">{segment.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};