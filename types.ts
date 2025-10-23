export type ProcessStep = 'idle' | 'analyzing' | 'translating' | 'dubbing' | 'done' | 'error' | 'regenerating';

export type Dialect = 'standard' | 'egyptian';

export interface SpeakerProfile {
  id: string; // e.g., "Speaker 1"
  gender: 'male' | 'female' | 'unknown';
  confidence: number; // Confidence score from 0.0 to 1.0
}

export interface TranscriptionSegment {
    speakerId: string;
    text: string;
    startTime: number; // in seconds
    endTime: number; // in seconds
}

export interface AnalysisResult {
  speakers: SpeakerProfile[];
  transcription: TranscriptionSegment[];
  language: string;
}

export interface Step {
  key: ProcessStep;
  label: string;
}