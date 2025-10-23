import React, { useState } from 'react';
import type { AnalysisResult, TranscriptionSegment } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { base64ToUint8Array, createWavBlobFromPcm, createAudioBufferFromPcm, mergeVideoAndPcmAudio } from '../utils/media';
import { ARABIC_VOICES } from '../constants';
import { generateAudioClip } from '../services/geminiService';


interface ResultDisplayProps {
  videoUrl: string;
  dubbedAudioData: string | null;
  analysisResult: AnalysisResult & { translatedTranscription?: TranscriptionSegment[] };
  originalAudioUrl: string | null;
  voiceSelection: Record<string, string>;
  onVoiceChange: (speakerId: string, voiceName: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isVoiceCloningActive: boolean;
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

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    videoUrl, 
    dubbedAudioData, 
    analysisResult, 
    originalAudioUrl,
    voiceSelection,
    onVoiceChange,
    onRegenerate,
    isRegenerating,
    isVoiceCloningActive
}) => {
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioOffset, setAudioOffset] = useState(0); // in milliseconds
  const [previewingSpeaker, setPreviewingSpeaker] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<Record<string, string | null>>({});
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);

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
      a.download = 'dubbed_video.mp4';
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
        };

    } catch (err) {
        console.error("Failed to generate preview audio:", err);
        const message = err instanceof Error ? err.message : "Audio preview failed.";
        setPreviewError(prev => ({ ...prev, [speakerId]: message }));
        // Automatically clear the error message after 4 seconds
        setTimeout(() => setPreviewError(prev => ({ ...prev, [speakerId]: null })), 4000);
    } finally {
        setPreviewingSpeaker(null);
    }
  };

  return (
    <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg animate-fade-in border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-teal-400">
        {dubbedAudioData ? 'Dubbing Complete!' : 'Analysis Complete'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {dubbedAudioData ? (
            <>
              <h3 className="text-xl font-semibold mb-2 text-gray-200">Dubbed Video (Arabic)</h3>
              <VideoPlayer 
                videoSrc={videoUrl} 
                audioData={dubbedAudioData}
                playbackRate={playbackRate}
                audioOffset={audioOffset}
              />
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2 text-gray-200">Original Video</h3>
              <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full h-auto rounded-lg shadow-2xl"
              />
            </>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Voice Configuration</h3>
            <div className="bg-gray-700/50 p-4 rounded-md space-y-3 text-gray-300">
                 <div>
                    <p className="text-sm mb-3 text-gray-400">Detected Language: <span className="font-mono bg-gray-600 px-2 py-1 rounded">{analysisResult.language}</span></p>
                    
                    {isVoiceCloningActive && (
                        <div className="p-3 mb-3 text-sm text-center bg-blue-900/50 border border-blue-700 rounded-md text-blue-300">
                            <p><strong>Voice cloning active.</strong> The uploaded voice sample will be used for all speakers.</p>
                        </div>
                    )}

                    <span className="font-semibold">Assign a voice for each speaker ({analysisResult.speakers.length}):</span>
                     <ul className="mt-2 space-y-3">
                        {analysisResult.speakers.map(speaker => {
                            const voiceOptions = speaker.gender === 'male' ? ARABIC_VOICES.male : ARABIC_VOICES.female;
                            const isPreviewing = previewingSpeaker === speaker.id;
                            
                            return (
                                <li key={speaker.id} className={`text-sm p-3 bg-gray-800/60 rounded-md space-y-2 ${isVoiceCloningActive ? 'opacity-60' : ''}`}>
                                    <div>
                                        <span className="font-medium text-gray-200">{speaker.id}</span>
                                        <span className="text-xs text-gray-400 ml-2 capitalize">({speaker.gender})</span>
                                        {typeof speaker.confidence === 'number' && (
                                            <span className="font-mono text-xs text-gray-500 ml-2">
                                                ({(speaker.confidence * 100).toFixed(0)}% confidence)
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            id={`voice-select-${speaker.id}`}
                                            value={voiceSelection[speaker.id] || ''}
                                            onChange={(e) => onVoiceChange(speaker.id, e.target.value)}
                                            disabled={isRegenerating || isPreviewing || isVoiceCloningActive}
                                            aria-label={`Select voice for ${speaker.id}`}
                                            className="flex-grow bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2 disabled:cursor-not-allowed"
                                        >
                                            {voiceOptions.map(voice => (
                                                <option key={voice.name} value={voice.name}>{voice.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handlePreview(speaker.id)}
                                            disabled={isRegenerating || isPreviewing || !voiceSelection[speaker.id] || isVoiceCloningActive}
                                            className="px-3 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-500 transition-colors duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center w-28"
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
                    <h3 className="text-xl font-semibold mb-2 text-gray-200">Dubbing Control</h3>
                    <div className="bg-gray-700/50 p-4 rounded-md">
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors duration-200 disabled:bg-blue-800 disabled:cursor-not-allowed"
                        >
                            {isRegenerating ? (
                                <>
                                    <RefreshCwIcon className="w-5 h-5 animate-spin" />
                                    Updating Audio...
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
                    <h3 className="text-xl font-semibold mb-2 text-gray-200">Downloads</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <button
                            onClick={handleDubbedVideoDownload}
                            disabled={!dubbedAudioData || isDownloadingVideo}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-colors duration-200 disabled:bg-teal-800 disabled:cursor-not-allowed"
                        >
                            <FilmIcon className="w-5 h-5" />
                            {isDownloadingVideo ? 'Preparing...' : 'Dubbed Video (.mp4)'}
                        </button>
                        <button
                            onClick={handleDubbedDownload}
                            disabled={!dubbedAudioData}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Dubbed Audio (.wav)
                        </button>
                        <button
                            onClick={handleOriginalDownload}
                            disabled={!originalAudioUrl}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Original Audio (.wav)
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-200">Audio Synchronization</h3>
                    <div className="bg-gray-700/50 p-4 rounded-md space-y-4">
                        <div>
                            <label htmlFor="playback-rate" className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                                <span>Playback Speed</span>
                                <span className="font-mono bg-gray-600 px-2 py-1 rounded-sm">{playbackRate.toFixed(2)}x</span>
                            </label>
                            <input
                                id="playback-rate"
                                type="range"
                                min="0.75"
                                max="1.5"
                                step="0.05"
                                value={playbackRate}
                                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="audio-offset" className="block text-sm font-medium text-gray-300 mb-1">Audio Offset (ms)</label>
                            <input
                                id="audio-offset"
                                type="number"
                                step="10"
                                value={audioOffset}
                                onChange={(e) => setAudioOffset(parseInt(e.target.value, 10) || 0)}
                                className="bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"
                            />
                             <p className="text-xs text-gray-400 mt-1">Positive values play audio later, negative values play it earlier.</p>
                        </div>
                    </div>
                </div>
            </>
          )}

          <div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Original Transcription</h3>
            <div className="bg-gray-700/50 p-4 rounded-md text-gray-300 max-h-60 overflow-y-auto text-sm font-mono">
              {analysisResult.transcription.map((segment, index) => (
                <div key={index} className="mb-2">
                    <p className="text-teal-400">
                        [{formatTime(segment.startTime)} → {formatTime(segment.endTime)}] {segment.speakerId}:
                    </p>
                    <p className="pl-2 text-gray-200">{segment.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};