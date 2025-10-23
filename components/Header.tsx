import React from 'react';

const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  // FIX: Corrected the malformed viewBox attribute from '0 0 24" 24"' to '0 0 24 24'. This was causing a cascade of JSX parsing errors.
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>
  </svg>
);


export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-4 mb-4">
        <FilmIcon className="w-10 h-10 text-teal-400"/>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          AI Video Dubber
        </h1>
      </div>
      <p className="text-lg text-gray-400 max-w-2xl mx-auto">
        قم بتحميل مقطع فيديو، وبشكل اختياري عينة صوتية. سيقوم الذكاء الاصطناعي بترجمته ودبلجته إلى اللغة العربية، إما بصوت مشابه أو بصوت مستنسخ.
      </p>
    </header>
  );
};
