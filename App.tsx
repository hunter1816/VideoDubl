import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { VoiceUploader } from './components/VoiceUploader';
import { SubtitleUploader } from './components/SubtitleUploader';
import { TerminalLog } from './components/TerminalLog';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ResultDisplay } from './components/ResultDisplay';
import { DialectSelector } from './components/DialectSelector';
import { TargetLanguageSelector } from './components/TargetLanguageSelector';
import { LanguageConfirmationModal } from './components/LanguageConfirmationModal';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { analyzeVideo, translateText, generateDubbedAudio, diarizeSpeakersAndDetectEmotion } from './services/geminiService';
import { extractAudioFromVideoAsWavBlob } from './utils/media';
import { parseSrt } from './utils/subtitleParser';
import type { ProcessStep, AnalysisResult, SpeakerProfile, TranscriptionSegment, Dialect, TargetLanguage } from './types';
import type { ParsedSubtitleSegment } from './utils/subtitleParser';
// FIX: Import TTS_VOICES to resolve reference errors throughout the component.
import { STEPS, TTS_VOICES } from './constants';
import { useI18n } from './i18n';

// Extend AnalysisResult type locally for component state
type AppAnalysisResult = AnalysisResult & { translatedTranscription?: TranscriptionSegment[], usedSubtitles?: boolean };

const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);


