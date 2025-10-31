import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

export const translations = {
  en: {
    // Header
    appTitle: 'AI Video Dubber',
    appSubtitle: '> Input a video file to analyze and begin the instant dubbing process. System is active.',

    // Language & Dialect Selectors
    targetLanguage: 'TARGET LANGUAGE',
    targetLanguageDesc: '// Select language for dubbing.',
    arabic: 'Arabic',
    spanish: 'Spanish',
    french: 'French',
    dubbingDialect: 'DUBBING DIALECT',
    dubbingDialectDesc: '// Select Arabic dialect for output.',
    standardArabic: 'الفصحى (Standard)',
    egyptianArabic: 'العامية المصرية (Egyptian)',

    // Uploaders
    uploadSubtitles: 'UPLOAD SUBTITLES',
    optional: '(Optional)',
    uploadSubtitlesDesc: '// Provide an SRT file to use its text for dubbing.',
    selectSrtFile: 'Select SRT subtitle file...',
    uploadVideo: 'UPLOAD VIDEO',
    uploadVideoDesc: '// Upload a subtitle file first (optional), then upload video to start.',
    dropVideo: 'Drop video file here, or',
    browseSystem: 'browse system',
    voiceCloningSample: 'VOICE CLONING SAMPLE',
    voiceCloningDesc: '// Upload 15-30s audio for high-fidelity voice cloning.',
    selectAudioSample: 'Select audio sample...',

    // Main App & Modals
    configError: '[ CONFIGURATION ERROR ]',
    configErrorMsg: '> Connection to backend services failed.',
    configErrorDesc: '// The application requires proper environment configuration to function. Please ensure all necessary service keys are set up correctly by the host environment.',
    confirmRequired: '[ CONFIRMATION REQUIRED ]',
    detectedLanguage: 'Detected language is',
    detectedLanguageWarning: '// System optimized for English input. Translation quality may vary for other languages.',
    proceedPrompt: '> Proceed with dubbing to Arabic?',
    abort: 'Abort',
    proceed: 'Proceed',
    
    // Terminal Log
    executing: 'Executing...',
    awaitingCommand: 'Awaiting command...',
    bootSeq1: 'Booting SYS.Dubber.v2.5 kernel...',
    bootSeq2: 'Initializing AI core...',
    bootSeq3: 'Loading neural network models...',
    bootSeq4: 'Establishing secure connection to Gemini API...',
    bootSeq5: 'Connection successful. Awaiting input.',
    bootSeq6: '---',

    // Error Display
    systemError: '[ SYSTEM ERROR ]',
    
    // Result Display
    dubbingStudio: '> Dubbing Studio',
    newUpload: 'New Upload',
    applyAllEdits: 'Apply All Edits',
    applying: 'APPLYING...',
    videoPreview: '[ VIDEO PREVIEW ]',
    dubbedVersion: 'Dubbed Version',
    originalVersion: 'Original Version',
    processing: '[ PROCESSING... ]',
    processingDesc: 'Please wait while the initial dubbing is generated.',
    downloadAssets: '[ DOWNLOAD ASSETS ]',
    dubbedVideo: 'Dubbed Video',
    compiling: 'COMPILING...',
    dubbedAudio: 'Dubbed Audio',
    originalAudio: 'Original Audio',
    syncCalibration: '[ SYNC CALIBRATION ]',
    reset: 'Reset',
    playbackSpeed: 'Playback Speed',
    audioOffset: 'Audio Offset (ms)',
    audioOffsetTooltip: 'Shifts the dubbed audio forward (negative values) or backward (positive values) in time. Use this to fine-tune lip-sync.',
    translationEditor: 'Translation Editor',
    add: 'Add',
    srt: 'SRT',
    noTextToDisplay: 'No Text to Display',
    noTextToDisplayDesc: 'The system did not find any text segments to dub. The final video will be silent.',
    voiceConfig: 'Voice & Dubbing Configuration',
    detectedLanguageLabel: 'Detected Language:',
    voiceCloningActive: 'Voice cloning is active',
    assignVoiceProfile: 'Assign voice profile ({{count}} found):',
    male: 'Male',
    female: 'Female',
    confidence: '(Confidence: {{value}}%)',
    preview: 'Preview',
    originalTranscriptionLog: 'Original Transcription Log',
    // Result Display - Segment Editor
    segment: 'SEGMENT #{{index}}',
    reorderUp: 'Move segment up',
    reorderDown: 'Move segment down',
    speaker: 'SPEAKER',
    mood: 'MOOD',
    timecode: 'TIMECODE (s)',
    startTime: 'T_START:',
    endTime: 'T_END:',
    setStartTime: 'Set start time from video',
    setEndTime: 'Set end time from video',
    sourceText: 'SRC:',
    defaultVoice: 'Default ({{voice}})',
    clonedVoice: 'Cloned Voice',
    clonedVoiceTooltip: 'Voice cloning sample will be used for this segment.',
    maleVoices: 'Male Voices',
    femaleVoices: 'Female Voices',
    // Result Display - Rename Modal
    confirmRename: '[ CONFIRM RENAME ]',
    confirmRenamePrompt: 'Are you sure you want to rename speaker "{{oldId}}" to "{{newId}}"?',
    confirmRenameDesc: '// This will update the name across the entire application, including the transcription logs and voice assignments.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    editSpeakerName: 'Edit speaker name',

    // Constants - STEPS
    stepAnalyzing: 'Analyzing Audio, Detecting Language & Speakers',
    stepTranslating: 'Translating Text',
    stepDubbing: 'Generating Dubbed Audio',
    stepDone: 'Processing Complete',

    // Constants - TTS Voices
    maleVoice1: 'Male Voice 1',
    maleVoice2: 'Male Voice 2',
    maleVoice3: 'Male Voice 3',
    femaleVoice1: 'Female Voice 1',
    femaleVoice2: 'Female Voice 2',

    // Constants - Emotions
    emotionNeutral: 'Neutral',
    emotionHappy: 'Happy',
    emotionSad: 'Sad',
    emotionAngry: 'Angry',
    emotionSurprised: 'Surprised',
    
    // App.tsx
    newSegmentPlaceholder: 'Enter translated text here...',
  },
  ar: {
    // Header
    appTitle: 'مدبلج الفيديو بالذكاء الاصطناعي',
    appSubtitle: '> أدخل ملف الفيديو لتحليل وبدء عملية الدبلجة الفورية. النظام فعال.',
    
    // Language & Dialect Selectors
    targetLanguage: 'لغة الدبلجة',
    targetLanguageDesc: '// اختر لغة الإخراج.',
    arabic: 'العربية',
    spanish: 'الإسبانية',
    french: 'الفرنسية',
    dubbingDialect: 'لهجة الدبلجة',
    dubbingDialectDesc: '// اختر اللهجة العربية للإخراج.',
    standardArabic: 'الفصحى',
    egyptianArabic: 'العامية المصرية',

    // Uploaders
    uploadSubtitles: 'رفع ملف الترجمة',
    optional: '(اختياري)',
    uploadSubtitlesDesc: '// قم بتوفير ملف SRT لاستخدام نصه في الدبلجة.',
    selectSrtFile: 'اختر ملف ترجمة SRT...',
    uploadVideo: 'رفع الفيديو',
    uploadVideoDesc: '// ارفع ملف الترجمة أولاً (اختياري)، ثم ارفع الفيديو للبدء.',
    dropVideo: 'اسحب ملف الفيديو هنا، أو',
    browseSystem: 'تصفح النظام',
    voiceCloningSample: 'عينة استنساخ الصوت',
    voiceCloningDesc: '// ارفع ملف صوتي مدته 15-30 ثانية لاستنساخ صوتي عالي الدقة.',
    selectAudioSample: 'اختر عينة صوتية...',

    // Main App & Modals
    configError: '[ خطأ في الإعدادات ]',
    configErrorMsg: '> فشل الاتصال بخدمات الواجهة الخلفية.',
    configErrorDesc: '// يتطلب التطبيق تكوينًا بيئيًا مناسبًا ليعمل. يرجى التأكد من أن جميع مفاتيح الخدمة الضرورية قد تم إعدادها بشكل صحيح بواسطة بيئة المضيف.',
    confirmRequired: '[ التأكيد مطلوب ]',
    detectedLanguage: 'اللغة المكتشفة هي',
    detectedLanguageWarning: '// النظام مُحسَّن للمدخلات باللغة الإنجليزية. قد تختلف جودة الترجمة للغات الأخرى.',
    proceedPrompt: '> متابعة الدبلجة إلى العربية؟',
    abort: 'إلغاء',
    proceed: 'متابعة',

    // Terminal Log
    executing: 'قيد التنفيذ...',
    awaitingCommand: 'في انتظار الأوامر...',
    bootSeq1: '...جارٍ تشغيل نواة SYS.Dubber.v2.5',
    bootSeq2: '...جارٍ تهيئة النواة الذكية',
    bootSeq3: '...جارٍ تحميل نماذج الشبكة العصبية',
    bootSeq4: '...جارٍ إنشاء اتصال آمن بواجهة Gemini API',
    bootSeq5: '.تم الاتصال بنجاح. في انتظار الإدخال',
    bootSeq6: '---',

    // Error Display
    systemError: '[ خطأ في النظام ]',

    // Result Display
    dubbingStudio: '> استوديو الدبلجة',
    newUpload: 'رفع جديد',
    applyAllEdits: 'تطبيق كل التعديلات',
    applying: 'جارٍ التطبيق...',
    videoPreview: '[ معاينة الفيديو ]',
    dubbedVersion: 'النسخة المدبلجة',
    originalVersion: 'النسخة الأصلية',
    processing: '[ قيد المعالجة... ]',
    processingDesc: 'يرجى الانتظار بينما يتم إنشاء الدبلجة الأولية.',
    downloadAssets: '[ تحميل الملفات ]',
    dubbedVideo: 'فيديو مدبلج',
    compiling: 'جارٍ التجميع...',
    dubbedAudio: 'صوت مدبلج',
    originalAudio: 'الصوت الأصلي',
    syncCalibration: '[ معايرة المزامنة ]',
    reset: 'إعادة تعيين',
    playbackSpeed: 'سرعة التشغيل',
    audioOffset: 'إزاحة الصوت (مللي ثانية)',
    audioOffsetTooltip: 'يزيح الصوت المدبلج للأمام (قيم سالبة) أو للخلف (قيم موجبة) في الوقت. استخدم هذا لضبط مزامنة الشفاه بدقة.',
    translationEditor: 'محرر الترجمة',
    add: 'إضافة',
    srt: 'SRT',
    noTextToDisplay: 'لا يوجد نص لعرضه',
    noTextToDisplayDesc: 'لم يعثر النظام على أي مقاطع نصية للدبلجة. سيكون الفيديو النهائي صامتًا.',
    voiceConfig: 'إعدادات الصوت والدبلجة',
    detectedLanguageLabel: 'اللغة المكتشفة:',
    voiceCloningActive: 'استنساخ الصوت نشط',
    assignVoiceProfile: 'تعيين ملف تعريف الصوت (تم العثور على {{count}}):',
    male: 'ذكر',
    female: 'أنثى',
    confidence: '(ثقة: {{value}}%)',
    preview: 'معاينة',
    originalTranscriptionLog: 'سجل النسخ الأصلي',
    // Result Display - Segment Editor
    segment: 'مقطع #{{index}}',
    reorderUp: 'تحريك المقطع لأعلى',
    reorderDown: 'تحريك المقطع لأسفل',
    speaker: 'المتحدث',
    mood: 'الحالة المزاجية',
    timecode: 'الرمز الزمني (ث)',
    startTime: 'بداية:',
    endTime: 'نهاية:',
    setStartTime: 'ضبط وقت البدء من الفيديو',
    setEndTime: 'ضبط وقت الانتهاء من الفيديو',
    sourceText: 'النص الأصلي:',
    defaultVoice: 'افتراضي ({{voice}})',
    clonedVoice: 'صوت مستنسخ',
    clonedVoiceTooltip: 'سيتم استخدام عينة استنساخ الصوت لهذا المقطع.',
    maleVoices: 'أصوات ذكور',
    femaleVoices: 'أصوات إناث',
    // Result Display - Rename Modal
    confirmRename: '[ تأكيد إعادة التسمية ]',
    confirmRenamePrompt: 'هل أنت متأكد من أنك تريد إعادة تسمية المتحدث "{{oldId}}" إلى "{{newId}}"؟',
    confirmRenameDesc: '// سيؤدي هذا إلى تحديث الاسم عبر التطبيق بأكمله، بما في ذلك سجلات النسخ وتعيينات الصوت.',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    editSpeakerName: 'تعديل اسم المتحدث',

    // Constants - STEPS
    stepAnalyzing: 'تحليل الصوت واكتشاف اللغة والمتحدثين',
    stepTranslating: 'ترجمة النص',
    stepDubbing: 'إنشاء الصوت المدبلج',
    stepDone: 'اكتملت المعالجة',

    // Constants - TTS Voices
    maleVoice1: 'صوت ذكر 1',
    maleVoice2: 'صوت ذكر 2',
    maleVoice3: 'صوت ذكر 3',
    femaleVoice1: 'صوت أنثى 1',
    femaleVoice2: 'صوت أنثى 2',

    // Constants - Emotions
    emotionNeutral: 'محايد',
    emotionHappy: 'سعيد',
    emotionSad: 'حزين',
    emotionAngry: 'غاضب',
    emotionSurprised: 'متفاجئ',

    // App.tsx
    newSegmentPlaceholder: 'أدخل النص المترجم هنا...',
  },
};

export type Language = 'en' | 'ar';
export type Translations = typeof translations.en;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof Translations, replacements?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const value = useMemo(() => {
    const t = (key: keyof Translations, replacements?: Record<string, string | number>): string => {
        let translation = translations[lang][key] || translations.en[key] || key;
        if (replacements) {
            Object.entries(replacements).forEach(([key, value]) => {
                translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });
        }
        return translation;
    };
    
    return {
      lang,
      setLang,
      t,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
    };
  }, [lang]);

  // FIX: Replaced JSX with React.createElement to prevent parsing errors in a .ts file.
  // The original code used JSX syntax in a file with a .ts extension, which is not allowed
  // and causes the TypeScript compiler to misinterpret the code.
  return React.createElement(I18nContext.Provider, { value: value }, children);
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};