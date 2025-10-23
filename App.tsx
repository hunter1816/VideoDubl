import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { VoiceUploader } from './components/VoiceUploader';
import { StatusIndicator } from './components/StatusIndicator';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ResultDisplay } from './components/ResultDisplay';
import { DialectSelector } from './components/DialectSelector';
import { TargetLanguageSelector } from './components/TargetLanguageSelector';
import { LanguageConfirmationModal } from './components/LanguageConfirmationModal';
import { analyzeVideo, translateText, generateDubbedAudio } from './services/geminiService';
import { extractAudioFromVideoAsWavBlob } from './utils/media';
import type { ProcessStep, AnalysisResult, SpeakerProfile, TranscriptionSegment, Dialect } from './types';
import { STEPS, ARABIC_VOICES } from './constants';

// Extend AnalysisResult type locally for component state
type AppAnalysisResult = AnalysisResult & { translatedTranscription?: TranscriptionSegment[] };

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioData, setDubbedAudioData] = useState<string | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AppAnalysisResult | null>(null);
  const [dialect, setDialect] = useState<Dialect>('standard');
  const [voiceSelection, setVoiceSelection] = useState<Record<string, string>>({});
  const [voiceSampleFile, setVoiceSampleFile] = useState<File | null>(null);
  const [showLanguageConfirmation, setShowLanguageConfirmation] = useState(false);

  const isInitialProcessing = ['analyzing', 'translating', 'dubbing'].includes(currentStep);
  const isRegenerating = currentStep === 'regenerating';

  const resetProcessingState = () => {
    setVideoFile(null);
    setDubbedAudioData(null);
    setCurrentStep('idle');
    setError(null);
    setAnalysisResult(null);
    setDialect('standard');
    setVoiceSelection({});
    setVoiceSampleFile(null);
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

  const startTranslationAndDubbing = useCallback(async (isRegen = false) => {
    setError(null);
    if (!analysisResult) {
        throw new Error("Cannot proceed without analysis results.");
    }

    try {
        let translatedSegments: TranscriptionSegment[];
        const speakers = analysisResult.speakers;
        let audioBase64: string;

        const currentStepBeforeDub = isRegen ? 'regenerating' : 'translating';
        setCurrentStep(currentStepBeforeDub);
        
        translatedSegments = await translateText(analysisResult.transcription, analysisResult.language, dialect);
        setAnalysisResult(prev => ({ ...prev!, translatedTranscription: translatedSegments }));
        
        setCurrentStep(isRegen ? 'regenerating' : 'dubbing');
        audioBase64 = await generateDubbedAudio(translatedSegments, speakers, voiceSelection, voiceSampleFile);

        setDubbedAudioData(audioBase64);
        setCurrentStep('done');
    } catch (err) {
         console.error(err);
         setError(err instanceof Error ? err.message : 'An unknown error occurred.');
         setCurrentStep('error');
    }
  }, [analysisResult, dialect, voiceSelection, voiceSampleFile]);

  const handleVideoAnalysis = useCallback(async (file: File) => {
      setError(null);
      setCurrentStep('analyzing');
      try {
          const analysis = await analyzeVideo(file);

          const initialVoiceSelection: Record<string, string> = {};
          analysis.speakers.forEach(speaker => {
              if (speaker.gender === 'male') {
                  initialVoiceSelection[speaker.id] = ARABIC_VOICES.male[0].name;
              } else if (speaker.gender === 'female') {
                  initialVoiceSelection[speaker.id] = ARABIC_VOICES.female[0].name;
              }
          });
          setVoiceSelection(initialVoiceSelection);
          
          setAnalysisResult(analysis); 
          
          if (analysis.language.toLowerCase().includes('english')) {
              startTranslationAndDubbing(false);
          } else {
              setShowLanguageConfirmation(true);
          }
      } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          setCurrentStep('error');
      }
  }, [startTranslationAndDubbing]);

  const handleFileChange = (file: File | null) => {
    resetProcessingState();
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      handleVideoAnalysis(file);
      handleExtractOriginalAudio(file);
    }
  };
  
  const handleVoiceSampleChange = (file: File | null) => {
    setVoiceSampleFile(file);
  };

  const handleVoiceSelectionChange = (speakerId: string, voiceName: string) => {
    setVoiceSelection(prev => ({ ...prev, [speakerId]: voiceName }));
  };
  
  const handleDialectChange = (newDialect: Dialect) => {
    setDialect(newDialect);
  };

  const handleRegenerate = () => {
    if (videoFile) {
      startTranslationAndDubbing(true);
    }
  };

  const handleConfirmAndProceed = () => {
      setShowLanguageConfirmation(false);
      startTranslationAndDubbing(false);
  };

  const handleCancelConfirmation = () => {
      setShowLanguageConfirmation(false);
      resetProcessingState();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        
        {showLanguageConfirmation && analysisResult && (
            <LanguageConfirmationModal
                detectedLanguage={analysisResult.language}
                onConfirm={handleConfirmAndProceed}
                onCancel={handleCancelConfirmation}
            />
        )}

        <Header />
        <main className="mt-8 space-y-8">
          <div className="p-6 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TargetLanguageSelector
                    selectedLanguage="arabic"
                    onLanguageChange={() => {}}
                    disabled={isInitialProcessing || isRegenerating}
                />
                <DialectSelector
                selectedDialect={dialect}
                onDialectChange={handleDialectChange}
                disabled={isInitialProcessing || isRegenerating}
                />
            </div>

            <div className="pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-gray-100">Upload Video</h3>
              <p className="text-sm text-gray-400 mb-3">Select the video file you want to dub. The AI will detect all speakers and their timing automatically.</p>
              <FileUploader onFileSelect={handleFileChange} disabled={isInitialProcessing || isRegenerating} />
            </div>
            <VoiceUploader 
              selectedFile={voiceSampleFile} 
              onFileChange={handleVoiceSampleChange}
              disabled={isInitialProcessing || isRegenerating}
            />
          </div>

          {isInitialProcessing && <Loader />}
          
          {currentStep !== 'idle' && !isRegenerating && <StatusIndicator currentStep={currentStep} steps={STEPS} />}
          
          {error && <ErrorDisplay message={error} />}

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
              isVoiceCloningActive={!!voiceSampleFile}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
