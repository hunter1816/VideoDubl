
import type { Step } from './types';

export const STEPS: Step[] = [
  { key: 'analyzing', label: 'Analyzing Audio, Detecting Language & Speakers' },
  { key: 'translating', label: 'Translating to Arabic' },
  { key: 'dubbing', label: 'Generating Arabic Dub' },
  { key: 'done', label: 'Processing Complete' },
];

export const ARABIC_VOICES: {
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
