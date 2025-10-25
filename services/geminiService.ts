
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { SpeakerProfile, TranscriptionSegment, Dialect, TargetLanguage } from '../types';
import { fileToBase64, base64ToUint8Array, createAudioBufferFromPcm, audioBufferToPcm, uint8ArrayToBase64 } from '../utils/media';

let ai: GoogleGenAI;

function getAiInstance(): GoogleGenAI {
    if (!ai) {
        if (!process.env.API_KEY) {
            // This should not be reached if the UI check is in place, but serves as a safeguard.
            throw new Error("API_KEY environment variable not set. This application cannot function without it.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}


export async function analyzeVideo(videoFile: File): Promise<{ speakers: SpeakerProfile[], transcription: TranscriptionSegment[], language: string }> {
  try {
    const ai = getAiInstance();
    const videoBase64 = await fileToBase64(videoFile);
    
    const prompt = `You are an expert audio analyst and transcriptionist. Your task is to analyze the audio from this video and produce a highly accurate, structured JSON output.

**Key Objectives:**
1.  **Identify Distinct Speakers & Gender**: Detect each unique speaker and assign a label (e.g., "Speaker 1"). For each, determine their gender ('male', 'female', or 'unknown' if uncertain) and provide a confidence score (0.0 to 1.0).
2.  **Detect Language**: Identify the primary spoken language in the video.
3.  **Create Precise Time-coded Transcription**: Transcribe all spoken words with precise start and end times in seconds for each utterance.

**Instructions for Enhanced Accuracy:**
*   **Handle Background Noise:** Focus on human speech. Make your best effort to transcribe dialogue accurately even if it's partially obscured by music, ambient noise, or other sounds.
*   **Adapt to Accents & Pacing:** Be mindful of regional accents, non-native speakers, and fast-paced speech. Transcribe the intended words, not just a phonetic spelling. Do not summarize or skip words in fast dialogue.
*   **Apply Correct Punctuation:** Use proper punctuation (commas, periods, question marks, etc.) to reflect the speaker's pauses and intonation, ensuring the final transcription is grammatically correct and readable.
*   **Proofread Output:** Before finalizing, review the transcription for coherence, typos, and common speech-to-text errors to ensure the highest possible quality.

**Required JSON Output Structure:**
Your response MUST be a single, valid JSON object with "language", "speakers", and "transcription" keys.
- "language": A string with the detected language name (e.g., "English").
- "speakers": An array of objects, each with "id" (string), "gender" (string: 'male', 'female', 'unknown'), and "confidence" (number).
- "transcription": An array of objects, each with "speakerId" (string), "text" (string), "startTime" (number), and "endTime" (number).`;


    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: videoFile.type,
              data: videoBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                language: { type: Type.STRING },
                speakers: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            gender: { type: Type.STRING },
                            confidence: { type: Type.NUMBER },
                        },
                        required: ['id', 'gender', 'confidence'],
                    }
                },
                transcription: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            speakerId: { type: Type.STRING },
                            text: { type: Type.STRING },
                            startTime: { type: Type.NUMBER },
                            endTime: { type: Type.NUMBER },
                        },
                        required: ['speakerId', 'text', 'startTime', 'endTime'],
                    }
                },
            },
            required: ['language', 'speakers', 'transcription'],
        }
      }
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    if (!result.language || !result.speakers || !result.transcription) {
      throw new Error('Invalid analysis data received from API. Missing required fields.');
    }
    
    const validatedSpeakers: SpeakerProfile[] = result.speakers.map((s: any) => ({
        id: s.id,
        gender: s.gender.toLowerCase() === 'male' ? 'male' : (s.gender.toLowerCase() === 'female' ? 'female' : 'unknown'),
        confidence: s.confidence,
    })).filter((s: SpeakerProfile) => s.gender !== 'unknown');
    
    if (validatedSpeakers.length === 0) {
        throw new Error("Could not identify any speakers in the video.");
    }
    
    const speakerIdSet = new Set(validatedSpeakers.map(s => s.id));
    const validatedTranscription = result.transcription.filter((t: TranscriptionSegment) => speakerIdSet.has(t.speakerId));


    return {
      language: result.language,
      speakers: validatedSpeakers,
      transcription: validatedTranscription,
    };
  } catch (error) {
    console.error("Error in analyzeVideo:", error);
    throw new Error("Failed to analyze video for speakers. The model may not have been able to process the audio.");
  }
}

