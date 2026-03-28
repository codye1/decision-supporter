import React from 'react';

export const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Ініціалізація системи...</p>
    </div>
  </div>
);
