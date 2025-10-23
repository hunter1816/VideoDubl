import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { SpeakerProfile, TranscriptionSegment, Dialect } from '../types';
import { fileToBase64, base64ToUint8Array, createAudioBufferFromPcm, audioBufferToPcm, uint8ArrayToBase64 } from '../utils/media';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeVideo(videoFile: File): Promise<{ speakers: SpeakerProfile[], transcription: TranscriptionSegment[], language: string }> {
  try {
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
    dialect: Dialect
): Promise<TranscriptionSegment[]> {
   try {
    const dialectInstruction = dialect === 'egyptian' 
        ? "colloquial Egyptian Arabic (العامية المصرية)" 
        : "Modern Standard Arabic (الفصحى)";
        
    const culturalNuance = dialect === 'egyptian'
        ? "Pay close attention to cultural nuances and use common Egyptian idioms and expressions to make the dialogue sound authentic and natural."
        : "Ensure the translation is formal, clear, and grammatically correct according to the rules of Modern Standard Arabic.";

    const prompt = `You are an expert translator specializing in video dubbing scripts. Your task is to translate the "text" of each segment in the provided JSON array from ${sourceLanguage} into high-quality, natural-sounding ${dialectInstruction}.

**Key Instructions:**
1.  **Maintain Context:** The segments are part of a continuous conversation. Translate them in context to ensure coherence and accuracy.
2.  **Natural Phrasing:** Avoid literal, word-for-word translations. The final text should flow naturally as if it were originally spoken in Arabic.
3.  **Dialect-Specific Nuances:** ${culturalNuance}
4.  **Preserve Structure:** You MUST return a valid JSON array with the exact same structure as the input. Only the value of the "text" field in each object should be changed. Do not alter "speakerId", "startTime", or "endTime".

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
    // Basic validation
    if (!Array.isArray(result) || result.length !== segments.length) {
        throw new Error("Translated data structure does not match original.");
    }

    return result;

   } catch(error) {
       console.error("Error in translateText:", error);
       throw new Error("Failed to translate the text.");
   }
}

// Generates a single audio clip for a given text and voice.
export async function generateAudioClip(
    text: string, 
    voiceName: string,
    voiceSample?: { data: string; mimeType: string }
): Promise<string> {
    
    let request: any;

    if (voiceSample) {
        // Attempt voice cloning with the provided sample
        request = {
            model: "gemini-2.5-flash-preview-tts",
            contents: {
                parts: [
                    { inlineData: { mimeType: voiceSample.mimeType, data: voiceSample.data } },
                    { text: `Using the provided audio sample as a voice reference, please say the following text in a natural tone: "${text}"` }
                ]
            },
            config: {
                responseModalities: [Modality.AUDIO],
            },
        };
    } else {
        // Use a pre-built voice
        const ttsPrompt = `Speak in an appropriate tone: ${text}`;
        request = {
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        };
    }

    const response = await ai.models.generateContent(request);

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
        console.warn(`TTS API returned no audio for text: "${text}"`);
        return ""; // Return empty string for failed clips
    }
    return audioData;
}


export async function generateDubbedAudio(
    translatedSegments: TranscriptionSegment[],
    speakers: SpeakerProfile[],
    voiceSelection: Record<string, string>, // Maps speaker ID to a voice name
    voiceSampleFile?: File | null
): Promise<string> {
    try {
        if (translatedSegments.length === 0) {
            throw new Error("No text segments provided for dubbing.");
        }
        
        const speakerMap = new Map(speakers.map(s => [s.id, s]));

        const voiceSampleData = voiceSampleFile 
            ? { data: await fileToBase64(voiceSampleFile), mimeType: voiceSampleFile.type }
            : undefined;

        // 1. Generate all audio clips in parallel
        const clipPromises = translatedSegments.map(segment => {
            const speaker = speakerMap.get(segment.speakerId);
            if (!speaker || (speaker.gender !== 'male' && speaker.gender !== 'female')) {
                return Promise.resolve(""); // Skip segments with unknown speakers/genders
            }
            const voiceName = voiceSelection[speaker.id];
            if (!voiceName && !voiceSampleData) {
                console.warn(`No voice selected for speaker ${speaker.id}, skipping segment.`);
                return Promise.resolve("");
            }
            return generateAudioClip(segment.text, voiceName, voiceSampleData);
        });

        const base64Clips = await Promise.all(clipPromises);

        // Filter out any failed clips and their corresponding segments
        const validClips = base64Clips.map((clip, index) => ({ clip, segment: translatedSegments[index] }))
            .filter(item => item.clip.length > 0);

        if (validClips.length === 0) {
            throw new Error("Failed to generate any audio clips for the given text.");
        }

        // 2. Decode clips into AudioBuffers using a temporary AudioContext
        const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBufferPromises = validClips.map(({ clip }) => {
            const bytes = base64ToUint8Array(clip);
            return createAudioBufferFromPcm(bytes, tempAudioContext);
        });
        const audioBuffers = await Promise.all(audioBufferPromises);
        await tempAudioContext.close();

        // 3. Stitch them together in an OfflineAudioContext
        const totalDuration = translatedSegments.length > 0
            ? Math.max(...translatedSegments.map(segment => segment.endTime))
            : 0;

        if (totalDuration === 0) {
            throw new Error("Cannot determine audio duration from segments.");
        }

        // Add a small buffer to the duration
        const offlineContext = new OfflineAudioContext(1, Math.ceil((totalDuration + 0.5) * 24000), 24000);

        validClips.forEach(({ segment }, index) => {
            const buffer = audioBuffers[index];
            const source = offlineContext.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineContext.destination);

            // Here we can add logic to stretch/compress audio if needed, for now just start at the right time
            source.start(segment.startTime);
        });

        const finalBuffer = await offlineContext.startRendering();

        // 4. Convert the final stitched AudioBuffer back to base64
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