export async function translateText(
    segments: TranscriptionSegment[],
    sourceLanguage: string,
    targetLanguage: TargetLanguage,
    dialect: Dialect | null
): Promise<TranscriptionSegment[]> {
   try {
    const ai = getAiInstance();
    let targetLanguageDescription: string;
    let culturalNuance: string;

    switch (targetLanguage) {
        case 'spanish':
            targetLanguageDescription = 'Spanish';
            culturalNuance = "Aim for a neutral Latin American Spanish unless the context implies a specific region. The translation must sound natural when spoken, avoiding overly literal or academic phrasing. Adapt sentence length to fit the rhythm of a conversation.";
            break;
        case 'french':
            targetLanguageDescription = 'French';
            culturalNuance = "Translate into standard, modern French. Pay close attention to context to choose the correct level of formality (vous vs. tu). The final text should be fluid and idiomatic, as if originally spoken by a native French speaker.";
            break;
        case 'arabic':
        default:
            targetLanguageDescription = dialect === 'egyptian' 
                ? "colloquial Egyptian Arabic (العامية المصرية)" 
                : "Modern Standard Arabic (الفصحى)";
            culturalNuance = dialect === 'egyptian'
                ? "Pay close attention to cultural nuances and use common Egyptian idioms and expressions to make the dialogue sound authentic and natural."
                : "Ensure the translation is formal, clear, and grammatically correct according to the rules of Modern Standard Arabic.";
            break;
    }

    const prompt = `You are an expert linguist specializing in creating high-quality, time-synchronized dubbing scripts for video. Your task is to translate the "text" of each segment in the provided JSON array from ${sourceLanguage} into natural-sounding, performable ${targetLanguageDescription}.

**CRITICAL Directives for High-Precision Dubbing:**

Your primary objective is to create a script that is perfectly synchronized with the video's timing. Meaning is important, but **timing is paramount**.

1.  **Strict Time-Matching (Lip-Sync)**: This is your most important task. The translated text MUST be performable within the exact duration calculated from \`endTime - startTime\`.
    *   **Analyze Original Pacing**: Before translating, consider the length and cadence of the original text.
    *   **Adapt, Don't Just Translate Literally**: You MUST rephrase, condense, or even slightly expand the translation to fit the time slot. A literal translation that is too long is a failure. A translation that is too short is also a failure. Find a natural-sounding equivalent that fits the timing.
    *   **Example**: If the original is a short, quick phrase, the translation must also be short and quick. If the original is a longer, slower sentence, the translation must match that pace. The goal is a seamless dub that looks and sounds natural.

2.  **Preserve Tone & Emotion**: Analyze the original text to understand the speaker's emotion (e.g., sarcastic, urgent, happy, sad). The translation MUST convey the same emotional tone.

3.  **Natural, Spoken Dialogue**: The output should sound like real people talking, not like a formal document.
    *   **Use Colloquialisms & Idioms**: Employ common, natural-sounding phrases and idioms appropriate for ${targetLanguageDescription}.
    *   **Language-Specific Nuances**: ${culturalNuance}

4.  **Maintain Contextual Integrity**: The segments are part of a continuous conversation. Ensure your translations are consistent and flow logically from one segment to the next.

5.  **Strict JSON Formatting**: You MUST return a valid JSON array with the exact same structure as the input. Only modify the "text" field in each object. Do not alter "speakerId", "startTime", or "endTime".

**Input JSON to Translate:**
---
${JSON.stringify(segments, null, 2)}
---`;


    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        speakerId: { type: Type.STRING },
                        text: { type: Type.STRING },
                        startTime: { type: Type.NUMBER },
                        endTime: { type: Type.NUMBER },
                    },
                    required: ['speakerId', 'text', 'startTime', 'endTime'],
                }
            }
        }
    });

    const result = JSON.parse(response.text);
    if (!Array.isArray(result) || result.length !== segments.length) {
        throw new Error("Translated data structure does not match original.");
    }

    return result;

   } catch(error) {
       console.error("Error in translateText:", error);
       throw new Error("Failed to translate the text.");
   }
}

