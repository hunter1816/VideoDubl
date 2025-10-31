import type { Step } from './types';
import { Translations } from './i18n';

export const STEPS: { key: Step['key']; labelKey: keyof Translations }[] = [
  { key: 'analyzing', labelKey: 'stepAnalyzing' },
  { key: 'translating', labelKey: 'stepTranslating' },
  { key: 'dubbing', labelKey: 'stepDubbing' },
  { key: 'done', labelKey: 'stepDone' },
];

export const TTS_VOICES: {
    male: { name: string; labelKey: keyof Translations }[];
    female: { name: string; labelKey: keyof Translations }[];
} = {
    male: [
        { name: 'Kore', labelKey: 'maleVoice1' },
        { name: 'Charon', labelKey: 'maleVoice2' },
        { name: 'Fenrir', labelKey: 'maleVoice3' },
    ],
    female: [
        { name: 'Puck', labelKey: 'femaleVoice1' },
        { name: 'Zephyr', labelKey: 'femaleVoice2' },
    ],
};

export const EMOTION_OPTIONS: { value: string; labelKey: keyof Translations }[] = [
  { value: 'neutral', labelKey: 'emotionNeutral' },
  { value: 'happy', labelKey: 'emotionHappy' },
  { value: 'sad', labelKey: 'emotionSad' },
  { value: 'angry', labelKey: 'emotionAngry' },
  { value: 'surprised', labelKey: 'emotionSurprised' },
];
