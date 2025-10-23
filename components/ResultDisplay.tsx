import React, { useState, useMemo } from 'react';
import type { AnalysisResult } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { base64ToUint8Array, createWavBlobFromPcm } from '../utils/media';
import { ARABIC_VOICES } from '../constants';

interface ResultDisplayProps {
  videoUrl: string;
  dubbedAudioData: string | null;
  analysisResult: AnalysisResult;
  originalAudioUrl: string | null;
  voiceSelection: { male: string; female: string };
  onVoiceChange: (gender: 'male' | 'female', voiceName: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
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


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    videoUrl, 
    dubbedAudioData, 
    analysisResult, 
    originalAudioUrl,
    voiceSelection,
    onVoiceChange,
    onRegenerate,
    isRegenerating
}) => {
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioOffset, setAudioOffset] = useState(0); // in milliseconds

  const { hasMaleSpeakers, hasFemaleSpeakers } = useMemo(() => {
    return {
      hasMaleSpeakers: analysisResult.speakers.some(s => s.gender === 'male'),
      hasFemaleSpeakers: analysisResult.speakers.some(s => s.gender === 'female'),
    };
  }, [analysisResult.speakers]);

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
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Analysis Details</h3>
            <div className="bg-gray-700/50 p-4 rounded-md space-y-3 text-gray-300">
                 <div className="flex justify-between items-center">
                    <span>Detected Language:</span>
                    <span className="font-mono bg-gray-600 px-2 py-1 rounded">{analysisResult.language}</span>
                 </div>
                 <div>
                    <span className="font-semibold">Speakers ({analysisResult.speakers.length}):</span>
                     <ul className="mt-2 space-y-2">
                        {analysisResult.speakers.map(speaker => (
                            <li key={speaker.id} className="text-sm flex justify-between items-center p-2 bg-gray-800/60 rounded-md">
                                <div>
                                    <span className="font-medium text-gray-200">{speaker.id}</span>
                                    <span className="text-xs text-gray-400 ml-2 capitalize">({speaker.gender})</span>
                                </div>
                                {typeof speaker.confidence === 'number' && (
                                    <span className="font-mono text-xs bg-gray-600 px-2 py-1 rounded">
                                        Confidence: {(speaker.confidence * 100).toFixed(0)}%
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                 </div>
            </div>
          </div>
          
          {dubbedAudioData && (
            <>
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-200">Voice Configuration</h3>
                    <div className="bg-gray-700/50 p-4 rounded-md space-y-3">
                        {hasMaleSpeakers && (
                           <div className="grid grid-cols-3 items-center gap-2">
                                <label htmlFor="voice-select-male" className="text-gray-300 col-span-1">All Male Speakers:</label>
                                <select
                                    id="voice-select-male"
                                    value={voiceSelection.male}
                                    onChange={(e) => onVoiceChange('male', e.target.value)}
                                    disabled={isRegenerating}
                                    className="col-span-2 w-full bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5"
                                >
                                    {ARABIC_VOICES.male.map(voice => (
                                        <option key={voice.name} value={voice.name}>{voice.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {hasFemaleSpeakers && (
                            <div className="grid grid-cols-3 items-center gap-2">
                                <label htmlFor="voice-select-female" className="text-gray-300 col-span-1">All Female Speakers:</label>
                                <select
                                    id="voice-select-female"
                                    value={voiceSelection.female}
                                    onChange={(e) => onVoiceChange('female', e.target.value)}
                                    disabled={isRegenerating}
                                    className="col-span-2 w-full bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5"
                                >
                                    {ARABIC_VOICES.female.map(voice => (
                                        <option key={voice.name} value={voice.name}>{voice.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors duration-200 disabled:bg-blue-800 disabled:cursor-not-allowed"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                        onClick={handleDubbedDownload}
                        disabled={!dubbedAudioData}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 transition-colors duration-200 disabled:bg-teal-800 disabled:cursor-not-allowed"
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
            <div className="bg-gray-700/50 p-4 rounded-md text-gray-300 max-h-40 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm">{analysisResult.transcription}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};