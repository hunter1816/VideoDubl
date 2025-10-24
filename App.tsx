
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { VoiceUploader } from './components/VoiceUploader';
import { TerminalLog } from './components/TerminalLog';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ResultDisplay } from './components/ResultDisplay';
import { DialectSelector } from './components/DialectSelector';
import { TargetLanguageSelector } from './components/TargetLanguageSelector';
import { LanguageConfirmationModal } from './components/LanguageConfirmationModal';
import { analyzeVideo, translateText, generateDubbedAudio } from './services/geminiService';
import { extractAudioFromVideoAsWavBlob } from './utils/media';
import type { ProcessStep, AnalysisResult, SpeakerProfile, TranscriptionSegment, Dialect, TargetLanguage } from './types';
import { STEPS, TTS_VOICES } from './constants';

// Extend AnalysisResult type locally for component state
type AppAnalysisResult = AnalysisResult & { translatedTranscription?: TranscriptionSegment[] };

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);


const App: React.FC = () => {
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioData, setDubbedAudioData] = useState<string | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AppAnalysisResult | null>(null);
  const [editedTranslation, setEditedTranslation] = useState<TranscriptionSegment[] | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('arabic');
  const [dialect, setDialect] = useState<Dialect>('standard');
  const [voiceSelection, setVoiceSelection] = useState<Record<string, string>>({});
  const [voiceSampleFile, setVoiceSampleFile] = useState<File | null>(null);
  const [showLanguageConfirmation, setShowLanguageConfirmation] = useState(false);

  useEffect(() => {
    // A simple check to see if the API key exists.
    if (process.env.API_KEY) {
      setIsApiKeySet(true);
    }
  }, []);

  useEffect(() => {
    // When the official translated transcription is available, initialize the editable state
    if (analysisResult?.translatedTranscription && videoFile) {
        const storageKey = `dubber-translation-${videoFile.name}`;
        const savedTranslationJson = localStorage.getItem(storageKey);
        
        if (savedTranslationJson) {
            try {
                const savedTranslation = JSON.parse(savedTranslationJson);
                // Simple validation to ensure the loaded data matches the current video's structure
                if (Array.isArray(savedTranslation) && savedTranslation.length === analysisResult.translatedTranscription.length) {
                    setEditedTranslation(savedTranslation);
                    return; // Use the saved version
                } else {
                    console.warn("Saved translation in localStorage is mismatched, ignoring.");
                }
            } catch (e) {
                console.error("Failed to parse saved translation from localStorage.", e);
                localStorage.removeItem(storageKey); // Clear corrupted data
            }
        }

      // If no valid saved version, use the newly generated one
      setEditedTranslation(analysisResult.translatedTranscription);
    }
  }, [analysisResult?.translatedTranscription, videoFile]);

  const isInitialProcessing = ['analyzing', 'translating', 'dubbing'].includes(currentStep);
  const isRegenerating = currentStep === 'regenerating';
  const showResultsPage = (currentStep === 'done' || (currentStep === 'error' && analysisResult)) && videoUrl && analysisResult;

  const resetProcessingState = () => {
    setVideoFile(null);
    setDubbedAudioData(null);
    setCurrentStep('idle');
    setError(null);
    setAnalysisResult(null);
    setEditedTranslation(null);
    setTargetLanguage('arabic');
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

  const startTranslationAndDubbing = useCallback(async (
    isRegen = false, 
    initialAnalysis?: AppAnalysisResult,
    voiceConfig?: Record<string, string>
  ) => {
    setError(null);
    const currentAnalysis = initialAnalysis || analysisResult;
    const currentVoices = voiceConfig || voiceSelection;

    if (!currentAnalysis) {
        setError("Analysis data is missing. Cannot proceed.");
        setCurrentStep('error');
        return;
    }

    try {
        const speakers = currentAnalysis.speakers;
        let segmentsToDub: TranscriptionSegment[];

        if (isRegen) {
            setCurrentStep('regenerating');
            if (!editedTranslation) {
                throw new Error("Cannot regenerate dubbing without the translated text.");
            }
            segmentsToDub = editedTranslation;
        } else {
            // For the initial run, we perform the translation first.
            setCurrentStep('translating');
            const translatedSegments = await translateText(
                currentAnalysis.transcription,
                currentAnalysis.language,
                targetLanguage,
                targetLanguage === 'arabic' ? dialect : null
            );
            // This will trigger the useEffect to setEditedTranslation
            const resultWithTranslation = { ...currentAnalysis, translatedTranscription: translatedSegments };
            setAnalysisResult(resultWithTranslation);
            segmentsToDub = translatedSegments;
        }
        
        setCurrentStep(isRegen ? 'regenerating' : 'dubbing');
        const audioBase64 = await generateDubbedAudio(segmentsToDub, speakers, currentVoices, voiceSampleFile);

        setDubbedAudioData(audioBase64);
        setCurrentStep('done');
    } catch (err) {
         console.error(err);
         setError(err instanceof Error ? err.message : 'An unknown error occurred.');
         setCurrentStep('error');
    }
  }, [analysisResult, dialect, voiceSelection, voiceSampleFile, targetLanguage, editedTranslation]);

  const handleVideoAnalysis = useCallback(async (file: File) => {
      setError(null);
      setCurrentStep('analyzing');
      try {
          const analysis = await analyzeVideo(file);

          const initialVoiceSelection: Record<string, string> = {};
          analysis.speakers.forEach(speaker => {
              if (speaker.gender === 'male') {
                  initialVoiceSelection[speaker.id] = TTS_VOICES.male[0].name;
              } else if (speaker.gender === 'female') {
                  initialVoiceSelection[speaker.id] = TTS_VOICES.female[0].name;
              }
          });
          setVoiceSelection(initialVoiceSelection);
          
          setAnalysisResult(analysis); 
          
          // For simplicity in this flow, we will assume English and proceed.
          // In a real app, the confirmation modal is a good idea.
          startTranslationAndDubbing(false, analysis, initialVoiceSelection);
          // if (analysis.language.toLowerCase().includes('english')) {
          //     startTranslationAndDubbing(false, analysis, initialVoiceSelection);
          // } else {
          //     setShowLanguageConfirmation(true);
          // }
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

  const handleTranslationChange = (index: number, newText: string) => {
    if (!editedTranslation) return;
    const newTranslation = [...editedTranslation];
    newTranslation[index] = { ...newTranslation[index], text: newText };
    setEditedTranslation(newTranslation);

    // Auto-save to localStorage
    if (videoFile) {
        const storageKey = `dubber-translation-${videoFile.name}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(newTranslation));
        } catch (e) {
            console.error("Failed to save translation to localStorage.", e);
        }
    }
  };
  
  const handleDialectChange = (newDialect: Dialect) => {
    setDialect(newDialect);
  };

  const handleLanguageChange = (lang: TargetLanguage) => {
    setTargetLanguage(lang);
  };

  const handleRegenerate = () => {
    if (videoFile && editedTranslation) {
      startTranslationAndDubbing(true);
    }
  };

  const handleConfirmAndProceed = () => {
      setShowLanguageConfirmation(false);
      // This flow would also need to be updated if the confirmation modal is re-enabled
      // to correctly pass the voice selection.
      startTranslationAndDubbing(false);
  };

  const handleCancelConfirmation = () => {
      setShowLanguageConfirmation(false);
      resetProcessingState();
  };

  const handleSpeakerRename = (oldId: string, newId: string) => {
    if (!newId || oldId === newId) return;

    const speakerExists = analysisResult?.speakers.some(s => s.id === newId);
    if (speakerExists) {
        setError(`Speaker name "${newId}" already exists. Please choose a unique name.`);
        setTimeout(() => setError(null), 4000);
        return;
    }
    setError(null);

    setAnalysisResult(prev => {
        if (!prev) return null;

        const updatedSpeakers = prev.speakers.map(speaker =>
            speaker.id === oldId ? { ...speaker, id: newId } : speaker
        );

        const updatedTranscription = prev.transcription.map(segment =>
            segment.speakerId === oldId ? { ...segment, speakerId: newId } : segment
        );

        const updatedTranslatedTranscription = prev.translatedTranscription?.map(segment =>
            segment.speakerId === oldId ? { ...segment, speakerId: newId } : segment
        );

        return {
            ...prev,
            speakers: updatedSpeakers,
            transcription: updatedTranscription,
            ...(updatedTranslatedTranscription && { translatedTranscription: updatedTranslatedTranscription }),
        };
    });

    setEditedTranslation(prev => {
        if (!prev) return null;
        return prev.map(segment =>
            segment.speakerId === oldId ? { ...segment, speakerId: newId } : segment
        );
    });

    setVoiceSelection(prev => {
        const newSelection = { ...prev };
        if (oldId in newSelection) {
            newSelection[newId] = newSelection[oldId];
            delete newSelection[oldId];
        }
        return newSelection;
    });
  };

  if (!isApiKeySet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full">
            <div className="p-6 bg-black border border-red-500 rounded-md flex items-start space-x-4 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
              <AlertTriangleIcon className="h-8 w-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-xl text-red-300">[ CONFIGURATION ERROR ]</h3>
                <p className="text-red-400 mt-2">&gt; Connection to backend services failed.</p>
                <p className="text-green-400/70 mt-1 text-sm">// The application requires proper environment configuration to function. Please ensure all necessary service keys are set up correctly by the host environment.</p>
              </div>
            </div>
        </div>
      </div>
    );
  }

  const renderResultsPage = () => (
    <>
      {error && !isRegenerating && <ErrorDisplay message={error} />}
      {showResultsPage && (
          <ResultDisplay
            videoUrl={videoUrl!}
            dubbedAudioData={dubbedAudioData}
            analysisResult={analysisResult!}
            editedTranslation={editedTranslation}
            onTranslationChange={handleTranslationChange}
            originalAudioUrl={originalAudioUrl}
            voiceSelection={voiceSelection}
            onVoiceChange={handleVoiceSelectionChange}
            onSpeakerRename={handleSpeakerRename}
            onRegenerate={handleRegenerate}
            isRegenerating={isRegenerating}
            isVoiceCloningActive={!!voiceSampleFile}
            targetLanguage={targetLanguage}
            onReset={resetProcessingState}
          />
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
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
           {showResultsPage ? renderResultsPage() : (
            <>
              <div className="p-6 rounded-md shadow-lg space-y-6 hacker-container">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TargetLanguageSelector
                    selectedLanguage={targetLanguage}
                    onLanguageChange={handleLanguageChange}
                    disabled={isInitialProcessing || !!videoFile}
                  />
                  {targetLanguage === 'arabic' && (
                    <DialectSelector
                      selectedDialect={dialect}
                      onDialectChange={handleDialectChange}
                      disabled={isInitialProcessing || !!videoFile}
                    />
                  )}
                </div>

                {!videoFile && (
                  <>
                    <div className="pt-6 border-t border-[var(--border-color)]">
                      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">[ UPLOAD VIDEO ]</h3>
                      <p className="text-sm text-green-400/70 mb-3">// AI will auto-detect speakers and timing.</p>
                      <FileUploader onFileSelect={handleFileChange} disabled={isInitialProcessing} />
                    </div>
                    <VoiceUploader
                      selectedFile={voiceSampleFile}
                      onFileChange={handleVoiceSampleChange}
                      disabled={isInitialProcessing}
                    />
                  </>
                )}
              </div>

              {isInitialProcessing && <TerminalLog currentStep={currentStep} steps={STEPS} error={error} />}
              {currentStep === 'error' && !analysisResult && error && <ErrorDisplay message={error} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