const App: React.FC = () => {
  const { t, dir } = useI18n();
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [parsedSubtitles, setParsedSubtitles] = useState<ParsedSubtitleSegment[] | null>(null);
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
  const [voiceOverrides, setVoiceOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    // A simple check to see if the API key exists in the environment.
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      setIsApiKeySet(true);
    }
  }, []);

  useEffect(() => {
    // When the official translated transcription is available, initialize the editable state
    if (analysisResult?.translatedTranscription && videoFile) {
        const translationKey = `dubber-translation-${videoFile.name}`;
        const savedTranslationJson = localStorage.getItem(translationKey);
        
        if (savedTranslationJson) {
            try {
                const savedTranslation = JSON.parse(savedTranslationJson);
                if (Array.isArray(savedTranslation)) { // Allow loading even if length mismatches, user may have edited
                    setEditedTranslation(savedTranslation);
                } else {
                    console.warn("Saved translation in localStorage is malformed, ignoring.");
                    setEditedTranslation(analysisResult.translatedTranscription);
                }
            } catch (e) {
                console.error("Failed to parse saved translation from localStorage.", e);
                localStorage.removeItem(translationKey);
                setEditedTranslation(analysisResult.translatedTranscription);
            }
        } else {
           setEditedTranslation(analysisResult.translatedTranscription);
        }

        // Load voice overrides
        const overridesKey = `dubber-overrides-${videoFile.name}`;
        const savedOverridesJson = localStorage.getItem(overridesKey);
        if (savedOverridesJson) {
            try {
                const savedOverrides = JSON.parse(savedOverridesJson);
                setVoiceOverrides(savedOverrides);
            } catch (e) {
                console.error("Failed to parse saved voice overrides.", e);
                localStorage.removeItem(overridesKey);
            }
        } else {
            setVoiceOverrides({});
        }
    }
  }, [analysisResult?.translatedTranscription, videoFile]);

  const isInitialProcessing = ['analyzing', 'translating', 'dubbing'].includes(currentStep);
  const isRegenerating = currentStep === 'regenerating';
  const showResultsPage = (currentStep === 'done' || (currentStep === 'error' && analysisResult)) && videoUrl && analysisResult;

  const resetApplicationState = () => {
    setVideoFile(null);
    setSubtitleFile(null);
    setParsedSubtitles(null);
    setDubbedAudioData(null);
    setCurrentStep('idle');
    setError(null);
    setAnalysisResult(null);
    setEditedTranslation(null);
    setTargetLanguage('arabic');
    setDialect('standard');
    setVoiceSelection({});
    setVoiceOverrides({});
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
    }
  };

  const startTranslationAndDubbing = useCallback(async (
    isRegen = false, 
    initialAnalysis?: AppAnalysisResult,
    voiceConfig?: Record<string, string>,
    overrides?: Record<number, string>
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
            // If using subtitles, translation is already done (it's the subtitle text)
            if (currentAnalysis.usedSubtitles) {
                segmentsToDub = currentAnalysis.transcription;
                const resultWithTranslation = { ...currentAnalysis, translatedTranscription: segmentsToDub };
                setAnalysisResult(resultWithTranslation);
            } else {
                setCurrentStep('translating');
                const translatedSegments = await translateText(
                    currentAnalysis.transcription,
                    currentAnalysis.language,
                    targetLanguage,
                    targetLanguage === 'arabic' ? dialect : null
                );
                const resultWithTranslation = { ...currentAnalysis, translatedTranscription: translatedSegments };
                setAnalysisResult(resultWithTranslation);
                segmentsToDub = translatedSegments;
            }
        }
        
        setCurrentStep(isRegen ? 'regenerating' : 'dubbing');
        const audioBase64 = await generateDubbedAudio(segmentsToDub, speakers, currentVoices, voiceSampleFile, overrides);

        setDubbedAudioData(audioBase64);
        setCurrentStep('done');
    } catch (err) {
         console.error(err);
         setError(err instanceof Error ? err.message : 'An unknown error occurred.');
         setCurrentStep('error');
    }
  }, [analysisResult, dialect, voiceSelection, voiceSampleFile, targetLanguage, editedTranslation]);

  const handleSubtitleWorkflow = useCallback(async (video: File, subtitles: ParsedSubtitleSegment[]) => {
      setError(null);
      setCurrentStep('analyzing');
      try {
        const { speakers: detectedSpeakers, timeline } = await diarizeSpeakersAndDetectEmotion(video);

        let finalSpeakers = detectedSpeakers;
        let speakerMap: Record<string, string> = {};

        // Simplify speakers if more than 2 are detected
        if (detectedSpeakers.length > 2) {
            const firstMale = detectedSpeakers.find(s => s.gender === 'male');
            const firstFemale = detectedSpeakers.find(s => s.gender === 'female');

            const newFinalSpeakers: SpeakerProfile[] = [];
            if(firstMale) newFinalSpeakers.push(firstMale);
            if(firstFemale) newFinalSpeakers.push(firstFemale);
            finalSpeakers = newFinalSpeakers;

            detectedSpeakers.forEach(s => {
                if (s.gender === 'male' && firstMale) speakerMap[s.id] = firstMale.id;
                else if (s.gender === 'female' && firstFemale) speakerMap[s.id] = firstFemale.id;
                else if (firstMale) speakerMap[s.id] = firstMale.id; // Fallback for 'unknown'
                else if (firstFemale) speakerMap[s.id] = firstFemale.id;
            });
        }
        
        const transcriptionWithSpeakers: TranscriptionSegment[] = subtitles.map(sub => {
            const overlappingSpeakers = timeline.filter(speakerSegment =>
                Math.max(sub.startTime, speakerSegment.startTime) < Math.min(sub.endTime, speakerSegment.endTime)
            );

            if (overlappingSpeakers.length === 0) {
                return { ...sub, speakerId: finalSpeakers[0]?.id || 'Speaker 1', emotion: 'neutral' };
            }

            const speakerOverlapDurations = overlappingSpeakers.map(speakerSegment => {
                const overlapStart = Math.max(sub.startTime, speakerSegment.startTime);
                const overlapEnd = Math.min(sub.endTime, speakerSegment.endTime);
                return { ...speakerSegment, overlap: overlapEnd - overlapStart };
            });

            const dominantSpeaker = speakerOverlapDurations.reduce((max, current) => current.overlap > max.overlap ? current : max);
            
            let finalSpeakerId = dominantSpeaker.speakerId;
            if(Object.keys(speakerMap).length > 0 && speakerMap[finalSpeakerId]) {
                finalSpeakerId = speakerMap[finalSpeakerId];
            }

            return { ...sub, speakerId: finalSpeakerId, emotion: dominantSpeaker.emotion };
        });

        const analysis: AppAnalysisResult = {
            speakers: finalSpeakers,
            transcription: transcriptionWithSpeakers,
            language: "From Subtitles",
            usedSubtitles: true
        };

        const initialVoiceSelection: Record<string, string> = {};
        analysis.speakers.forEach(speaker => {
            const defaultMale = TTS_VOICES.male[0]?.name;
            const defaultFemale = TTS_VOICES.female[0]?.name;
            if (speaker.gender === 'male' && defaultMale) initialVoiceSelection[speaker.id] = defaultMale;
            else if (speaker.gender === 'female' && defaultFemale) initialVoiceSelection[speaker.id] = defaultFemale;
        });
        setVoiceSelection(initialVoiceSelection);
        setAnalysisResult(analysis);
        startTranslationAndDubbing(false, analysis, initialVoiceSelection, {});

      } catch(err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during subtitle workflow.');
        setCurrentStep('error');
      }
  }, [startTranslationAndDubbing]);

  const handleTranscriptionWorkflow = useCallback(async (file: File) => {
      setError(null);
      setCurrentStep('analyzing');
      try {
          const analysis = await analyzeVideo(file);

          const initialVoiceSelection: Record<string, string> = {};
          analysis.speakers.forEach(speaker => {
              const defaultMale = TTS_VOICES.male[0]?.name;
              const defaultFemale = TTS_VOICES.female[0]?.name;
              if (speaker.gender === 'male' && defaultMale) initialVoiceSelection[speaker.id] = defaultMale;
              else if (speaker.gender === 'female' && defaultFemale) initialVoiceSelection[speaker.id] = defaultFemale;
          });
          setVoiceSelection(initialVoiceSelection);
          
          setAnalysisResult(analysis); 
          
          startTranslationAndDubbing(false, analysis, initialVoiceSelection, {});
      } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          setCurrentStep('error');
      }
  }, [startTranslationAndDubbing]);

  const handleVideoFileChange = (file: File | null) => {
    // Soft reset: clear previous results but keep user's input settings for the new job.
    setDubbedAudioData(null);
    setCurrentStep('idle');
    setError(null);
    setAnalysisResult(null);
    setEditedTranslation(null);
    setVoiceSelection({});
    setVoiceOverrides({});
    if(videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    if(originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
    setOriginalAudioUrl(null);
    // Note: subtitleFile, parsedSubtitles, voiceSampleFile, targetLanguage, and dialect are preserved.

    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      if (parsedSubtitles) {
          handleSubtitleWorkflow(file, parsedSubtitles);
      } else {
          handleTranscriptionWorkflow(file);
      }
      handleExtractOriginalAudio(file);
    }
  };

  const handleSubtitleFileChange = async (file: File | null) => {
    setSubtitleFile(file);
    if(file) {
        try {
            const content = await file.text();
            const parsed = parseSrt(content);
            setParsedSubtitles(parsed);
        } catch (e) {
            console.error("Failed to parse SRT file", e);
            setError("Could not read or parse the provided SRT file. Please check its format.");
            setParsedSubtitles(null);
        }
    } else {
        setParsedSubtitles(null);
    }
  };
  
  const handleVoiceSampleChange = (file: File | null) => {
    setVoiceSampleFile(file);
  };

  const handleVoiceSelectionChange = (speakerId: string, voiceName: string) => {
    setVoiceSelection(prev => ({ ...prev, [speakerId]: voiceName }));
  };

  const handleTranslationChange = (index: number, updatedFields: Partial<TranscriptionSegment>) => {
    if (!editedTranslation) return;

    const newSegments = [...editedTranslation];
    const updatedSegment = { ...newSegments[index], ...updatedFields };

    // Basic validation
    if (updatedSegment.startTime < 0) updatedSegment.startTime = 0;
    if (updatedSegment.endTime < updatedSegment.startTime) {
        updatedSegment.endTime = updatedSegment.startTime;
    }
    newSegments[index] = updatedSegment;
    
    setEditedTranslation(newSegments);

    if (videoFile) {
        const storageKey = `dubber-translation-${videoFile.name}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(newSegments));
        } catch (e) {
            console.error("Failed to save translation to localStorage.", e);
        }
    }
  };
  
  const handleAddNewSegment = () => {
    setEditedTranslation(prev => {
        if (!prev) return null;

        // Find the latest endTime in the whole array to ensure the new segment starts after everything else.
        const latestTime = prev.reduce((max, seg) => Math.max(max, seg.endTime), 0);

        const newSegment: TranscriptionSegment = {
            speakerId: analysisResult?.speakers[0]?.id ?? 'Speaker 1',
            text: t('newSegmentPlaceholder'),
            startTime: latestTime + 0.1, // Add a small gap
            endTime: latestTime + 2.1, // Default 2 second duration
            emotion: 'neutral',
        };

        const newSegments = [...prev, newSegment];
        
        if (videoFile) {
            const storageKey = `dubber-translation-${videoFile.name}`;
            localStorage.setItem(storageKey, JSON.stringify(newSegments));
        }
        
        return newSegments;
    });
  };

  const handleSegmentReorder = (index: number, direction: 'up' | 'down') => {
    if (!editedTranslation) return;

    const newSegments = [...editedTranslation];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSegments.length) {
      return; // Invalid move
    }

    // Swap elements
    [newSegments[index], newSegments[targetIndex]] = [newSegments[targetIndex], newSegments[index]];
    
    setEditedTranslation(newSegments);

    if (videoFile) {
        const storageKey = `dubber-translation-${videoFile.name}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(newSegments));
        } catch (e) {
            console.error("Failed to save reordered translation to localStorage.", e);
        }
    }
  };

  const handleVoiceOverrideChange = (index: number, voiceName: string | null) => {
    setVoiceOverrides(prev => {
        const newOverrides = { ...prev };
        if (voiceName) {
            newOverrides[index] = voiceName;
        } else {
            delete newOverrides[index];
        }
        
        if (videoFile) {
            const storageKey = `dubber-overrides-${videoFile.name}`;
            try {
                localStorage.setItem(storageKey, JSON.stringify(newOverrides));
            } catch (e) {
                console.error("Failed to save voice overrides to localStorage.", e);
            }
        }
        return newOverrides;
    });
  };

  const handleDialectChange = (newDialect: Dialect) => {
    setDialect(newDialect);
  };

  const handleLanguageChange = (lang: TargetLanguage) => {
    setTargetLanguage(lang);
  };

  const handleRegenerate = () => {
    if (videoFile && editedTranslation) {
      // The user's manual order from the UI is now the source of truth.
      // We will no longer sort by startTime, giving them full control over sequence.
      // The localStorage is already updated by the reorder and edit handlers,
      // so we just need to trigger the dubbing process with the current state.
      startTranslationAndDubbing(true, undefined, undefined, voiceOverrides);
    }
  };

  const handleConfirmAndProceed = () => {
      setShowLanguageConfirmation(false);
      startTranslationAndDubbing(false, undefined, undefined, {});
  };

  const handleCancelConfirmation = () => {
      setShowLanguageConfirmation(false);
      resetApplicationState();
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

  const handleSpeakerGenderChange = (speakerId: string, newGender: 'male' | 'female') => {
    setAnalysisResult(prev => {
        if (!prev) return null;
        const updatedSpeakers = prev.speakers.map(s => 
            s.id === speakerId ? { ...s, gender: newGender } : s
        );
        return { ...prev, speakers: updatedSpeakers };
    });

    const newDefaultVoice = newGender === 'male' 
        ? TTS_VOICES.male[0]?.name 
        : TTS_VOICES.female[0]?.name;

    if (newDefaultVoice) {
        setVoiceSelection(prev => ({
            ...prev,
            [speakerId]: newDefaultVoice
        }));
    }
  };

  if (!isApiKeySet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full">
            <div className="p-6 bg-black border border-red-500 rounded-md flex items-start space-x-4 shadow-[0_0_15px_rgba(255,0,0,0.5)]">
              <AlertTriangleIcon className="h-8 w-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-xl text-red-300">{t('configError')}</h3>
                <p className="text-red-400 mt-2">{t('configErrorMsg')}</p>
                <p className="text-green-400/70 mt-1 text-sm">{t('configErrorDesc')}</p>
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
            onAddNewSegment={handleAddNewSegment}
            onSegmentReorder={handleSegmentReorder}
            voiceOverrides={voiceOverrides}
            onVoiceOverrideChange={handleVoiceOverrideChange}
            originalAudioUrl={originalAudioUrl}
            voiceSelection={voiceSelection}
            onVoiceChange={handleVoiceSelectionChange}
            onSpeakerRename={handleSpeakerRename}
            onSpeakerGenderChange={handleSpeakerGenderChange}
            onRegenerate={handleRegenerate}
            isRegenerating={isRegenerating}
            isVoiceCloningActive={!!voiceSampleFile}
            voiceSampleFile={voiceSampleFile}
            targetLanguage={targetLanguage}
            onReset={resetApplicationState}
          />
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8" dir={dir}>
      <div className="w-full max-w-4xl mx-auto relative">
        
        <LanguageSwitcher />

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
                        <SubtitleUploader
                            selectedFile={subtitleFile}
                            onFileChange={handleSubtitleFileChange}
                            disabled={isInitialProcessing || !!videoFile}
                        />
                    </div>
                    <div className="pt-6 border-t border-[var(--border-color)]">
                      <h3 className="text-lg font-semibold mb-2 text-green-300 tracking-wider">{t('uploadVideo')}</h3>
                      <p className="text-sm text-green-400/70 mb-3">{t('uploadVideoDesc')}</p>
                      <FileUploader onFileSelect={handleVideoFileChange} disabled={isInitialProcessing} />
                    </div>
                    <VoiceUploader
                      selectedFile={voiceSampleFile}
                      onFileChange={handleVoiceSampleChange}
                      disabled={isInitialProcessing}
                    />
                  </>
                )}
              </div>

              {isInitialProcessing && <TerminalLog currentStep={currentStep} steps={STEPS.map(s=> ({key: s.key, label: t(s.labelKey)}))} error={error} />}
              {currentStep === 'error' && !analysisResult && error && <ErrorDisplay message={error} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;