export async function generateAudioClip(
    text: string, 
    voiceName: string,
    voiceSample?: { data: string; mimeType: string }
): Promise<string> {
    if (!text || !text.trim()) {
        return "";
    }
    const ai = getAiInstance();

    if (voiceSample) {
        const cloningRequest = {
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO] as Modality[],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                        customVoice: {
                            source: {
                                inlineData: {
                                    data: voiceSample.data,
                                    mimeType: voiceSample.mimeType,
                                }
                            }
                        }
                    }
                },
            },
        };
        try {
            const response = await ai.models.generateContent(cloningRequest);
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                return audioData;
            }
            console.warn(`Voice cloning attempt for text: "${text}" returned no audio data. Proceeding to fallback.`);
        } catch (cloningError) {
            console.warn(`Voice cloning attempt for text: "${text}" failed with an error. Proceeding to fallback.`, cloningError);
        }
    }

    const fallbackRequest = {
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO] as Modality[],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    };

    try {
        const response = await ai.models.generateContent(fallbackRequest);
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
            console.warn(`TTS API returned no audio for text on fallback: "${text}"`);
            return "";
        }
        return audioData;
    } catch (fallbackError) {
        console.error(`TTS API fallback failed for text "${text}" with voice "${voiceName}". Error:`, fallbackError);
        return "";
    }
}


export async function generateDubbedAudio(
    translatedSegments: TranscriptionSegment[],
    speakers: SpeakerProfile[],
    voiceSelection: Record<string, string>,
    voiceSampleFile?: File | null,
    voiceOverrides?: Record<number, string>
): Promise<string> {
    try {
        if (translatedSegments.length === 0) {
            throw new Error("No text segments provided for dubbing.");
        }
        
        const speakerMap = new Map(speakers.map(s => [s.id, s]));

        const voiceSampleData = voiceSampleFile 
            ? { data: await fileToBase64(voiceSampleFile), mimeType: voiceSampleFile.type }
            : undefined;

        const clipPromises = translatedSegments.map((segment, index) => {
            const speaker = speakerMap.get(segment.speakerId);
            if (!speaker || (speaker.gender !== 'male' && speaker.gender !== 'female')) {
                console.warn(`Skipping segment for unknown or invalid-gender speaker: ${segment.speakerId}`);
                return Promise.resolve("");
            }
            
            const overrideVoice = voiceOverrides?.[index];
            const defaultVoice = voiceSelection[speaker.id];
            const voiceName = overrideVoice || defaultVoice;

            if (!voiceName) {
                console.warn(`No voice selected or assigned for speaker ${speaker.id} (segment ${index}), skipping segment.`);
                return Promise.resolve("");
            }

            return generateAudioClip(segment.text, voiceName, voiceSampleData);
        });

        const base64Clips = await Promise.all(clipPromises);

        const validClips = base64Clips.map((clip, index) => ({ clip, segment: translatedSegments[index] }))
            .filter(item => item.clip.length > 0);

        if (validClips.length === 0) {
            throw new Error("Failed to generate any audio clips for the given text.");
        }

        const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBufferPromises = validClips.map(({ clip }) => {
            const bytes = base64ToUint8Array(clip);
            return createAudioBufferFromPcm(bytes, tempAudioContext);
        });
        const audioBuffers = await Promise.all(audioBufferPromises);
        await tempAudioContext.close();

        const totalDuration = translatedSegments.length > 0
            ? Math.max(...translatedSegments.map(segment => segment.endTime))
            : 0;

        if (totalDuration === 0) {
            throw new Error("Cannot determine audio duration from segments.");
        }

        const offlineContext = new OfflineAudioContext(1, Math.ceil((totalDuration + 0.5) * 24000), 24000);

        validClips.forEach(({ segment }, index) => {
            const buffer = audioBuffers[index];
            if (buffer.duration > 0) {
                const source = offlineContext.createBufferSource();
                source.buffer = buffer;
                source.connect(offlineContext.destination);
                source.start(segment.startTime);
            }
        });

        const finalBuffer = await offlineContext.startRendering();

        const pcmData = audioBufferToPcm(finalBuffer);
        return uint8ArrayToBase64(pcmData);

    } catch(error) {
        console.error("Error in generateDubbedAudio:", error);
        if (error instanceof Error && error.message.startsWith("Failed to generate any audio clips")) {
             throw error;
        }
        throw new Error("An unexpected error occurred while generating the synchronized audio track.");
    }
}
