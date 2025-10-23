import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { SpeakerProfile } from '../types';
import { fileToBase64 } from '../utils/media';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeVideo(videoFile: File): Promise<{ speakers: SpeakerProfile[], transcription: string, language: string }> {
  try {
    const videoBase64 = await fileToBase64(videoFile);
    
    const prompt = `Analyze the audio from this video with high accuracy and provide detailed speaker information.
1. Identify the primary spoken language.
2. Identify ALL distinct human speakers in the video. Be conservative; only identify a new speaker if you are highly confident they are a different person. Do not identify background noise, music, or non-speech sounds as speakers. Assign each a unique label like "Speaker 1", "Speaker 2", etc.
3. For each speaker, provide the following details:
    - Their estimated gender ('male' or 'female'). If gender is ambiguous, label it 'unknown'.
    - A confidence score (a number from 0.0 to 1.0) indicating how certain you are that this is a distinct speaker.
4. Provide a full transcription of the conversation, with each line prefixed by the corresponding speaker label. Ensure the transcription only includes spoken words.

Your response MUST be a single JSON object with three keys: "language", "speakers", and "transcription".
- "language": A string with the detected language name (e.g., "English").
- "speakers": An array of objects, where each object has an "id" (e.g., "Speaker 1"), a "gender" ('male', 'female', or 'unknown'), and a "confidence" (a number between 0.0 and 1.0).
- "transcription": A single string containing the full, speaker-labeled transcription.`;

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
          {
            text: prompt,
          },
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
                transcription: { type: Type.STRING },
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

    return {
      language: result.language,
      speakers: validatedSpeakers,
      transcription: result.transcription,
    };
  } catch (error) {
    console.error("Error in analyzeVideo:", error);
    throw new Error("Failed to analyze video for speakers. The model may not have been able to process the audio.");
  }
}

export async function translateText(text: string, sourceLanguage: string): Promise<string> {
   try {
    const prompt = `Translate the following conversation from ${sourceLanguage} to Arabic.
IMPORTANT: Preserve the speaker labels (e.g., "Speaker 1:", "Speaker 2:") exactly as they are in the original text. Only translate the dialogue.

Original Text:
---
${text}
---`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
   } catch(error) {
       console.error("Error in translateText:", error);
       throw new Error("Failed to translate the text.");
   }
}

export async function generateDubbedAudio(
    translatedText: string,
    speakers: SpeakerProfile[],
    voiceSelection: Record<string, string> // Maps speaker.id to a voice name like 'Kore'
): Promise<string> {
    try {
        if (speakers.length === 0) {
            throw new Error("No speakers provided for dubbing.");
        }

        // Handle single speaker
        if (speakers.length === 1) {
            const speaker = speakers[0];
            const voiceName = voiceSelection[speaker.id];
            const cleanText = translatedText.replace(new RegExp(`^${speaker.id}:\\s*`, 'gm'), '').trim();
            const ttsPrompt = `Speak in an appropriate tone: ${cleanText}`;
            
            const response = await ai.models.generateContent({
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
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) throw new Error("No audio data received from single-speaker TTS API.");
            return audioData;
        }

        // Handle 2 or more speakers by mapping to genders
        if (speakers.length >= 2) {
            const gendersPresent = new Set<'male' | 'female'>();
            speakers.forEach(s => {
                if (s.gender === 'male' || s.gender === 'female') {
                    gendersPresent.add(s.gender);
                }
            });

            // Case 1: All speakers are of the same gender. Treat as a single speaker narrating.
            if (gendersPresent.size === 1) {
                const gender = gendersPresent.values().next().value as 'male' | 'female';
                const firstSpeakerOfGender = speakers.find(s => s.gender === gender)!;
                const voiceName = voiceSelection[firstSpeakerOfGender.id];

                // Remove all speaker ID prefixes (e.g., "Speaker 1: ")
                let cleanText = translatedText;
                speakers.forEach(s => {
                    const regex = new RegExp(`^${s.id}:\\s*`, 'gm');
                    cleanText = cleanText.replace(regex, '');
                });
                
                const ttsPrompt = `Speak in an appropriate tone, narrating a conversation: ${cleanText.trim()}`;
            
                const response = await ai.models.generateContent({
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
                });
                const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (!audioData) throw new Error("No audio data received from single-gender TTS API.");
                return audioData;
            }

            // Case 2: Speakers are of mixed genders. Use multi-speaker TTS with generic gender roles.
            if (gendersPresent.size === 2) {
                const MALE_SPEAKER_ID = 'الرجل';
                const FEMALE_SPEAKER_ID = 'المرأة';
                
                const speakerIdToGenderId: Record<string, string> = {};
                speakers.forEach(s => {
                    if (s.gender === 'male') speakerIdToGenderId[s.id] = MALE_SPEAKER_ID;
                    else if (s.gender === 'female') speakerIdToGenderId[s.id] = FEMALE_SPEAKER_ID;
                });
    
                let modifiedText = translatedText;
                for (const speakerId in speakerIdToGenderId) {
                    const regex = new RegExp(`^${speakerId}:`, 'gm');
                    modifiedText = modifiedText.replace(regex, `${speakerIdToGenderId[speakerId]}:`);
                }
                
                const maleVoice = voiceSelection[speakers.find(s => s.gender === 'male')!.id];
                const femaleVoice = voiceSelection[speakers.find(s => s.gender === 'female')!.id];
    
                const speakerVoiceConfigs = [
                    { speaker: MALE_SPEAKER_ID, voiceConfig: { prebuiltVoiceConfig: { voiceName: maleVoice } } },
                    { speaker: FEMALE_SPEAKER_ID, voiceConfig: { prebuiltVoiceConfig: { voiceName: femaleVoice } } }
                ];

                const ttsPrompt = `TTS the following conversation between ${MALE_SPEAKER_ID} and ${FEMALE_SPEAKER_ID}:\n${modifiedText}`;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text: ttsPrompt }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            multiSpeakerVoiceConfig: { speakerVoiceConfigs }
                        }
                    }
                });
                
                const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (!audioData) throw new Error("No audio data received from multi-speaker TTS API.");
                return audioData;
            }
            
            // This case handles 0 genders present, which is filtered out by analyzeVideo, so this is a fallback.
            throw new Error("Could not generate audio as no speakers with identifiable genders were found.");
        }
        
        // Should not be reached.
        return Promise.reject("An unexpected error occurred in audio generation logic.");

    } catch(error) {
        console.error("Error in generateDubbedAudio:", error);
        if (error instanceof Error) {
            // Re-throw the original error to preserve our specific user-facing messages
            // or other specific API errors that can be displayed in the UI.
            throw error;
        }
        // Fallback for non-Error objects being thrown
        throw new Error("An unexpected error occurred while generating dubbed audio.");
    }
}