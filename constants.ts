import type { Step } from './types';

export const STEPS: Step[] = [
  { key: 'analyzing', label: 'Analyzing Audio, Detecting Language & Speakers' },
  { key: 'translating', label: 'Translating Text' },
  { key: 'dubbing', label: 'Generating Dubbed Audio' },
  { key: 'done', label: 'Processing Complete' },
];

export const TTS_VOICES: {
    male: { name: string; label: string }[];
    female: { name: string; label: string }[];
} = {
    male: [
        { name: 'Kore', label: 'Male Voice 1' },
        { name: 'Charon', label: 'Male Voice 2' },
        { name: 'Fenrir', label: 'Male Voice 3' },
    ],
    female: [
        { name: 'Puck', label: 'Female Voice 1' },
        { name: 'Zephyr', label: 'Female Voice 2' },
    ],
};

export const EMOTION_OPTIONS: { value: string; label: string; labelAr: string }[] = [
  { value: 'neutral', label: 'Neutral', labelAr: 'محايد' },
  { value: 'happy', label: 'Happy', labelAr: 'سعيد' },
  { value: 'sad', label: 'Sad', labelAr: 'حزين' },
  { value: 'angry', label: 'Angry', labelAr: 'غاضب' },
  { value: 'surprised', label: 'Surprised', labelAr: 'متفاجئ' },
];