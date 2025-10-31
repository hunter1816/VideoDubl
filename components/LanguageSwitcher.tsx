import React from 'react';
import { useI18n } from '../i18n';

export const LanguageSwitcher: React.FC = () => {
    const { lang, setLang } = useI18n();

    const buttonClasses = (isActive: boolean) => 
        `px-4 py-1.5 text-sm font-bold transition-colors duration-200 border border-[var(--border-color)] ${
            isActive 
                ? 'bg-green-500 text-black shadow-[0_0_10px_var(--primary-color)]'
                : 'text-green-400/70 hover:bg-green-900/50 hover:text-green-300'
        }`;

    return (
        <div className="absolute top-4 right-4 z-10" role="group">
            <button
                onClick={() => setLang('en')}
                className={`${buttonClasses(lang === 'en')} rounded-l-md`}
                aria-pressed={lang === 'en'}
            >
                EN
            </button>
            <button
                onClick={() => setLang('ar')}
                className={`${buttonClasses(lang === 'ar')} rounded-r-md border-l-0`}
                aria-pressed={lang === 'ar'}
            >
                ع
            </button>
        </div>
    );
};
