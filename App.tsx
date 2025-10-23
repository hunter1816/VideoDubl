import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { StatusIndicator } from './components/StatusIndicator';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ResultDisplay } from './components/ResultDisplay';
import { analyzeVideo, translateText, generateDubbedAudio } from './services/geminiService';
import { extractAudioFromVideoAsWavBlob } from './utils/media';
import type { ProcessStep, AnalysisResult, SpeakerProfile } from './types';
import { STEPS, ARABIC_VOICES } from './constants';

// Extend AnalysisResult type locally for component state
type AppAnalysisResult = AnalysisResult & { translatedTranscription?: string };

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioData, setDubbedAudioData] = useState<string | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AppAnalysisResult | null>(null);
  const [voiceSelection, setVoiceSelection] = useState({
    male: ARABIC_VOICES.male[0].name,
    female: ARABIC_VOICES.female[0].name,
  });

  const isInitialProcessing = ['analyzing', 'translating', 'dubbing'].includes(currentStep);
  const isRegenerating = currentStep === 'regenerating';

  const resetProcessingState = () => {
    setVideoFile(null);
    setDubbedAudioData(null);
    setCurrentStep('idle');
    setError(null);
    setAnalysisResult(null);
    setVoiceSelection({
      male: ARABIC_VOICES.male[0].name,
      female: ARABIC_VOICES.female[0].name,
    });
    if(videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    if(originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
    setOriginalAudioUrl(null);
  };

  const handleExtractOriginalAudio = async (file: File) => {
    try {
      const audioBlob = await extractAudioFromVideoAsWavBlob(file);
      const url = URL.createObjectURL(audioBlob);
      setOriginalAudioUrl(url);
    } catch (err) {
      console.error("Failed to extract original audio:", err);
      // Non-critical error, so we don't set the main error state
    }
  };
  
  const handleDubVideo = useCallback(async (file: File, isRegen = false) => {
    setError(null);

    try {
      let translatedText: string;
      let speakers: SpeakerProfile[];

      if (!isRegen) {
        // --- Initial Processing ---
        setCurrentStep('analyzing');
        const analysis = await analyzeVideo(file);
        
        // Always set analysis result to show details, even if there's an error later.
        setAnalysisResult({ ...analysis, translatedTranscription: "" });
        
        speakers = analysis.speakers;

        setCurrentStep('translating');
        translatedText = await translateText(analysis.transcription, analysis.language);

        // Update analysis result with translated text
        setAnalysisResult(prev => ({ ...prev!, translatedTranscription: translatedText }));

      } else {
        // --- Re-generating with new voices ---
        if (!analysisResult || !analysisResult.translatedTranscription || !analysisResult.speakers) {
          throw new Error("Cannot regenerate audio without initial analysis results.");
        }
        setCurrentStep('regenerating');
        speakers = analysisResult.speakers;
        translatedText = analysisResult.translatedTranscription;
      }
      
      const voicesForDubbing: Record<string, string> = {};
      speakers.forEach(speaker => {
        if (speaker.gender === 'male') {
          voicesForDubbing[speaker.id] = voiceSelection.male;
        } else if (speaker.gender === 'female') {
          voicesForDubbing[speaker.id] = voiceSelection.female;
        }
      });

      setCurrentStep(isRegen ? 'regenerating' : 'dubbing');
      const audioBase64 = await generateDubbedAudio(translatedText, speakers, voicesForDubbing);
      setDubbedAudioData(audioBase64);

      setCurrentStep('done');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setCurrentStep('error');
    }
  }, [analysisResult, voiceSelection]);
  
  const handleFileChange = (file: File | null) => {
    resetProcessingState();
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      handleDubVideo(file);
      handleExtractOriginalAudio(file);
    }
  };

  const handleVoiceSelectionChange = (gender: 'male' | 'female', voiceName: string) => {
    setVoiceSelection(prev => ({ ...prev, [gender]: voiceName }));
  };

  const handleRegenerate = () => {
    if (videoFile) {
      handleDubVideo(videoFile, true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <Header />
        <main className="mt-8 space-y-8">
          <div className="p-6 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-100">Upload Video</h3>
              <p className="text-sm text-gray-400 mb-3">Select the video file you want to dub. The AI will detect all speakers automatically.</p>
              <FileUploader onFileSelect={handleFileChange} disabled={isInitialProcessing} />
            </div>
          </div>

          {isInitialProcessing && <Loader />}
          
          {currentStep !== 'idle' && !isRegenerating && <StatusIndicator currentStep={currentStep} steps={STEPS} />}
          
          {error && <ErrorDisplay message={error} />}

          {/* Show results if analysis is complete, even if there was a subsequent error preventing dubbing */}
          {(currentStep === 'done' || (currentStep === 'error' && analysisResult)) && videoUrl && analysisResult && (
            <ResultDisplay
              videoUrl={videoUrl}
              dubbedAudioData={dubbedAudioData}
              analysisResult={analysisResult}
              originalAudioUrl={originalAudioUrl}
              voiceSelection={voiceSelection}
              onVoiceChange={handleVoiceSelectionChange}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;